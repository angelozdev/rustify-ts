# rustify-ts

Typed error handling for TypeScript: honest types **and** honest runtime.

```bash
npm install rustify-ts
```

`Outcome<T, E>` has three states, not two:

| State       | Meaning                       | Who handles it                            |
| ----------- | ----------------------------- | ----------------------------------------- |
| `Ok<T>`     | the value                     | the happy path                            |
| `Fail<E>`   | a domain error                | someone will write recovery code for it   |
| `Defect`    | a bug                         | nobody can; it is reported and it fails   |

The question that classifies an error is not "how bad is it?" but "is anyone
going to write recovery code for this?". A timeout is a `Fail`. An
`undefined is not a function` is a `Defect`, and no `catchAll` will ever
swallow it.

## Quick start

```ts
import { V, ok, fail, formatTrace, type Outcome } from 'rustify-ts'

type SyncErr =
  | { _tag: 'Invalid'; fields: Record<string, unknown> }
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'Forbidden'; tenant: string }
  | { _tag: 'RateLimited'; retryInMs: number }
  | { _tag: 'Network' }

const syncDevice = (raw: unknown, tenant: string) =>
  V.struct({ id: validId(raw), token: validToken(raw) })
    .annotate(`tenant:${tenant}`)
    .andThen((input) => authorize(input, tenant))
    .andThen(fetchDevice)
    .map(toDomain)
    .mapFail(withTenant(tenant))

const res = syncDevice(body, tenant)

res
  .catchTag('RateLimited', () => ok(cached))
  .catchTag('Network', () => ok(cached))
  .matchAll(
    (device) => reply(200, device),
    (failure) => {
      switch (failure._tag) {
        case 'Invalid':
          return reply(422, { fields: failure.fields })
        case 'NotFound':
          return reply(404, { id: failure.id })
        case 'Forbidden':
          return reply(403, {})
      }
    },
    (defect) => {
      sentry.captureException(defect.cause, { extra: { trace: formatTrace(res) } })
      return reply(500, { error: 'internal' })
    },
  )
```

Each `catchTag` subtracts that member from the error type, so the switch above
covers exactly the three that are left. Add a sixth member to `SyncErr`
tomorrow and the compiler breaks that switch — which is the point.

## Causal traces

Every operation on the fail channel leaves a frame, so an error that reaches
the top tells you where it went:

```
Fail(RateLimited { retryInMs: 4200 })
    at fetchDevice          api/device.ts:41
  ↷ andThen                 sync/pipeline.ts:18
  ↷ map                     sync/pipeline.ts:19
  ✎ annotate                sync/pipeline.ts:20   "tenant:acme-prod"
  ✔ handled                 http/handler.ts:88    catchTag('RateLimited')
```

The happy path allocates nothing for this: an `Ok` never carries a trace. File
and line come from the build plugin; without it the frames read `<unknown>` and
everything else works the same. `disableTracing()` turns frames off entirely in
production.

## Accumulating validation

`V.struct` inspects every field instead of stopping at the first failure, and
the accumulated error is a normal tagged member of the union — it goes straight
into `catchTag('Invalid', …)` with no adapter, and `fields` mirrors the shape of
your input:

```ts
const validated = V.struct({ id: validId(raw), token: validToken(raw) })
//    Outcome<{ id: string; token: string }, Invalid<…>>
//    where the error is { _tag: 'Invalid', fields: { id?: Empty; token?: Empty } }
```

`V.all` and `V.tuple` do the same by position.

## The bug lane

Bugs stay out of `E` unless you deliberately ask for them:

```ts
import { catchDefect, refine, sandbox, unsandbox } from 'rustify-ts'

pipeline.pipe(catchDefect((d) => fail({ _tag: 'PluginCrashed' as const, cause: d.cause })))
pipeline.pipe(refine((e) => e._tag !== 'Impossible')) // a failure that cannot happen is a bug
sandbox(pipeline)   // Outcome<T, E | SandboxedDefect> — the bug becomes catchable
unsandbox(boxed)    // and goes back to being a bug
```

`.match(onOk, onFail)` rethrows a Defect on purpose: the path of least effort
never swallows a bug. Use `.matchAll` when you want to handle all three.

## API

**On the prototype:** `map`, `andThen`, `mapFail`, `catchTag`, `annotate`,
`match`, `matchAll`, `pipe`, `isOk`, `isFail`, `isDefect`, `trace`.

**Free functions, composed with `.pipe()`:** `tap`, `filterOrFail`, `catchTags`,
`catchAll`, `orElse`, `catchDefect`, `refine`, `sandbox`, `unsandbox`,
`unwrapOr`, `unwrapOrThrow`.

**Constructors and boundary:** `ok`, `fail`, `die`, `attempt`, `fromThrowable`,
`fromPromise`, `ensure`, `invariant`.

**Trace:** `formatTrace`, `toError`, `disableTracing`, `enableTracing`.

**Validation:** `V.struct`, `V.all`, `V.tuple`, `Invalid`.

## Facts

- ESM only, zero runtime dependencies, under 3 kB min+gzip (gated in CI).
- Node >= 18. TypeScript strict, no `any` in any public input or output.
- One runtime class for the three states, so there is one hidden class to
  optimize instead of three.

## License

MIT
