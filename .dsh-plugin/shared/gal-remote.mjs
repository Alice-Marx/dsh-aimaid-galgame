/** Independent GAL Typert contract; no installer or router dependency. */
export const GAL_REMOTE_PACKAGE = '@ljwei-stak/dsh-galgame'
export const GAL_REMOTE_NAMESPACE = 'dshGalgame'

function strictCodec(typeSymbol, parse) {
  return Object.freeze({ mode: 'strict', typeSymbol, create: () => ({ parse }) })
}

function plainObject(value, subject) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${subject} must be an object`)
  }
  return value
}

const galRequestCodec = strictCodec(`${GAL_REMOTE_PACKAGE}#GalReplyRequest`, value => {
  const request = plainObject(value, 'Gal reply request')
  if (typeof request.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.requestId)) {
    throw new TypeError('Gal reply needs a random requestId')
  }
  const short = field => typeof request[field] === 'string' && request[field].trim().length > 0 && request[field].length <= 160
  if (!short('provider') || !short('model')) throw new TypeError('Gal reply needs a configured provider/model')
  if (typeof request.persona !== 'string' || request.persona.length > 4_000) throw new TypeError('Gal persona is too long')
  if (!Array.isArray(request.messages) || request.messages.length < 1 || request.messages.length > 24) throw new TypeError('Gal reply needs 1-24 messages')
  let total = request.persona.length
  for (const item of request.messages) {
    const entry = plainObject(item, 'Gal message')
    if (!['user', 'assistant'].includes(entry.role) || typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > 3_000) {
      throw new TypeError('Gal messages need bounded user/assistant text')
    }
    total += entry.text.length
  }
  if (request.messages.at(-1).role !== 'user' || total > 30_000) throw new TypeError('Gal conversation is too long or lacks a user turn')
  return request
})

const galResultCodec = strictCodec(`${GAL_REMOTE_PACKAGE}#GalReplyResult`, value => {
  const result = plainObject(value, 'Gal reply result')
  if (typeof result.ok !== 'boolean') throw new TypeError('Gal result needs ok')
  if (result.ok && typeof result.text !== 'string') throw new TypeError('Gal success needs text')
  if (!result.ok && typeof result.error !== 'string') throw new TypeError('Gal failure needs error')
  return result
})

const galRequestIdCodec = strictCodec(`${GAL_REMOTE_PACKAGE}#GalReplyId`, value => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new TypeError('Gal requestId must be a UUID')
  }
  return value
})
const galCancelResultCodec = strictCodec(`${GAL_REMOTE_PACKAGE}#GalCancelResult`, value => {
  const result = plainObject(value, 'Gal cancellation result')
  if (typeof result.cancelled !== 'boolean') throw new TypeError('Gal cancellation needs a boolean')
  return result
})

function descriptor(method, parameters, result) {
  return Object.freeze({
    id: `${GAL_REMOTE_PACKAGE}#${GAL_REMOTE_NAMESPACE}/${method}`,
    service: GAL_REMOTE_NAMESPACE,
    namespace: GAL_REMOTE_NAMESPACE,
    method,
    invocation: { kind: 'direct' },
    parameters,
    result,
  })
}

const galRequestParameter = Object.freeze({ name: 'request', wire: 'request', source: 'json', codec: galRequestCodec })
const galRequestIdParameter = Object.freeze({ name: 'requestId', wire: 'requestId', source: 'json', codec: galRequestIdCodec })
export const GAL_REMOTE_DESCRIPTORS = Object.freeze([descriptor('galReply', [galRequestParameter], galResultCodec), descriptor('cancelGalReply', [galRequestIdParameter], galCancelResultCodec)])
export const GAL_CLIENT_REMOTE = Object.freeze({ package: GAL_REMOTE_PACKAGE, descriptors: GAL_REMOTE_DESCRIPTORS })
export const GAL_HOST_TYPERT = Object.freeze({ package: GAL_REMOTE_PACKAGE, face: 'host', schemas: [], invocations: GAL_REMOTE_DESCRIPTORS, model: { services: [], events: [], objects: [] } })
