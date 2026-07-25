/**
 * Runs the comparative suites across the tracing on/off matrix. Each run is a
 * child process because the tracing flag has to be set before mitata registers
 * its benches, not between them. The child process imports `dist`, so the
 * caller must have built it first (the bench:compare script does).
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
    execFileSync('node', [fileURLToPath(new URL(suite, import.meta.url))], {
      stdio: 'inherit',
      env: { ...process.env, RUSTIFY_TRACE: mode.env },
    })
  }
}
