import test from 'node:test';
import assert from 'node:assert/strict';
import { telemetry } from './telemetry.mjs';

test('only final assistant usage is counted, with cache categories separate', () => {
 const message = { role: 'assistant', usage: { input: 13, cacheRead: 70, cacheWrite: 5, output: 12, cost: { total: 0 } } };
 assert.equal(telemetry({type:'message_update',message}), undefined);
 const event = telemetry({type:'message_end',message});
 assert.deepEqual(event.tokens, {input:13,cache_read:70,cache_write:5,output:12});
 assert.equal(event.cost_usd,undefined);
 message.usage.cost.total=0.01;
 assert.equal(telemetry({type:'message_end',message}).cost_usd,0.01);
 message.usage.input=-1;
 assert.equal(telemetry({type:'message_end',message}),undefined);
});
test('tools carry correlation IDs, command and actual failure state', () => {
 assert.deepEqual(telemetry({type:'tool_execution_start',toolCallId:'a',toolName:'bash',args:{command:'go test ./...'}}),{kind:'tool_started',tool_id:'a',command:'go test ./...'});
 assert.deepEqual(telemetry({type:'tool_execution_end',toolCallId:'a',isError:true}),{kind:'tool_finished',tool_id:'a',failed:true});
});
