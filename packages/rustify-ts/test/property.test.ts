import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  DEFECT,
  FAIL,
  OK,
  type Outcome,
  die,
  fail,
  filterOrFail,
  ok,
  tap,
} from '../src/index'

type E = { _tag: 'E' }
type O = Outcome<number, E>

const boom = new Error('boom')

const ops: ReadonlyArray<(o: O) => O> = [
  (o) => o.map((n) => n + 1),
  (o) =>
    o.map(() => {
      throw boom
    }),
  (o) => o.andThen((n) => ok(n * 2)),
  (o) => o.andThen(() => fail({ _tag: 'E' as const })),
  (o) =>
    o.andThen(() => {
      throw boom
    }),
  (o) => o.annotate('note'),
  (o) =>
    o.pipe(
      tap(() => {
        throw boom
      }),
    ),
  (o) => o.pipe(tap(() => undefined)),
  (o) =>
    o.pipe(
      filterOrFail(() => {
        throw boom
      }, { _tag: 'E' as const }),
    ),
  (o) => o.pipe(filterOrFail((n) => n > 0, { _tag: 'E' as const })),
]

const seeds: ReadonlyArray<O> = [ok(1), fail({ _tag: 'E' as const }), die(boom)]

describe('I5: no chain of combinators ever throws, no matter how it is built', () => {
  it('fuzzes random chains with throwing callbacks mixed in', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: seeds.length - 1 }),
        fc.array(fc.integer({ min: 0, max: ops.length - 1 }), { maxLength: 60 }),
        (seedIdx, opIdxs) => {
          let o = seeds[seedIdx] as O
          for (const i of opIdxs) o = (ops[i] as (o: O) => O)(o)
          expect([OK, FAIL, DEFECT]).toContain(o._tag)
        },
      ),
      { numRuns: 500 },
    )
  })

  it('the Ok state of a healthy chain keeps _fr === null (I1)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 20 }), { maxLength: 30 }), (ns) => {
        let o: O = ok(1)
        for (const n of ns) o = o.map((x) => x + n)
        expect(o._tag).toBe(OK)
        expect(o._fr).toBeNull()
      }),
    )
  })
})
