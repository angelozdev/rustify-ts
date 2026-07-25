/**
 * The one HTTP handler, written three ways: native try/catch with thrown tagged
 * errors, rustify-ts Outcome, and neverthrow Result. All three normalize their
 * answer to the same `{ status, body }` shape so a benchmark comparing them is
 * comparing equal work. `assertEquivalent` turns that into a hard precondition:
 * it throws before any measurement if the three ever disagree.
 */
import { fail, ok, V } from '../../dist/index.js'
import { err as nerr, ok as nok } from 'neverthrow'

export const INPUTS = [
  { id: '1', token: 't', tenant: 'acme' },
  { id: '', token: 't', tenant: 'acme' },
  { id: '9', token: 't', tenant: 'acme' },
  { id: '2', token: '', tenant: 'acme' },
]

const okBody = (device) => ({ status: 200, body: { device } })
const failBody = (error) => ({ status: 422, body: { error } })

const validId = (raw) => (raw.id ? ok(raw.id) : fail({ _tag: 'Invalid', fields: { id: 'required' } }))
const validToken = (raw) =>
  raw.token ? ok(raw.token) : fail({ _tag: 'Invalid', fields: { token: 'required' } })

export function rustifyHandler(raw) {
  return V.struct({ id: validId(raw), token: validToken(raw) })
    .andThen(({ id }) => (id === '9' ? fail({ _tag: 'NotFound', id }) : ok({ id })))
    .map((device) => ({ device: device.id }))
    .catchTag('NotFound', () => ok({ device: 'cached' }))
    .match(
      (device) => okBody(device.device),
      (error) => failBody(error._tag),
    )
}

export function neverthrowHandler(raw) {
  return (raw.id ? nok(raw.id) : nerr({ _tag: 'Invalid' }))
    .andThen((id) => (raw.token ? nok({ id }) : nerr({ _tag: 'Invalid' })))
    .andThen(({ id }) => (id === '9' ? nerr({ _tag: 'NotFound', id }) : nok({ id })))
    .map((device) => ({ device: device.id }))
    .orElse((error) => (error._tag === 'NotFound' ? nok({ device: 'cached' }) : nerr(error)))
    .match(
      (device) => okBody(device.device),
      (error) => failBody(error._tag),
    )
}

export function nativeHandler(raw) {
  try {
    if (!raw.id || !raw.token) throw { _tag: 'Invalid' }
    let id = raw.id
    if (id === '9') {
      try {
        throw { _tag: 'NotFound', id }
      } catch (error) {
        if (error._tag === 'NotFound') id = 'cached'
        else throw error
      }
    }
    return okBody(id)
  } catch (error) {
    return failBody(error._tag)
  }
}

export function assertEquivalent() {
  for (const raw of INPUTS) {
    const results = {
      native: nativeHandler(raw),
      rustify: rustifyHandler(raw),
      neverthrow: neverthrowHandler(raw),
    }
    const [reference, ...rest] = Object.entries(results)
    const expected = JSON.stringify(reference[1])
    for (const [name, value] of rest) {
      if (JSON.stringify(value) !== expected) {
        throw new Error(
          `handlers disagree on ${JSON.stringify(raw)}: ${reference[0]}=${expected} vs ${name}=${JSON.stringify(value)}`,
        )
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  assertEquivalent()
  console.log('handlers equivalent OK')
}
