import { describe, expectTypeOf, it } from 'vitest'
import type { Fail, Ok, TagOf, Tagged } from '../src/types'

describe('types helpers', () => {
  it('TagOf extracts the union of tags', () => {
    type E = { _tag: 'A'; x: number } | { _tag: 'B' }
    expectTypeOf<TagOf<E>>().toEqualTypeOf<'A' | 'B'>()
  })

  it('TagOf on non-tagged is never', () => {
    expectTypeOf<TagOf<string>>().toEqualTypeOf<never>()
    expectTypeOf<TagOf<{ code: number }>>().toEqualTypeOf<never>()
  })

  it('Tagged accepts any _tag string', () => {
    expectTypeOf<{ _tag: 'X'; y: 1 }>().toMatchTypeOf<Tagged>()
  })

  it('Ok/Fail views type _v', () => {
    expectTypeOf<Ok<number>['_v']>().toEqualTypeOf<number>()
    expectTypeOf<Ok<number>['_tag']>().toEqualTypeOf<0>()
    expectTypeOf<Fail<{ _tag: 'E' }>['_v']>().toEqualTypeOf<{ _tag: 'E' }>()
    expectTypeOf<Fail<never>['_tag']>().toEqualTypeOf<1>()
  })
})

import type { FailOf, OkOf, Outcome } from '../src/core'
import { die, fail, ok } from '../src/core'

describe('core types', () => {
  it('I2: Outcome<T, never> is a valid, honest signature', () => {
    expectTypeOf(ok(1)).toEqualTypeOf<Outcome<number, never>>()
    expectTypeOf(fail({ _tag: 'E' as const })).toEqualTypeOf<Outcome<never, { _tag: 'E' }>>()
    expectTypeOf(die('x')).toEqualTypeOf<Outcome<never, never>>()
  })

  it('covariance in T and E: never fits any signature', () => {
    expectTypeOf<Outcome<number, never>>().toMatchTypeOf<Outcome<number, { _tag: 'X' }>>()
    expectTypeOf<Outcome<never, never>>().toMatchTypeOf<Outcome<number, { _tag: 'X' }>>()
  })

  it('OkOf/FailOf project correctly', () => {
    type O = Outcome<number, { _tag: 'E' }>
    expectTypeOf<OkOf<O>>().toEqualTypeOf<number>()
    expectTypeOf<FailOf<O>>().toEqualTypeOf<{ _tag: 'E' }>()
  })

  it('predicate narrowing: _v typed after the guard', () => {
    const o = ok(1) as Outcome<number, { _tag: 'X'; n: number }>
    if (o.isOk()) expectTypeOf(o._v).toEqualTypeOf<number>()
    if (o.isFail()) expectTypeOf(o._v).toEqualTypeOf<{ _tag: 'X'; n: number }>()
  })
})
