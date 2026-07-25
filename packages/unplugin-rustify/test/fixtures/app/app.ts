import { ok, fail, V } from 'rustify-ts'

export const run = (raw: unknown) =>
  V.struct({ id: ok(raw) })
    .map((v) => v)
    .catchTag('Invalid', () => fail({ _tag: 'Boom' as const }))

export const untouched: number[] = [1, 2].map((n) => n + 1)
