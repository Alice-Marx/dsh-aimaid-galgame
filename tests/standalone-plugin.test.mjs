import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import * as host from '../.dsh-plugin/index.mjs'
import { GalRemoteService, replyCharacterLimit } from '../.dsh-plugin/gal-remote-service.mjs'
import { GAL_REMOTE_NAMESPACE, GAL_REMOTE_PACKAGE, GAL_REMOTE_DESCRIPTORS, GAL_HOST_TYPERT } from '../.dsh-plugin/shared/gal-remote.mjs'
import { routesFromModelCatalog } from '../.dsh-plugin/client/gal-catalog.mjs'

const read = relative => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')
const request = () => ({ requestId: randomUUID(), provider: 'test-provider', model: 'test-model', persona: '你是衔雪。', messages: [{ role: 'user', text: '你好' }] })
const descriptor = method => GAL_REMOTE_DESCRIPTORS.find(item => item.method === method)
const parse = (method, value) => descriptor(method).parameters[0].codec.create().parse(value)
const receiver = llm => ({ ctx: { llm }, pendingGalReplies: new Map() })
const modelDirectory = stream => ({ listProviders: () => ['test-provider'], listModels: async () => [{ id: 'test-model' }], stream })

test('the independent manifest registers only GAL and keeps its own host and remote identities', () => {
  const manifest = JSON.parse(read('package.json'))
  assert.equal(manifest.name, '@ljwei-stak/dsh-galgame')
  assert.equal(manifest.version, '0.1.0')
  assert.equal(manifest.repository.url, 'git+https://github.com/Alice-Marx/deepseek-harness-galgame.git')
  assert.equal(host.name, 'dsh-galgame')
  assert.deepEqual(host.inject, ['llm', 'typert'])
  assert.deepEqual(Object.keys(host.Config.dict), ['maxReplyCharacters'], 'nonempty settings schema serves the desktop lifecycle namespace')
  assert.equal(host.Config.dict.maxReplyCharacters.meta.volatile, true)
  assert.equal(GAL_REMOTE_NAMESPACE, 'dshGalgame')
  assert.equal(GAL_REMOTE_PACKAGE, manifest.name)
  assert.deepEqual(GAL_REMOTE_DESCRIPTORS.map(item => item.method), ['galReply', 'cancelGalReply'])
  assert.equal(GAL_HOST_TYPERT.invocations, GAL_REMOTE_DESCRIPTORS)
  assert.match(read('.dsh-plugin/client/official-harness.jsx'), /GAL_PANEL = 'model-router-gal'/)
  assert.doesNotMatch(read('.dsh-plugin/client/official-harness.jsx'), /RouterMainPage|OFFICIAL_TOOLS|ROUTER_NAMESPACE/)
  assert.doesNotMatch(read('.dsh-plugin/client/gal-catalog.mjs'), /createPlanFromRoutes|model-profiles|official-tool/)
  assert.ok(manifest.files.every(file => !/official-tool|router-main|harness-plan|model-profiles/.test(file)))
})

test('reply codecs retain bounded messages, UUID cancellation, final-user and result validation', () => {
  const valid = request()
  assert.deepEqual(parse('galReply', valid), valid, 'request shape is preserved')
  for (const changes of [{ requestId: 'not-id' }, { provider: '' }, { model: '' }, { persona: 'x'.repeat(4001) }, { messages: [] }, { messages: Array.from({length: 25}, () => ({role:'user', text:'x'})) }, { messages: [{ role:'system', text:'x' }] }, { messages: [{ role:'assistant', text:'x' }] }, { messages: [{role:'user',text:'x'.repeat(3001)}] }]) {
    assert.throws(() => parse('galReply', { ...request(), ...changes }))
  }
  assert.throws(() => parse('galReply', { ...request(), messages: Array.from({length: 11}, () => ({role:'user',text:'x'.repeat(3000)})) }))
  const id = randomUUID()
  assert.equal(parse('cancelGalReply', id), id)
  assert.throws(() => parse('cancelGalReply', 'not-a-uuid'))
  const results = descriptor('galReply').result.create()
  assert.deepEqual(results.parse({ok:true,text:'回应'}), {ok:true,text:'回应'})
  assert.throws(() => results.parse({ok:true}))
  assert.throws(() => results.parse({ok:false}))
})

test('Host mounts its own Cordis service/descriptors and unload withdraws it', async () => {
  const ctx = new Context()
  ctx.provide('llm', modelDirectory(async function* () { yield {type:'text-delta',text:'你好'} }))
  const registrations = []
  ctx.provide('typert', { register(contribution) { registrations.push(contribution); return () => registrations.pop() } })
  const fiber = ctx.plugin(host)
  await fiber
  assert.equal(ctx[GAL_REMOTE_NAMESPACE] instanceof GalRemoteService, true)
  assert.equal(ctx[GAL_REMOTE_NAMESPACE].typertRemote.namespace, GAL_REMOTE_NAMESPACE)
  assert.deepEqual(registrations, [GAL_HOST_TYPERT])
  const result = await ctx[GAL_REMOTE_NAMESPACE].galReply(request())
  assert.equal(result.ok, true)
  assert.equal(result.text, '你好')
  await fiber.dispose()
  assert.equal(registrations.length, 0)
  assert.equal(ctx.get(GAL_REMOTE_NAMESPACE), undefined)
})

test('free-mode streams only the chosen exact official route with the existing token limit', async () => {
  let sent
  const state = receiver(modelDirectory(async function* (options) { sent = options; yield {type:'text-delta',text:'第一句'}; yield {type:'text-delta',text:'。'}; yield {type:'finish',reason:{kind:'stop'}} }))
  const input = request()
  const result = await GalRemoteService.prototype.galReply.call(state, input)
  assert.equal(result.ok, true)
  assert.equal(result.text, '第一句。')
  assert.equal(result.truncated, false)
  assert.equal(sent.provider, input.provider)
  assert.equal(sent.model, input.model)
  assert.equal(sent.maxTokens, 1500)
  assert.deepEqual(sent.messages, [{role:'user',content:[{type:'text',text:input.persona}]},{role:'user',content:[{type:'text',text:'你好'}]}])
  assert.equal(state.pendingGalReplies.size, 0)
})

test('unconfigured provider/model, duplicate request and empty/failed streams return visible errors', async () => {
  const state = receiver(modelDirectory(async function* () {}))
  for (const changes of [{provider:'unknown'},{model:'unknown'},{requestId:'wrong'}]) assert.equal((await GalRemoteService.prototype.galReply.call(state,{...request(),...changes})).ok,false)
  const duplicate=request(); state.pendingGalReplies.set(duplicate.requestId,new AbortController())
  assert.equal((await GalRemoteService.prototype.galReply.call(state,duplicate)).ok,false)
  state.pendingGalReplies.delete(duplicate.requestId)
  assert.equal((await GalRemoteService.prototype.galReply.call(state,request())).ok,false)
  state.ctx.llm.stream=async function* () {yield {type:'finish',reason:{kind:'error',failure:{message:'账号不可用'}}}}
  assert.equal((await GalRemoteService.prototype.galReply.call(state,request())).error,'账号不可用')
})

test('reply output is capped at 8000 characters and reports truncation', async () => {
  const state=receiver(modelDirectory(async function* () {yield {type:'text-delta',text:'x'.repeat(9000)}}))
  const result=await GalRemoteService.prototype.galReply.call(state,request())
  assert.equal(result.ok,true); assert.equal(result.text.length,8000); assert.equal(result.truncated,true)
  assert.equal(state.pendingGalReplies.size,0)
})

test('volatile reply preference reads current numeric values and bounds invalid direct calls', () => {
  assert.equal(replyCharacterLimit(), 8000)
  assert.equal(replyCharacterLimit({maxReplyCharacters: {get: () => 600}}), 600)
  assert.equal(replyCharacterLimit({maxReplyCharacters: 400}), 500)
  assert.equal(replyCharacterLimit({maxReplyCharacters: 9999}), 8000)
  assert.equal(replyCharacterLimit({maxReplyCharacters: 700.9}), 700)
  for (const value of [undefined, null, '600', NaN, Infinity]) assert.equal(replyCharacterLimit({maxReplyCharacters: value}), 8000)
})

test('free reply observes the configurable Host ceiling with the default semantics intact', async () => {
  const state=receiver(modelDirectory(async function* () {yield {type:'text-delta',text:'x'.repeat(800)}}))
  state.config={maxReplyCharacters:{get:()=>600}}
  const result=await GalRemoteService.prototype.galReply.call(state,request())
  assert.equal(result.ok,true); assert.equal(result.text.length,600); assert.equal(result.truncated,true)
})

test('cancellation aborts only the matching UUID and cleans the pending turn', async () => {
  const state=receiver(modelDirectory(async function* ({signal}) {await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true})); throw signal.reason}))
  const input=request(), resultPromise=GalRemoteService.prototype.galReply.call(state,input)
  await Promise.resolve(); await Promise.resolve()
  assert.deepEqual(GalRemoteService.prototype.cancelGalReply.call(state,randomUUID()),{cancelled:false})
  assert.deepEqual(GalRemoteService.prototype.cancelGalReply.call(state,input.requestId),{cancelled:true})
  const result=await resultPromise
  assert.equal(result.ok,false); assert.match(result.error,/已取消/); assert.equal(state.pendingGalReplies.size,0)
})

test('free-mode catalog filters to routable providers, deduplicates and sorts exact routes', () => {
  const routes=routesFromModelCatalog({routableProviders:['b','a'],groups:[{id:'b',name:'B',models:[{id:'model2',reasoning:{efforts:[{id:'high'},'high'],defaultEffort:'high'}}]},{id:'a',models:[{id:'model1'},{id:'model1'},{id:''}]},{id:'private',models:[{id:'hidden'}]}]})
  assert.deepEqual(routes.map(item=>`${item.provider}/${item.model}`),['a/model1','b/model2'])
  assert.deepEqual(routes[1].reasoningEfforts,['high'])
  assert.deepEqual(routes[1].inputModalities,[])
  assert.deepEqual(routesFromModelCatalog(null),[])
})
