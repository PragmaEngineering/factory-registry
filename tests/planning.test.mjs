import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const documents = ['skills/author-spec/assets/spec.html', 'skills/author-plan/assets/plan.html', ...['small', 'service'].flatMap(example => ['spec', 'plan'].map(kind => `skills/author-${kind}/examples/${example}/${kind}.html`))];

function files(directory, suffix) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file, suffix) : file.endsWith(suffix) ? [file] : [];
  });
}

test('generated templates and examples match their shared sources', () => {
  const result = spawnSync(process.execPath, ['skills/author-spec/scripts/build-templates.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const styles = read('skills/author-spec/assets/document.css').trimEnd();
  for (const file of documents) assert.ok(read(file).includes(`<style>\n${styles}\n</style>`), file);
});

test('documents have unique anchors, navigable sections, accessible tables, and no rendering dependencies', () => {
  for (const file of documents) {
    const html = read(file);
    assert.ok(!/<script\b|<link\b|@import\b/i.test(html), file);
    assert.ok(!/\b(?:src|href)=["']https?:/i.test(html), file);
    for (const [, target] of html.matchAll(/url\(([^)]+)\)/g)) assert.ok(target.startsWith("#"), `${file}: external rendering resource`);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate IDs`);
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor), `${file}: missing ${anchor}`);
    for (const [, label] of html.matchAll(/<th scope="([^"]+)"/g)) assert.equal(label, 'col');
    const sections = [...html.matchAll(/<section id="([^"]+)"/g)].map(match => match[1]);
    for (const id of sections) assert.ok(html.includes(`href="#${id}"`), `${file}: unlinked section ${id}`);
    const sibling = /href="([^"#]*(?:spec|plan)\.html)"/.exec(html);
    assert.ok(sibling, file);
    assert.ok(fs.existsSync(path.join(path.dirname(path.join(root, file)), sibling[1])) || file.startsWith('skills/'), file);
  }
});

test('shared references and agent role links resolve from their source locations', () => {
  const markdown = [path.join(root, 'README.md'), path.join(root, 'agents/README.md'), ...files(path.join(root, 'skills'), '.md'), ...['architect', 'architecture_reviewer', 'coder_golang', 'code_reviewer_golang', 'pair_writer'].map(name => path.join(root, 'agents', name, 'agent.md'))];
  for (const file of markdown) {
    for (const [, target] of fs.readFileSync(file, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), target.split('#')[0])), `${file}: ${target}`);
    }
  }
});

test('example acceptance references in plans resolve to their spec criteria', () => {
  for (const example of ['small', 'service']) {
    const spec = read(`skills/author-spec/examples/${example}/spec.html`);
    const plan = read(`skills/author-plan/examples/${example}/plan.html`);
    const criteria = new Set(spec.match(/AC-\d{3}/g));
    for (const id of plan.match(/AC-\d{3}/g)) assert.ok(criteria.has(id), `${example}: unknown ${id}`);
  }
});

test('agent entrypoints actually pass their canonical skill paths and native profile to Pi', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-agent-loading-'));
  try {
    for (const command of ['rg', 'go', 'gofmt', 'golangci-lint', 'gopls']) fs.writeFileSync(path.join(temp, command), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    const executable = path.join(temp, 'fake-pi');
    fs.writeFileSync(executable, `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' '${path.join(temp, 'capture.cjs')}' "$@"\n`, { mode: 0o700 });
    fs.writeFileSync(path.join(temp, 'capture.cjs'), `console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),profile:process.env.PI_CODING_AGENT_DIR}));`);
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(FACTORY_|AGENT_|PI_)/.test(name)));
    for (const [agent, required] of Object.entries({ architect: ['author-spec', 'author-plan'], architecture_reviewer: ['review-spec', 'review-plan'], coder_golang: ['follow-plan'], code_reviewer_golang: ['go-code-quality', 'critical-code-review'], pair_writer: ['technical-writing', 'business-writing'] })) {
      const result = spawnSync(path.join(root, 'agents', agent, 'start.sh'), ['-p', 'Loading check only'], { cwd: temp, env: { ...env, PATH: temp + path.delimiter + env.PATH, AGENT_EXECUTABLE: executable, FACTORY_AGENT_RUNTIME_DIR: path.join(temp, 'profiles') }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const actual = JSON.parse(result.stdout);
      assert.equal(actual.cwd, fs.realpathSync(temp));
      const selected = actual.args.flatMap((value, i) => value === '--skill' ? [actual.args[i + 1]] : []);
      for (const name of required) assert.ok(selected.includes(fs.realpathSync(path.join(root, 'skills', name))), `${agent}: ${name}`);
      for (const skill of fs.readdirSync(path.join(root, 'agents', agent, 'skills'))) assert.ok(selected.includes(fs.realpathSync(path.join(root, 'agents', agent, 'skills', skill))), `${agent}: missing linked ${skill}`);
      const profile = JSON.parse(fs.readFileSync(path.join(actual.profile, 'settings.json'), 'utf8'));
      const native = JSON.parse(read(`agents/${agent}/pi/settings.json`));
      assert.deepEqual(profile, native);
      assert.ok(!selected.some(file => /spec-and-plan|architecture-challenge/.test(file)));
      assert.deepEqual(actual.args.slice(-2), ['-p', 'Loading check only']);
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
