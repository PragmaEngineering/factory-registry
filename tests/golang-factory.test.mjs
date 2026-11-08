import { parse as parseYAML } from 'yaml';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const factoryDirectory = fileURLToPath(new URL('../factories/golang/', import.meta.url));
const factory = parseYAML(readFileSync(join(factoryDirectory, 'factory.yaml'), 'utf8'));

test('configured Go hooks use one execution worktree and keep documents outside its source commits', t => {
  const parent = mkdtempSync(join(tmpdir(), 'go-worktree-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const project = join(parent, 'project'); mkdirSync(project);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (cwd, ...args) => {
    const result = spawnSync('git', args, { cwd, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  git(project, 'init', '-q', '-b', 'main'); git(project, 'config', 'user.name', 'Go factory test');
  git(project, 'config', 'user.email', 'test@example.invalid'); git(project, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(project, '.gitignore'), '.factory/\n'); writeFileSync(join(project, 'main.go'), 'package main\n');
  git(project, 'add', '.'); git(project, 'commit', '-qm', 'test: seed');
  const id = randomUUID();
  const values = { 'execution.project': project, 'execution.id': id, 'execution.factory_dir': join(project, '.factory') };
  for (const [key, value] of Object.entries(factory.variables)) {
    values['variables.' + key] = value.replace(/\$\{([^}]+)\}/g, (_, key) => { assert.ok(values[key]); return values[key]; });
  }
  const workspace = values['variables.workspace'];
  const files = join(project, '.factory', 'executions', id, 'files'); mkdirSync(files, { recursive: true });
  const context = { version: 1, execution_id: id, invocation_id: randomUUID(), project, files_dir: files, scope: 'execution', boundary: 'before' };
  const run = (hook, ctx) => {
    const [script, ...args] = hook.arguments;
    const result = spawnSync(hook.command, [resolve(factoryDirectory, script), ...args.map(value => value.replace(/\$\{([^}]+)\}/g, (_, key) => { assert.ok(values[key]); return values[key]; }))], { cwd: project, env, encoding: 'utf8', input: JSON.stringify(ctx) });
    assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
  };
  run(factory.hooks.before[0], context);
  assert.equal(git(project, 'branch', '--show-current'), 'main');
  assert.equal(git(workspace, 'branch', '--show-current'), 'execution/' + id);
  writeFileSync(join(files, 'spec.html'), 'specification'); writeFileSync(join(files, 'plan.html'), 'plan');
  const design = { ...context, invocation_id: randomUUID(), scope: 'stage', boundary: 'after', stage: 'design', participants: [] };
  const stage = name => factory.workflow.stages.find(stage => stage.name === name).hooks.after[0];
  assert.equal(run(stage('design'), design).state, 'no_changes');
  // Exercise the real package launchers from the configuration directory.
  // Fake native agents edit/review source only in the launcher-selected cwd.
  const tools=join(parent,'tools');mkdirSync(tools);
  for(const command of ['rg','go','gofmt','golangci-lint'])writeFileSync(join(tools,command),'#!/bin/sh\nexit 0\n',{mode:0o755});
  const profile=join(parent,'profile');mkdirSync(profile);
  writeFileSync(join(profile,'settings.json'),JSON.stringify({defaultProvider:'fixture',defaultModel:'fixture'}));
  mkdirSync(join(files,'reviews'));
  const native=join(parent,'native');
  writeFileSync(native,`#!${process.execPath}
import {readFileSync,writeFileSync} from 'node:fs';
if(process.env.TEST_ROLE==='coder_golang') writeFileSync('main.go','package changed\\n');
else if(readFileSync('main.go','utf8')!=='package changed\\n') throw new Error('reviewer inspected a different source tree');
writeFileSync(process.env.TEST_FILES+'/reviews/'+process.env.TEST_ROLE+'.md','source checks performed in '+process.cwd());
console.log(JSON.stringify({cwd:process.cwd()}));
`,{mode:0o755});
  const launchEnv=Object.fromEntries(Object.entries(env).filter(([key])=>!key.startsWith('FACTORY_')&&!key.startsWith('PI_')&&!key.startsWith('AGENT_')));
  for(const name of ['coder_golang','code_reviewer_golang']) {
    const pkg=factory.packages.find(pkg=>pkg.name===name);
    const result=spawnSync(resolve(factoryDirectory,pkg.path,pkg.entrypoint),['--workspace',workspace,'-p','fixture work'],{cwd:project,env:{...launchEnv,PATH:tools+':'+env.PATH,AGENT_EXECUTABLE:native,FACTORY_RUNTIME_NAME:'pi',PI_CODING_AGENT_DIR:profile,TEST_ROLE:name,TEST_FILES:files},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).cwd,realpathSync(workspace));
    assert.equal(readFileSync(join(project,'main.go'),'utf8'),'package main\n');
    assert.match(readFileSync(join(files,'reviews',name+'.md'),'utf8'),/source checks performed in/);
  }
  const implementation = { ...design, stage: 'implementation', invocation_id: randomUUID(), participants: [
    { agent: 'coder_golang', instance_id: 'coder', step: 'build', visit: 1, attempt: 1, outcome: 'ready_for_review' },
    { agent: 'code_reviewer_golang', instance_id: 'reviewer', step: 'code_review', visit: 1, attempt: 1, outcome: 'completed' },
  ] };
  const commit = run(stage('implementation'), implementation).commit;
  assert.equal(run(stage('implementation'), implementation).commit, commit);
  assert.equal(git(workspace, 'show', '--format=', '--name-only', 'HEAD'), 'main.go');
  run(factory.hooks.after[0], { ...context, boundary: 'after', invocation_id: randomUUID() });
  assert.equal(git(project, 'status', '--porcelain'), '');
});
