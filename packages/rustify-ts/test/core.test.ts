import { afterEach, describe, expect, it } from 'vitest'
import { DEFECT, FAIL, OK, Outcome, die, fail, ok } from '../src/core'
import { disableTracing, enableTracing, type DefectPayload } from '../src/trace'

afterEach(() => enableTracing())

describe('runtime representation (§5)', () => {
  it('ok: _tag 0, value in _v, _fr ALWAYS null (I1)', () => {
    const o = ok(42)
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(42)
    expect(o._fr).toBeNull()
    expect(o.trace).toBeNull()
  })

  it('fail: _tag 1, origin frame with explicit site', () => {
    const o = fail({ _tag: 'E' as const }, 'fail@app.ts:1')
    expect(o._tag).toBe(FAIL)
    expect(o._fr).toEqual([{ site: 'fail@app.ts:1', kind: 'origin', note: undefined }])
  })

  it('fail without site falls back to the combinator name', () => {
    expect(fail('e')._fr).toEqual([{ site: 'fail@<unknown>', kind: 'origin', note: undefined }])
  })

  it('die: payload with cause and lazy Error stack', () => {
    const cause = new Error('boom')
    const o = die(cause, 'die@app.ts:2')
    expect(o._tag).toBe(DEFECT)
    const p = o._v as DefectPayload
    expect(p.cause).toBe(cause)
    expect(p.stack).toBe(cause.stack)
    expect(o._fr).toEqual([{ site: 'die@app.ts:2', kind: 'origin', note: undefined }])
  })

  it('die with non-Error cause: stack undefined', () => {
    const p = die('raw')._v as DefectPayload
    expect(p.cause).toBe('raw')
    expect(p.stack).toBeUndefined()
  })

  it('a single hidden class: all three states are instances of Outcome', () => {
    expect(ok(1)).toBeInstanceOf(Outcome)
    expect(fail('e')).toBeInstanceOf(Outcome)
    expect(die('d')).toBeInstanceOf(Outcome)
  })

  it('disableTracing: fail/die produce no frames', () => {
    disableTracing()
    expect(fail('e')._fr).toEqual([])
    expect(die('d')._fr).toEqual([])
  })
})

describe('predicates', () => {
  it('isOk/isFail/isDefect', () => {
    expect(ok(1).isOk()).toBe(true)
    expect(ok(1).isFail()).toBe(false)
    expect(ok(1).isDefect()).toBe(false)
    expect(fail('e').isFail()).toBe(true)
    expect(die('d').isDefect()).toBe(true)
  })
})
