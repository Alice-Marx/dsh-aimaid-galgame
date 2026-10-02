import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createStory, advanceStory, currentStoryNode, normalizeStory, getStoryEpisode, STORY_EPISODES } from '../.dsh-plugin/shared/gal-story-catalog.mjs'
import { readStory, writeStory, readStorySlots, episodeStorageKey, selectedStoryEpisode, STORY_STORAGE_KEY } from '../.dsh-plugin/client/gal-story-storage.mjs'

const memory = () => {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('the installable catalog contains only the main saga and Old City Migration', () => {
  assert.deepEqual(STORY_EPISODES.map(item => item.id), ['echo-chronicle', 'legacy'])
  assert.equal(STORY_EPISODES[0].label, '回声之城·正篇')
  assert.equal(STORY_EPISODES[1].label, '旧城迁移篇：未写完的约定')
  assert.throws(() => createStory('bridges'), /未包含在当前核心插件中/)
  assert.throws(() => createStory('echo-city'), /未包含在当前核心插件中/)
  assert.throws(() => createStory('echo-spring'), /未包含在当前核心插件中/)
})

test('the npm manifest and core background map do not pull archived-story assets', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.files.some(file => /gal-story-(?:v2|echo\.mjs|spring\.mjs)|gal-spring|spring-portraits|spring-backgrounds|optional-stories/.test(file)), false)
  const backgrounds = readFileSync(new URL('../.dsh-plugin/client/gal-story-backgrounds.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(backgrounds, /kimi-rehearsal/)
})

test('a new install opens the main story; a valid legacy save still resumes Old City Migration', () => {
  const storage = memory()
  assert.equal(selectedStoryEpisode(storage), 'echo-chronicle')
  const old = advanceStory(createStory('legacy'))
  writeStory(storage, STORY_STORAGE_KEY, old, 'legacy')
  assert.equal(selectedStoryEpisode(storage), 'legacy')
  assert.deepEqual(readStory(storage, STORY_STORAGE_KEY, 'legacy'), old)
  storage.setItem(`${STORY_STORAGE_KEY}:episode`, 'bridges')
  assert.equal(selectedStoryEpisode(storage), 'legacy')
  assert.deepEqual(readStory(storage, STORY_STORAGE_KEY, 'legacy'), old)
})

test('archived story save bytes are left untouched and cannot be mistaken for a bundled story', () => {
  const storage = memory()
  const key = `${STORY_STORAGE_KEY}:episode:bridges`
  const archivedBytes = JSON.stringify({ kind: 'model-router-gal-story', version: 2, nodeId: 'archived-node' })
  storage.setItem(key, archivedBytes)
  assert.equal(selectedStoryEpisode(storage), 'echo-chronicle')
  assert.throws(() => episodeStorageKey(STORY_STORAGE_KEY, 'bridges'), /未知/)
  assert.throws(() => readStory(storage, key, 'echo-chronicle'), /原存档已保留/)
  assert.equal(storage.getItem(key), archivedBytes)
})

test('the two bundled stories keep independent autosave and manual slot storage', () => {
  const storage = memory()
  const legacy = advanceStory(createStory('legacy'))
  const chronicle = advanceStory(createStory('echo-chronicle'))
  const legacyKey = episodeStorageKey(STORY_STORAGE_KEY, 'legacy')
  const chronicleKey = episodeStorageKey(STORY_STORAGE_KEY, 'echo-chronicle')
  writeStory(storage, legacyKey, legacy, 'legacy')
  writeStory(storage, chronicleKey, chronicle, 'echo-chronicle')
  storage.setItem(`${legacyKey}:slots`, JSON.stringify([{ state: legacy }]))
  storage.setItem(`${chronicleKey}:slots`, JSON.stringify([{ state: chronicle }]))
  assert.deepEqual(readStory(storage, legacyKey, 'legacy'), legacy)
  assert.deepEqual(readStory(storage, chronicleKey, 'echo-chronicle'), chronicle)
  assert.equal(readStorySlots(storage, legacyKey, 'legacy')[0].state.version, 1)
  assert.equal(readStorySlots(storage, chronicleKey, 'echo-chronicle')[0].state.version, 5)
  assert.throws(() => writeStory(storage, legacyKey, chronicle, 'legacy'), /另一部剧目/)
})

test('catalog resolves both bundled save versions and rejects unsupported engines', () => {
  for (const episode of STORY_EPISODES) {
    const state = createStory(episode.id)
    assert.equal(getStoryEpisode(state).id, episode.id)
    assert.ok(currentStoryNode(state).text.length > 0)
    assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(state))), state)
  }
  assert.equal(getStoryEpisode({ version: 2 }), undefined)
  assert.throws(() => normalizeStory({ version: 2 }), /未随本插件安装/)
  assert.throws(() => normalizeStory({ version: 99 }), /未随本插件安装/)
})
