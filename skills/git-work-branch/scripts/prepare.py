#!/usr/bin/env python3
"""Execution before hook: prepare a branch, without resetting an existing checkout."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid


def git(*args):
    result = subprocess.run(["git", *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def write_json(path, data):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as output:
        json.dump(data, output)
        temporary = output.name
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release",action="store_true",help="release this execution checkout after successful completion")
    parser.add_argument("--base", default="HEAD")
    parser.add_argument("--prefix", default="execution/")
    args = parser.parse_args()
    context = json.load(sys.stdin)
    if context.get("version") != 1 or context.get("scope") != "execution" or context.get("boundary") != ("after" if args.release else "before"):
        raise RuntimeError("branch preparation/release requires matching version 1 execution before/after context")
    execution = str(uuid.UUID(context["execution_id"]))
    invocation = str(uuid.UUID(context["invocation_id"]))
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    if root != Path.cwd().resolve():
        raise RuntimeError("run the hook from the repository root")
    directory = Path(git("rev-parse", "--git-common-dir")).resolve() / "factory"
    receipts = directory / "executions"
    receipts.mkdir(parents=True, exist_ok=True)
    branch = args.prefix + execution
    git("check-ref-format", "--branch", branch)
    with (directory / "hooks.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        receipt = receipts / (execution + ".json")
        checkout = directory / ("checkout-" + hashlib.sha256(str(root).encode()).hexdigest() + ".json")
        owner = json.loads(checkout.read_text()) if checkout.exists() else None
        if owner and owner.get("state") == "active" and owner["execution_id"] != execution:
            raise RuntimeError("checkout is reserved by another execution: " + owner["execution_id"])
        if args.release:
            if not receipt.exists():
                raise RuntimeError("execution has no branch receipt to release")
            prior = json.loads(receipt.read_text())
            if git("branch", "--show-current") != prior["branch"]:
                raise RuntimeError("checkout is no longer on the execution branch")
            if prior.get("release_invocation") not in (None, invocation):
                raise RuntimeError("checkout was released by a different hook invocation")
            prior.update(state="released", release_invocation=invocation)
            write_json(receipt, prior)
            write_json(checkout, {"execution_id": execution, "state": "released"})
            print(json.dumps(prior))
            return
        if receipt.exists():
            prior = json.loads(receipt.read_text())
            if prior["invocation_id"] != invocation or prior["branch"] != branch or prior["base"] != args.base:
                raise RuntimeError("execution branch receipt differs from this hook configuration")
            if git("branch", "--show-current") != branch:
                if prior["state"] != "preparing" or git("status", "--porcelain", "--untracked-files=all"):
                    raise RuntimeError("execution checkout is no longer on its recorded work branch")
                exists = subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/heads/" + branch]).returncode == 0
                if exists:
                    if git("rev-parse", "refs/heads/" + branch) != prior["starting_commit"]:
                        raise RuntimeError("interrupted preparation branch has unexpected commits")
                    git("switch", branch)
                else:
                    git("switch", "-c", branch, prior["starting_commit"])
            if prior["state"] != "released":
                prior["state"] = "prepared"
                write_json(checkout, {"execution_id": execution, "state": "active"})
            write_json(receipt, prior)
            print(json.dumps(prior))
            return
        if git("status", "--porcelain", "--untracked-files=all"):
            raise RuntimeError("checkout has existing changes; commit or relocate them before branch preparation")
        if subprocess.run(["git", "show-ref", "--verify", "--quiet", "refs/heads/" + branch]).returncode == 0:
            raise RuntimeError("target branch already exists without this execution's receipt")
        parent = git("rev-parse", "--verify", args.base + "^{commit}")
        data = {"version": 1, "execution_id": execution, "invocation_id": invocation, "branch": branch, "base": args.base, "starting_commit": parent, "state": "preparing"}
        # Write before switching. If interrupted, a retry can verify the owned
        # branch rather than mistake it for an unrelated pre-existing branch.
        write_json(receipt, data)
        write_json(checkout, {"execution_id": execution, "state": "active"})
        try:
            git("switch", "-c", branch, parent)
        except Exception:
            # Retain the receipt for inspection; never reset a possibly-created branch.
            raise
        data["state"] = "prepared"
        write_json(receipt, data)
        print(json.dumps(data))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError) as error:
        print("work branch: " + str(error), file=sys.stderr)
        sys.exit(1)
