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
union, plus an 8-field `V.struct` chain and the array validators — with
`tsc --extendedDiagnostics` and reads `Check time`. The budget is 2 seconds;
the script exits non-zero above it. Report the number on every milestone, and
report it before simplifying any type when it goes over.
