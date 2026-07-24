/**
 * Defect channel: the bug lane. Recovering from a bug is a deliberate
 * architectural decision, so these live as free functions and read verbosely
 * at the call site.
 */
import { DEFECT, __pass, __recover, type Outcome } from './core'
import type { DefectPayload } from './trace'

/**
 * Recovers from a Defect. Ok and Fail pass through as the same instance; a
 * Defect runs the handler and the trace gets a `handled` frame. Recovering to
 * Ok drops the trace, and turning the bug into a domain error adds that error
 * to the union instead of hiding it.
 */
export function catchDefect<U, E2>(
  h: (d: DefectPayload) => Outcome<U, E2>,
  site?: string,
): <T, E>(o: Outcome<T, E>) => Outcome<T | U, E | E2> {
  return (o) =>
    o._tag === DEFECT ? __recover(o, h, 'catchDefect', site, 'catchDefect') : __pass(o)
}
