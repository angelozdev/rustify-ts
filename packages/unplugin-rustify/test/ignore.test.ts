import { describe, expect, it } from 'vitest'
import type { ResolvedOptions } from '../src/options'
import { transform } from '../src/transform'

const OPTIONS: ResolvedOptions = { include: [], exclude: [], sites: true, root: '/repo' }

const run = (code: string): string | null =>
  transform(code, '/repo/src/app.ts', OPTIONS)?.code ?? null

describe('@rustify-ignore', () => {
  it('skips every call of the statement it precedes', () => {
    const code = ["import { ok } from 'rustify-ts'", '/* @rustify-ignore */', 'const r = ok(1).map(f).andThen(g)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('skips the single call it precedes', () => {
    const code = ["import { fail } from 'rustify-ts'", 'const r = /* @rustify-ignore */ fail(e)'].join('\n')
    expect(run(code)).toBe(null)
  })

  it('leaves the rest of the file alone', () => {
    const code = [
      "import { fail } from 'rustify-ts'",
      '/* @rustify-ignore */',
      'const a = fail(e)',
      'const b = fail(e)',
    ].join('\n')
    const out = run(code)
    expect(out).toContain('const a = fail(e)\n')
    expect(out).toContain('const b = fail(e, "fail@src/app.ts:4")')
  })

  it('does nothing without the comment', () => {
    const code = ["import { ok } from 'rustify-ts'", 'const r = ok(1).map(f)'].join('\n')
    expect(run(code)).toContain('map(f, "map@src/app.ts:2")')
  })

  it('reads the marker inside a line comment too', () => {
    const code = ["import { fail } from 'rustify-ts'", '// @rustify-ignore', 'const a = fail(e)'].join('\n')
    expect(run(code)).toBe(null)
  })
})
