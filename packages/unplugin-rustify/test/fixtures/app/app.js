import { ok, fail, V } from 'rustify-ts'

export const run = (raw) =>
  V.struct({ id: ok(raw) })
    .map((v) => v)
    .catchTag('Invalid', () => fail({ _tag: 'Boom' }))

export const untouched = [1, 2].map((n) => n + 1)
