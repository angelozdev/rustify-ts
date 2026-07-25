# Performance invariant checks

## I1 — happy path with no extra allocation

    pnpm --filter rustify-ts bench:invariants

Expected: `I1 OK`, retained ≈ 0 after GC, and `_fr: null`.

Complementary manual procedure (flat `--trace-gc`):

    node --trace-gc bench/invariants/i1-happy-alloc.mjs 2>&1 | grep -c Scavenge

The scavenges from the loop correspond only to the newly created Outcome
instances (unavoidable); there should be no growing Mark-Compact or old-space
usage.

## I4 — a single hidden class

    pnpm --filter rustify-ts bench:invariants
    pnpm --filter rustify-ts bench:i4

Expected: `I4 OK`, 13 outcome shapes compared with none differing, and the
three defect payloads sharing one shape.

The hard gate is `%HaveSameMap` under `--allow-natives-syntax`, not the
`--trace-deopt` output: a control with three separate classes read in a hot
loop emits no `wrong map` deopt at all, because V8 turns the inline cache
megamorphic without deoptimizing. The printed deopt table is a diagnostic, and
only reasons that mean a shape assumption broke (`wrong map`, `wrong call
target`, `wrong instance type`, `wrong name`) fail the run.

## Type-checking budget

    pnpm --filter rustify-ts bench:types

Compiles `bench/types/pipeline.ts` — a 15-step chain over a 10-member error
union, an 8-field `V.struct` chain, the array validators, and a chain through
`refine` / `catchDefect` / `sandbox` / `unsandbox` — with
`tsc --extendedDiagnostics` and reads `Check time`. The budget is 2 seconds;
the script exits non-zero above it. Report the number on every milestone, and
report it before simplifying any type when it goes over.

## Comparative benchmarks

    pnpm --filter rustify-ts bench:compare

Builds `dist`, then runs the micro suite (construction, a healthy chain, the
fail path, recovering a tagged failure) and the macro suite (a full HTTP
handler over a mix of inputs) across the tracing on/off matrix, each written
three ways: native try/catch, rustify-ts, and neverthrow. Every macro run
first asserts the three implementations return identical `{ status, body }`
for each input, so the timings compare equal work.

### Results (Node v24.14.0, Apple M4 Max, machine of record — re-run for your own)

| Benchmark                              | rustify vs neverthrow (× slower) | rustify vs native try/catch |
| --------------------------------------- | --------------------------------- | ---------------------------- |
| creation                                | 1.14x                             | (native has no wrapper)      |
| happy chain (map x3, andThen)           | 1.59x                             | (native has no wrapper)      |
| fail path — tracing ON                  | 65.17x                             | 4.47x slower                 |
| fail path — tracing OFF                 | 2.69x                              | 5.50x faster                 |
| recover a tagged failure — tracing ON   | 7.27x                              | 2.21x faster                 |
| recover a tagged failure — tracing OFF  | 2.54x                              | 6.67x faster                 |
| macro handler — tracing ON              | 8.54x                              | 3.88x slower                 |
| macro handler — tracing OFF             | 2.79x                              | 1.34x slower                 |

Read the ratios, not the absolute nanoseconds: they move with the machine,
the verdict does not.

### How to read the budget

The guardrail set for this work was 2x of neverthrow, in production mode
(`disableTracing()` called), across every micro and macro benchmark. That
gate is only partially met:

- **The happy path holds.** Creation (1.14x) and the happy chain (1.59x)
  stay within 2x of neverthrow whether tracing is on or off. This part of the
  gate is real and reproducible.
- **The fail path and the macro handler do not hold, even in production
  mode.** With tracing off — the configuration every deployed service is
  expected to run — the fail path measures ~2.69x of neverthrow, recovering a
  tagged failure ~2.54x, and the full macro HTTP handler ~2.79x. All three
  sit above the 2x gate. This is a real, measured, reproducible result on
  this machine, not a one-off anomaly or noise from a single run.
- **Against native try/catch, on the paths where native handles an error**,
  rustify still comes out ahead in production mode: the fail path is ~5.50x
  faster than a real `throw`/`catch`, recovery is ~6.67x faster, and even the
  macro handler — which does more work per call than a bare try/catch — is
  only ~1.34x slower than the native version. A thrown exception still costs
  more than returning a tagged Outcome.

One caveat specific to the macro number: the rustify handler validates its
fields with `V.struct`, which accumulates every failing field instead of
stopping at the first one, while the neverthrow handler short-circuits on
the first failing check with a plain `andThen` chain — so part of the
~2.79x macro gap reflects doing more validation work per call, not purely
wrapper overhead.

The happy path against raw native arithmetic/object-literal is not a gate:
allocating a result wrapper costs, no Result type wins it, and neverthrow
pays a similar tax. Those numbers are visible in the raw benchmark output for
transparency, not reproduced here as a pass/fail line.

### Why tracing off is still over budget on the fail path

Tracing ON is the extreme case by design: `fail()` allocates an origin frame
and each step through `map`/`andThen` appends a `through` frame, so the
~65.17x and ~8.54x multiples above are the cost of the causal trace itself,
never paid on the happy path (`_fr` stays `null` on `Ok`, invariant I1).
`disableTracing()` removes most of that cost — the ratios drop by an order
of magnitude — but it does not bring the fail path down into neverthrow's
territory.

Reading `core.ts` and `trace.ts` directly now confirms there is no
allocation left ungated by `disableTracing()` on the Fail path: `__through`,
`catchTag`, and `__recover` all skip the extra frame work once tracing is
off. That confirmation required one real fix along the way: `catchTag` and
`catchTags` each built their `note` string (`` `catchTag('${tag}')` ``)
unconditionally on every call, even though `__recover` only reads that note
when tracing is on. That allocation was ungated by `disableTracing()` and
has been fixed — both call sites now build the note only behind
`__isTracing()`, the same guard `annotate()` already used. The fix is
behavior-preserving (the note was already discarded unused when tracing was
off) and does not move the fail-path-alone number, since that path never
calls `catchTag`.

The leading hypothesis for the remaining ~2.5x-2.8x is structural rather
than an allocation cost: `map`, `andThen`, and `__recover` each carry an
unconditional `try/catch` in their method body, used to convert a throwing
callback into a Defect on the `Ok` branch. It is plausible that this
`try/catch` limits how well V8 optimizes the method as a whole, including
the Fail-passthrough branch that never enters the guarded block. This is a
hypothesis, not a proven root cause. No fix for this structural cost has
been attempted here; the budget miss is documented as a known, measured
result and left as a follow-up.

### mapUnsafe / andThenUnsafe: not shipped

The spec allows a `try/catch`-free `mapUnsafe`/`andThenUnsafe` for hot loops
"only if the numbers justify it." They do not — but not for the reason
originally anticipated. The happy path is already within 2x of neverthrow
(1.14x creation, 1.59x happy chain), so a `try/catch`-free variant would not
move a number that is not over budget. And the benchmarks that are actually
over budget — the fail path, recovery, and the macro handler, at ~2.5x-2.8x
of neverthrow in production — are mechanically untouched by either method: both `mapUnsafe` and
`andThenUnsafe` are specified to early-return through the existing
Fail/Defect passthrough for anything that isn't `Ok`, exactly like `map` and
`andThen` do today. Shipping the unsafe pair would add API surface without
moving the figure that actually misses the gate.
