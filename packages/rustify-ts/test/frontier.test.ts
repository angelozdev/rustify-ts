import { describe, expect, it } from 'vitest'
import {
  DEFECT,
  FAIL,
  OK,
  attempt,
  die,
  ensure,
  fail,
  fromPromise,
  fromThrowable,
  invariant,
} from '../src/core'
import type { DefectPayload } from '../src/trace'

describe('attempt', () => {
  it('f returns → Ok', () => {
    const o = attempt(() => JSON.parse('{"a":1}') as { a: number })
    expect(o._tag).toBe(OK)
    expect(o._v).toEqual({ a: 1 })
  })

  it('f throws → Defect, NEVER Fail', () => {
    const o = attempt(() => JSON.parse('nope'))
    expect(o._tag).toBe(DEFECT)
    expect((o._v as DefectPayload).cause).toBeInstanceOf(SyntaxError)
    expect(o._fr?.[0]?.site).toBe('attempt@<unknown>')
  })
})

describe('fromThrowable (the centerpiece of the boundary)', () => {
  const parse = fromThrowable(
    (s: string) => JSON.parse(s) as unknown,
    (cause) => (cause instanceof SyntaxError ? fail({ _tag: 'BadJson' as const }) : die(cause)),
  )

  it('does not throw → Ok', () => {
    expect(parse('1')._tag).toBe(OK)
  })

  it('classify recognizes the cause → typed Fail', () => {
    const o = parse('nope')
    expect(o._tag).toBe(FAIL)
    expect(o._v).toEqual({ _tag: 'BadJson' })
  })

  it('classify does not recognize the cause → Defect (die inside classify)', () => {
    const boom = fromThrowable(
      () => {
        throw 'raw-string'
      },
      (cause) => (cause instanceof SyntaxError ? fail({ _tag: 'BadJson' as const }) : die(cause)),
    )
    const o = boom()
    expect(o._tag).toBe(DEFECT)
    expect((o._v as DefectPayload).cause).toBe('raw-string')
  })

  it('classify itself THROWS → Defect with the ORIGINAL cause, since no combinator may ever throw', () => {
    const broken = fromThrowable(
      () => {
        throw new Error('original')
      },
      () => {
        throw new Error('classify bug')
      },
    )
    const o = broken()
    expect(o._tag).toBe(DEFECT)
    expect(((o._v as DefectPayload).cause as Error).message).toBe('original')
  })
})

describe('fromPromise', () => {
  it('resolves → Ok', async () => {
    const o = await fromPromise(Promise.resolve(7), () => die('x'))
    expect(o._tag).toBe(OK)
    expect(o._v).toBe(7)
  })

  it('rejects → classify decides', async () => {
    const o = await fromPromise(
      Promise.reject(new Error('net')),
      () => fail({ _tag: 'Network' as const }),
    )
    expect(o._tag).toBe(FAIL)
  })

  it('classify throws → Defect with the original cause', async () => {
    const original = new Error('original')
    const o = await fromPromise(Promise.reject(original), () => {
      throw new Error('classify bug')
    })
    expect(o._tag).toBe(DEFECT)
    expect((o._v as DefectPayload).cause).toBe(original)
  })
})

describe('ensure / invariant (one validates the world, the other your own code)', () => {
  it('ensure true → Ok(void); false → Fail', () => {
    expect(ensure(true, { _tag: 'E' as const })._tag).toBe(OK)
    const o = ensure(false, { _tag: 'E' as const }, 'ensure@d.ts:5')
    expect(o._tag).toBe(FAIL)
    expect(o._fr?.[0]?.site).toBe('ensure@d.ts:5')
  })

  it('invariant true → Ok(void); false → Defect with Error(msg)', () => {
    expect(invariant(true, 'must hold')._tag).toBe(OK)
    const o = invariant(false, 'must hold')
    expect(o._tag).toBe(DEFECT)
    expect(((o._v as DefectPayload).cause as Error).message).toBe('must hold')
    expect(o._fr?.[0]?.site).toBe('invariant@<unknown>')
  })
})
