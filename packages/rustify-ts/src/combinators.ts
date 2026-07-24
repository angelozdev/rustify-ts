/**
 * Free functions for the happy path and outputs, built on core's public API
 * (internal `@internal` helpers included) — never touch `_v` directly.
 */
import {
  FAIL,
  OK,
  Outcome,
  __catchTags,
  __defect,
  __pass,
  __recover,
  __through,
  __val,
  fail,
  type FailOf,
  type OkOf,
} from './core'
import type { TagOf } from './types'
import { toError } from './trace'

const UNKNOWN = '<unknown>'

/**
 * Side-effect over Ok. On Ok it returns the same instance, so a healthy
 * chain allocates nothing extra. On Fail/Defect it passes through unchanged
 * except for an appended `through` frame, exactly like `map`.
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

/** Partial map from the tags of `E` to their recovery handlers. */
type FailHandlers<E> = {
  readonly [K in TagOf<E>]?: (e: Extract<E, { readonly _tag: K }>) => Outcome<any, any>
}

type HandledTag<H> = Extract<keyof H, string>
type ReturnOf<F> = F extends (...args: never[]) => infer R ? R : never
type Recovered<H> = ReturnOf<NonNullable<H[keyof H]>>

/**
 * Recovers from several tagged members of the error union at once. Every tag
 * present in `handlers` is dropped from the resulting error union and the
 * errors those handlers can produce are added. A Fail whose tag has no handler
 * passes through as the same instance with no frame.
 */
export function catchTags<E, H extends FailHandlers<E>>(
  handlers: H,
  site?: string,
): <T>(
  o: Outcome<T, E>,
) => Outcome<
  T | OkOf<Recovered<H>>,
  Exclude<E, { readonly _tag: HandledTag<H> }> | FailOf<Recovered<H>>
> {
  return (o) => __catchTags(o, handlers, site)
}

/**
 * Recovers from every domain error, whatever its tag. It does NOT catch a
 * Defect: "all" means every failure someone can write recovery code for.
 */
export function catchAll<E, U, E2>(
  h: (e: E) => Outcome<U, E2>,
  site?: string,
): <T>(o: Outcome<T, E>) => Outcome<T | U, E2> {
  return (o) => (o._tag === FAIL ? __recover(o, h, 'catchAll', site, undefined) : __pass(o))
}

/** Like {@link catchAll}, for recovery that ignores the error value. */
export function orElse<U, E2>(
  h: () => Outcome<U, E2>,
  site?: string,
): <T, E>(o: Outcome<T, E>) => Outcome<T | U, E2> {
  return (o) => (o._tag === FAIL ? __recover(o, h, 'orElse', site, undefined) : __pass(o))
}
