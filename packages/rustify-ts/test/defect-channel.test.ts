import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFECT, FAIL, OK, type Outcome, die, fail, ok } from '../src/core'
import { catchDefect } from '../src/defect'
import { disableTracing, enableTracing, type DefectPayload } from '../src/trace'

afterEach(() => enableTracing())

type NotFound = { _tag: 'NotFound'; id: string }

const notFound = (id: string): NotFound => ({ _tag: 'NotFound', id })

describe('catchDefect', () => {
  it('on Defect: runs the handler and marks the trace as handled', () => {
    const o = die(new Error('bug'), 'die@app.ts:1').pipe(
      catchDefect(
        () => fail({ _tag: 'Reported' as const }, 'fail@handler.ts:9'),
        'catchDefect@app.ts:2',
      ),
    )
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'Reported' })
    expect(o._fr).toEqual([
      { site: 'die@app.ts:1', kind: 'origin', note: undefined },
      { site: 'catchDefect@app.ts:2', kind: 'handled', note: 'catchDefect' },
      { site: 'fail@handler.ts:9', kind: 'origin', note: undefined },
    ])
  })

  it('recovering to Ok drops the trace', () => {
    const o = die(new Error('bug')).pipe(
      catchDefect((d) => ok((d.cause as Error).message)),
    )
    expect(o._tag).toBe(OK)
    expect(o._v).toBe('bug')
    expect(o._fr).toBeNull()
  })

  it('the handler sees the cause and the lazy stack of an Error cause', () => {
    const cause = new Error('bug')
    const seen = vi.fn((d: DefectPayload) => ok(d.cause === cause && d.stack === cause.stack))
    const o = die(cause).pipe(catchDefect(seen))
    expect(o._v).toBe(true)
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('on Ok and Fail: the SAME instance, no frame', () => {
    const o: Outcome<number, NotFound> = ok(1)
    const f: Outcome<number, NotFound> = fail(notFound('a'))
    const h = () => ok(0)
    expect(o.pipe(catchDefect(h))).toBe(o)
    expect(f.pipe(catchDefect(h))).toBe(f)
  })

  it('a handler that throws becomes a Defect', () => {
    const o = die(new Error('bug')).pipe(
      catchDefect(() => {
        throw new Error('boom')
      }),
    )
    expect(o._tag).toBe(DEFECT)
    expect(o._fr).toEqual([{ site: 'catchDefect@<unknown>', kind: 'origin', note: undefined }])
  })

  it('with tracing disabled the handler still runs, without frames', () => {
    disableTracing()
    const o = die(new Error('bug')).pipe(catchDefect(() => fail({ _tag: 'Reported' as const })))
    expect(o._tag).toBe(FAIL)
    expect(o._fr).toEqual([])
  })
})
