import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const load = name => parse(readFileSync(join(root, 'factories/python_swe_bench_lite', name), 'utf8'));

test('Python variants have explicit autonomous routes and matching nominal limits', () => {
  const pair = load('factory.yaml'), single = load('baseline.yaml');
  const loop = pair.workflow.stages[0].loop;
  assert.equal(loop.mode, 'sequential');
  assert.equal(loop.limit, 2);
  assert.deepEqual(loop.steps.map(step => step.name), ['implement', 'review']);
  assert.deepEqual(loop.steps[0].on, { ready_for_review: 'review', blocked: '$blocked' });
  assert.deepEqual(loop.steps[1].on, { completed: '$done', changes_requested: 'implement', blocked: '$blocked' });
  assert.equal(pair.workflow.stages[0].human, undefined);
  assert.equal(single.workflow.steps.length, 1);
  assert.equal(single.workflow.steps[0].on.completed, '$done');
  assert.deepEqual(pair.packages[0], single.packages[0]);
  for (const key of ['tokens', 'elapsed_seconds']) {
    assert.equal(loop.steps.reduce((sum, step) => sum + step.budget[key], 0) * loop.limit,
      single.workflow.steps[0].budget[key]);
  }
  for (const step of [...loop.steps, ...single.workflow.steps]) {
    assert.equal(step.type, 'run');
    assert.equal(step.budget.action, 'stop');
    assert.equal(step.outputs_on.includes('blocked'), false);
  }
  assert.equal(pair.hooks, undefined);
  assert.equal(single.hooks, undefined);
});

test('Python launchers select workspaces, load linked skills and preserve managed profiles', t => {
  const temp = mkdtempSync(join(tmpdir(), 'python-bundle-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const workspace = join(temp, 'workspace with spaces'); mkdirSync(workspace);
  const tools = join(temp, 'tools'); mkdirSync(tools);
  for (const tool of ['rg', 'python3']) writeFileSync(join(tools, tool), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const pi = join(temp, 'pi');
  writeFileSync(pi, `#!${process.execPath}\nconsole.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2),profile:process.env.PI_CODING_AGENT_DIR}));\n`, { mode: 0o755 });
  const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(FACTORY_|PI_|AGENT_)/.test(key)));
  for (const agent of ['coder_python', 'code_reviewer_python']) {
    const dir = join(root, 'agents', agent);
    const settings = JSON.parse(readFileSync(join(dir, 'pi/settings.json')));
    assert.equal(settings.packages, undefined);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'pi/mcp.json'))), { mcpServers: {} });
    assert.equal(realpathSync(join(dir, 'skills/python-repository-repair')), join(root, 'skills/python-repository-repair'));
    const profile = join(temp, agent); mkdirSync(profile);
    writeFileSync(join(profile, 'settings.json'), '{"defaultProvider":"custom","defaultModel":"custom"}');
    for (const managed of [false, true]) {
      const env = { ...baseEnv, PATH: tools + ':' + baseEnv.PATH, AGENT_EXECUTABLE: pi,
        FACTORY_AGENT_RUNTIME_DIR: join(temp, 'profiles'),
        ...(managed ? { FACTORY_RUNTIME_NAME: 'pi', PI_CODING_AGENT_DIR: profile } : {}) };
      const result = spawnSync(join(dir, 'start.sh'), ['--workspace', workspace, '-p', 'repair issue'], { env, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(output.cwd, realpathSync(workspace));
      assert.ok(!output.args.includes('--workspace'));
      assert.ok(output.args.includes(join(root, 'skills/python-repository-repair')));
      assert.deepEqual(output.args.slice(-2), ['-p', 'repair issue']);
      if (managed) assert.equal(output.profile, profile);
      const missing = spawnSync(join(dir, 'start.sh'), ['--workspace', join(temp, 'missing')], { env, encoding: 'utf8' });
      assert.notEqual(missing.status, 0);
      assert.equal(missing.stdout, '');
    }
  }
});
