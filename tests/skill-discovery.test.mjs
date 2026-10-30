import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = fileURLToPath(new URL('../skills/', import.meta.url));
const names = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

test('every canonical skill declares discovery metadata', () => {
  for (const name of names) {
    const text = readFileSync(`${directory}/${name}/SKILL.md`, 'utf8');
    const metadata = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
    assert(metadata, `${name}: missing frontmatter`);
    assert.match(metadata, new RegExp(`^name: ${name}$`, 'm'), name);
    assert.match(metadata, /^description: \S.+$/m, `${name}: missing description`);
  }
});

test('installed Pi discovers every canonical skill without diagnostics', { skip: !process.env.PI_SKILL_LOADER }, async () => {
  const { loadSkillsFromDir } = await import(pathToFileURL(process.env.PI_SKILL_LOADER).href);
  const loaded = loadSkillsFromDir({ dir: directory, source: 'test' });
  assert.deepEqual(loaded.diagnostics, []);
  assert.deepEqual(loaded.skills.map(skill => skill.name).sort(), names);
});
