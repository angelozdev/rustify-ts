import { describe, expect, it, vi } from 'vitest'
import { filterOrFail, tap, unwrapOr, unwrapOrThrow } from '../src/combinators'
import { DEFECT, FAIL, type Outcome, die, fail, ok } from '../src/core'

describe('tap (table §8: like map but without transforming)', () => {
  it('on Ok: runs the side-effect and returns the SAME instance (I1)', () => {
    const spy = vi.fn()
    const o = ok(5)
    expect(o.pipe(tap(spy))).toBe(o)
    expect(spy).toHaveBeenCalledWith(5)
  })

  it('on Ok with a callback that throws → Defect (I5)', () => {
    const o = ok(1).pipe(
      tap(() => {
        throw new Error('boom')
      }),
    )
    expect(o._tag).toBe(DEFECT)
    expect(o._fr?.[0]?.site).toBe('tap@<unknown>')
  })

  it('on Fail/Defect: passes through intact plus a through frame', () => {
    const spy = vi.fn()
    expect(fail('e').pipe(tap(spy))._fr?.at(-1)?.kind).toBe('through')
    expect(die('d').pipe(tap(spy))._fr?.at(-1)?.kind).toBe('through')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('filterOrFail (table §8: passes through intact WITHOUT a frame on Fail/Defect)', () => {
  it('pred true → same instance', () => {
    const o = ok(5)
    expect(o.pipe(filterOrFail((n) => n > 0, { _tag: 'NonPositive' as const }))).toBe(o)
  })

  it('pred false → Fail with an origin frame at filterOrFail', () => {
    const o = ok(-1).pipe(filterOrFail((n) => n > 0, { _tag: 'NonPositive' as const }))
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'NonPositive' })
    expect(o._fr?.[0]?.site).toBe('filterOrFail@<unknown>')
  })

  it('pred throws → Defect (I5)', () => {
    const o = ok(1).pipe(
      filterOrFail(() => {
        throw new Error('pred boom')
      }, { _tag: 'X' as const }),
    )
    expect(o._tag).toBe(DEFECT)
  })

  it('on Fail/Defect: the SAME instance, no frame (the exact table cell)', () => {
    const f = fail('e')
    const d = die('d')
    expect(f.pipe(filterOrFail(() => true, 'e2'))).toBe(f)
    expect(d.pipe(filterOrFail(() => true, 'e2'))).toBe(d)
  })
})

describe('unwrapOr (table §8: value / default / THROW)', () => {
  it('Ok → value; Fail → default', () => {
    expect(ok(3).pipe(unwrapOr(0))).toBe(3)
    const o: Outcome<number, string> = fail('e')
    expect(o.pipe(unwrapOr(0))).toBe(0)
  })

  it('Defect → throws (the default does NOT paper over bugs)', () => {
    expect(() => die(new Error('bug')).pipe(unwrapOr(0))).toThrow('Defect(Error: bug)')
  })
})

describe('unwrapOrThrow', () => {
  it('Ok → value', () => {
    expect(unwrapOrThrow(ok('v'))).toBe('v')
  })

  it('Fail → throws with the trace as the stack', () => {
    expect(() => unwrapOrThrow(fail({ _tag: 'E' as const }))).toThrow('Fail(E)')
  })

  it('Defect → throws', () => {
    expect(() => unwrapOrThrow(die('d'))).toThrow('Defect("d")')
  })
})
