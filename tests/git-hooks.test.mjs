import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const prepare=fileURLToPath(new URL('../scripts/git-work-branch.py',import.meta.url));
const commit=fileURLToPath(new URL('../scripts/git-commit.py',import.meta.url));
function fixture(t) {
 const cwd=mkdtempSync(join(tmpdir(),'registry-git-'));t.after(()=>rmSync(cwd,{recursive:true,force:true}));
 const env={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'};
 const git=(...args)=>{const r=spawnSync('git',args,{cwd,env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','-q');git('config','user.name','Registry test');git('config','user.email','test@example.invalid');git('config','commit.gpgsign','false');
 writeFileSync(join(cwd,'main.go'),'package main\n');git('add','.');git('commit','-qm','chore: seed test');
 const execution=randomUUID();
 const context={version:1,invocation_id:randomUUID(),execution_id:execution,project:cwd,scope:'execution',boundary:'before',name:'work-branch'};
 const run=(script,ctx,args=[])=>spawnSync('python3',[script,...args],{cwd,env,encoding:'utf8',input:JSON.stringify(ctx)});
 const prepared=run(prepare,context);assert.equal(prepared.status,0,prepared.stderr);
 const after={...context,invocation_id:randomUUID(),scope:'stage',boundary:'after',name:'commit-work',stage:'implementation',stage_visit:1,participants:[{agent:'coder_golang',instance_id:'coder-instance',step:'build',visit:1,attempt:1,outcome:'ready'},{agent:'reviewer',instance_id:'reviewer-instance',step:'review',visit:1,attempt:1,outcome:'completed'}]};
 const args=['--type','feat','--scope','example','--description','add behavior','--path','main.go'];
 return {cwd,git,run,context,after,args};
}
test('branch retry preserves work, commit attributes both agents and retries without duplication',t=>{
 const f=fixture(t);writeFileSync(join(f.cwd,'main.go'),'package main\n// change\n');
 assert.equal(f.run(prepare,f.context).status,0);
 let result=f.run(commit,f.after,f.args);assert.equal(result.status,0,result.stderr);
 const first=JSON.parse(result.stdout).commit;
 assert.equal(f.git('log','-1','--format=%s'),'feat(example): add behavior');
 const message=f.git('log','-1','--format=%B');assert.match(message,/Agent-Invocation: coder_golang\/coder-instance\/build\/v1\/t1/);assert.match(message,/Agent-Invocation: reviewer\/reviewer-instance\/review\/v1\/t1/);
 // Simulate interruption after git commit but before the receipt was saved.
 rmSync(join(f.cwd,'.git','factory','commits',f.after.invocation_id+'.json'));
 result=f.run(commit,f.after,f.args);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).commit,first);assert.equal(f.git('rev-list','--count','HEAD'),'2');
 assert.equal(f.git('status','--porcelain'),'');
});
test('no changes is an idempotent no-op, and argument reuse conflicts are rejected',t=>{
 const f=fixture(t);const result=f.run(commit,f.after,f.args);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).state,'no_changes');
 writeFileSync(join(f.cwd,'main.go'),'package changed\n');
 assert.equal(JSON.parse(f.run(commit,f.after,f.args).stdout).state,'no_changes');assert.equal(f.git('rev-list','--count','HEAD'),'1');
 const conflict=f.run(commit,f.after,[...f.args,'--description','different']);assert.notEqual(conflict.status,0);assert.match(conflict.stderr,/different commit arguments/);
});
test('unrelated staging is refused and repository hooks remain enabled',t=>{
 const f=fixture(t);writeFileSync(join(f.cwd,'unrelated.txt'),'not owned');f.git('add','unrelated.txt');
 let result=f.run(commit,f.after,f.args);assert.notEqual(result.status,0);assert.match(result.stderr,/not owned/);
 f.git('restore','--staged','unrelated.txt');writeFileSync(join(f.cwd,'main.go'),'package modified\n');
 writeFileSync(join(f.cwd,'.git','hooks','pre-commit'),'#!/bin/sh\nprintf "hook rejection\\n" >&2\nexit 1\n',{mode:0o755});
 result=f.run(commit,f.after,f.args);assert.notEqual(result.status,0);assert.match(result.stderr,/hook rejection/);assert.equal(f.git('rev-list','--count','HEAD'),'1');
 rmSync(join(f.cwd,'.git','hooks','pre-commit'));
 result=f.run(commit,f.after,f.args);assert.equal(result.status,0,result.stderr);
 assert.equal(f.git('status','--porcelain'),'?? unrelated.txt');
});
test('checkout reservations prevent simultaneous executions, release allows a subsequent one',t=>{
 const f=fixture(t);const other={...f.context,execution_id:randomUUID(),invocation_id:randomUUID()};
 let result=f.run(prepare,other);assert.notEqual(result.status,0);assert.match(result.stderr,/reserved by another execution/);
 result=f.run(prepare,{...f.context,invocation_id:randomUUID(),boundary:'after'},['--release']);assert.equal(result.status,0,result.stderr);
 result=f.run(prepare,other);assert.equal(result.status,0,result.stderr);
});
test('explicit project-root path includes added and removed files',t=>{
 const f=fixture(t);rmSync(join(f.cwd,'main.go'));writeFileSync(join(f.cwd,'new.go'),'package main\n');
 const args=[...f.args.slice(0,-1),'.'];const result=f.run(commit,f.after,args);assert.equal(result.status,0,result.stderr);assert.equal(f.git('status','--porcelain'),'');
 assert.match(f.git('show','--no-renames','--format=','--name-status','HEAD'),/A\s+new.go/);
});

test('unexpected commit message rewrites do not turn into a successful no-op on retry',t=>{
 const f=fixture(t);writeFileSync(join(f.cwd,'main.go'),'package modified\n');
 writeFileSync(join(f.cwd,'.git','hooks','commit-msg'),'#!/bin/sh\nprintf "broken message\\n" > "$1"\n',{mode:0o755});
 let result=f.run(commit,f.after,f.args);assert.notEqual(result.status,0);assert.match(result.stderr,/changed the generated commit message/);
 result=f.run(commit,f.after,f.args);assert.notEqual(result.status,0);assert.match(result.stderr,/HEAD changed/);
 assert.equal(f.git('rev-list','--count','HEAD'),'2');
});
