#!/usr/bin/env node
// Native Pi RPC supervision plus MCP delivery. Domain skills do not implement
// workflow routing; this adapter only configures the connection and moves input.
import { spawn } from 'node:child_process';
import { telemetry } from './telemetry.mjs';
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
let Client, StreamableHTTPClientTransport;
try {
  ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
  ({ StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  console.error(`Factory MCP runtime dependency is missing. Run: npm ci --prefix "${fileURLToPath(new URL('.', import.meta.url))}"`);
  process.exit(2);
}

const argv = process.argv.slice(2);
if (!argv.includes('-p') && process.env.FACTORY_PROMPT_PATH) argv.push('-p', readFileSync(process.env.FACTORY_PROMPT_PATH, 'utf8'));
const promptFlag = argv.indexOf('-p');
if (promptFlag < 0 || promptFlag + 1 >= argv.length || !process.env.FACTORY_MCP_URL || !process.env.FACTORY_MCP_TOKEN) {
  console.error('Factory Pi adapter requires -p PROMPT and a provisioned MCP connection');
  process.exit(2);
}
let prompt = argv[promptFlag + 1];
argv.splice(promptFlag, 2);
const environment = { ...process.env };
const profile = environment.PI_CODING_AGENT_DIR;
if (!profile) {
  console.error('Factory Pi adapter requires a private PI_CODING_AGENT_DIR');
  process.exit(2);
}
mkdirSync(profile, { recursive: true });
const configPath = join(profile, 'mcp.json');
let config = {};
try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
config.mcpServers = { ...config.mcpServers, factory: {
  url: environment.FACTORY_MCP_URL,
  headers: { Authorization: 'Bearer ${FACTORY_MCP_TOKEN}' },
  description: 'Assigned Factory conversation and control-plane communication',
  exposure: 'codemode', toolExposure: { list_participants: 'direct', send_message: 'direct', read_messages: 'direct', wait_for_message: 'hidden' }, enabled: true,
} };
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
if (environment.FACTORY_COMMS_SKILL) argv.push('--skill', environment.FACTORY_COMMS_SKILL);
prompt += `\n\nFactory connection: thread ${environment.FACTORY_THREAD_ID}; your participant ID is ${environment.FACTORY_PARTICIPANT_ID}. Automatic MCP message delivery is active. Use the factory MCP tools and loaded control-plane-comms skill. Final completion requires send_message with a step_result and effect.state=accepted. When waiting for a peer, end your turn with a short waiting status. The runtime keeps your session open and wakes it on messages; do not poll or wait using tools or shell loops.\n`;

const client = new Client({ name: 'factory-pi-delivery', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(environment.FACTORY_MCP_URL), {
  requestInit: { headers: { Authorization: `Bearer ${environment.FACTORY_MCP_TOKEN}` } },
}));
const child = spawn(environment.AGENT_EXECUTABLE || 'pi', [...argv, '--mode', 'rpc'], { stdio: ['pipe', 'pipe', 'inherit'], env: environment });
let busy = false;
let completed = false;
let stopping = false;
let lastAssistantStop;
let continuations = 0;
const continuationLimit = Number(environment.FACTORY_PI_CONTINUATION_LIMIT ?? 2);
if (!Number.isInteger(continuationLimit) || continuationLimit < 0 || continuationLimit > 10) {
  console.error('FACTORY_PI_CONTINUATION_LIMIT must be an integer between 0 and 10');
  child.kill('SIGTERM');
  process.exit(2);
}
const failSession = reason => {
  if (stopping) return;
  stopping = true;
  console.error(`Factory agent blocked: ${reason}`);
  child.kill('SIGTERM');
};
let telemetrySequence = 0;
let buffer = Buffer.alloc(0);
let nextID = 0;
const pending = new Map();
const send = (message, steer = busy) => new Promise((resolve, reject) => {
  if (child.stdin.destroyed) { reject(new Error('Pi input is closed')); return; }
  const id = `factory-${++nextID}`;
  pending.set(id, { resolve, reject });
  child.stdin.write(JSON.stringify({ id, type: 'prompt', message, ...(steer ? { streamingBehavior: 'steer' } : {}) }) + '\n');
  if (!busy) lastAssistantStop = undefined;
  busy = true;
});
const finish = () => { if (completed && !busy && !child.stdin.destroyed) child.stdin.end(); };
child.stdout.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const end = buffer.indexOf(10);
    if (end < 0) break;
    const line = buffer.subarray(0, end + 1);
    buffer = buffer.subarray(end + 1);
    process.stdout.write(line);
    try {
      const record = JSON.parse(line.toString('utf8'));
      const metric = telemetry(record);
      if (metric) process.stdout.write(JSON.stringify({ type: 'factory.telemetry.v1', sequence: ++telemetrySequence, ...metric }) + '\n');
      if (record.type === 'response' && record.command === 'prompt' && pending.has(record.id)) {
        const waiter = pending.get(record.id); pending.delete(record.id);
        if (record.success === false) waiter.reject(new Error(record.error || 'Pi rejected input')); else waiter.resolve();
      }
      if (record.type === 'message_end' && record.message?.role === 'assistant') {
        lastAssistantStop = { reason: record.message.stopReason, error: record.message.errorMessage };
      }
      if (record.type === 'agent_settled') {
        busy = false;
        if (!completed && !stopping && lastAssistantStop?.reason === 'length') {
          if (continuations >= continuationLimit) {
            failSession(`model response truncated (stopReason=length); continuation limit ${continuationLimit} exhausted`);
          } else {
            continuations++;
            console.error(`Factory agent recovery: model response truncated (stopReason=length); continuation ${continuations}/${continuationLimit}`);
            send('Your preceding response was truncated by the model output limit. Continue from completed work. Do not repeat the analysis or redesign the presentation. Take the next concrete action using tools, save incremental work, and publish it when ready. If blocked, report the actual blocker through Factory MCP.', false).catch(error => failSession(`continuation failed: ${error.message}`));
          }
        } else if (!completed && !stopping && ['error', 'aborted'].includes(lastAssistantStop?.reason)) {
          failSession(`model response ended with stopReason=${lastAssistantStop.reason}${lastAssistantStop.error ? ': ' + lastAssistantStop.error : ''}`);
        } else {
          finish();
        }
      }
    } catch { /* Preserve non-JSON output for diagnosis. */ }
  }
});
child.on('error', error => { console.error(`Pi session: ${error.message}`); process.exitCode = 1; });
const operatorInput = createInterface({ input: process.stdin, crlfDelay: Infinity });
operatorInput.on('line', line => { if (line.trim()) send(line).catch(error => console.error(`Operator delivery: ${error.message}`)); });
child.on('close', code => {
  stopping = true;
  operatorInput.close(); process.stdin.pause();
  if (buffer.length) process.stdout.write(buffer);
  for (const waiter of pending.values()) waiter.reject(new Error('Pi session ended')); pending.clear();
  client.close().catch(() => {});
  process.exitCode = code || (completed ? 0 : 1);
});
process.on('SIGTERM', () => { stopping = true; child.kill('SIGTERM'); });
process.on('SIGINT', () => { stopping = true; child.kill('SIGINT'); });
await send(prompt, false);

// Read acknowledgment follows successful handoff to Pi. Retries retain the
// cursor; a timed-out read does not consume a message or alter workflow state.
async function tool(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error('Factory communication call was rejected');
  return result.structuredContent ?? JSON.parse(result.content.find(item => item.type === 'text').text);
}
let cursor = '';
let acknowledgment = '';
let failures = 0;
while (!stopping && !completed) {
  try {
    if (acknowledgment) {
      await tool('read_messages', { thread_id: environment.FACTORY_THREAD_ID, after: cursor, ack_through: acknowledgment, limit: 1 });
      acknowledgment = '';
    }
    const batch = await tool('wait_for_message', { thread_id: environment.FACTORY_THREAD_ID, after: cursor, wait_seconds: 20, limit: 50 });
    if (batch.closed) { stopping = true; child.kill('SIGTERM'); break; }
    for (const message of batch.messages) {
      if (message.sender === environment.FACTORY_PARTICIPANT_ID) {
        if (message.payload.kind === 'step_result') { completed = true; finish(); }
        continue;
      }
      await send(`Factory thread message ${message.id} from ${message.sender_name} (${message.sender}):\n${JSON.stringify(message.payload)}\nReply through the Factory MCP tools when needed.`);
    }
    cursor = batch.cursor; acknowledgment = cursor; failures = 0;
  } catch {
    if (stopping || completed) break;
    if (++failures >= 5) {
      console.error('Factory message delivery unavailable after five attempts; ending the session for visible recovery.');
      child.kill('SIGTERM'); break;
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** failures, 10000)));
  }
}
