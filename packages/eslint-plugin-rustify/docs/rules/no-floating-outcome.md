# no-floating-outcome

> Disallow creating or producing an `Outcome` without handling it.

- Type: `problem`
- Requires type information: **yes**
- Autofix: no — suggestion only
- Included in: `rustify.configs.recommended` (as `error`)

## Rule details

An `Outcome<T, E>` carries three possible states: `Ok`, `Fail` and `Defect`.
Dropping one on the floor silently discards the `Fail` or the `Defect` — the
exact class of swallowed error `rustify-ts` exists to eliminate.

The type system forces you to *handle* an `Outcome` once you touch it, but it
cannot force you to *touch* it. This rule closes that last mile, the way
Rust's `#[must_use]` does for `Result`.

The rule reports an `ExpressionStatement` whose expression is typed as
`Outcome<...>` — including `Promise<Outcome<...>>` (awaited or not) and unions
that contain an `Outcome` member.

Only the `Outcome` type declared by the installed `rustify-ts` package counts.
A local type that happens to also be named `Outcome` is ignored: the rule
resolves each declaration file to its nearest `package.json` and checks the
`name` field, which works for both a plain `npm install` and a pnpm workspace
symlink.

## Examples

Incorrect:

```ts
ok(1)                              // Outcome created and dropped
syncDevice(body)                   // domain function returning Outcome, dropped
res.map(toDomain)                  // still an Outcome after the chain, dropped
fromPromise(p, classify)           // floating Promise<Outcome>
await fromPromise(p, classify)     // awaited, still dropped
```

Correct:

```ts
const r = syncDevice(body)         // assigned
r = syncDevice(body)               // reassigned
return syncDevice(body)            // returned
handle(syncDevice(body))           // passed as an argument
syncDevice(body).match(ok, onErr)  // the statement's type is R, not Outcome
void syncDevice(body)              // explicit intentional discard
notAnOutcome()                     // not an Outcome-typed expression
```

## Options

```ts
type Options = [{ ignoreVoid?: boolean }]
```

### `ignoreVoid`

`boolean`, default `true`.

When `true`, `void expr` is accepted as the idiomatic "I am discarding this on
purpose" opt-out. Set it to `false` to report even a `void`-ed `Outcome`, so
that every `Outcome` in the codebase must be genuinely consumed.

```js
// eslint.config.js
import rustify from 'eslint-plugin-rustify'

export default [
  rustify.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      'rustify/no-floating-outcome': ['error', { ignoreVoid: false }],
    },
  },
]
```

## Suggestion

The rule offers one suggestion — *Prepend `void` to explicitly ignore this
Outcome* — which wraps the expression as `void (expr)`. The parentheses keep
the result correct regardless of the expression's precedence.

The suggestion is offered only when it would actually silence the report: with
`ignoreVoid: false`, or on an expression that is already `void`-ed, adding
`void` changes nothing, so no suggestion appears and the message drops its
mention of `void`.

There is no autofix. Deciding how to handle an `Outcome` is a design decision
that an automated fix should not make for you.

## When not to use it

If you are not using `rustify-ts`, or your setup has no typed linting
(`parserOptions.project` / `parserOptions.projectService`), the rule cannot
run — it needs the type checker.

## Limitations

- Only the floating `ExpressionStatement` itself is checked. Whether an
  already-assigned variable is ever used afterwards is `no-unused-vars`'s job.
- An assignment statement (`x = makeOutcome()`) is treated as handled; the
  value has a home, even if that home is never read.

## Resources

- [Rule source](../../src/rules/no-floating-outcome.ts)
- [Tests](../../test/no-floating-outcome.test.ts)
