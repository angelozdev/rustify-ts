/**
 * Defect channel: the bug lane. Recovering from a bug is a deliberate
 * architectural decision, so these live as free functions and read verbosely
 * at the call site.
 */
import { DEFECT, FAIL, Outcome, __pass, __recover } from './core'
import { __isMinted, type DefectPayload } from './trace'

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

/**
 * Moves a Defect into the typed error channel, keeping payload and trace
 * exactly as they are: this is a change of channel, not an operation on the
 * error, so it leaves no frame and a round trip through `unsandbox` restores
 * the original trace. Ok and Fail pass through as the same instance.
 */
export function sandbox<T, E>(o: Outcome<T, E>): Outcome<T, E | DefectPayload> {
  return o._tag === DEFECT ? new Outcome<T, E | DefectPayload>(FAIL, o._v, o._fr) : o
}

/**
 * Inverse of {@link sandbox}: a Fail carrying a payload minted by this package
 * goes back to the bug lane, again with no frame. A hand-made object of the
 * same shape stays a Fail, so only a defect this package produced can be
 * un-sandboxed.
 */
export function unsandbox<T, E>(o: Outcome<T, E>): Outcome<T, Exclude<E, DefectPayload>> {
  return o._tag === FAIL && __isMinted(o._v)
    ? new Outcome<T, Exclude<E, DefectPayload>>(DEFECT, o._v, o._fr)
    : __pass(o)
}
