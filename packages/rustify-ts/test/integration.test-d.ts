import { describe, it } from 'vitest'
import type { Outcome } from '../src/core'

type SyncErr =
  | { _tag: 'Invalid'; fields: Record<string, unknown> }
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'Forbidden'; tenant: string }

type WithConflict = SyncErr | { _tag: 'Conflict'; version: number }

declare const res: Outcome<{ id: string }, SyncErr>
declare const grown: Outcome<{ id: string }, WithConflict>

const assertNever = (x: never): never => x

describe('exhaustiveness of the remaining error union', () => {
  it('covering every member compiles', () => {
    res.matchAll(
      (device) => device.id,
      (f) => {
        switch (f._tag) {
          case 'Invalid':
            return Object.keys(f.fields).join(',')
          case 'NotFound':
            return f.id
          case 'Forbidden':
            return f.tenant
          default:
            return assertNever(f)
        }
      },
      () => 'defect',
    )
  })

  it('one more member breaks the same switch', () => {
    grown.matchAll(
      (device) => device.id,
      (f) => {
        switch (f._tag) {
          case 'Invalid':
            return Object.keys(f.fields).join(',')
          case 'NotFound':
            return f.id
          case 'Forbidden':
            return f.tenant
          default:
            // @ts-expect-error Conflict is unhandled, so the value here is not never
            return assertNever(f)
        }
      },
      () => 'defect',
    )
  })
})
