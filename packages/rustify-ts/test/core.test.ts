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

describe('map (table §8)', () => {
  it('on Ok: applies the callback, _fr stays null since the happy path allocates no trace', () => {
    const o = ok(2).map((n) => n + 1)
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(3)
    expect(o._fr).toBeNull()
  })

  it('on Ok with a callback that throws: becomes a Defect with the combinator site, since no combinator may ever throw', () => {
    const cause = new Error('cb boom')
    const o = ok(1).map(() => {
      throw cause
    })
    expect(o._tag).toBe(DEFECT)
    expect((o._v as DefectPayload).cause).toBe(cause)
    expect(o._fr).toEqual([{ site: 'map@<unknown>', kind: 'origin', note: undefined }])
  })

  it('on Fail: passes through intact plus a through frame (immutable append)', () => {
    const base = fail({ _tag: 'E' as const }, 'fail@a.ts:1')
    const o = base.map((n: never) => n)
    expect(o).not.toBe(base)
    expect(o._v).toBe(base._v)
    expect(o._fr).toEqual([
      { site: 'fail@a.ts:1', kind: 'origin', note: undefined },
      { site: 'map@<unknown>', kind: 'through', note: undefined },
    ])
    expect(base._fr).toHaveLength(1)
  })

  it('on Defect: passes through intact plus a through frame', () => {
    const o = die('bug', 'die@a.ts:1').map((n: never) => n)
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([
      { site: 'die@a.ts:1', kind: 'origin', note: undefined },
      { site: 'map@<unknown>', kind: 'through', note: undefined },
    ])
  })

  it('with an injected site, uses the literal', () => {
    const o = fail('e').map((n: never) => n, 'map@pipeline.ts:19')
    expect(o._fr?.at(-1)).toEqual({ site: 'map@pipeline.ts:19', kind: 'through', note: undefined })
  })

  it('with tracing disabled: pass-through returns the SAME instance', () => {
    disableTracing()
    const base = fail('e')
    expect(base.map((n: never) => n)).toBe(base)
  })
})

describe('andThen (table §8)', () => {
  it('on Ok: applies the callback and returns its Outcome', () => {
    expect(ok(2).andThen((n) => ok(n * 2))._v).toBe(4)
    const f = ok(2).andThen(() => fail({ _tag: 'E' as const }, 'fail@b.ts:2'))
    expect(f._tag).toBe(FAIL)
  })

  it('on Ok with a callback that throws: becomes a Defect, since no combinator may ever throw', () => {
    const o = ok(1).andThen(() => {
      throw new Error('boom')
    })
    expect(o._tag).toBe(DEFECT)
    expect(o._fr?.[0]?.site).toBe('andThen@<unknown>')
  })

  it('on Fail/Defect: passes through intact plus a through frame', () => {
    expect(fail('e').andThen(() => ok(1))._fr?.at(-1)?.kind).toBe('through')
    expect(die('d').andThen(() => ok(1))._fr?.at(-1)?.kind).toBe('through')
  })
})

describe('annotate (table §8, strict no-alloc on Ok)', () => {
  it('on Ok: no-op, returns the SAME instance, zero allocation', () => {
    const o = ok(1)
    expect(o.annotate('tenant:acme')).toBe(o)
  })

  it('on Fail: adds a note frame', () => {
    const o = fail('e', 'fail@c.ts:3').annotate('tenant:acme', 'annotate@c.ts:4')
    expect(o._fr?.at(-1)).toEqual({
      site: 'annotate@c.ts:4',
      kind: 'note',
      note: 'tenant:acme',
    })
  })

  it('on Defect: adds a note frame', () => {
    expect(die('d').annotate('ctx')._fr?.at(-1)?.kind).toBe('note')
  })
})

describe('pipe', () => {
  it('chains free functions', () => {
    const doubled = ok(3).pipe(
      (o) => o.map((n) => n * 2),
      (o) => o.match((n) => n, () => -1),
    )
    expect(doubled).toBe(6)
  })

  it('with no arguments returns this', () => {
    const o = ok(1)
    expect(o.pipe()).toBe(o)
  })
})
