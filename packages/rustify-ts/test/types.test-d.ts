import { describe, expectTypeOf, it } from 'vitest'
import type { Fail, Ok, TagOf, Tagged } from '../src/types'

describe('types helpers', () => {
  it('TagOf extrae la unión de tags', () => {
    type E = { _tag: 'A'; x: number } | { _tag: 'B' }
    expectTypeOf<TagOf<E>>().toEqualTypeOf<'A' | 'B'>()
  })

  it('TagOf sobre no-tagged es never', () => {
    expectTypeOf<TagOf<string>>().toEqualTypeOf<never>()
    expectTypeOf<TagOf<{ code: number }>>().toEqualTypeOf<never>()
  })

  it('Tagged acepta cualquier _tag string', () => {
    expectTypeOf<{ _tag: 'X'; y: 1 }>().toMatchTypeOf<Tagged>()
  })

  it('vistas Ok/Fail tipan _v', () => {
    expectTypeOf<Ok<number>['_v']>().toEqualTypeOf<number>()
    expectTypeOf<Ok<number>['_tag']>().toEqualTypeOf<0>()
    expectTypeOf<Fail<{ _tag: 'E' }>['_v']>().toEqualTypeOf<{ _tag: 'E' }>()
    expectTypeOf<Fail<never>['_tag']>().toEqualTypeOf<1>()
  })
})
