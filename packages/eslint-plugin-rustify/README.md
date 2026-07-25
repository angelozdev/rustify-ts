# eslint-plugin-rustify

Type-aware ESLint rule for [rustify-ts](https://www.npmjs.com/package/rustify-ts): catches an `Outcome` that is created and never handled.

Dropping an `Outcome` silently discards its `Fail` or `Defect` — exactly the
class of swallowed error `rustify-ts` exists to eliminate. The core's types
force you to *handle* an `Outcome` once you touch it; they can't force you to
*touch* it. That last mile is static, and lives in this linter — the
equivalent of Rust's `#[must_use]` on `Result`.

## Install

```bash
npm i -D eslint-plugin-rustify
```

Requires ESLint `>=8.57.0` with typed linting already configured
(`parserOptions.project` or `parserOptions.projectService`). Flat config only
(ESLint 9+) — no eslintrc legacy preset.

## Usage

```js
// eslint.config.js
import rustify from 'eslint-plugin-rustify'

export default [
  // ...your typed-linting config (parserOptions.project / projectService)
  rustify.configs.recommended,
]
```

## Rule: `no-floating-outcome`

Reports an `ExpressionStatement` whose expression is an `Outcome<...>` (or
`Promise<Outcome<...>>`) and is therefore dropped:

```ts
ok(1)                          // ❌ Outcome created and dropped
syncDevice(body)                // ❌ a domain function returning Outcome, dropped
res.map(toDomain)                // ❌ still an Outcome after the chain, dropped
fromPromise(p, classify)         // ❌ floating Promise<Outcome>, with or without await
```

```ts
const r = syncDevice(body)       // ✅ assigned
return syncDevice(body)          // ✅ returned
handle(syncDevice(body))         // ✅ passed as an argument
syncDevice(body).match(ok, onErr) // ✅ the statement is the .match call — its type is R, not Outcome
void syncDevice(body)            // ✅ explicit intentional discard
notAnOutcome()                   // ✅ not an Outcome-typed expression
```

### Options

- **`ignoreVoid`** (`boolean`, default `true`) — when `true`, `void expr` on an
  Outcome is allowed as the idiomatic "I'm discarding this on purpose" opt-out.
  Set to `false` to report even a `void`-ed Outcome.

```js
rustify.configs.recommended,
{
  rules: {
    'rustify/no-floating-outcome': ['error', { ignoreVoid: false }],
  },
},
```

## What this doesn't do

- No autofix — only a suggestion that prepends `void `. Handling an `Outcome`
  is a design decision an automated fix shouldn't make for you.
- Only user-defined `Outcome` from `rustify-ts` is recognized; a locally
  defined type that happens to also be named `Outcome` is ignored.
- Downstream use of an already-assigned variable is `no-unused-vars`'s job,
  not this rule's — only the floating `ExpressionStatement` itself is checked.
