/**
 * Defect channel: the bug lane. Recovering from a bug is a deliberate
 * architectural decision, so these live as free functions and read verbosely
 * at the call site.
 */
import {
  DEFECT,
  FAIL,
  Outcome,
  __appended,
  __defect,
  __err,
  __pass,
  __payload,
  __recover,
} from './core'
import { __isMinted, type DefectPayload, type SandboxedDefect } from './trace'

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
export function sandbox<T, E>(o: Outcome<T, E>): Outcome<T, E | SandboxedDefect> {
  return o._tag === DEFECT ? new Outcome<T, E | SandboxedDefect>(FAIL, o._v, o._fr) : o
}

/**
 * Inverse of {@link sandbox}: a Fail carrying a payload minted by this package
 * goes back to the bug lane, again with no frame. A hand-made object of the
 * same shape stays a Fail, so only a defect this package produced can be
 * un-sandboxed.
 */
export function unsandbox<T, E>(o: Outcome<T, E>): Outcome<T, Exclude<E, SandboxedDefect>> {
  return o._tag === FAIL && __isMinted(o._v)
    ? new Outcome<T, Exclude<E, SandboxedDefect>>(DEFECT, o._v, o._fr)
    : __pass(o)
}

/**
 * Escalates a Fail the predicate rejects into a Defect: an error that gets
 * here and does not hold is a bug, not a domain failure. The escalated Defect
 * keeps the accumulated trace plus a `through` frame, and its cause is the
 * rejected error value. A Fail the predicate accepts, an Ok and a Defect all
 * pass through as the same instance. A predicate that throws yields a Defect
 * with the thrown cause.
 */
export function refine<T, E>(
  pred: (e: E) => boolean,
  site?: string,
): (o: Outcome<T, E>) => Outcome<T, E> {
  return (o) => {
    if (o._tag !== FAIL) return o
    let held: boolean
    try {
      held = pred(__err(o))
    } catch (cause) {
      return __defect(cause, 'refine', site)
    }
    if (held) return o
    return new Outcome<T, E>(
      DEFECT,
      __payload(o._v),
      __appended(o, 'refine', 'through', site, 'refine'),
    )
  }
}
