import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const prepare = fileURLToPath(new URL('../scripts/git-worktree.py', import.meta.url));
const commit = fileURLToPath(new URL('../scripts/git-commit.py', import.meta.url));

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'registry-worktree-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, 'source');
  const workspace = join(directory, 'work trees', 'execution [one]');
  mkdirSync(source);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  function gitAt(cwd, ...args) {
    const result = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  const git = (...args) => gitAt(source, ...args);
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Registry test');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  mkdirSync(join(source, 'app'));
  writeFileSync(join(source, 'main.go'), 'package main\n');
  writeFileSync(join(source, 'app', 'main.go'), 'package main\n');
  git('add', '.'); git('commit', '-qm', 'test: seed project');
  const context = { version: 1, invocation_id: randomUUID(), execution_id: randomUUID(), project: source, scope: 'execution', boundary: 'before' };
  const run = (script, ctx, args = [], cwd = source) => spawnSync('python3', [script, ...args], { cwd, env, encoding: 'utf8', input: JSON.stringify(ctx) });
  const preparationArgs = ['--repository', source, '--workspace', workspace];
  const start = () => run(prepare, context, preparationArgs);
  const after = { ...context, invocation_id: randomUUID(), scope: 'stage', boundary: 'after', stage: 'implementation', participants: [
    { agent: 'coder_golang', instance_id: 'coder-instance', step: 'build', visit: 1, attempt: 1, outcome: 'ready' },
    { agent: 'reviewer', instance_id: 'reviewer-instance', step: 'review', visit: 1, attempt: 1, outcome: 'completed' },
  ] };
  const commitArgs = ['--workspace', workspace, '--type', 'feat', '--scope', 'example', '--description', 'add behavior', '--path', '.'];
  return { source, workspace, directory, git, gitAt, env, context, run, start, after, preparationArgs, commitArgs };
}

function succeeds(result) { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }

test('preparation preserves the source checkout and retries reuse dirty worktree', t => {
  const f = fixture(t);
  const baseline = f.git('rev-parse', 'HEAD');
  succeeds(f.start());
  assert.equal(f.git('branch', '--show-current'), 'main');
  assert.equal(f.git('rev-parse', 'HEAD'), baseline);
  assert.equal(f.gitAt(f.workspace, 'branch', '--show-current'), 'execution/' + f.context.execution_id);
  writeFileSync(join(f.workspace, 'main.go'), 'package changed\n');
  succeeds(f.start());
  assert.equal(readFileSync(join(f.workspace, 'main.go'), 'utf8'), 'package changed\n');
  assert.equal(readFileSync(join(f.source, 'main.go'), 'utf8'), 'package main\n');
});

test('separate executions use separate worktrees and can remain active concurrently', t => {
  const f = fixture(t); succeeds(f.start());
  const other = { ...f.context, execution_id: randomUUID(), invocation_id: randomUUID() };
  const second = join(f.directory, 'second');
  succeeds(f.run(prepare, other, ['--repository', f.source, '--workspace', second]));
  assert.notEqual(f.gitAt(second, 'branch', '--show-current'), f.gitAt(f.workspace, 'branch', '--show-current'));
  assert.equal(f.git('branch', '--show-current'), 'main');
});

test('dirty source changes are neither lost nor silently included in a new worktree', t => {
  const f = fixture(t);
  writeFileSync(join(f.source, 'main.go'), 'uncommitted source change\n');
  succeeds(f.start());
  assert.equal(readFileSync(join(f.source, 'main.go'), 'utf8'), 'uncommitted source change\n');
  assert.equal(readFileSync(join(f.workspace, 'main.go'), 'utf8'), 'package main\n');
});

test('worktree preparation refuses unowned paths, branches and conflicting invocations', t => {
  const f = fixture(t);
  mkdirSync(f.workspace, { recursive: true });
  let result = f.start(); assert.notEqual(result.status, 0); assert.match(result.stderr, /already exists/);
  rmSync(f.workspace, { recursive: true });
  f.git('branch', 'execution/' + f.context.execution_id);
  result = f.start(); assert.notEqual(result.status, 0); assert.match(result.stderr, /branch already exists/);
  f.git('branch', '-D', 'execution/' + f.context.execution_id);
  succeeds(f.start());
  result = f.run(prepare, { ...f.context, invocation_id: randomUUID() }, f.preparationArgs);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /different hook invocation/);
});

test('preparation recovers after Git creation but refuses to recreate a missing prepared worktree', t => {
  const f = fixture(t); succeeds(f.start());
  const path = join(f.source, '.git', 'factory', 'executions', f.context.execution_id + '.json');
  const receipt = JSON.parse(readFileSync(path)); receipt.state = 'preparing'; writeFileSync(path, JSON.stringify(receipt));
  succeeds(f.start());
  rmSync(f.workspace, { recursive: true });
  const result = f.start(); assert.notEqual(result.status, 0); assert.match(result.stderr, /missing/);
  assert.equal(existsSync(f.workspace), false);
});

test('commits attribute both agents and recover acceptance without creating duplicate commits', t => {
  const f = fixture(t); succeeds(f.start());
  writeFileSync(join(f.workspace, 'main.go'), 'package changed\n');
  const first = succeeds(f.run(commit, f.after, f.commitArgs)).commit;
  const message = f.gitAt(f.workspace, 'log', '-1', '--format=%B');
  assert.match(message, /^feat\(example\): add behavior/);
  assert.match(message, /Agent-Invocation: coder_golang\/coder-instance\/build\/v1\/t1/);
  assert.match(message, /Agent-Invocation: reviewer\/reviewer-instance\/review\/v1\/t1/);
  rmSync(join(f.source, '.git', 'factory', 'commits', f.after.invocation_id + '.json'));
  assert.equal(succeeds(f.run(commit, f.after, f.commitArgs)).commit, first);
  assert.equal(f.gitAt(f.workspace, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(f.git('rev-list', '--count', 'HEAD'), '1');
});

test('workspace-relative commits include additions and deletions without staging neighboring source', t => {
  const f = fixture(t); succeeds(f.start());
  const app = join(f.workspace, 'app');
  rmSync(join(app, 'main.go')); writeFileSync(join(app, 'spec [draft].html'), 'test artifact');
  writeFileSync(join(f.workspace, 'main.go'), 'unrelated change');
  const args = [...f.commitArgs]; args[1] = app;
  succeeds(f.run(commit, f.after, args));
  assert.equal(f.gitAt(f.workspace, 'show', '--format=', '--name-status', '--no-renames', 'HEAD'), 'D\tapp/main.go\nA\tapp/spec [draft].html');
  assert.match(f.gitAt(f.workspace, 'status', '--porcelain'), /M main.go/);
  const escaping = [...args.slice(0, -1), '../main.go'];
  const result = f.run(commit, { ...f.after, invocation_id: randomUUID() }, escaping);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /inside the workspace root/);
});

test('committer rejects unrelated staging, preserves normal Git hooks and safely retries', t => {
  const f = fixture(t); succeeds(f.start());
  writeFileSync(join(f.workspace, 'main.go'), 'package changed\n');
  f.gitAt(f.workspace, 'add', 'main.go');
  let result = f.run(commit, f.after, f.commitArgs);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /not owned/);
  f.gitAt(f.workspace, 'restore', '--staged', 'main.go');
  const hook = join(f.source, '.git', 'hooks', 'pre-commit');
  writeFileSync(hook, '#!/bin/sh\necho hook-rejected >&2\nexit 1\n', { mode: 0o755 });
  result = f.run(commit, f.after, f.commitArgs);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /hook-rejected/);
  rmSync(hook); succeeds(f.run(commit, f.after, f.commitArgs));
});

test('a no-change commit stays a no-op and successful release retains evidence and branch', t => {
  const f = fixture(t); succeeds(f.start());
  assert.equal(succeeds(f.run(commit, f.after, f.commitArgs)).state, 'no_changes');
  writeFileSync(join(f.workspace, 'main.go'), 'package changed\n');
  assert.equal(succeeds(f.run(commit, f.after, f.commitArgs)).state, 'no_changes');
  const released = { ...f.context, invocation_id: randomUUID(), boundary: 'after' };
  succeeds(f.run(prepare, released, [...f.preparationArgs, '--release']));
  succeeds(f.run(prepare, released, [...f.preparationArgs, '--release']));
  assert.equal(readFileSync(join(f.workspace, 'main.go'), 'utf8'), 'package changed\n');
  assert.equal(f.gitAt(f.workspace, 'branch', '--show-current'), 'execution/' + f.context.execution_id);
  const result = f.run(commit, { ...f.after, invocation_id: randomUUID() }, f.commitArgs);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /prepared worktree/);
});
