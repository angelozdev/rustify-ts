# Performance invariant checks

## I1 — happy path with no extra allocation

    pnpm --filter rustify-ts bench:invariants

Expected: `I1 OK`, retained ≈ 0 after GC, and `_fr: null`.

Complementary manual procedure (flat `--trace-gc`):

    node --trace-gc bench/invariants/i1-happy-alloc.mjs 2>&1 | grep -c Scavenge

The scavenges from the loop correspond only to the newly created Outcome
instances (unavoidable); there should be no growing Mark-Compact or old-space
usage.

## I4 — a single hidden class (arrives with slice 4)

    node --trace-deopt over a mixed-state workload. Pending until all three
    channels are complete.

## Type-checking budget

    pnpm --filter rustify-ts bench:types

Compiles `bench/types/pipeline.ts` — a 15-step chain over a 10-member error
union, plus an 8-field `V.struct` chain and the array validators — with
`tsc --extendedDiagnostics` and reads `Check time`. The budget is 2 seconds;
the script exits non-zero above it. Report the number on every milestone, and
report it before simplifying any type when it goes over.
