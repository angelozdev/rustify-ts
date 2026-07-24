import { describe, expectTypeOf, it } from 'vitest'
import { type Outcome, fail, ok } from '../src/core'
import { catchTags } from '../src/combinators'

type Invalid = { _tag: 'Invalid'; fields: Record<string, unknown> }
type NotFound = { _tag: 'NotFound'; id: string }
type Forbidden = { _tag: 'Forbidden'; tenant: string }
type RateLimited = { _tag: 'RateLimited'; retryInMs: number }
type Network = { _tag: 'Network' }
type SyncErr = Invalid | NotFound | Forbidden | RateLimited | Network
type Device = { id: string }

declare const res: Outcome<Device, SyncErr>
declare const cached: Device

describe('catchTag types', () => {
  it('subtracts the handled member and keeps the rest', () => {
    const r = res.catchTag('RateLimited', () => ok(cached))
    expectTypeOf(r).toEqualTypeOf<Outcome<Device, Invalid | NotFound | Forbidden | Network>>()
  })

  it('adds the errors the handler can produce', () => {
    const r = res.catchTag('Network', () => fail({ _tag: 'Boom' as const }))
    expectTypeOf(r).toEqualTypeOf<
      Outcome<Device, Invalid | NotFound | Forbidden | RateLimited | { _tag: 'Boom' }>
    >()
  })

  it('the handler receives the narrowed member', () => {
    res.catchTag('NotFound', (e) => {
      expectTypeOf(e).toEqualTypeOf<NotFound>()
      return ok(cached)
    })
  })

  it('rejects a tag that is not in the union', () => {
    /* @ts-expect-error 'RateLimitd' is not a tag of SyncErr */
    res.catchTag('RateLimitd', () => ok(cached))
  })
})

describe('exhaustiveness after catching', () => {
  it('the remaining union is exhaustive for a switch', () => {
    const assertNever = (x: never): never => x
    res
      .catchTag('RateLimited', () => ok(cached))
      .catchTag('Network', () => ok(cached))
      .matchAll(
        (d) => d.id,
        (e) => {
          switch (e._tag) {
            case 'Invalid':
              return 'invalid'
            case 'NotFound':
              return e.id
            case 'Forbidden':
              return e.tenant
            default:
              return assertNever(e)
          }
        },
        () => 'defect',
      )
  })
})

describe('catchTags types', () => {
  it('subtracts every handled tag at once', () => {
    const r = res.pipe(catchTags({ RateLimited: () => ok(cached), Network: () => ok(cached) }))
    expectTypeOf(r).toEqualTypeOf<Outcome<Device, Invalid | NotFound | Forbidden>>()
  })

  it('adds the errors its handlers can produce', () => {
    const r = res.pipe(catchTags({ Network: () => fail({ _tag: 'Boom' as const }) }))
    expectTypeOf(r).toEqualTypeOf<
      Outcome<Device, Invalid | NotFound | Forbidden | RateLimited | { _tag: 'Boom' }>
    >()
  })

  it('the handlers receive the narrowed member', () => {
    res.pipe(
      catchTags({
        NotFound: (e) => {
          expectTypeOf(e).toEqualTypeOf<NotFound>()
          return ok(cached)
        },
      }),
    )
  })

  it('rejects a key that is not a tag of the union', () => {
    /* @ts-expect-error 'Nope' is not a tag of SyncErr */
    res.pipe(catchTags({ Nope: () => ok(cached) }))
  })
})
