import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFECT, FAIL, OK, type Outcome, die, fail, ok } from '../src/core'
import { catchAll } from '../src/combinators'
import { catchDefect, sandbox, unsandbox } from '../src/defect'
import { disableTracing, enableTracing, formatTrace, type DefectPayload } from '../src/trace'

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

describe('sandbox and unsandbox', () => {
  it('sandbox moves a Defect to the Fail channel keeping payload and trace', () => {
    const d = die(new Error('bug'), 'die@app.ts:1')
    const s = sandbox(d)
    expect(s._tag).toBe(FAIL)
    expect(s._v).toBe(d._v)
    expect(s._fr).toBe(d._fr)
    expect(s.isFail()).toBe(true)
  })

  it('a sandboxed bug can be recovered by a domain handler', () => {
    const cause = new Error('bug')
    const o = sandbox(die(cause)).pipe(catchAll((e) => ok(e.cause)))
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(cause)
  })

  it('unsandbox puts it back with the trace untouched', () => {
    const d = die(new Error('bug'), 'die@app.ts:1')
    const u = unsandbox(sandbox(d))
    expect(u._tag).toBe(DEFECT)
    expect(u._v).toBe(d._v)
    expect(formatTrace(u)).toBe(formatTrace(d))
  })

  it('a hand-made payload-shaped Fail stays a Fail', () => {
    const handMade: DefectPayload = { cause: new Error('x'), stack: undefined }
    const f = fail(handMade)
    expect(unsandbox(f)).toBe(f)
  })

  it('Ok and a domain Fail pass through as the SAME instance', () => {
    const o: Outcome<number, NotFound> = ok(1)
    const f: Outcome<number, NotFound> = fail(notFound('a'))
    expect(sandbox(o)).toBe(o)
    expect(sandbox(f)).toBe(f)
    expect(unsandbox(o)).toBe(o)
    expect(unsandbox(f)).toBe(f)
  })

  it('both compose through pipe', () => {
    const d = die(new Error('bug'))
    expect(d.pipe(sandbox, unsandbox)._tag).toBe(DEFECT)
  })
})

describe('formatTrace headers for the defect channel', () => {
  it('a sandboxed payload reads as a Fail carrying a Defect', () => {
    const s = sandbox(die(new Error('bug'), 'die@app.ts:1'))
    expect(formatTrace(s).split('\n')[0]).toBe('Fail(Defect(Error: bug))')
  })

  it('a tagged cause keeps its tag in the header', () => {
    const d = die({ _tag: 'Weird', x: 1 }, 'die@app.ts:3')
    expect(formatTrace(d).split('\n')[0]).toBe('Defect(Weird { x: 1 })')
    expect(formatTrace(sandbox(d)).split('\n')[0]).toBe('Fail(Defect(Weird { x: 1 }))')
  })
})
