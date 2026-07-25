import { describe, expect, it } from 'vitest'
import { cleanId, displayPath, isVirtual, siteOf } from '../src/site'

describe('cleanId', () => {
  it('drops the query suffix a bundler appends to an id', () => {
    expect(cleanId('/repo/src/app.ts?v=3f2a')).toBe('/repo/src/app.ts')
  })

  it('leaves a plain id untouched', () => {
    expect(cleanId('/repo/src/app.ts')).toBe('/repo/src/app.ts')
  })
})

describe('isVirtual', () => {
  it('recognizes the null byte that marks a virtual module', () => {
    expect(isVirtual('\0rustify-stub')).toBe(true)
  })

  it('accepts a real file', () => {
    expect(isVirtual('/repo/src/app.ts')).toBe(false)
  })
})

describe('displayPath', () => {
  it('is relative to the root', () => {
    expect(displayPath('/repo/src/api/device.ts', '/repo')).toBe('src/api/device.ts')
  })

  it('drops the query before relativizing', () => {
    expect(displayPath('/repo/src/app.ts?v=1', '/repo')).toBe('src/app.ts')
  })

  it('keeps a path that lives outside the root readable', () => {
    expect(displayPath('/other/src/app.ts', '/repo')).toBe('../other/src/app.ts')
  })
})

describe('siteOf', () => {
  it('formats what a trace frame stores', () => {
    expect(siteOf('src/api/device.ts', 'andThen', 41)).toBe('andThen@src/api/device.ts:41')
  })
})
