import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFECT, FAIL, OK, type Outcome, die, fail, ok } from '../src/core'
import { catchAll, catchTags, orElse } from '../src/combinators'
import { disableTracing, enableTracing, formatTrace } from '../src/trace'

afterEach(() => enableTracing())

type NotFound = { _tag: 'NotFound'; id: string }
type Network = { _tag: 'Network' }
type Err = NotFound | Network

const notFound = (id: string): NotFound => ({ _tag: 'NotFound', id })

describe('mapFail', () => {
  it('on Fail: transforms the error and appends a through frame', () => {
    const o = fail(notFound('a'), 'fail@app.ts:1').mapFail(
      (e) => ({ _tag: 'Wrapped' as const, inner: e._tag }),
      'mapFail@app.ts:2',
    )
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'Wrapped', inner: 'NotFound' })
    expect(o._fr).toEqual([
      { site: 'fail@app.ts:1', kind: 'origin', note: undefined },
      { site: 'mapFail@app.ts:2', kind: 'through', note: undefined },
    ])
  })

  it('on Ok: the SAME instance, no allocation', () => {
    const o = ok(1)
    expect(o.mapFail(() => 'other')).toBe(o)
  })

  it('on Defect: the SAME instance, no frame appended', () => {
    const d = die(new Error('bug'))
    expect(d.mapFail(() => 'other')).toBe(d)
    expect(d._fr).toHaveLength(1)
  })

  it('a callback that throws becomes a Defect', () => {
    const o = fail(notFound('a')).mapFail(() => {
      throw new Error('boom')
    })
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([{ site: 'mapFail@<unknown>', kind: 'origin', note: undefined }])
  })

  it('with tracing disabled it transforms without appending frames', () => {
    disableTracing()
    const o = fail(notFound('a')).mapFail((e) => e.id)
    expect(o._tag).toBe(FAIL)
    expect(o._v).toBe('a')
    expect(o._fr).toEqual([])
  })
})

describe('catchTag', () => {
  it('matching Fail: runs the handler and marks the trace as handled', () => {
    const o = fail(notFound('a'), 'fail@app.ts:1').catchTag(
      'NotFound',
      (e) => fail({ _tag: 'Wrapped' as const, id: e.id }, 'fail@handler.ts:9'),
      'catchTag@app.ts:2',
    )
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'Wrapped', id: 'a' })
    expect(o._fr).toEqual([
      { site: 'fail@app.ts:1', kind: 'origin', note: undefined },
      { site: 'catchTag@app.ts:2', kind: 'handled', note: "catchTag('NotFound')" },
      { site: 'fail@handler.ts:9', kind: 'origin', note: undefined },
    ])
  })

  it('recovering to Ok drops the trace: _fr stays null', () => {
    const o = fail(notFound('a')).catchTag('NotFound', () => ok(7))
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(7)
    expect(o._fr).toBeNull()
  })

  it('Fail with another tag: the SAME instance, no frame', () => {
    const f: Outcome<number, Err> = fail({ _tag: 'Network' as const })
    expect(f.catchTag('NotFound', () => ok(1))).toBe(f)
  })

  it('Ok and Defect: the SAME instance', () => {
    const o: Outcome<number, Err> = ok(1)
    const d: Outcome<number, Err> = die(new Error('bug'))
    const h = () => ok(2)
    expect(o.catchTag('NotFound', h)).toBe(o)
    expect(d.catchTag('NotFound', h)).toBe(d)
  })

  it('a handler that throws becomes a Defect', () => {
    const o = fail(notFound('a')).catchTag('NotFound', () => {
      throw new Error('boom')
    })
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([{ site: 'catchTag@<unknown>', kind: 'origin', note: undefined }])
  })

  it('renders the handled frame in formatTrace', () => {
    const o = fail(notFound('a'), 'fetchDevice@api/device.ts:41').catchTag(
      'NotFound',
      () => fail({ _tag: 'Boom' as const }, 'fail@http/handler.ts:88'),
      'catchTag@http/handler.ts:88',
    )
    expect(formatTrace(o)).toBe(
      [
        'Fail(Boom)',
        '    at fetchDevice         api/device.ts:41',
        "  ✔ handled                http/handler.ts:88   catchTag('NotFound')",
        '    at fail                http/handler.ts:88',
      ].join('\n'),
    )
  })

  it('with tracing disabled the handler still runs, without frames', () => {
    disableTracing()
    const o = fail(notFound('a')).catchTag('NotFound', (e) => fail({ _tag: 'W' as const, id: e.id }))
    expect(o._v).toEqual({ _tag: 'W', id: 'a' })
    expect(o._fr).toEqual([])
  })
})

describe('catchTags', () => {
  it('recovers with the handler matching the tag and marks it handled', () => {
    const o = fail(notFound('a'), 'fail@app.ts:1').pipe(
      catchTags(
        {
          NotFound: (e) => fail({ _tag: 'Wrapped' as const, id: e.id }, 'fail@handler.ts:9'),
          Network: () => ok(0),
        },
        'catchTags@app.ts:2',
      ),
    )
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'Wrapped', id: 'a' })
    expect(o._fr).toEqual([
      { site: 'fail@app.ts:1', kind: 'origin', note: undefined },
      { site: 'catchTags@app.ts:2', kind: 'handled', note: "catchTags('NotFound')" },
      { site: 'fail@handler.ts:9', kind: 'origin', note: undefined },
    ])
  })

  it('a tag with no handler passes through as the SAME instance', () => {
    const f: Outcome<number, Err> = fail({ _tag: 'Network' as const })
    expect(f.pipe(catchTags({ NotFound: () => ok(1) }))).toBe(f)
  })

  it('a tag colliding with an inherited Object property passes through as the SAME instance', () => {
    const f: Outcome<number, { _tag: 'toString' }> = fail({ _tag: 'toString' as const })
    expect(f.pipe(catchTags({ NotFound: () => ok(1) } as any))).toBe(f)
  })

  it('a Fail whose error is not tagged passes through as the SAME instance', () => {
    const f = fail('plain string error')
    expect(f.pipe(catchTags({}))).toBe(f)
  })

  it('Ok and Defect: the SAME instance', () => {
    const o: Outcome<number, Err> = ok(1)
    const d: Outcome<number, Err> = die(new Error('bug'))
    expect(o.pipe(catchTags({ NotFound: () => ok(2) }))).toBe(o)
    expect(d.pipe(catchTags({ NotFound: () => ok(2) }))).toBe(d)
  })

  it('a handler that throws becomes a Defect', () => {
    const o = fail(notFound('a')).pipe(
      catchTags({
        NotFound: () => {
          throw new Error('boom')
        },
      }),
    )
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([{ site: 'catchTags@<unknown>', kind: 'origin', note: undefined }])
  })
})

describe('catchAll and orElse', () => {
  it('catchAll recovers from any tag and marks it handled', () => {
    const o = fail(notFound('a'), 'fail@app.ts:1').pipe(
      catchAll(
        (e) => fail({ _tag: 'Wrapped' as const, id: e.id }, 'fail@handler.ts:9'),
        'catchAll@app.ts:2',
      ),
    )
    expect(o._fr).toEqual([
      { site: 'fail@app.ts:1', kind: 'origin', note: undefined },
      { site: 'catchAll@app.ts:2', kind: 'handled', note: undefined },
      { site: 'fail@handler.ts:9', kind: 'origin', note: undefined },
    ])
  })

  it('orElse ignores the error value', () => {
    const spy = vi.fn(() => ok(9))
    const o = fail(notFound('a')).pipe(orElse(spy))
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(9)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('neither one catches a Defect', () => {
    const d = die(new Error('bug'))
    const spy = vi.fn(() => ok(1))
    expect(d.pipe(catchAll(spy))).toBe(d)
    expect(d.pipe(orElse(spy))).toBe(d)
    expect(spy).not.toHaveBeenCalled()
  })

  it('Ok passes through as the SAME instance', () => {
    const o = ok(1)
    expect(o.pipe(catchAll(() => ok(2)))).toBe(o)
    expect(o.pipe(orElse(() => ok(2)))).toBe(o)
  })

  it('a handler that throws becomes a Defect', () => {
    const o = fail(notFound('a')).pipe(
      catchAll(() => {
        throw new Error('boom')
      }),
    )
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([{ site: 'catchAll@<unknown>', kind: 'origin', note: undefined }])
  })
})
