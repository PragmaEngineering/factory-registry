import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { configuration, buildRequest, evaluate, validateResponse, usageEvent } from '../classifications/task-readiness/evaluate.mjs';

const questions = JSON.parse(await readFile(new URL('../classifications/task-readiness/questions.json', import.meta.url), 'utf8'));
function response() {
  return {
    model: 'typesafe/jev-1.14-snapshot', provider: 'TypeSafe',
    answers: {
      task_type: { type: 'choice', choice: 'investigation', probabilities: { investigation: 0.95, implementation: 0.02, follow_up: 0.01, other: 0.02 }, confidence: 0.93 },
      readiness: { type: 'choice', choice: 'clarify', probabilities: { accept: 0.12, clarify: 0.85, pass_through: 0.03 }, confidence: 0.76 },
      missing_target: { type: 'noul', noul: 0.91 },
    },
    usage: { input_tokens: 476, output_tokens: 70, cost: 0.000019992 },
  };
}

test('readiness preserves request and response without interpreting clarify as failure', async () => {
  const config = await configuration();
  const task = { brief: 'Investigate why the gateway is slow.', documents: [] };
  const answer = response();
  const pair = await evaluate(task, config, 'fixture-provider-secret', async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(options.headers.Authorization, 'Bearer fixture-provider-secret');
    const request = JSON.parse(options.body);
    assert.equal(request.state.user_message, task.brief);
    assert.deepEqual(request.questions, questions);
    return new Response(JSON.stringify(answer));
  });
  assert.deepEqual(pair.response, answer);
  assert.deepEqual(pair.request.questions, questions);
  assert.equal(pair.response.answers.readiness.choice, 'clarify');
  assert.equal(usageEvent(answer).tokens.input, 476);
  assert.equal(usageEvent(answer).tokens.output, 70);
  assert.equal(usageEvent(answer).cost_usd, answer.usage.cost);
  assert.equal(usageEvent({ ...answer, usage: undefined }), undefined);
  assert.ok(!JSON.stringify(pair).includes('fixture-provider-secret'));
});

test('invalid labels, missing answers, probabilities and provider errors cannot pass', async () => {
  const config = await configuration();
  for (const alter of [
    value => { value.answers.readiness.choice = 'invented'; },
    value => { delete value.answers.missing_target; },
    value => { value.answers.readiness.probabilities.clarify = 2; },
    value => { value.answers.readiness.probabilities = { accept: 0.1, clarify: 0.1, pass_through: 0.1 }; },
    value => { value.answers.missing_target.noul = -0.1; },
  ]) {
    const bad = response(); alter(bad);
    assert.throws(() => validateResponse(bad, questions));
  }
  const task = { brief: 'A task', documents: [] };
  await assert.rejects(evaluate(task, config, '', () => assert.fail('must not call provider')), /Missing credential/);
  await assert.rejects(evaluate(task, config, 'fixture-secret', async () => new Response('private diagnostic', { status: 429 })), /HTTP 429/);
  await assert.rejects(evaluate(task, config, 'fixture-secret', async () => new Response('bad JSON')), /invalid.*JSON/);
  await assert.rejects(evaluate(task, config, 'fixture-secret', async () => new Response(JSON.stringify({ error: { message: 'rejected' } }))), /valid decision/);
  await assert.rejects(configuration({ temperature: 0 }), /Unknown.*temperature/);
  await assert.rejects(configuration({ endpoint: 'http://remote.example/decisions' }), /HTTPS/);
});

test('captured files are read with digest validation and never silently truncated', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'factory-readiness-input-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'brief.md'); const content = 'Investigate the p99 spike in /chat/completions.';
  await writeFile(path, content);
  const config = await configuration();
  const task = { brief: '', documents: [{ name: 'brief.md', uri: path, digest: createHash('sha256').update(content).digest('hex') }] };
  const request = await buildRequest(task, config); assert.equal(request.state.documents[0].content, content);
  await writeFile(path, 'Changed after capture');
  await assert.rejects(buildRequest(task, config), /digest changed/);
  await assert.rejects(buildRequest({ brief: 'x'.repeat(25000), documents: [] }, config), /byte limit/);
});

test('standalone classifier submits through MCP and reuses its saved evaluation on process recovery', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'factory-readiness-mcp-')); t.after(() => rm(directory, { recursive: true, force: true }));
  let providerCalls = 0; let providerStatus = 200; const submitted = []; let sentRequest;
  const http = createServer(async (req, res) => {
    if (req.url === '/decisions') {
      providerCalls++;
      assert.equal(req.headers.authorization, 'Bearer fixture-provider-secret');
      let raw = ''; for await (const chunk of req) raw += chunk;
      sentRequest = JSON.parse(raw);
      res.writeHead(providerStatus, { 'Content-Type': 'application/json' }).end(JSON.stringify(response()));
      return;
    }
    if (req.headers.authorization !== 'Bearer fixture-mcp-secret') { res.writeHead(401).end(); return; }
    const server = new McpServer({ name: 'fixture', version: '1' });
    const respond = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
    server.registerTool('list_participants', { inputSchema: z.object({ thread_id: z.string() }) }, async () => respond({ participants: [{ id: 'controller-uuid', kind: 'controller' }] }));
    server.registerTool('send_message', { inputSchema: z.object({ operation_id: z.string(), thread_id: z.string(), recipients: z.array(z.string()), payload: z.any() }) }, async args => {
      submitted.push(args); return respond({ effect: { state: 'accepted' } });
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    res.on('close', () => { transport.close(); server.close(); });
    await transport.handleRequest(req, res);
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => { http.closeAllConnections(); http.close(); });
  const origin = `http://127.0.0.1:${http.address().port}`;
  const inputPath = join(directory, 'inputs.json'); const configPath = join(directory, 'config.json');
  await writeFile(inputPath, JSON.stringify({ task: { brief: 'Investigate why the gateway is slow.', documents: [] } }));
  await writeFile(configPath, JSON.stringify({ endpoint: `${origin}/decisions` }));
  async function run(invocation) {
    await mkdir(invocation, { recursive: true });
    const child = spawn(fileURLToPath(new URL('../classifications/task-readiness/start.sh', import.meta.url)), [], {
      cwd: directory, env: { ...process.env, OPENROUTER_API_KEY: 'fixture-provider-secret', FACTORY_MCP_URL: `${origin}/mcp`, FACTORY_MCP_TOKEN: 'fixture-mcp-secret', FACTORY_THREAD_ID: 'thread', FACTORY_PARTICIPANT_ID: 'classifier', FACTORY_INPUTS_PATH: inputPath, FACTORY_PACKAGE_CONFIG: configPath, FACTORY_INVOCATION_DIR: invocation },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(() => child.kill());
    let stdout = '', stderr = ''; child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    return { code, stdout, stderr };
  }
  const invocation = join(directory, 'try-1');
  const first = await run(invocation); assert.equal(first.code, 0, first.stderr);
  assert.equal(submitted[0].payload.parts[0].data.outcome, 'completed');
  assert.deepEqual(submitted[0].recipients, ['controller-uuid']);
  assert.deepEqual(submitted[0].payload.parts[0].data.data.request, sentRequest);
  assert.deepEqual(submitted[0].payload.parts[0].data.data.response, response());
  assert.ok(!first.stdout.includes('fixture-provider-secret')); assert.ok(!first.stderr.includes('fixture-provider-secret'));
  const recovered = await run(invocation); assert.equal(recovered.code, 0, recovered.stderr); assert.equal(providerCalls, 1);
  assert.equal(submitted[0].operation_id, submitted[1].operation_id);
  assert.deepEqual(submitted[0].payload, submitted[1].payload);
  providerStatus = 401;
  const failed = await run(join(directory, 'try-2')); assert.equal(failed.code, 1); assert.match(failed.stderr, /HTTP 401/); assert.equal(submitted.length, 2);
});
