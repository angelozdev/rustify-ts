import { afterEach, describe, expect, it } from 'vitest'
import { DEFECT, FAIL, OK, die, fail, ok } from '../src/core'
import { disableTracing, enableTracing, formatTrace } from '../src/trace'
import { V } from '../src/validation'

afterEach(() => enableTracing())

type Empty = { _tag: 'Empty'; field: string }
type TooLong = { _tag: 'TooLong'; max: number }

const empty = (field: string): Empty => ({ _tag: 'Empty', field })
const tooLong = (max: number): TooLong => ({ _tag: 'TooLong', max })

describe('V.struct', () => {
  it('all Ok: the record of values, with no trace', () => {
    const o = V.struct({ id: ok('a'), n: ok(1) })
    expect(o._tag).toBe(OK)
    expect(o._v).toEqual({ id: 'a', n: 1 })
    expect(o._fr).toBeNull()
  })

  it('an empty record is Ok with an empty object', () => {
    const o = V.struct({})
    expect(o._tag).toBe(OK)
    expect(o._v).toEqual({})
  })

  it('accumulates every failed field, keyed like the input', () => {
    const o = V.struct(
      { id: fail(empty('id')), token: ok('t'), name: fail(tooLong(8)) },
      'V.struct@app.ts:4',
    )
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({
      _tag: 'Invalid',
      fields: { id: { _tag: 'Empty', field: 'id' }, name: { _tag: 'TooLong', max: 8 } },
    })
  })

  it('the Invalid trace is born at V.struct and drops the field traces', () => {
    const o = V.struct({ id: fail(empty('id'), 'validId@app.ts:1') }, 'V.struct@app.ts:4')
    expect(o._fr).toEqual([{ site: 'V.struct@app.ts:4', kind: 'origin', note: undefined }])
  })

  it('without a site the origin frame degrades to <unknown>', () => {
    const o = V.struct({ id: fail(empty('id')) })
    expect(o._fr).toEqual([{ site: 'V.struct@<unknown>', kind: 'origin', note: undefined }])
  })

  it('a Defect wins over accumulated failures and keeps its own trace', () => {
    const o = V.struct(
      { id: fail(empty('id')), token: die(new Error('bug'), 'parse@app.ts:2') },
      'V.struct@app.ts:4',
    )
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([
      { site: 'parse@app.ts:2', kind: 'origin', note: undefined },
      { site: 'V.struct@app.ts:4', kind: 'through', note: undefined },
    ])
  })

  it('with several Defects the first one in key order wins', () => {
    const o = V.struct({ a: die(new Error('first')), b: die(new Error('second')) })
    expect(formatTrace(o)).toContain('Error: first')
  })

  it('with tracing disabled it still validates, without frames', () => {
    disableTracing()
    const o = V.struct({ id: fail(empty('id')) })
    expect(o._tag).toBe(FAIL)
    expect(o._fr).toEqual([])
  })

  it('the trace header elides the fields, they are read from the error value', () => {
    const o = V.struct({ id: fail(empty('id')) }, 'V.struct@app.ts:4')
    expect(formatTrace(o).split('\n')[0]).toBe('Fail(Invalid { fields: {…} })')
  })
})
