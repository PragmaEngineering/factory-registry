import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Go agents consume an explicit workspace without passing it to Pi or requiring Factory',t=>{
 const root=mkdtempSync(join(tmpdir(),'workspace-launch-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const workspace=join(root,'project with spaces');mkdirSync(workspace);
 const tools=join(root,'tools');mkdirSync(tools);
 for(const command of ['rg','go','gofmt','golangci-lint'])writeFileSync(join(tools,command),'#!/bin/sh\nexit 0\n',{mode:0o755});
 const pi=join(root,'pi');writeFileSync(pi,`#!${process.execPath}\nconsole.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));\n`,{mode:0o755});
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('FACTORY_')&&!key.startsWith('PI_')&&!key.startsWith('AGENT_')));
 for(const agent of ['architect','architecture_reviewer','coder_golang','code_reviewer_golang']){
  const start=fileURLToPath(new URL('../agents/'+agent+'/start.sh',import.meta.url));
  const result=spawnSync(start,['--workspace',workspace,'-p','A request with spaces'],{cwd:root,env:{...env,PATH:tools+':'+env.PATH,AGENT_EXECUTABLE:pi,FACTORY_AGENT_RUNTIME_DIR:join(root,'profiles')},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout);
  assert.equal(output.cwd,realpathSync(workspace));assert.ok(!output.args.includes('--workspace'));
  assert.deepEqual(output.args.slice(-2),['-p','A request with spaces']);
 }
});

test('managed Pi roles reuse the prepared profile without changing workspace selection',t=>{
 const root=mkdtempSync(join(tmpdir(),'managed-profile-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const workspace=join(root,'workspace');mkdirSync(workspace);
 const profile=join(root,'prepared');mkdirSync(profile);
 writeFileSync(join(profile,'settings.json'),JSON.stringify({defaultProvider:'prepared-provider',defaultModel:'prepared-model'}));
 const tools=join(root,'tools');mkdirSync(tools);
 for(const command of ['rg','go','gofmt','golangci-lint'])writeFileSync(join(tools,command),'#!/bin/sh\nexit 0\n',{mode:0o755});
 const pi=join(root,'pi');writeFileSync(pi,`#!${process.execPath}\nconsole.log(JSON.stringify({cwd:process.cwd(),profile:process.env.PI_CODING_AGENT_DIR,args:process.argv.slice(2)}));\n`,{mode:0o755});
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('FACTORY_')&&!key.startsWith('PI_')&&!key.startsWith('AGENT_')));
 for(const agent of ['architect','architecture_reviewer','coder_golang','code_reviewer_golang','pair_writer']){
  const start=fileURLToPath(new URL('../agents/'+agent+'/start.sh',import.meta.url));
  const args=agent==='pair_writer' ? ['-p','Prepared launch'] : ['--workspace',workspace,'-p','Prepared launch'];
  const result=spawnSync(start,args,{cwd:agent==='pair_writer'?workspace:root,env:{...env,PATH:tools+':'+env.PATH,AGENT_EXECUTABLE:pi,FACTORY_RUNTIME_NAME:'pi',PI_CODING_AGENT_DIR:profile},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const output=JSON.parse(result.stdout);
  assert.equal(output.profile,profile);
  assert.equal(output.cwd,realpathSync(workspace));
  assert.ok(output.args.includes('--skill'));
 }
});
