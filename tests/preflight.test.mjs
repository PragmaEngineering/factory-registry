import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkTools, findCommand } from '../agents/scripts/preflight.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'agent tools '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const tool = name => { const file = join(root, name); writeFileSync(file, '#!/bin/sh\nexit 0\n', { mode: 0o700 }); return file; };
  return { root, tool };
}

test('preflight finds executable paths with spaces and rejects directories or nonexecutables', t => {
  const { root, tool } = fixture(t);
  const executable = tool('a tool');
  mkdirSync(join(root, 'directory'));
  writeFileSync(join(root, 'not-executable'), '');
  assert.equal(findCommand('a tool', { PATH: root }), executable);
  assert.equal(findCommand('./a tool', {}, root), executable);
  assert.equal(findCommand('directory', { PATH: root }), undefined);
  assert.equal(findCommand('not-executable', { PATH: root }), undefined);
});

test('preflight checks enabled MCP command environments and ignores disabled and HTTP servers', t => {
  const { root, tool } = fixture(t);
  const pi = tool('pi');
  tool('custom-mcp');
  writeFileSync(join(root, 'mcp.json'), JSON.stringify({ mcpServers: {
    custom: { command: './custom-mcp', cwd: root },
    path: { command: 'custom-mcp', env: { PATH: root } },
    disabled: { command: 'missing-disabled', enabled: false },
    remote: { url: 'http://localhost/mcp' },
    missing: { command: 'missing-mcp' },
  } }));
  assert.deepEqual(checkTools({ executable: pi, profile: root, required: ['rg'] }, { PATH: '' }), ['required command: rg', 'MCP missing: missing-mcp']);
});

test('CLI fails before launching an agent when prerequisites are missing', t => {
  const { root, tool } = fixture(t);
  const pi = tool('pi');
  const result = spawnSync(process.execPath, [join(import.meta.dirname, '../agents/scripts/preflight.mjs'), '--agent', pi, '--require', 'missing-command'], { env: { PATH: root }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /required command: missing-command/);
  assert.match(result.stderr, /No tools were downloaded/);
});

test('Go launcher preflights supplied profiles and preserves explicit toolchain configuration', t => {
  const { root, tool } = fixture(t);
  for (const command of ['rg', 'go', 'gofmt', 'golangci-lint']) tool(command);
  const fake = join(root, 'fake-pi');
  writeFileSync(fake, `#!/bin/sh\nprintf '%s' "$GOTOOLCHAIN"\n`, { mode: 0o700 });
  symlinkSync(process.execPath, join(root, 'node'));
  const instructions = join(root, 'instructions.md');
  writeFileSync(instructions, 'Role');
  const profile = join(root, 'profile'); mkdirSync(profile);
  const run = extra => spawnSync('/bin/sh', [join(import.meta.dirname, '../agents/coder_golang/start.sh')], { encoding: 'utf8', env: { PATH: `${root}:/usr/bin:/bin`, AGENT_EXECUTABLE: fake, AGENT_INSTRUCTIONS_FILE: instructions, PI_CODING_AGENT_DIR: profile, ...extra } });
  const local = run({});
  assert.equal(local.status, 0, local.stderr);
  assert.equal(local.stdout, 'local');
  assert.equal(run({ GOTOOLCHAIN: 'custom' }).stdout, 'custom');
  writeFileSync(join(profile, 'mcp.json'), JSON.stringify({ mcpServers: { broken: { command: 'missing-server' } } }));
  const failure = run({});
  assert.equal(failure.status, 1);
  assert.equal(failure.stdout, '');
  assert.match(failure.stderr, /MCP broken: missing-server/);
});
