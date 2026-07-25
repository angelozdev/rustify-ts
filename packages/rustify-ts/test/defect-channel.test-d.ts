import { describe, expectTypeOf, it } from 'vitest'
import { type Outcome, fail, ok } from '../src/core'
import { catchDefect, refine, sandbox, unsandbox } from '../src/defect'
import type { DefectPayload, SandboxedDefect } from '../src/trace'

type NotFound = { _tag: 'NotFound'; id: string }
type Network = { _tag: 'Network' }
type Err = NotFound | Network

declare const o: Outcome<number, Err>

describe('sandbox and unsandbox types', () => {
  it('sandbox adds SandboxedDefect to the error union', () => {
    expectTypeOf(sandbox(o)).toEqualTypeOf<Outcome<number, Err | SandboxedDefect>>()
  })

  it('unsandbox subtracts it again', () => {
    expectTypeOf(unsandbox(sandbox(o))).toEqualTypeOf<Outcome<number, Err>>()
  })

  it('both flow through pipe as unary functions', () => {
    expectTypeOf(o.pipe(sandbox)).toEqualTypeOf<Outcome<number, Err | SandboxedDefect>>()
    expectTypeOf(o.pipe(sandbox, unsandbox)).toEqualTypeOf<Outcome<number, Err>>()
  })

  it('unsandbox on an outcome with no payload in E is a type-level no-op', () => {
    expectTypeOf(unsandbox(o)).toEqualTypeOf<Outcome<number, Err>>()
  })

  it('a sandboxed payload is reachable from the fail channel', () => {
    const s = sandbox(o)
    expectTypeOf<
      Extract<typeof s extends Outcome<unknown, infer E> ? E : never, SandboxedDefect>
    >().toEqualTypeOf<SandboxedDefect>()
  })
})

describe('catchDefect types', () => {
  it('recovering to Ok leaves the error union untouched', () => {
    expectTypeOf(o.pipe(catchDefect(() => ok(0)))).toEqualTypeOf<Outcome<number, Err>>()
  })

  it('an error the handler produces joins the union', () => {
    const r = o.pipe(catchDefect(() => fail({ _tag: 'Reported' as const })))
    expectTypeOf(r).toEqualTypeOf<Outcome<number, Err | { _tag: 'Reported' }>>()
  })

  it('the handler sees the payload, never the domain error', () => {
    o.pipe(
      catchDefect((d) => {
        expectTypeOf(d).toEqualTypeOf<DefectPayload>()
        expectTypeOf(d.cause).toEqualTypeOf<unknown>()
        expectTypeOf(d.stack).toEqualTypeOf<string | undefined>()
        return ok(0)
      }),
    )
  })

  it('I2: catching a defect never puts DefectPayload into E', () => {
    expectTypeOf(o.pipe(catchDefect(() => ok(0)))).not.toEqualTypeOf<
      Outcome<number, Err | DefectPayload>
    >()
  })

  it('the recovered value joins the Ok type', () => {
    expectTypeOf(o.pipe(catchDefect(() => ok('fallback')))).toEqualTypeOf<
      Outcome<number | string, Err>
    >()
  })
})

describe('refine types', () => {
  it('refine keeps both parameters and types the predicate on E', () => {
    const r = o.pipe(
      refine((e) => {
        expectTypeOf(e).toEqualTypeOf<Err>()
        return e._tag === 'Network'
      }),
    )
    expectTypeOf(r).toEqualTypeOf<Outcome<number, Err>>()
  })
})
