/**
 * Runs the comparative suites across the tracing on/off matrix. Each run is a
 * child process because the tracing flag has to be set before mitata registers
 * its benches, not between them. Reads the same `dist` the child imports, so the
 * caller is expected to have built it (the bench:compare script does).
 */
import { execFileSync } from 'node:child_process'

const SUITES = ['micro.mjs', 'macro.mjs']
const MODES = [
  { label: 'tracing ON (development)', env: 'on' },
  { label: 'tracing OFF (production)', env: 'off' },
]

for (const suite of SUITES) {
  for (const mode of MODES) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`${suite} — ${mode.label}`)
    console.log('='.repeat(70))
    execFileSync('node', [`bench/compare/${suite}`], {
      encoding: 'utf8',
      stdio: 'inherit',
      env: { ...process.env, RUSTIFY_TRACE: mode.env },
    })
  }
}
