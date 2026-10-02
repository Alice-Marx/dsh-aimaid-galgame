import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('official installer gate accepts independent GAL on rc.1 and rc.2 without exemptions', () => {
  assert.equal(manifest.name, '@ljwei-stak/dsh-galgame')
  for (const [name, range] of Object.entries(manifest.peerDependencies)) {
    if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(range, '0.2.0-rc.1 || 0.2.0-rc.2')
  }
  for (const version of ['0.2.0-rc.1', '0.2.0-rc.2']) assert.equal(evaluatePluginCompatibility(manifest, {}, version), undefined)
})

test('unverified hosts remain rejected without version exemptions', () => {
  for (const version of ['0.1.7-rc.2', '0.2.0-rc.3', '0.2.0', '0.3.0']) {
    const result = evaluatePluginCompatibility(manifest, {}, version)
    assert.ok(result)
    assert.equal(result.exempted, false)
  }
})
