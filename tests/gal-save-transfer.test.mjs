import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_EPISODES,
  createStory,
  currentStoryNode,
  advanceStory,
  normalizeStory,
  getStoryEpisode,
} from '../.dsh-plugin/shared/gal-story-catalog.mjs'
import { STORY_STORAGE_KEY, storySlotsKey, readStorySlots } from '../.dsh-plugin/client/gal-story-storage.mjs'
import {
  exportStorySave,
  importStorySave,
  saveQuickStory,
  loadQuickStory,
  saveManualStorySlot,
  getStorySaveMeta,
} from '../.dsh-plugin/client/gal-save-transfer.mjs'

const clone = value => JSON.parse(JSON.stringify(value))
function memoryStorage() {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) }
}
function progressedStory(episodeId) {
  let state = createStory(episodeId)
  for (let index = 0; index < 4; index += 1) {
    const node = currentStoryNode(state)
    if (node.ending || node.input) break
    state = advanceStory(state, node.choices?.[0]?.id ?? null)
  }
  return state
}

test('JSON exports and imports preserve the exact replayed path of both bundled stories', () => {
  assert.equal(STORY_EPISODES.length, 2)
  for (const episode of STORY_EPISODES) {
    const state = progressedStory(episode.id)
    const source = exportStorySave(state)
    const envelope = JSON.parse(source)
    assert.equal(envelope.format, 'model-router-gal-story')
    assert.equal(envelope.version, 1)
    assert.equal(envelope.episodeId, episode.id)
    assert.equal(Number.isFinite(Date.parse(envelope.exportedAt)), true)
    assert.deepEqual(importStorySave(source, episode.id), state, `${episode.id} round-trip keeps state`)
    assert.deepEqual(importStorySave(source), state, `${episode.id} can identify its own episode`)
    assert.deepEqual(currentStoryNode(importStorySave(source)), currentStoryNode(state))
  }
})

test('legacy raw-state JSON remains importable for every bundled engine version', () => {
  for (const episode of STORY_EPISODES) {
    const state = progressedStory(episode.id)
    const original = JSON.stringify(state)
    assert.deepEqual(importStorySave(original, episode.id), state)
    assert.equal(getStoryEpisode(importStorySave(original)).id, episode.id)
    assert.equal(JSON.stringify(state), original, 'import does not mutate its source state')
  }
})

test('invalid JSON, unsupported envelopes and oversized sources fail explicitly', () => {
  assert.throws(() => importStorySave('{broken'), /有效的 JSON/)
  for (const source of [null, 1, {}, 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    assert.throws(() => importStorySave(source), /存档文件过大/)
  }
  const state = clone(createStory('echo-chronicle'))
  for (const envelope of [
    { format: 'foreign-game', version: 1, episodeId: 'echo-chronicle', state },
    { format: 'model-router-gal-story', version: 2, episodeId: 'echo-chronicle', state },
    { format: 'model-router-gal-story', version: '1', episodeId: 'echo-chronicle', state },
  ]) {
    assert.throws(() => importStorySave(JSON.stringify(envelope)), /不支持此存档格式或版本/)
  }
  for (const damaged of [null, [], {}, { kind: 'model-router-gal-game', version: 1 }]) {
    assert.throws(() => importStorySave(JSON.stringify(damaged)))
  }
})

test('import limit counts UTF-8 bytes so oversized Chinese data cannot bypass the 2 MB cap', () => {
  const source = JSON.stringify({ padding: '春'.repeat(800_000) })
  assert.ok(source.length < 2 * 1024 * 1024)
  assert.ok(new TextEncoder().encode(source).length > 2 * 1024 * 1024)
  assert.throws(() => importStorySave(source), /存档文件过大/)
  const valid = JSON.stringify(createStory('echo-chronicle'))
  const boundary = valid + ' '.repeat(2 * 1024 * 1024 - new TextEncoder().encode(valid).length)
  assert.equal(new TextEncoder().encode(boundary).length, 2 * 1024 * 1024)
  assert.deepEqual(importStorySave(boundary, 'echo-chronicle'), createStory('echo-chronicle'))
  assert.throws(() => importStorySave(`${boundary} `, 'echo-chronicle'), /存档文件过大/)
})

test('cross-episode import and forged envelope episode metadata are rejected', () => {
  const source = exportStorySave(progressedStory('echo-chronicle'))
  assert.throws(() => importStorySave(source, 'legacy'), /另一部剧目/)
  assert.throws(() => importStorySave(JSON.stringify(progressedStory('legacy')), 'echo-chronicle'), /另一部剧目/)
  const envelope = JSON.parse(source)
  envelope.episodeId = 'echo-city'
  assert.throws(() => importStorySave(JSON.stringify(envelope)), /剧目标识与内容不一致/)
  assert.throws(() => importStorySave(JSON.stringify({ ...envelope, episodeId: undefined })), /剧目标识与内容不一致/)
})

test('forged current nodes and noncontinuous replay trails cannot redirect an imported save', () => {
  for (const episode of STORY_EPISODES) {
    const state = clone(progressedStory(episode.id))
    const fakeNode = { ...state, nodeId: 'forged-true-ending' }
    assert.throws(() => importStorySave(JSON.stringify(fakeNode), episode.id), `${episode.id} forged current node is rejected`)
    assert.ok(state.trail.length > 0)
    const fakeTrail = clone(state)
    fakeTrail.trail[0].nodeId = 'not-the-authored-start'
    assert.throws(() => importStorySave(JSON.stringify(fakeTrail), episode.id), `${episode.id} forged trail is rejected`)
    const fakeChoice = clone(state)
    fakeChoice.trail[0].choiceId = 'fake-unlock-all-routes'
    assert.throws(() => importStorySave(JSON.stringify(fakeChoice), episode.id), `${episode.id} forged choice is rejected`)
  }
})

test('supplied flags and scores never replace authored replay results', () => {
  for (const episodeId of ['legacy', 'echo-chronicle']) {
    const state = progressedStory(episodeId)
    const raw = clone(state)
    raw.flags = { ...raw.flags, fakeUnlockAllRoutes: true, aff_claude: 999999 }
    raw.affection = 999999
    raw.axes = { safety: 999999 }
    const restored = importStorySave(JSON.stringify(raw), episodeId)
    assert.deepEqual(restored, normalizeStory(state), `${episodeId} metadata is rebuilt from the authored trail`)
    assert.equal(restored.flags.fakeUnlockAllRoutes, undefined)
  }
  assert.throws(() => createStory('bridges'), /未包含在当前核心插件中/)
  assert.throws(() => createStory('echo-city'), /未包含在当前核心插件中/)
  assert.throws(() => createStory('echo-spring'), /未包含在当前核心插件中/)
})

test('quick saves remain episode-scoped for the two bundled stories', () => {
  const storage = memoryStorage()
  storage.setItem(STORY_STORAGE_KEY, 'existing-story-autosave')
  storage.setItem('model-router:gal-game:v1', 'existing-free-mode')
  const sharedSlots = JSON.stringify([{ state: clone(createStory('legacy')), savedAt: 'old-1' }, null, null])
  storage.setItem(`${STORY_STORAGE_KEY}:slots`, sharedSlots)
  for (const episode of STORY_EPISODES) {
    const state = progressedStory(episode.id)
    saveQuickStory(storage, episode.id, state)
    assert.deepEqual(loadQuickStory(storage, episode.id), state)
  }
  assert.equal(storage.getItem(`${STORY_STORAGE_KEY}:slots`), sharedSlots)
  assert.equal(storage.getItem(STORY_STORAGE_KEY), 'existing-story-autosave')
  assert.equal(storage.getItem('model-router:gal-game:v1'), 'existing-free-mode')
  assert.equal([...storage.data.keys()].filter(key => key.startsWith(`${STORY_STORAGE_KEY}:quick:`)).length, 2)
})

test('quick save errors preserve the previous valid quick save', () => {
  const storage = memoryStorage()
  const state = progressedStory('echo-chronicle')
  assert.throws(() => loadQuickStory(storage, 'echo-chronicle'), /没有快捷存档/)
  saveQuickStory(storage, 'echo-chronicle', state)
  const before = new Map(storage.data)
  assert.throws(() => saveQuickStory(storage, 'echo-chronicle', createStory('legacy')), /另一部剧目/)
  assert.deepEqual(storage.data, before)
  const key = `${STORY_STORAGE_KEY}:quick:echo-chronicle`
  storage.setItem(key, '{broken')
  assert.throws(() => loadQuickStory(storage, 'echo-chronicle'), /有效的 JSON/)
  assert.equal(storage.getItem(key), '{broken')
  assert.throws(() => saveQuickStory(null, 'echo-chronicle', state), /本地存储不可用/)
  assert.throws(() => saveQuickStory({ setItem() { throw new Error('quota') } }, 'echo-chronicle', state), /快捷存档失败/)
  assert.throws(() => loadQuickStory({ getItem() { throw new Error('denied') } }, 'echo-chronicle'), /本地存储无法读取.*导入存档备份/)
})

test('main story manual slots are independent and legacy slots remain untouched', () => {
  const storage = memoryStorage()
  const old = [
    { state: clone(createStory('legacy')), savedAt: 'retained-slot-1' },
    null,
    { state: clone(progressedStory('legacy')), savedAt: 'retained-slot-3' },
  ]
  const key = `${STORY_STORAGE_KEY}:slots`
  const original = JSON.stringify(old)
  storage.setItem(key, original)
  const state = progressedStory('echo-chronicle')
  saveManualStorySlot(storage, 'echo-chronicle', 1, state)
  const mainSlotsKey = storySlotsKey(STORY_STORAGE_KEY, 'echo-chronicle')
  assert.equal(storage.getItem(key), original, 'legacy save slots stay byte-identical')
  assert.equal(readStorySlots(storage, STORY_STORAGE_KEY, 'legacy')[0].state.version, 1)
  assert.equal(readStorySlots(storage, STORY_STORAGE_KEY, 'legacy')[2].state.version, 1)
  assert.deepEqual(readStorySlots(storage, mainSlotsKey, 'echo-chronicle')[1].state, state)
  assert.equal(storage.data.size, 2, 'each bundled story keeps its own slot key')
})

test('new episodes retain independent manual slot keys and keep other episodes intact', () => {
  const storage = memoryStorage()
  storage.setItem(`${STORY_STORAGE_KEY}:slots`, 'existing-shared-slots')
  for (const episodeId of ['echo-chronicle']) {
    const state = progressedStory(episodeId)
    saveManualStorySlot(storage, episodeId, 2, state)
    const key = storySlotsKey(STORY_STORAGE_KEY, episodeId)
    assert.deepEqual(readStorySlots(storage, key, episodeId), [null, null, { state, savedAt: JSON.parse(storage.getItem(`${key}:slots`))[2].savedAt }])
  }
  assert.equal(storage.getItem(`${STORY_STORAGE_KEY}:slots`), 'existing-shared-slots')
  assert.equal(storage.data.size, 2)
})

test('corrupt manual slot data remains byte-identical and is never silently cleared', () => {
  const storage = memoryStorage()
  const key = `${storySlotsKey(STORY_STORAGE_KEY, 'echo-chronicle')}:slots`
  for (const source of ['{broken', '{}', 'null', '42', '"wrong type"']) {
    storage.setItem(key, source)
    assert.throws(() => saveManualStorySlot(storage, 'echo-chronicle', 0, createStory('echo-chronicle')), /已保留/)
    assert.equal(storage.getItem(key), source)
  }
})

test('invalid slot indices are rejected before storage is read or changed', () => {
  const storage = {
    getItem() { assert.fail('invalid index must not read storage') },
    setItem() { assert.fail('invalid index must not write storage') },
  }
  for (const index of [-1, 3, 0.5, NaN, Infinity, '1', null, undefined]) {
    assert.throws(() => saveManualStorySlot(storage, 'echo-chronicle', index, createStory('echo-chronicle')), /槽编号无效/)
  }
})

test('manual slot failures and cross-episode state never overwrite stored slots', () => {
  const storage = memoryStorage()
  const key = `${storySlotsKey(STORY_STORAGE_KEY, 'echo-chronicle')}:slots`
  const previous = JSON.stringify([{ state: clone(createStory('echo-chronicle')), savedAt: 'old' }])
  storage.setItem(key, previous)
  assert.throws(() => saveManualStorySlot(storage, 'echo-chronicle', 0, createStory('legacy')), /另一部剧目/)
  assert.equal(storage.getItem(key), previous)
  assert.throws(() => saveManualStorySlot(null, 'echo-chronicle', 0, createStory('echo-chronicle')), /本地存储不可用/)
  assert.throws(() => saveManualStorySlot({ getItem() { throw new Error('denied') }, setItem() { assert.fail('no write after denied read') } }, 'echo-chronicle', 0, createStory('echo-chronicle')), /已保留.*导出/)
  assert.throws(() => saveManualStorySlot({ getItem() { return '[]' }, setItem() { throw new Error('quota') } }, 'echo-chronicle', 0, createStory('echo-chronicle')), /存档槽保存失败.*空间不足.*导出备份/)
})

test('save metadata comes from the normalized live node and uses a short text preview', () => {
  for (const episode of STORY_EPISODES) {
    const state = progressedStory(episode.id)
    const node = currentStoryNode(state)
    const meta = getStorySaveMeta(state)
    assert.equal(meta.episodeId, episode.id)
    assert.equal(meta.title, episode.title)
    assert.equal(meta.chapterId, state.chapterId)
    assert.equal(meta.nodeId, node.id)
    assert.equal(meta.location, node.location ?? '')
    assert.equal(meta.text, String(node.text ?? '').slice(0, 70))
    assert.ok(meta.text.length <= 70)
    assert.deepEqual(Object.keys(meta).sort(), ['chapterId', 'episodeId', 'location', 'nodeId', 'text', 'title'])
  }
  assert.throws(() => getStorySaveMeta({ version: 99 }))
})
