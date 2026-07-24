import { afterEach, describe, expect, it } from 'vitest'
import { DEFECT, FAIL, OK, Outcome, die, fail, ok } from '../src/core'
import { disableTracing, enableTracing, type DefectPayload } from '../src/trace'

afterEach(() => enableTracing())

describe('representación runtime (§5)', () => {
  it('ok: _tag 0, valor en _v, _fr SIEMPRE null (I1)', () => {
    const o = ok(42)
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(42)
    expect(o._fr).toBeNull()
    expect(o.trace).toBeNull()
  })

  it('fail: _tag 1, frame origin con site explícito', () => {
    const o = fail({ _tag: 'E' as const }, 'fail@app.ts:1')
    expect(o._tag).toBe(FAIL)
    expect(o._fr).toEqual([{ site: 'fail@app.ts:1', kind: 'origin', note: undefined }])
  })

  it('fail sin site usa fallback con nombre de combinador', () => {
    expect(fail('e')._fr).toEqual([{ site: 'fail@<unknown>', kind: 'origin', note: undefined }])
  })

  it('die: payload con cause y stack lazy del Error', () => {
    const cause = new Error('boom')
    const o = die(cause, 'die@app.ts:2')
    expect(o._tag).toBe(DEFECT)
    const p = o._v as DefectPayload
    expect(p.cause).toBe(cause)
    expect(p.stack).toBe(cause.stack)
    expect(o._fr).toEqual([{ site: 'die@app.ts:2', kind: 'origin', note: undefined }])
  })

  it('die con cause no-Error: stack undefined', () => {
    const p = die('raw')._v as DefectPayload
    expect(p.cause).toBe('raw')
    expect(p.stack).toBeUndefined()
  })

  it('una sola hidden class: los tres estados son instancias de Outcome', () => {
    expect(ok(1)).toBeInstanceOf(Outcome)
    expect(fail('e')).toBeInstanceOf(Outcome)
    expect(die('d')).toBeInstanceOf(Outcome)
  })

  it('disableTracing: fail/die sin frames', () => {
    disableTracing()
    expect(fail('e')._fr).toEqual([])
    expect(die('d')._fr).toEqual([])
  })
})

describe('predicados', () => {
  it('isOk/isFail/isDefect', () => {
    expect(ok(1).isOk()).toBe(true)
    expect(ok(1).isFail()).toBe(false)
    expect(ok(1).isDefect()).toBe(false)
    expect(fail('e').isFail()).toBe(true)
    expect(die('d').isDefect()).toBe(true)
  })
})
