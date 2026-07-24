import { afterEach, describe, expect, it } from 'vitest'
import { DEFECT, FAIL, OK, Outcome, die, fail, ok } from '../src/core'
import { disableTracing, enableTracing, formatTrace, type DefectPayload } from '../src/trace'

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

describe('match (table §8: onOk / onFail / THROW)', () => {
  it('Ok → onOk', () => {
    expect(ok(2).match((n) => n * 10, () => -1)).toBe(20)
  })

  it('Fail → onFail', () => {
    const o = fail({ _tag: 'E' as const, n: 7 })
    expect(o.match(() => -1, (e) => e.n)).toBe(7)
  })

  it('Defect → rethrows toError (the most important API decision)', () => {
    const cause = new Error('bug')
    const o = die(cause, 'die@app.ts:9')
    let thrown: unknown
    try {
      o.match(() => 'ok', () => 'fail')
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toBe('Defect(Error: bug)')
    expect((thrown as Error).stack).toBe(formatTrace(o))
    expect((thrown as Error).cause).toBe(cause)
  })
})

describe('matchAll (table §8: onOk / onFail / onDefect)', () => {
  it('three branches', () => {
    const onOk = (n: number) => `ok:${n}`
    const onFail = (e: { _tag: 'E' }) => `fail:${e._tag}`
    const onDefect = (d: DefectPayload) => `defect:${String(d.cause)}`
    expect(ok(1).matchAll(onOk, onFail, onDefect)).toBe('ok:1')
    expect(fail({ _tag: 'E' as const }).matchAll(onOk, onFail, onDefect)).toBe('fail:E')
    expect(die('x').matchAll(onOk, onFail, onDefect)).toBe('defect:x')
  })
})
