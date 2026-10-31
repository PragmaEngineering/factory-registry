// Minimal runner-neutral completion client. Packages still own their work;
// this helper only discovers the controller and submits the common MCP result.
import { fileURLToPath } from 'node:url';

export async function withController(environment, run) {
  let Client, StreamableHTTPClientTransport;
  try {
    ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
    ({ StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js'));
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    throw new Error(`Factory MCP dependency missing; run npm ci --prefix "${fileURLToPath(new URL('.', import.meta.url))}"`);
  }
  const client = new Client({ name: 'factory-package', version: '0.1.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(environment.FACTORY_MCP_URL), {
      requestInit: { headers: { Authorization: `Bearer ${environment.FACTORY_MCP_TOKEN}` } },
    }));
    const participants = await tool(client, 'list_participants', { thread_id: environment.FACTORY_THREAD_ID });
    const controllers = participants.participants?.filter(participant => participant.kind === 'controller');
    if (controllers?.length !== 1) throw new Error('Assigned thread must have one controller');
    return await run(async result => {
      const receipt = await tool(client, 'send_message', {
        operation_id: `${environment.FACTORY_PARTICIPANT_ID}:result`,
        thread_id: environment.FACTORY_THREAD_ID, recipients: [controllers[0].id],
        payload: { kind: 'step_result', version: 1, parts: [{ kind: 'data', data: result }] },
      });
      if (receipt.effect?.state !== 'accepted') throw new Error('Controller did not accept the package result');
      return receipt;
    });
  } finally { await client.close(); }
}

async function tool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  // Do not print server responses that may contain supplied task data.
  if (result.isError) throw new Error(`Factory MCP ${name} rejected the request; inspect the execution messages`);
  if (result.structuredContent) return result.structuredContent;
  return JSON.parse(result.content.find(part => part.type === 'text')?.text ?? '{}');
}
