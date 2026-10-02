import * as legacy from './gal-story.mjs'
import * as echoChronicle from './gal-story-echocity.mjs'

/** Stories included in the installable core plugin. Optional stories live in a
 * separate sibling project and are deliberately not imported here. */
export const STORY_EPISODES = Object.freeze([
  Object.freeze({ id: 'echo-chronicle', title: echoChronicle.STORY_TITLE, label: '回声之城·正篇', description: echoChronicle.STORY_DESCRIPTION, chapters: echoChronicle.STORY_CHAPTERS }),
  Object.freeze({ id: 'legacy', title: '旧城迁移篇：未写完的约定', label: '旧城迁移篇：未写完的约定', description: '旧城迁移与 DeepSeek 的约定', chapters: [] }),
])

// This roster combines the two shipped stories with names useful to the
// free-mode character picker. Optional story code is not needed at runtime.
export const STORY_CHARACTERS = Object.freeze({
  ...echoChronicle.STORY_CHARACTERS,
  ...legacy.STORY_CHARACTERS,
  mistral: 'Mistral',
})
export const STORY_SIDE_ROUTES = Object.freeze([])
export const STORY_MUSIC_THEMES = Object.freeze({
  'title-city': Object.freeze({ title: '回声之城 · 序曲' }),
})

export function getStoryEpisode(state) {
  const episodeId = { 1: 'legacy', 5: 'echo-chronicle' }[state?.version]
  return STORY_EPISODES.find(episode => episode.id === episodeId)
}

function engine(raw) {
  if (raw?.version === 1) return legacy
  if (raw?.version === 5) return echoChronicle
  throw new Error('这份存档属于未随本插件安装的可选剧目，或版本不受支持。原存档已保留。')
}

export function createStory(episodeId = 'echo-chronicle', options = {}) {
  if (episodeId === 'legacy') return legacy.createStory()
  if (episodeId === 'echo-chronicle') return echoChronicle.createStory(options)
  throw new Error('这部剧目未包含在当前核心插件中。')
}

export const normalizeStory = raw => engine(raw).normalizeStory(raw)
export const currentStoryNode = raw => engine(raw).currentStoryNode(raw)
export const advanceStory = (raw, choiceId = null) => engine(raw).advanceStory(raw, choiceId)
export const storyHistory = raw => engine(raw).storyHistory(raw)

/** 章节切换（仅支持显式实现的剧目；返回 null 表示该剧目不支持）。 */
export function switchStoryChapter(raw, chapterId) {
  const module = engine(raw)
  return typeof module.switchChapter === 'function' ? module.switchChapter(raw, chapterId) : null
}

/** 章节锁与完成态（含解锁提示；不支持的剧目返回空数组）。 */
export function storyChapterStates(raw) {
  const module = engine(raw)
  return typeof module.chapterStates === 'function' ? module.chapterStates(raw) : []
}

/** 好感度面板数据（不支持的剧目返回空数组）。 */
export function storyAffinityPanel(raw) {
  const module = engine(raw)
  return typeof module.storyAffinities === 'function' ? module.storyAffinities(raw) : []
}
