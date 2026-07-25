import { describe, expect, it } from 'vitest'
import { resolveOptions } from '../src/options'

describe('resolveOptions', () => {
  it('defaults to source files outside node_modules, with sites on', () => {
    const options = resolveOptions(undefined)
    expect(options.sites).toBe(true)
    expect(options.root).toBe(process.cwd())
    expect(options.include).toHaveLength(1)
    expect(options.exclude).toHaveLength(1)
    expect(options.include[0]).toBeInstanceOf(RegExp)
  })

  it('keeps every value the caller passed', () => {
    const options = resolveOptions({ include: [/\.ts$/], exclude: [], sites: false, root: '/repo' })
    expect(options).toEqual({ include: [/\.ts$/], exclude: [], sites: false, root: '/repo' })
  })

  it('copies the arrays so a later mutation by the caller cannot reach the plugin', () => {
    const include = [/\.ts$/]
    const options = resolveOptions({ include })
    expect(options.include).not.toBe(include)
  })

  it('returns fresh arrays on each call when defaults are used', () => {
    const first = resolveOptions(undefined)
    const second = resolveOptions(undefined)
    expect(first.include).not.toBe(second.include)
    expect(first.exclude).not.toBe(second.exclude)
  })
})
