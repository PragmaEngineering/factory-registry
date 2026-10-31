import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bodyOf, readDocument, render } from '../skills/author-spec/scripts/document.mjs';

const body = '<section id="scope"><h2>Scope</h2><p>AC-001: observable behavior</p></section>';

test('render preserves canonical offline presentation while reading returns content only', () => {
  const html = render('spec', body, { title: '<change & "title">', revision: '2', 'companion-revision': '1' });
  const styles = readFileSync(join(import.meta.dirname, '../skills/author-spec/assets/document.css'), 'utf8').trimEnd();
  assert.ok(html.includes(styles));
  assert.ok(html.includes('href="#scope"'));
  assert.ok(html.includes('&lt;change &amp; &quot;title&quot;&gt;'));
  assert.ok(html.includes('href="plan.html"'));
  assert.equal(bodyOf(html), body);
  const readable = readDocument(html);
  assert.ok(readable.includes('<dt>Revision</dt><dd>2</dd>'));
  assert.ok(!readable.includes(styles));
  const revised = render('spec', body.replace('observable', 'revised'), { title: 'Change', revision: '3' });
  assert.ok(revised.includes(styles));
  assert.ok(!bodyOf(revised).includes('<style>'));
});

test('renderer rejects shell injection, duplicate section IDs, and missing sections', () => {
  assert.throws(() => render('spec', body + body, { title: 'x' }), /unique/);
  assert.throws(() => render('spec', body + '<script>alert(1)</script>', { title: 'x' }), /content sections only/);
  assert.throws(() => render('spec', '<p>Unstructured</p>', { title: 'x' }), /named sections/);
  assert.throws(() => bodyOf('not a document'), /standard planning document/);
});

test('author skill CLI works from an unrelated directory without model or network access', t => {
  const root = mkdtempSync(join(tmpdir(), 'planning content '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'body.html');
  writeFileSync(source, body);
  for (const kind of ['spec', 'plan']) {
    const output = join(root, `${kind}.html`);
    const script = join(import.meta.dirname, `../skills/author-${kind}/scripts/document.mjs`);
    const result = spawnSync(process.execPath, [script, 'render', kind, '--body', source, '--output', output, '--title', 'A small change'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const read = spawnSync(process.execPath, [script, 'read', output], { cwd: root, encoding: 'utf8' });
    assert.equal(read.status, 0, read.stderr);
    assert.ok(read.stdout.trim().endsWith(body));
    assert.ok(read.stdout.includes('<dt>Revision</dt><dd>1</dd>'));
    assert.ok(!read.stdout.includes('<style>'));
  }
});
