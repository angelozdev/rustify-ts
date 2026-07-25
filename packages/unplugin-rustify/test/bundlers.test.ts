import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import rustify from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, 'fixtures/app')

const STUB_ID = '\0rustify-stub'

function hasOutput(value: unknown): value is { output: ReadonlyArray<{ code: string }> } {
  return typeof value === 'object' && value !== null && 'output' in value
}

const firstChunk = (result: Awaited<ReturnType<typeof build>>): string => {
  const first = Array.isArray(result) ? result[0] : result
  if (!hasOutput(first)) throw new Error('vite produced no output')
  const chunk = first.output[0]
  if (chunk === undefined) throw new Error('vite produced no output')
  return chunk.code
}

const stub = {
  name: 'rustify-stub',
  resolveId: (source: string): string | null => (source === 'rustify-ts' ? STUB_ID : null),
  load: (id: string): string | null =>
    id === STUB_ID
      ? [
          'export const ok = (v, site) => ({ v, site })',
          'export const fail = (e, site) => ({ e, site })',
          'export const V = { struct: (s, site) => ({ s, site }) }',
        ].join('\n')
      : null,
}

describe('rollup', () => {
  it('injects sites into the bundle and leaves Array.prototype.map alone', async () => {
    const bundle = await rollup({
      input: resolve(root, 'app.js'),
      plugins: [rustify.rollup({ root }), stub],
      onwarn: () => {},
    })
    const { output } = await bundle.generate({ format: 'es' })
    await bundle.close()
    const code = output[0].code

    expect(code).toContain('"V.struct@app.js:4"')
    expect(code).toContain('"map@app.js:5"')
    expect(code).toContain('"catchTag@app.js:6"')
    expect(code).toContain('"fail@app.js:6"')
    expect(code).toContain('[1, 2].map((n) => n + 1)')
  })
})

describe('vite', () => {
  it('injects sites into a TypeScript entry', async () => {
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: { entry: resolve(root, 'app.ts'), formats: ['es'], fileName: 'app' },
      },
      plugins: [rustify.vite({ root }), stub],
    })
    const code = firstChunk(result)

    expect(code).toContain('"V.struct@app.ts:4"')
    expect(code).toContain('"map@app.ts:5"')
    expect(code).toContain('"catchTag@app.ts:6"')
    expect(code).toContain('[1, 2].map((n) => n + 1)')
  })

  it('injects nothing when sites are switched off', async () => {
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: { entry: resolve(root, 'app.ts'), formats: ['es'], fileName: 'app' },
      },
      plugins: [rustify.vite({ root, sites: false }), stub],
    })
    expect(firstChunk(result)).not.toContain('@app.ts:')
  })
})
