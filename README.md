# rustify-ts

[![CI](https://github.com/angelozdev/rustify-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/angelozdev/rustify-ts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/rustify-ts.svg)](https://www.npmjs.com/package/rustify-ts)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Typed error handling for TypeScript: honest types **and** honest runtime.

`Outcome<T, E>` has three states, not two — `Ok<T>` is the value, `Fail<E>` is a
domain error someone will write recovery code for, and `Defect` is a bug nobody
can recover from, so it is reported instead of swallowed. A timeout is a
`Fail`. An `undefined is not a function` is a `Defect`, and no `catchAll` will
ever catch it.

```bash
npm install rustify-ts
```

```ts
import { V, ok, formatTrace } from 'rustify-ts'

const syncDevice = (raw: unknown, tenant: string) =>
  V.struct({ id: validId(raw), token: validToken(raw) })
    .annotate(`tenant:${tenant}`)
    .andThen((input) => authorize(input, tenant))
    .andThen(fetchDevice)
    .map(toDomain)

const res = syncDevice(body, tenant)

res
  .catchTag('RateLimited', () => ok(cached))
  .matchAll(
    (device) => reply(200, device),
    (failure) => reply(422, { tag: failure._tag }),
    (defect) => {
      sentry.captureException(defect.cause, { extra: { trace: formatTrace(res) } })
      return reply(500, { error: 'internal' })
    },
  )
```

Each `catchTag` subtracts that member from the error type, so the handler you
write covers exactly what is left. Add a new error tomorrow and the compiler
breaks the switch — which is the point. Every operation on the fail channel
leaves a frame, so an error that reaches the top tells you where it went:

```
Fail(RateLimited { retryInMs: 4200 })
    at fetchDevice          api/device.ts:41
  ↷ andThen                 sync/pipeline.ts:18
  ✎ annotate                sync/pipeline.ts:20   "tenant:acme-prod"
  ✔ handled                 http/handler.ts:88    catchTag('RateLimited')
```

The happy path allocates nothing for this: an `Ok` never carries a trace.

Full API, accumulating validation and the bug lane: **[packages/rustify-ts](./packages/rustify-ts)**.

## Packages

| Package | What it is |
| --- | --- |
| [`rustify-ts`](./packages/rustify-ts) | The core: `Outcome<T, E>` with Ok / Fail / Defect and causal traces. ESM only, zero deps, under 3 kB min+gzip. |
| [`unplugin-rustify`](./packages/unplugin-rustify) | Optional build plugin: turns `<unknown>` trace frames into `file:line`. Vite, Rollup, webpack, esbuild, rspack, Metro. |
| [`eslint-plugin-rustify`](./packages/eslint-plugin-rustify) | `#[must_use]` for `Outcome`: catches a created-and-never-handled Outcome at lint time. |

## Status

`rustify-ts@2` is a rewrite and a hard break from `1.x`: `Result` and `Option`
are gone, replaced by `Outcome`, and the package is now ESM only. `1.x` stays
installable as `rustify-ts@1`. See the
[migration table](./packages/rustify-ts/README.md#migrating-from-1x) and the
[changelog](./packages/rustify-ts/CHANGELOG.md).

Node `>=20`.

## Development

    pnpm install
    pnpm build
    pnpm lint          # tsc --noEmit
    pnpm test          # unit + type tests across the workspace

Benchmarks (manual, not a PR gate):

    pnpm --filter rustify-ts bench:compare   # micro + macro vs native try/catch and neverthrow
    pnpm --filter rustify-ts bench:all       # invariants I1/I4, type-check budget, and the above

## License

MIT © Angelo Zambrano
