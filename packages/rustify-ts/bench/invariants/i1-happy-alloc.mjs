/**
 * I1: the happy path allocates nothing extra (no frames, no trace arrays).
 * Run with: pnpm --filter rustify-ts bench:invariants
 * Measures memory retained after GC: a loop of `map` over Ok must retain
 * nothing.
 */
import { ok } from '../../dist/index.js'

if (typeof globalThis.gc !== 'function') {
  console.error('Run with node --expose-gc')
  process.exit(1)
}

const N = 1_000_000
const inc = (n) => n + 1

/**
 * Warm-up: stabilizes hidden classes and inline caches before measuring.
 */
let o = ok(0)
for (let i = 0; i < 100_000; i++) o = ok(i).map(inc)

globalThis.gc()
const before = process.memoryUsage().heapUsed
for (let i = 0; i < N; i++) o = ok(i).map(inc)
globalThis.gc()
const after = process.memoryUsage().heapUsed

const retained = after - before
console.log(`I1 — retained after GC across ${N.toLocaleString()} map calls over Ok: ${retained} bytes`)
console.log(`last value: ${o._v} · _fr: ${o._fr}`)
if (o._fr !== null) {
  console.error('I1 VIOLATION: _fr is not null on the happy path')
  process.exit(1)
}
if (retained > 1_000_000) {
  console.error('I1 VIOLATION: memory retained after GC — the happy path is retaining garbage')
  process.exit(1)
}
console.log('I1 OK')
