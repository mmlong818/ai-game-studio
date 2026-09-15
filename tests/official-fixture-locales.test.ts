import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fixtures = ['arrow-escape', 'arrow-cube-3d', 'freecell', 'island-kart', 'meadow-railway', 'endless-match3', 'star-dream-duel'];

test('official game fixtures implement the four-locale query and trusted live-update contract', async () => {
  for (const fixture of fixtures) {
    let source = await readFile(new URL(`../fixtures/${fixture}/app.js`, import.meta.url), 'utf8');
    try { source += await readFile(new URL(`../fixtures/${fixture}/i18n.js`, import.meta.url), 'utf8'); } catch { /* Most fixtures keep the small dictionary in app.js. */ }
    for (const locale of ['zh-CN', 'zh-TW', 'en', 'ja']) {
      const localeDefinition = locale.includes('-')
        ? new RegExp(`['"]${locale}['"]`)
        : new RegExp(`(?:['"]${locale}['"]|\\b${locale}\\s*:)`);
      assert.match(source, localeDefinition, `${fixture} is missing ${locale}`);
    }
    assert.match(source, /URLSearchParams\(location\.search\).*['"]lang['"]/s, `${fixture} does not read lang from the URL`);
    assert.match(source, /document\.documentElement\.lang\s*=/, `${fixture} does not update the document language`);
    assert.match(source, /forge:locale/, `${fixture} does not handle live locale updates`);
    assert.match(source, /event\.source\s*!==\s*(?:window\.)?parent/, `${fixture} does not verify the message source`);
    assert.match(source, /event\.origin\s*!==/, `${fixture} does not verify the message origin`);
    assert.match(source, /document\.referrer/, `${fixture} does not derive the trusted parent origin`);
  }
});
