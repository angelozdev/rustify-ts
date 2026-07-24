import { afterEach, describe, expect, it } from 'vitest'
import {
  __isTracing,
  disableTracing,
  enableTracing,
  formatTrace,
  toError,
  type DefectPayload,
  type OutcomeShape,
} from '../src/trace'

const failShape: OutcomeShape = {
  _tag: 1,
  _v: { _tag: 'RateLimited', retryInMs: 4200 },
  _fr: [
    { site: 'fetchDevice@api/device.ts:41', kind: 'origin', note: undefined },
    { site: 'andThen@sync/pipeline.ts:18', kind: 'through', note: undefined },
    { site: 'annotate@sync/pipeline.ts:20', kind: 'note', note: 'tenant:acme-prod' },
    { site: 'catchTag@http/handler.ts:88', kind: 'handled', note: "catchTag('RateLimited')" },
  ],
}

describe('formatTrace', () => {
  it('formats the reference example from spec §8', () => {
    expect(formatTrace(failShape)).toBe(
      [
        'Fail(RateLimited { retryInMs: 4200 })',
        '    at fetchDevice         api/device.ts:41',
        '  ↷ andThen                sync/pipeline.ts:18',
        '  ✎ annotate               sync/pipeline.ts:20   "tenant:acme-prod"',
        "  ✔ handled                http/handler.ts:88   catchTag('RateLimited')",
      ].join('\n'),
    )
  })

  it('Ok with no frames: header only', () => {
    expect(formatTrace({ _tag: 0, _v: 42, _fr: null })).toBe('Ok(42)')
    expect(formatTrace({ _tag: 0, _v: 'hi', _fr: null })).toBe('Ok("hi")')
  })

  it('Fail non-tagged uses flat inspection', () => {
    expect(formatTrace({ _tag: 1, _v: 'boom', _fr: [] })).toBe('Fail("boom")')
  })

  it('Fail tagged with no extra props omits the braces', () => {
    expect(formatTrace({ _tag: 1, _v: { _tag: 'Network' }, _fr: [] })).toBe('Fail(Network)')
  })

  it('Defect with Error shows name: message', () => {
    const payload: DefectPayload = { cause: new TypeError('x is not a function'), stack: undefined }
    expect(formatTrace({ _tag: 2, _v: payload, _fr: [] })).toBe(
      'Defect(TypeError: x is not a function)',
    )
  })

  it('site without @ degrades gracefully', () => {
    const o: OutcomeShape = {
      _tag: 1,
      _v: { _tag: 'X' },
      _fr: [{ site: '<unknown>', kind: 'origin', note: undefined }],
    }
    expect(formatTrace(o)).toBe(['Fail(X)', '    at <unknown>           '].join('\n'))
  })
})

describe('toError', () => {
  it('message = header, stack = full trace', () => {
    const err = toError(failShape)
    expect(err.message).toBe('Fail(RateLimited { retryInMs: 4200 })')
    expect(err.stack).toBe(formatTrace(failShape))
  })

  it('preserves cause in Defect', () => {
    const cause = new Error('boom')
    const payload: DefectPayload = { cause, stack: undefined }
    const err = toError({ _tag: 2, _v: payload, _fr: [] })
    expect(err.cause).toBe(cause)
    expect(err.message).toBe('Defect(Error: boom)')
  })
})

describe('tracing flag', () => {
  afterEach(() => enableTracing())

  it('disableTracing/enableTracing toggle the flag', () => {
    expect(__isTracing()).toBe(true)
    disableTracing()
    expect(__isTracing()).toBe(false)
    enableTracing()
    expect(__isTracing()).toBe(true)
  })
})
