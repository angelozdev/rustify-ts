/**
 * Macro-benchmark: one full HTTP handler pass over a mix of inputs that hits
 * success and every failure branch. Tracing is set first, then the
 * equivalence guard runs, so whichever mode is actually active for this
 * process is the one whose outputs get checked before any timing.
 */
import { bench, do_not_optimize, run, summary } from 'mitata'
import { disableTracing } from '../../dist/index.js'
import {
  assertEquivalent,
  INPUTS,
  nativeHandler,
  neverthrowHandler,
  rustifyHandler,
} from './handlers.mjs'

if (process.env.RUSTIFY_TRACE === 'off') disableTracing()

assertEquivalent()

const sweep = (handler) => {
  for (const raw of INPUTS) do_not_optimize(handler(raw))
}

summary(() => {
  bench('native handler', () => sweep(nativeHandler))
  bench('rustify handler', () => sweep(rustifyHandler))
  bench('neverthrow handler', () => sweep(neverthrowHandler))
})

await run()
