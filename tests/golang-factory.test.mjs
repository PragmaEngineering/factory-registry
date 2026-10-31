import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const factoryDirectory = fileURLToPath(new URL('../factories/golang/', import.meta.url));
const factory = JSON.parse(readFileSync(join(factoryDirectory, 'factory.json'), 'utf8'));

function project(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'golang-factory-hooks-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git('init', '-q');
  git('config', 'user.name', 'Factory test');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  writeFileSync(join(cwd, 'main.go'), 'package main\n');
  git('add', '.');
  git('commit', '-qm', 'chore: seed temporary project');
  const execution = randomUUID();
  const before = { version: 1, execution_id: execution, invocation_id: randomUUID(), project: cwd, scope: 'execution', boundary: 'before' };
  function runHooks(hooks, context) {
    return hooks.map(hook => {
      const [script, ...args] = hook.arguments;
      return spawnSync(hook.command, [resolve(factoryDirectory, script), ...args], {
        cwd, env, encoding: 'utf8', input: JSON.stringify({ ...context, name: hook.name }),
      });
    });
  }
  const run = (boundary, context) => runHooks(factory.hooks[boundary], context);
  const runStage = (name, context) => runHooks(factory.workflow.stages.find(stage => stage.name === name).hooks.after, context);
  return { cwd, git, before, run, runStage, execution };
}

test('Go factory hooks preserve retried work, reserve the checkout and create distinct execution branches', t => {
  const p = project(t);
  const startingCommit = p.git('rev-parse', 'HEAD');
  let results = p.run('before', p.before);
  for (const result of results) assert.equal(result.status, 0, result.stderr);
  const firstBranch = p.git('branch', '--show-current');
  assert.equal(firstBranch, `execution/${p.execution}`);
  assert.equal(p.git('rev-parse', 'HEAD'), startingCommit);
  writeFileSync(join(p.cwd, 'main.go'), 'package main\n// execution work\n');
  for (const result of p.run('before', p.before)) assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(p.cwd, 'main.go'), 'utf8'), /execution work/);
  const another = { ...p.before, invocation_id: randomUUID(), execution_id: randomUUID() };
  results = p.run('before', another);
  assert.notEqual(results[0].status, 0);
  assert.match(results[0].stderr, /reserved by another execution/);
  for (const result of p.run('after', { ...p.before, invocation_id: randomUUID(), boundary: 'after' })) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('branch', '--show-current'), firstBranch);
  assert.match(p.git('diff'), /execution work/);
  results = p.run('before', another);
  assert.notEqual(results[0].status, 0);
  assert.match(results[0].stderr, /checkout has existing changes/);
  // Only discard the known fixture edit, inside this temporary test project.
  p.git('restore', 'main.go');
  for (const result of p.run('before', another)) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('branch', '--show-current'), `execution/${another.execution_id}`);
  assert.notEqual(p.git('branch', '--show-current'), firstBranch);
  assert.equal(p.git('rev-parse', 'HEAD'), startingCommit);
});

test('Go factory rejects an initially dirty checkout without changing its branch', t => {
  const p = project(t);
  const branch = p.git('branch', '--show-current');
  writeFileSync(join(p.cwd, 'untracked.txt'), 'unrelated work');
  const results = p.run('before', p.before);
  assert.notEqual(results[0].status, 0);
  assert.match(results[0].stderr, /checkout has existing changes/);
  assert.equal(p.git('branch', '--show-current'), branch);
  assert.equal(readFileSync(join(p.cwd, 'untracked.txt'), 'utf8'), 'unrelated work');
});

test('configured Go stage commits preserve the approved design and attribute both agents without duplicate commits', t => {
  const p = project(t);
  for (const result of p.run('before', p.before)) assert.equal(result.status, 0, result.stderr);
  mkdirSync(join(p.cwd, 'reviews'));
  writeFileSync(join(p.cwd, 'spec.html'), '<h1>Specification</h1>');
  writeFileSync(join(p.cwd, 'plan.html'), '<h1>Plan</h1>');
  writeFileSync(join(p.cwd, 'reviews/architecture.md'), 'Ready for design approval.');
  const design = {
    ...p.before, invocation_id: randomUUID(), scope: 'stage', boundary: 'after', stage: 'design', stage_visit: 1,
    participants: [
      { agent: 'architect', instance_id: 'architect-instance', step: 'specification', visit: 1, attempt: 1, outcome: 'completed' },
      { agent: 'architecture_reviewer', instance_id: 'design-reviewer-instance', step: 'architecture_review', visit: 1, attempt: 1, outcome: 'completed' },
    ],
  };
  for (const result of p.runStage('design', design)) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('log', '-1', '--format=%s'), 'docs(design): record approved specification and plan');
  assert.deepEqual(p.git('show', '--format=', '--name-only', 'HEAD').split('\n').sort(), ['plan.html', 'reviews/architecture.md', 'spec.html']);
  const designCommit = p.git('rev-parse', 'HEAD');
  for (const result of p.runStage('design', design)) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('rev-parse', 'HEAD'), designCommit);
  writeFileSync(join(p.cwd, 'main.go'), 'package main\nfunc main() {}\n');
  writeFileSync(join(p.cwd, 'reviews/build.md'), 'Implementation checks passed.');
  writeFileSync(join(p.cwd, 'reviews/code.md'), 'Independent review completed.');
  const implementation = {
    ...design, invocation_id: randomUUID(), stage: 'implementation',
    participants: [
      { agent: 'coder_golang', instance_id: 'coder-instance', step: 'build', visit: 1, attempt: 1, outcome: 'ready_for_review' },
      { agent: 'code_reviewer_golang', instance_id: 'code-reviewer-instance', step: 'code_review', visit: 1, attempt: 1, outcome: 'completed' },
    ],
  };
  for (const result of p.runStage('implementation', implementation)) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('log', '-1', '--format=%s'), 'chore(implementation): record accepted work');
  const message = p.git('log', '-1', '--format=%B');
  assert.match(message, /Agent-Invocation: coder_golang\/coder-instance\/build\/v1\/t1/);
  assert.match(message, /Agent-Invocation: code_reviewer_golang\/code-reviewer-instance\/code_review\/v1\/t1/);
  const implementationCommit = p.git('rev-parse', 'HEAD');
  for (const result of p.runStage('implementation', implementation)) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('rev-parse', 'HEAD'), implementationCommit);
  assert.equal(p.git('rev-list', '--count', 'HEAD'), '3');
  assert.equal(p.git('status', '--porcelain'), '');
  for (const result of p.run('after', { ...p.before, invocation_id: randomUUID(), boundary: 'after' })) assert.equal(result.status, 0, result.stderr);
  assert.equal(p.git('branch', '--show-current'), `execution/${p.execution}`);
});
