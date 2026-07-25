/**
 * Runs the I4 workload under --trace-deopt and reports the deoptimization
 * reasons V8 emitted. The hard gate is the map comparison inside the workload;
 * the reasons below are diagnostics, and only those that mean a shape
 * assumption broke fail the run.
 */
import { execFileSync } from 'node:child_process'

const SHAPE_DEOPTS = /wrong map|wrong call target|wrong instance type|wrong name/

const out = execFileSync(
  'node',
  ['--allow-natives-syntax', '--trace-deopt', 'bench/invariants/i4-workload.mjs'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
)

const reasons = new Map()
for (const m of out.matchAll(/reason: ([^)]+)\)/g)) {
  const reason = m[1].trim()
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
}

console.log(
  out
    .split('\n')
    .filter((line) => line.startsWith('I4'))
    .join('\n'),
)
console.log('deopt reasons:')
for (const [reason, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${reason}`)

const shapeDeopts = [...reasons.keys()].filter((reason) => SHAPE_DEOPTS.test(reason))
if (shapeDeopts.length > 0) {
  console.error(`I4 VIOLATION: shape deopts: ${shapeDeopts.join(' | ')}`)
  process.exit(1)
}

console.log('I4 OK')
