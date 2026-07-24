import { type Outcome, fail, ok } from '../../src/core'
import { catchAll, catchTags, filterOrFail, orElse, tap } from '../../src/combinators'

type E01 = { _tag: 'Invalid'; fields: Record<string, unknown> }
type E02 = { _tag: 'NotFound'; id: string }
type E03 = { _tag: 'Forbidden'; tenant: string }
type E04 = { _tag: 'RateLimited'; retryInMs: number }
type E05 = { _tag: 'Network' }
type E06 = { _tag: 'Timeout'; afterMs: number }
type E07 = { _tag: 'Conflict'; version: number }
type E08 = { _tag: 'Unauthorized' }
type E09 = { _tag: 'Unavailable'; region: string }
type E10 = { _tag: 'Throttled'; queue: string }

type Err = E01 | E02 | E03 | E04 | E05 | E06 | E07 | E08 | E09 | E10

declare const source: Outcome<{ id: string; n: number }, Err>

export const pipeline = source
  .map((v) => ({ ...v, step1: v.n + 1 }))
  .andThen((v) =>
    v.n > 0 ? ok({ ...v, step2: v.n * 2 }) : fail({ _tag: 'Conflict' as const, version: 1 }),
  )
  .map((v) => ({ ...v, step3: `${v.id}:${v.step2}` }))
  .pipe(tap((v) => void v.step3))
  .pipe(filterOrFail((v) => v.n < 100, { _tag: 'Throttled' as const, queue: 'main' }))
  .mapFail((e) => ({ ...e, at: 'stage6' as const }))
  .andThen((v) => ok({ ...v, step7: v.step1 + v.step2 }))
  .catchTag('RateLimited', (e) =>
    ok({
      id: 'cached',
      n: e.retryInMs,
      step1: 0,
      step2: 0,
      step3: '',
      step7: 0,
      at: 'stage6' as const,
    }),
  )
  .map((v) => ({ ...v, step9: v.step7.toString(16) }))
  .catchTag('Network', () => fail({ _tag: 'Unavailable' as const, region: 'us-east-1' }))
  .andThen((v) => ok({ ...v, step11: v.step9.length }))
  .pipe(
    catchTags({
      Timeout: (e) => fail({ _tag: 'Unavailable' as const, region: String(e.afterMs) }),
      Throttled: () => fail({ _tag: 'Unavailable' as const, region: 'eu' }),
    }),
  )
  .map((v) => ({ ...v, step13: v.step11 % 7 }))
  .mapFail((e) => ({ _tag: 'Wrapped' as const, inner: e._tag }))
  .pipe(
    catchAll((e) =>
      ok({
        id: e.inner,
        n: 0,
        step1: 0,
        step2: 0,
        step3: '',
        step7: 0,
        step9: '',
        step11: 0,
        step13: 0,
      }),
    ),
  )
  .pipe(
    orElse(() =>
      ok({
        id: 'x',
        n: 0,
        step1: 0,
        step2: 0,
        step3: '',
        step7: 0,
        step9: '',
        step11: 0,
        step13: 0,
      }),
    ),
  )
