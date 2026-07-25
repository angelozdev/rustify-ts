import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'
import rustifyBabel from '../src/babel'
import { transform as metroTransform } from './metro-transformer'

const run = (src: string, filename: string, options: object = { root: '/project' }): string => {
  const result = transformSync(src, {
    filename,
    cwd: process.cwd(),
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: [[rustifyBabel, options]],
  })
  const code = result?.code
  if (code === null || code === undefined) throw new Error('babel produced no code')
  return code
}

describe('babel adapter', () => {
  it('injects the same sites the bundler adapter does', () => {
    const src = [
      "import { ok, V, tap } from 'rustify-ts'",
      'export const run = (raw: unknown) =>',
      '  V.struct({ id: ok(raw) })',
      '    .map(toDomain)',
      '    .pipe(tap(log))',
      'export const untouched = [1, 2].map((n) => n + 1)',
    ].join('\n')

    const code = run(src, '/project/src/app.ts')
    expect(code).toContain('"V.struct@src/app.ts:3"')
    expect(code).toContain('"map@src/app.ts:4"')
    expect(code).toContain('"tap@src/app.ts:5"')
    expect(code).toContain('[1, 2].map(n => n + 1)')
  })

  it('handles a TSX file', () => {
    const src = ["import { ok } from 'rustify-ts'", 'export const View = () => <div>{ok(1).map(f)}</div>'].join('\n')
    expect(run(src, '/project/src/View.tsx')).toContain('"map@src/View.tsx:2"')
  })

  it('injects nothing when sites are switched off', () => {
    const src = ["import { ok } from 'rustify-ts'", 'export const r = ok(1).map(f)'].join('\n')
    expect(run(src, '/project/src/app.ts', { root: '/project', sites: false })).not.toContain('@src/app.ts')
  })

  it('leaves calls that are not rustify-ts alone', () => {
    const src = ["import { map } from 'lodash-es'", 'export const xs = map([1], (n) => n)'].join('\n')
    expect(run(src, '/project/src/app.ts')).not.toContain('@src/app.ts')
  })
})

describe('metro transformer fixture', () => {
  it('returns an AST whose code carries project-relative sites', () => {
    const { ast, code } = metroTransform({
      filename: '/project/src/screens/Sync.ts',
      options: { projectRoot: '/project' },
      src: ["import { ok, fail } from 'rustify-ts'", 'export const sync = () => ok(1).mapFail(() => fail(e))'].join('\n'),
    })

    expect(ast.type).toBe('File')
    expect(code).toContain('"mapFail@src/screens/Sync.ts:2"')
    expect(code).toContain('"fail@src/screens/Sync.ts:2"')
  })
})
