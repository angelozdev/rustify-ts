import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'
import rustify from '../src/index'
import type { ResolvedOptions } from '../src/options'
import rustifyBabel from '../src/babel'
import { transform } from '../src/transform'

const FILENAME = '/repo/src/app.ts'
const ROOT = '/repo'
const OPTIONS: ResolvedOptions = { include: [], exclude: [], sites: true, root: ROOT }

const SITE_PATTERN = /"[A-Za-z.]+@[^"]+:\d+"/g

function extractSites(code: string): Set<string> {
  return new Set(code.match(SITE_PATTERN) ?? [])
}

function runBundler(code: string): Set<string> {
  const output = transform(code, FILENAME, OPTIONS)
  return extractSites(output?.code ?? code)
}

function runBabelDriver(code: string): Set<string> {
  const result = transformSync(code, {
    filename: FILENAME,
    cwd: process.cwd(),
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: [[rustifyBabel, { root: ROOT }]],
  })
  const out = result?.code
  if (out === null || out === undefined) throw new Error('babel produced no code')
  return extractSites(out)
}

const CORPUS: ReadonlyArray<{ name: string; code: string }> = [
  {
    name: 'direct calls to every free export',
    code: [
      "import { fail, die, attempt, ensure, invariant, tap, filterOrFail } from 'rustify-ts'",
      'const a = fail(e)',
      'const b = die(cause)',
      'const c = attempt(f)',
      'const d = ensure(cond, e)',
      'const g = invariant(cond, "broken")',
      'const h = tap(log)',
      'const i = filterOrFail(pred, e)',
    ].join('\n'),
  },
  {
    name: 'the recovery combinators',
    code: [
      "import { catchTags, catchAll, orElse, catchDefect, refine } from 'rustify-ts'",
      'const a = catchTags({})',
      'const b = catchAll(h)',
      'const c = orElse(h)',
      'const d = catchDefect(h)',
      'const g = refine(pred)',
    ].join('\n'),
  },
  {
    name: 'the validation combinators',
    code: ["import { V, ok } from 'rustify-ts'", 'const a = V.struct({ id: ok(1) })', 'const b = V.all([ok(1)])'].join('\n'),
  },
  {
    name: 'a method chain rooted at a producer',
    code: ["import { ok } from 'rustify-ts'", 'const r = ok(1).map(f).andThen(g)'].join('\n'),
  },
  {
    name: 'the catchTag method with its handler before the site',
    code: ["import { ok } from 'rustify-ts'", 'const r = ok(1).catchTag("NotFound", h)'].join('\n'),
  },
  {
    name: 'a chain spread across several lines',
    code: ["import { ok } from 'rustify-ts'", 'const r = ok(1)', '  .map(f)', '  .andThen(g)'].join('\n'),
  },
  {
    name: 'a chain rooted at V.struct',
    code: ["import { V, ok } from 'rustify-ts'", 'const r = V.struct({ id: ok(1) }).map(f)'].join('\n'),
  },
  {
    name: 'a chain rooted at V.tuple',
    code: ["import { V, ok } from 'rustify-ts'", 'const r = V.tuple(ok(1), ok(2)).map(f)'].join('\n'),
  },
  {
    name: 'a constant bound to an outcome',
    code: ["import { ok } from 'rustify-ts'", 'const r = ok(1)', 'const y = r.map(f)'].join('\n'),
  },
  {
    name: 'a function built by fromThrowable',
    code: ["import { fromThrowable } from 'rustify-ts'", 'const safe = fromThrowable(fn, classify)', 'const r = safe(1).map(f)'].join('\n'),
  },
  {
    name: 'an awaited fromPromise',
    code: [
      "import { fromPromise } from 'rustify-ts'",
      'export async function load(p) {',
      '  const r = await fromPromise(p, classify)',
      '  return r.map(f)',
      '}',
    ].join('\n'),
  },
  {
    name: 'a chain seen through a type assertion',
    code: ["import { ok } from 'rustify-ts'", 'const r = (ok(1) as Outcome<number, never>).map(f)'].join('\n'),
  },
  {
    name: 'a namespace import, including the V namespace',
    code: ["import * as R from 'rustify-ts'", 'const a = R.fail(e)', 'const b = R.V.struct({ id: R.ok(1) })'].join('\n'),
  },
  {
    name: 'an import alias',
    code: ["import { tap as t } from 'rustify-ts'", 'const a = t(log)'].join('\n'),
  },
  {
    name: 'a call the @rustify-ignore marker opts out',
    code: ["import { ok } from 'rustify-ts'", '/* @rustify-ignore */', 'const r = ok(1).map(f).andThen(g)'].join('\n'),
  },
  {
    name: 'Array.prototype.map, a false positive the plugin must never touch',
    code: ["import { ok } from 'rustify-ts'", 'const r = ok(1)', 'const xs = [1, 2].map(f)'].join('\n'),
  },
  {
    name: 'a call whose arity is unknown because of a spread',
    code: ["import { fail } from 'rustify-ts'", 'const a = fail(...args)'].join('\n'),
  },
  {
    name: 'pipe, which stops a chain because its result may be any value',
    code: ["import { ok, unwrapOr } from 'rustify-ts'", 'const xs = ok([1]).pipe(unwrapOr([]))', 'const ys = xs.map(f)'].join('\n'),
  },
]

describe('driver parity', () => {
  it.each(CORPUS)('injects the same sites through both drivers: $name', ({ code }) => {
    expect(runBundler(code)).toEqual(runBabelDriver(code))
  })
})

describe('filter wiring', () => {
  it('carries the resolved include and exclude onto the rollup transform filter', () => {
    const include = [/\.ts$/]
    const exclude = [/dist/]
    const plugin = rustify.rollup({ include, exclude })
    const hook = plugin.transform
    if (hook === undefined || typeof hook === 'function') {
      throw new Error('expected an object hook carrying a filter')
    }
    expect(hook.filter?.id).toEqual({ include, exclude })
  })
})
