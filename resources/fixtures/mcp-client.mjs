// Opt-in Go/TypeScript SDK interoperability fixture. No model or Pi process.
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client = new Client({ name: 'interop', version: '1' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.FACTORY_TEST_MCP_URL), {
  requestInit: { headers: { Authorization: `Bearer ${process.env.FACTORY_TEST_MCP_TOKEN}` } },
}));
try {
  assert.equal((await client.listTools()).tools.length, 8);
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert(!result.isError, JSON.stringify(result.content));
    return result.structuredContent;
  };
  const thread_id = process.env.FACTORY_TEST_THREAD_ID;
  const listed = await call('list_participants', { thread_id });
  assert.equal(listed.participants.length, 4);
  const sent = await call('send_message', {
    operation_id: 'sdk-interop', thread_id,
    recipients: [process.env.FACTORY_TEST_PARTICIPANT_ID],
    payload: { kind: 'progress', version: 1, parts: [{ kind: 'data', data: { summary: 'SDK interoperability check' } }] },
  });
  assert.equal(sent.state, 'stored');
  const batch = await call('read_messages', { thread_id });
  assert(batch.messages.some(message => message.id === sent.message_id));
  console.log('TS_MCP_OK');
} finally { await client.close(); }
