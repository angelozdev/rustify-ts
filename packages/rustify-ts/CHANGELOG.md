# Changelog

## 2.0.0 — 2026-07-25

A full rewrite. v2 shares the name with `1.x` and nothing else: the API, the
module format and the supported Node range all changed. There is no codemod
and no compatibility layer.

### Breaking

- **`Result<T, E>` is gone; `Outcome<T, E>` replaces it.** The new type has
  three states instead of two — `Ok<T>`, `Fail<E>` for a domain error someone
  will write recovery code for, and `Defect` for a bug nobody can recover
  from. A `Defect` is never caught by `catchAll`, and `.match(onOk, onFail)`
  rethrows it on purpose.
- **`Option<T>` is gone, with no replacement.** `Option`, `Some`, `None`,
  `some` and `none` are not exported in v2. Use `T | undefined`, or stay on
  `1.x`.
- **`err()` is now `fail()`.** `ok()` keeps its name.
- **The prototype is much smaller.** v1's `unwrap`, `unwrapErr`, `expect`,
  `flatMap`, `mapError`, `zip`, `xor`, `transpose`, `okOr`, `toNullable` and
  the rest of that surface are gone. v2 keeps `map`, `andThen`, `mapFail`,
  `catchTag`, `annotate`, `match`, `matchAll`, `pipe`, `isOk`, `isFail`,
  `isDefect` and `trace` on the prototype, and moves the rest to free
  functions composed with `.pipe()`: `tap`, `filterOrFail`, `catchTags`,
  `catchAll`, `orElse`, `catchDefect`, `refine`, `sandbox`, `unsandbox`,
  `unwrapOr`, `unwrapOrThrow`.
  - `flatMap` → `andThen`
  - `mapError` → `mapFail`
  - `unwrapOr` → still `unwrapOr`, but used as `res.pipe(unwrapOr(d))`
  - `unwrap` / `expect` → `unwrapOrThrow`, or better, `match` / `matchAll`
- **ESM only.** `1.x` shipped both CJS and ESM; v2 ships ESM only. A CJS
  consumer must use a dynamic `import()`.
- **Node `>=20`.** `1.x` declared `>=14.0.0`.

### Added

- **Causal traces.** Every operation on the fail channel leaves a frame, so an
  error that reaches the top says where it went. `formatTrace`, `toError`,
  `disableTracing`, `enableTracing`. An `Ok` never carries a trace, so the
  happy path allocates nothing for this.
- **The `Defect` channel.** `die`, `invariant`, `catchDefect`, `refine`,
  `sandbox`, `unsandbox` — bugs stay out of `E` unless you deliberately ask
  for them.
- **Accumulating validation.** `V.struct`, `V.all` and `V.tuple` inspect every
  field instead of stopping at the first failure, and the accumulated error is
  a normal tagged member of the union.
- **Tag-directed recovery.** `catchTag` / `catchTags` subtract the handled
  member from the error type, so the remaining switch is exhaustive and breaks
  when a new error is added.
- **Boundary helpers.** `attempt`, `fromThrowable`, `fromPromise`, `ensure`.
- **Companion packages.** [`unplugin-rustify`](https://github.com/angelozdev/rustify-ts/tree/main/packages/unplugin-rustify)
  turns `<unknown>` trace frames into `file:line` at build time;
  [`eslint-plugin-rustify`](https://github.com/angelozdev/rustify-ts/tree/main/packages/eslint-plugin-rustify)
  catches an `Outcome` that is created and never handled.

## 1.x

See the [1.2.0 release](https://www.npmjs.com/package/rustify-ts/v/1.2.0) for
the `Result` / `Option` API.
