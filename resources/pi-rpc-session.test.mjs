import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const moduleURL = file => pathToFileURL(join(import.meta.dirname, 'node_modules/@modelcontextprotocol/sdk/dist/esm', file)).href;

async function runSession(t, scenario, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'factory-pi-mcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const messages = [];
  const profile = join(root, 'profile');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(profile);
  writeFileSync(join(profile, 'mcp.json'), JSON.stringify({ mcpServers: { gopls: { command: 'gopls' } } }));
  const http = createServer(async (req, res) => {
    if (req.headers.authorization !== 'Bearer test-secret') { res.writeHead(401).end(); return; }
    const server = new McpServer({ name: 'fixture', version: '1' });
    const respond = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
    server.registerTool('read_messages', { inputSchema: z.object({ thread_id: z.string(), after: z.string().optional(), ack_through: z.string().optional(), limit: z.number().optional() }) }, async () => respond({ messages: [], cursor: '0', more: false, closed: false }));
    server.registerTool('wait_for_message', { inputSchema: z.object({ thread_id: z.string(), after: z.string().optional(), wait_seconds: z.number().optional(), limit: z.number().optional() }) }, async args => {
      await new Promise(resolve => setTimeout(resolve, 20));
      const selected = messages.filter(item => item.sequence > Number(args.after || 0));
      return respond({ messages: selected, cursor: String(selected.at(-1)?.sequence || args.after || 0), more: false, closed: false });
    });
    server.registerTool('send_message', { inputSchema: z.object({ operation_id: z.string(), thread_id: z.string(), payload: z.any() }) }, async args => {
      messages.push({ id: 'accepted-result', sequence: messages.length + 1, sender: 'worker', sender_name: 'worker', payload: args.payload });
      return respond({ message_id: 'accepted-result', state: 'stored', effect: { state: 'accepted' } });
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    res.on('close', () => { transport.close(); server.close(); });
    await transport.handleRequest(req, res);
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => { http.closeAllConnections(); http.close(); });
  const url = `http://127.0.0.1:${http.address().port}/mcp`;
  const fake = join(root, 'fake-pi.mjs');
  writeFileSync(fake, `#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { Client } from '${moduleURL('client/index.js')}';
import { StreamableHTTPClientTransport } from '${moduleURL('client/streamableHttp.js')}';
const client = new Client({name:'fake-pi',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.FACTORY_MCP_URL),{requestInit:{headers:{Authorization:'Bearer '+process.env.FACTORY_MCP_TOKEN}}}));
let turns=0;
for await (const line of createInterface({input:process.stdin})) {
  turns++;
  const request=JSON.parse(line);
  console.log(JSON.stringify({type:'response',command:'prompt',success:true,id:request.id}));
  console.log(JSON.stringify({type:'tool_execution_start',input:request.message,mode:request.streamingBehavior || 'initial'}));
  const scenario=${JSON.stringify(scenario)};
  if(scenario==='exhausted' || scenario==='no-recovery' || (scenario==='recover' && turns===1)) {
    console.log(JSON.stringify({type:'message_end',message:{role:'assistant',stopReason:'length',usage:{output:16384}}}));
  } else if(scenario==='error' || scenario==='aborted') {
    console.log(JSON.stringify({type:'message_end',message:{role:'assistant',stopReason:scenario,errorMessage:'fixture model failure'}}));
  }
  if((scenario==='peer' && request.message.startsWith('Factory thread message')) || (scenario==='recover' && turns===2)) {
    const result=await client.callTool({name:'send_message',arguments:{operation_id:'final',thread_id:'thread',payload:{kind:'step_result',version:1,parts:[{kind:'data',data:{outcome:'ready',summary:'done'}}]}}});
    if(result.isError) process.exit(2);
  }
  console.log(JSON.stringify({type:'agent_settled'}));
}
await client.close();
`, { mode: 0o700 });
  const promptPath = join(root, 'prompt.md');
  writeFileSync(promptPath, 'initial work');
  const args = options.promptFile ? [] : ['-p', 'initial work'];
  const child = spawn(process.execPath, [join(import.meta.dirname, 'pi-rpc-session.mjs'), ...args], {
    env: { ...process.env, ...(options.promptFile ? { FACTORY_PROMPT_PATH: promptPath } : {}), AGENT_EXECUTABLE: fake, PI_CODING_AGENT_DIR: profile, FACTORY_MCP_URL: url, FACTORY_MCP_TOKEN: 'test-secret', FACTORY_THREAD_ID: 'thread', FACTORY_PARTICIPANT_ID: 'worker', FACTORY_COMMS_SKILL: root, FACTORY_PI_CONTINUATION_LIMIT: scenario === 'no-recovery' ? '0' : '2' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => child.kill('SIGKILL'));
  let output = '', error = '', injected = false;
  child.stdout.on('data', chunk => {
    output += chunk;
    if (scenario === 'peer' && !injected && output.includes('"type":"agent_settled"')) {
      injected = true;
      child.stdin.write('operator feedback\n');
      messages.push({ id: 'peer-review', sequence: 1, sender: 'reviewer', sender_name: 'reviewer', payload: { kind: 'message', version: 1, parts: [{ kind: 'text', text: 'Review findings' }] } });
    }
  });
  child.stderr.on('data', chunk => { error += chunk; });
  const code = await new Promise(resolve => child.on('close', resolve));
  const records = output.trim().split('\n').map(JSON.parse);
  const turns = records.filter(item => item.type === 'tool_execution_start');
  if (scenario === 'peer' || scenario === 'recover') {
    assert.equal(code, 0, error);
    assert(messages.some(item => item.id === 'accepted-result'));
  } else {
    assert.equal(code, 1, error);
    assert.match(error, /Factory agent blocked:/);
  }
  if (scenario === 'peer') {
    assert(records.some(item => item.input?.startsWith('initial work')));
    assert(records.some(item => item.input === 'operator feedback'));
    assert(records.some(item => item.input?.includes('peer-review')));
    assert.doesNotMatch(error, /recovery|blocked/);
  } else if (scenario === 'recover') {
    assert.equal(turns.length, 2);
    assert.match(error, /continuation 1\/2/);
    assert.match(turns[1].input, /preceding response was truncated/);
    assert.equal(turns[1].mode, 'initial');
  } else if (scenario === 'exhausted') {
    assert.equal(turns.length, 3, 'initial turn plus exactly two continuations');
    assert.match(error, /continuation limit 2 exhausted/);
  } else if (scenario === 'no-recovery') {
    assert.equal(turns.length, 1);
    assert.match(error, /continuation limit 0 exhausted/);
  } else {
    assert.equal(turns.length, 1, 'model errors must not become silent waiting or unbounded retries');
    assert.match(error, new RegExp('stopReason=' + scenario));
    assert.match(error, /fixture model failure/);
  }
  const config = JSON.parse(readFileSync(join(profile, 'mcp.json')));
  assert.equal(config.mcpServers.gopls.command, 'gopls');
  assert.equal(config.mcpServers.factory.headers.Authorization, 'Bearer ${FACTORY_MCP_TOKEN}');
  assert(!readFileSync(join(profile, 'mcp.json'), 'utf8').includes('test-secret'));
  assert.equal(config.mcpServers.factory.toolExposure.wait_for_message, 'hidden');
  if (process.env.PI_SKILL_LOADER) {
    const { validateMcpServerConfig, getMcpToolExposure } = await import(pathToFileURL(process.env.PI_SKILL_LOADER.replace(/skills\.js$/, 'mcp-servers.js')).href);
    const native = validateMcpServerConfig('factory', config.mcpServers.factory);
    assert.equal(typeof native, 'object', String(native));
    for (const name of ['list_participants', 'send_message', 'read_messages']) assert.equal(getMcpToolExposure(native, name), 'direct');
    assert.equal(getMcpToolExposure(native, 'wait_for_message'), 'hidden');
    assert.equal(getMcpToolExposure(native, 'create_thread'), 'codemode');
  }
  for (const tool of ['list_participants','send_message','read_messages']) assert.equal(config.mcpServers.factory.toolExposure[tool], 'direct');
}

for (const [scenario, description] of Object.entries({
  peer: 'idle Pi stays available, receives peer input, and finishes through MCP',
  recover: 'truncated response continues and completes through MCP',
  'no-recovery': 'zero continuation budget blocks on first truncation',
  exhausted: 'repeated truncation ends visibly after bounded continuations',
  error: 'provider error ends the session visibly',
  aborted: 'aborted model turn does not silently wait',
})) {
  test(description, { timeout: 15000 }, t => runSession(t, scenario));
}

test("managed Pi package reads its Factory prompt file without Pi-specific factory arguments", async t => { await runSession(t, "recover", { promptFile: true }); });
