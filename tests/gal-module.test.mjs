import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_EPISODES,
  STORY_CHARACTERS,
  getStoryEpisode,
  createStory,
  currentStoryNode,
  advanceStory,
  storyHistory,
} from '../.dsh-plugin/shared/gal-story-catalog.mjs'
import {
  STORY_STORAGE_KEY,
  episodeStorageKey,
  readStory,
  writeStory,
  readStorySlots,
} from '../.dsh-plugin/client/gal-story-storage.mjs'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: key => { map.delete(key) },
  }
}

test('both bundled stories expose a playable first node through the shared engine', () => {
  for (const episode of STORY_EPISODES) {
    const story = createStory(episode.id)
    const node = currentStoryNode(story)
    assert.equal(node.chapterId, story.chapterId)
    assert.ok(typeof node.text === 'string' && node.text.length > 0, `${episode.id} first node has text`)
    assert.ok(node.speaker, `${episode.id} first node has a speaker`)
    const advanced = advanceStory(story, null)
    assert.notEqual(advanced.nodeId, story.nodeId, `${episode.id} advances without choices`)
  }
})

test('story characters roster covers the displayed cast', () => {
  assert.ok(STORY_CHARACTERS.harness, 'DeepSeek Harness has a display name')
  assert.ok(STORY_CHARACTERS.kimi, 'Kimi has a display name')
  assert.ok(STORY_CHARACTERS.mistral, 'Mistral has a display name')
  assert.throws(() => createStory('bridges'), /未包含在当前核心插件中/)
  assert.ok(getStoryEpisode(createStory('legacy')).id === 'legacy')
})

test('story saves round-trip through episode-scoped storage keys', () => {
  const storage = fakeStorage()
  const chronicleKey = episodeStorageKey(STORY_STORAGE_KEY, 'echo-chronicle')
  const original = createStory('echo-chronicle')
  const progressed = advanceStory(original, null)
  writeStory(storage, chronicleKey, progressed, 'echo-chronicle')
  const restored = readStory(storage, chronicleKey, 'echo-chronicle')
  assert.equal(restored.nodeId, progressed.nodeId)
  assert.equal(restored.chapterId, progressed.chapterId)
  // Episode validation keeps saves from leaking across episodes.
  assert.throws(() => readStory(storage, chronicleKey, 'legacy'))
})

test('manual save slots validate episode and report empty slots', () => {
  const storage = fakeStorage()
  const chronicleKey = episodeStorageKey(STORY_STORAGE_KEY, 'echo-chronicle')
  assert.deepEqual(readStorySlots(storage, chronicleKey, 'echo-chronicle'), [null, null, null])
  const state = advanceStory(createStory('echo-chronicle'), null)
  storage.setItem(`${chronicleKey}:slots`, JSON.stringify([
    { state: JSON.parse(JSON.stringify(state)), savedAt: '2026-09-26 12:00' },
  ]))
  const slots = readStorySlots(storage, chronicleKey, 'echo-chronicle')
  assert.equal(slots[0].savedAt, '2026-09-26 12:00')
  assert.equal(slots[1], null)
  // A save from another episode degrades to an invalid slot instead of loading.
  const foreign = readStorySlots(storage, chronicleKey, 'legacy')
  assert.equal(foreign[0].invalid, true)
})

test('story history replays the walked path with player choices', () => {
  let original = createStory('echo-chronicle')
  for (let i = 0; i < 10 && !currentStoryNode(original).choices; i += 1) original = advanceStory(original)
  const first = currentStoryNode(original)
  assert.ok(first.choices?.length)
  const progressed = advanceStory(original, first.choices[0].id)
  const history = storyHistory(progressed)
  assert.ok(history.length >= 3, 'history includes nodes and the choice line')
  assert.equal(history.some(entry => entry.speaker === 'player'), true)
})


test('echo-chronicle plays the full journey through every route', async () => {
  const echo = await import('../.dsh-plugin/shared/gal-story-echocity.mjs')
  const catalog = await import('../.dsh-plugin/shared/gal-story-catalog.mjs')
  assert.equal(echo.storyGraphIssues().length, 0)
  const episode = catalog.STORY_EPISODES.find(item => item.id === 'echo-chronicle')
  assert.ok(episode, 'echo-chronicle registered in catalog')
  const play = (story, pick) => {
    let state = story
    let hops = 0
    while (hops < 400) {
      const node = catalog.currentStoryNode(state)
      if (node.ending) break
      if (node.input) state = catalog.advanceStory(state, '__input__:衔雪')
      else if (node.choices) state = catalog.advanceStory(state, pick(node, state))
      else state = catalog.advanceStory(state, null)
      hops += 1
    }
    return { state, hops }
  }
  let state = catalog.createStory('echo-chronicle')
  assert.equal(state.version, 5)
  const pick = node => ({
    'petition-01': 'c', 'note-03': 'a', 'stele-01': 'a', 'diary-01': 'b', 'follow-01': 'a',
  })[node.id] ?? node.choices[0].id
  const common = play(state, pick)
  state = common.state
  assert.equal(state.flags.flag_recite_names, true)
  assert.equal(state.flags.flag_transcribe_light, true)
  assert.equal(state.flags.flag_x4_count, 2)
  const chapters = catalog.storyChapterStates(state)
  assert.equal(chapters.find(item => item.id === 'hidden-harness').locked, true, 'hidden locked before DeepSeek route')
  for (const chapterId of ['route-deepseek', 'route-chatgpt', 'route-claude', 'route-llama', 'route-grok', 'route-rwkv', 'hidden-harness', 'true-end']) {
    state = catalog.switchStoryChapter(state, chapterId)
    assert.ok(state, `${chapterId} switch supported`)
    const run = play(state, node => node.choices[0].id)
    state = run.state
  }
  const finale = catalog.currentStoryNode(state)
  assert.match(finale.ending?.title ?? '', /回声之城/)
  assert.equal(state.flags.hidden_true, true)
  assert.equal(state.flags.harness_name, '衔雪')
  const loaded = catalog.normalizeStory(JSON.parse(JSON.stringify(state)))
  assert.equal(loaded.nodeId, state.nodeId)
  const affinity = catalog.storyAffinityPanel(state)
  assert.ok(affinity.length >= 14)
  assert.ok(affinity[0].value >= affinity[1].value)
})
