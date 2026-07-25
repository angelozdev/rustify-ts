import { describe, expect, it } from 'vitest'
import type { ResolvedOptions } from '../src/options'
import { transform } from '../src/transform'

const OPTIONS: ResolvedOptions = { include: [], exclude: [], sites: true, root: '/repo' }

const run = (code: string, id = '/repo/src/app.ts'): string | null =>
  transform(code, id, OPTIONS)?.code ?? null

describe('rooted receivers', () => {
  it('injects into every method of a chain that starts at a constructor', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1).map(f).andThen(g).mapFail(h).annotate("note")'].join('\n')
    expect(run(code)).toContain(
      'ok(1).map(f, "map@src/app.ts:2").andThen(g, "andThen@src/app.ts:2").mapFail(h, "mapFail@src/app.ts:2").annotate("note", "annotate@src/app.ts:2")',
    )
  })

  it('puts the site of catchTag after the handler', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1).catchTag("NotFound", h)'].join('\n')
    expect(run(code)).toContain('catchTag("NotFound", h, "catchTag@src/app.ts:2")')
  })

  it('reports the line of each step of a multiline chain', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1)', '  .map(f)', '  .andThen(g)'].join('\n')
    const out = run(code)
    expect(out).toContain('.map(f, "map@src/app.ts:3")')
    expect(out).toContain('.andThen(g, "andThen@src/app.ts:4")')
  })

  it('follows a constant bound to an outcome', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1)', 'const y = r.map(f)'].join('\n')
    expect(run(code)).toContain('r.map(f, "map@src/app.ts:3")')
  })

  it('follows a chain rooted at V.struct', () => {
    const code = ["import { V, ok } from 'rustify-ts'", 'const r = V.struct({ id: ok(1) }).map(f)'].join('\n')
    expect(run(code)).toContain('.map(f, "map@src/app.ts:2")')
  })

  it('follows a function built by fromThrowable', () => {
    const code = ["import { fromThrowable } from 'rustify-ts'", 'const safe = fromThrowable(fn, classify)', 'const r = safe(1).map(f)'].join('\n')
    expect(run(code)).toContain('safe(1).map(f, "map@src/app.ts:3")')
  })

  it('follows an awaited fromPromise', () => {
    const code = [
      "import { fromPromise } from 'rustify-ts'",
      'export async function load(p) {',
      '  const r = await fromPromise(p, classify)',
      '  return r.map(f)',
      '}',
    ].join('\n')
    expect(run(code)).toContain('r.map(f, "map@src/app.ts:4")')
  })

  it('sees through a type assertion', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = (ok(1) as Outcome<number, never>).map(f)'].join('\n')
    expect(run(code)).toContain('.map(f, "map@src/app.ts:2")')
  })

  it('follows a chain through a namespace import', () => {
    const code = ["import * as R from 'rustify-ts'", 'const r = R.ok(1).map(f)'].join('\n')
    expect(run(code)).toContain('.map(f, "map@src/app.ts:2")')
  })
})

describe('receivers it must never touch', () => {
  it('leaves Array.prototype.map alone in a file that does use rustify-ts', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1)', 'const xs = [1, 2].map(f)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('stops at pipe, whose result can be a plain value', () => {
    const code = [
      "import { ok, unwrapOr } from 'rustify-ts'",
      'const xs = ok([1]).pipe(unwrapOr([]))',
      'const ys = xs.map(f)',
    ].join('\n')
    expect(run(code)).toBe(null)
  })

  it('respects a shadowing binding in an inner scope', () => {
    const code = [
      "import { ok } from 'rustify-ts'",
      'const r = ok(1)',
      'export function g() {',
      '  const r = [1, 2]',
      '  return r.map(f)',
      '}',
    ].join('\n')
    expect(run(code)).toBe(null)
  })

  it('gives up on a binding that is reassigned', () => {
    const code = ["import { ok } from 'rustify-ts'", 'let r = ok(1)', 'r = [1, 2]', 'const y = r.map(f)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('gives up on a receiver that arrives as a parameter', () => {
    const code = ["import { ok } from 'rustify-ts'", 'export const g = (r) => r.map(f)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('does not grow a chain out of a method it does not know', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1).unknown().map(f)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('leaves the outputs alone: they take no site', () => {
    const code = [
      "import { ok } from 'rustify-ts'",
      'const a = ok(1).match(onOk, onFail)',
      'const b = ok(1).matchAll(onOk, onFail, onDefect)',
      'const c = ok(1).isOk()',
    ].join('\n')
    expect(run(code)).toBe(null)
  })
})
