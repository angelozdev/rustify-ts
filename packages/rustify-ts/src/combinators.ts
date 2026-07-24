/**
 * Layer 3 free functions for the happy path and outputs. They only use
 * core's public API (internal `@internal` helpers included) — never touch
 * `_v` directly.
 */
import { FAIL, OK, Outcome, __defect, __through, __val, fail } from './core'
import { toError } from './trace'

const UNKNOWN = '<unknown>'

/**
 * Side-effect over Ok. On Ok it returns the same instance (I1). On
 * Fail/Defect it passes through unchanged except for an appended `through`
 * frame, exactly like `map`.
 */
export function tap<T, E>(
  f: (t: T) => void,
  site?: string,
): (o: Outcome<T, E>) => Outcome<T, E> {
  return (o) => {
    if (o._tag !== OK) return __through(o, 'tap', site)
    try {
      f(__val(o))
      return o
    } catch (cause) {
      return __defect(cause, 'tap', site)
    }
  }
}

/**
 * Predicate over Ok; false turns it into a Fail. On Fail/Defect it passes
 * through the SAME instance with NO frame appended — unlike `map`/`tap`,
 * this combinator never evaluates its predicate on a value that already
 * failed, so there is nothing to record.
 */
export function filterOrFail<T, E, E2>(
  pred: (t: T) => boolean,
  e: E2,
  site?: string,
): (o: Outcome<T, E>) => Outcome<T, E | E2> {
  return (o) => {
    if (o._tag !== OK) return o
    try {
      return pred(__val(o)) ? o : fail(e, site ?? `filterOrFail@${UNKNOWN}`)
    } catch (cause) {
      return __defect(cause, 'filterOrFail', site)
    }
  }
}

/**
 * Ok returns the value; Fail returns the default; Defect still throws — a
 * default value must never paper over a bug.
 */
export function unwrapOr<T>(d: T): (o: Outcome<T, unknown>) => T {
  return (o) => {
    if (o._tag === OK) return __val(o)
    if (o._tag === FAIL) return d
    throw toError(o)
  }
}

/**
 * The awkward name is deliberate: this is the only output that throws on
 * Fail as well as Defect.
 */
export function unwrapOrThrow<T>(o: Outcome<T, unknown>): T {
  if (o._tag === OK) return __val(o)
  throw toError(o)
}
