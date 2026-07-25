import { describe, expect, it } from 'vitest'
import type { ResolvedOptions } from '../src/options'
import { transform } from '../src/transform'

const OPTIONS: ResolvedOptions = { include: [], exclude: [], sites: true, root: '/repo' }

const run = (code: string, id = '/repo/src/app.ts'): string | null =>
  transform(code, id, OPTIONS)?.code ?? null

describe('direct calls', () => {
  it('injects a site into every export that takes one', () => {
    const code = [
      "import { fail, die, attempt, ensure, invariant, tap, filterOrFail } from 'rustify-ts'",
      'const a = fail(e)',
      'const b = die(cause)',
      'const c = attempt(f)',
      'const d = ensure(cond, e)',
      'const g = invariant(cond, "broken")',
      'const h = tap(log)',
      'const i = filterOrFail(pred, e)',
    ].join('\n')

    expect(run(code)).toBe(
      [
        "import { fail, die, attempt, ensure, invariant, tap, filterOrFail } from 'rustify-ts'",
        'const a = fail(e, "fail@src/app.ts:2")',
        'const b = die(cause, "die@src/app.ts:3")',
        'const c = attempt(f, "attempt@src/app.ts:4")',
        'const d = ensure(cond, e, "ensure@src/app.ts:5")',
        'const g = invariant(cond, "broken", "invariant@src/app.ts:6")',
        'const h = tap(log, "tap@src/app.ts:7")',
        'const i = filterOrFail(pred, e, "filterOrFail@src/app.ts:8")',
      ].join('\n'),
    )
  })

  it('injects into the recovery combinators', () => {
    const code = [
      "import { catchTags, catchAll, orElse, catchDefect, refine } from 'rustify-ts'",
      'const a = catchTags({})',
      'const b = catchAll(h)',
      'const c = orElse(h)',
      'const d = catchDefect(h)',
      'const g = refine(pred)',
    ].join('\n')

    const out = run(code)
    expect(out).toContain('catchTags({}, "catchTags@src/app.ts:2")')
    expect(out).toContain('catchAll(h, "catchAll@src/app.ts:3")')
    expect(out).toContain('orElse(h, "orElse@src/app.ts:4")')
    expect(out).toContain('catchDefect(h, "catchDefect@src/app.ts:5")')
    expect(out).toContain('refine(pred, "refine@src/app.ts:6")')
  })

  it('names the validation combinators the way the runtime does', () => {
    const code = ["import { V, ok } from 'rustify-ts'", 'const a = V.struct({ id: ok(1) })', 'const b = V.all([ok(1)])'].join('\n')
    const out = run(code)
    expect(out).toContain('V.struct({ id: ok(1) }, "V.struct@src/app.ts:2")')
    expect(out).toContain('V.all([ok(1)], "V.all@src/app.ts:3")')
  })

  it('leaves V.tuple alone: a trailing string would read as one more outcome', () => {
    const code = ["import { V, ok } from 'rustify-ts'", 'const a = V.tuple(ok(1), ok(2))'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('follows an import alias to the exported name', () => {
    const code = ["import { tap as t } from 'rustify-ts'", 'const a = t(log)'].join('\n')
    expect(run(code)).toContain('t(log, "tap@src/app.ts:2")')
  })

  it('follows a namespace import, including the V namespace', () => {
    const code = ["import * as R from 'rustify-ts'", 'const a = R.fail(e)', 'const b = R.V.struct({ id: R.ok(1) })'].join('\n')
    const out = run(code)
    expect(out).toContain('R.fail(e, "fail@src/app.ts:2")')
    expect(out).toContain('R.V.struct({ id: R.ok(1) }, "V.struct@src/app.ts:3")')
  })

  it('ignores a same-named function that comes from somewhere else', () => {
    const code = ["import { fail } from 'other-lib'", 'const a = fail(e)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('ignores a local function that shares the name', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const fail = (e) => e', 'const a = fail(e)'].join('\n')
    expect(run(code)).toBe(null)
  })
})

describe('arity guards', () => {
  it('respects a site the developer wrote by hand', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(e, "fail@by-hand.ts:1")'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('skips a call with fewer arguments than the site position', () => {
    const code = ["import { ensure } from 'rustify-ts'", 'const a = ensure(cond)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('skips a call whose arity is unknown because of a spread', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(...args)'].join('\n')
    expect(run(code)).toBe(null)
  })
})

describe('when there is nothing to do', () => {
  it('returns null for a file that never mentions rustify-ts', () => {
    expect(run('const a = fail(e)')).toBe(null)
  })

  it('returns null for a virtual module', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(e)'].join('\n')
    expect(run(code, '\0virtual:app')).toBe(null)
  })

  it('returns null when sites are switched off', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(e)'].join('\n')
    expect(transform(code, '/repo/src/app.ts', { ...OPTIONS, sites: false })).toBe(null)
  })

  it('never breaks a build on source it cannot parse', () => {
    expect(run("import { fail } from 'rustify-ts'\nconst a = fail(")).toBe(null)
  })
})

describe('output', () => {
  it('reads the path through the query suffix of a bundler id', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(e)'].join('\n')
    expect(run(code, '/repo/src/app.ts?v=3f2a')).toContain('"fail@src/app.ts:2"')
  })

  it('parses TypeScript and TSX', () => {
    const ts = ["import { fail } from 'rustify-ts'", 'const a: unknown = fail<{ _tag: "X" }>(e)'].join('\n')
    expect(run(ts)).toContain('"fail@src/app.ts:2"')

    const tsx = ["import { fail } from 'rustify-ts'", 'export const View = () => <div>{fail(e)}</div>'].join('\n')
    expect(run(tsx, '/repo/src/View.tsx')).toContain('"fail@src/View.tsx:2"')
  })

  it('ships a source map alongside the code', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const a = fail(e)'].join('\n')
    const result = transform(code, '/repo/src/app.ts', OPTIONS)
    expect(result).not.toBe(null)
    const map: unknown = JSON.parse(result!.map)
    expect(map).toMatchObject({ version: 3, sources: ['/repo/src/app.ts'] })
  })
})
