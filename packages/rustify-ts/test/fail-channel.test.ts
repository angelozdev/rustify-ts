import { afterEach, describe, expect, it } from 'vitest'
import { DEFECT, FAIL, die, fail, ok } from '../src/core'
import { disableTracing, enableTracing } from '../src/trace'

afterEach(() => enableTracing())

type NotFound = { _tag: 'NotFound'; id: string }

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
