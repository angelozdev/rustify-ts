import { describe, expectTypeOf, it } from 'vitest'
import { type OkOf, type Outcome, fail, ok } from '../src/core'
import { type Invalid, V } from '../src/validation'

type Empty = { _tag: 'Empty'; field: string }
type TooLong = { _tag: 'TooLong'; max: number }
type NotFound = { _tag: 'NotFound'; id: string }
type Device = { id: string }

declare const id: Outcome<string, Empty>
declare const n: Outcome<number, TooLong>
declare const device: Device

type SyncErr =
  | { _tag: 'Invalid'; fields: Record<string, unknown> }
  | { _tag: 'NotFound'; id: string }

declare const res: Outcome<Device, SyncErr>

describe('V.struct types', () => {
  it('Ok is the record of values', () => {
    const r = V.struct({ id, n })
    expectTypeOf(r).toEqualTypeOf<
      Outcome<{ id: string; n: number }, Invalid<{ id: typeof id; n: typeof n }>>
    >()
  })

  it('fields mirrors the input shape with each error type', () => {
    type S = { id: typeof id; n: typeof n }
    expectTypeOf<Invalid<S>['fields']>().toEqualTypeOf<{ id?: Empty; n?: TooLong }>()
  })

  it('rejects a field that is not an Outcome', () => {
    /* @ts-expect-error a plain value is not an Outcome */
    V.struct({ id, n: 3 })
  })

  it('Invalid is assignable to the wide member a user declares by hand', () => {
    type S = { id: typeof id; n: typeof n }
    expectTypeOf<Invalid<S>>().toMatchTypeOf<{
      _tag: 'Invalid'
      fields: Record<string, unknown>
    }>()
  })
})

describe('Invalid enters catchTag with no adapter', () => {
  it('a chain starting at V.struct fits a hand-written error union', () => {
    const chain = V.struct({ id, n }).andThen((v): Outcome<Device, NotFound> => ok({ id: v.id }))
    const widened: Outcome<Device, SyncErr> = chain
    const handled = widened.catchTag('Invalid', () => ok(device))
    expectTypeOf(handled).toEqualTypeOf<Outcome<Device, { _tag: 'NotFound'; id: string }>>()
  })

  it('catchTag runs directly on the V.struct error with its precise fields', () => {
    const validated = V.struct({ id, n })
    const r = validated.catchTag('Invalid', (e) => {
      expectTypeOf(e.fields).toEqualTypeOf<{ id?: Empty; n?: TooLong }>()
      return ok<OkOf<typeof validated>>({ id: 'fallback', n: 0 })
    })
    expectTypeOf(r).toEqualTypeOf<Outcome<{ id: string; n: number }, never>>()
  })
})

describe('exhaustiveness with Invalid in the union', () => {
  it('the switch over the remaining union stays exhaustive', () => {
    const assertNever = (x: never): never => x
    res.matchAll(
      (d) => d.id,
      (e) => {
        switch (e._tag) {
          case 'Invalid':
            return Object.keys(e.fields).join(',')
          case 'NotFound':
            return e.id
          default:
            return assertNever(e)
        }
      },
      () => 'defect',
    )
  })

  it('a handler can turn Invalid into another tagged error', () => {
    const r = V.struct({ id, n }).catchTag('Invalid', (e) =>
      fail({ _tag: 'Rejected' as const, count: Object.keys(e.fields).length }),
    )
    expectTypeOf(r).toEqualTypeOf<
      Outcome<{ id: string; n: number }, { _tag: 'Rejected'; count: number }>
    >()
  })
})
