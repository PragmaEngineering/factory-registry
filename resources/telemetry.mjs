// Translate completed Pi events into the runner-neutral host telemetry protocol.
// Streaming usage snapshots are intentionally excluded to prevent double counts.
export function telemetry(record) {
  if (record.type === 'message_end' && record.message?.role === 'assistant' && record.message.usage) {
    const { usage, provider, model } = record.message;
    const names = ['input', 'cacheRead', 'cacheWrite', 'output'];
    if (!names.every(name => Number.isSafeInteger(usage[name] ?? 0) && (usage[name] ?? 0) >= 0)) return;
    const event = { kind: 'usage', tokens: { input: usage.input ?? 0, cache_read: usage.cacheRead ?? 0, cache_write: usage.cacheWrite ?? 0, output: usage.output ?? 0 }, provider, model };
    // Some providers omit prices or Pi supplies zero-filled pricing. Zero is
    // ambiguous, so it must remain unknown rather than imply free inference.
    if (Number.isFinite(usage.cost?.total) && usage.cost.total > 0) event.cost_usd = usage.cost.total;
    return event;
  }
  if (record.type === 'tool_execution_start' && record.toolCallId) {
    const command = record.args?.command ?? `${record.toolName || 'tool'} ${JSON.stringify(record.args ?? {})}`;
    return { kind: 'tool_started', tool_id: record.toolCallId, command: String(command).slice(0, 2048) };
  }
  if (record.type === 'tool_execution_end' && record.toolCallId) return { kind: 'tool_finished', tool_id: record.toolCallId, failed: record.isError === true };
  if (record.type === 'agent_settled') return { kind: 'progress' };
}
