/**
 * The Outcome class and its constructors. This is the only file in the
 * package allowed to hold internal casts — all `any`/unsafe narrowing is
 * confined here and covered by the type tests in `test/types.test-d.ts`.
 */
import type { Fail, Ok } from './types'
import { __isTracing, toError, type DefectPayload, type Frame } from './trace'

export const OK = 0 as const
export const FAIL = 1 as const
export const DEFECT = 2 as const

const UNKNOWN = '<unknown>'

/**
 * Shared empty frame list used whenever tracing is disabled. Never mutated —
 * frames are appended by returning `.concat(...)`, never by `.push`.
 */
const NO_FRAMES: Frame[] = []

/**
 * A single class represents all three states (Ok, Fail, Defect) so the
 * runtime has one hidden shape instead of three incompatible ones. The three
 * slots always sit at the same offsets: `_tag` discriminates the state, `_v`
 * holds the payload (`T` for Ok, `E` for Fail, a {@link DefectPayload} for
 * Defect), and `_fr` holds the causal trace frames — always `null` for Ok.
 */
export class Outcome<T, E> {
  constructor(
    readonly _tag: 0 | 1 | 2,
    readonly _v: unknown,
    readonly _fr: Frame[] | null,
  ) {}

  get trace(): readonly Frame[] | null {
    return this._fr
  }

  isOk(): this is Outcome<T, never> & Ok<T> {
    return this._tag === OK
  }

  isFail(): this is Outcome<never, E> & Fail<E> {
    return this._tag === FAIL
  }

  isDefect(): boolean {
    return this._tag === DEFECT
  }

  /**
   * Fallible pattern match: on Ok/Fail returns a result, on Defect rethrows.
   * The path of least effort never swallows a bug.
   */
  match<R>(onOk: (t: T) => R, onFail: (e: E) => R): R {
    if (this._tag === OK) return onOk(this._v as T)
    if (this._tag === FAIL) return onFail(this._v as E)
    throw toError(this)
  }

  /**
   * Total pattern match: covers Ok/Fail/Defect explicitly, never throws.
   */
  matchAll<R>(
    onOk: (t: T) => R,
    onFail: (e: E) => R,
    onDefect: (d: DefectPayload) => R,
  ): R {
    if (this._tag === OK) return onOk(this._v as T)
    if (this._tag === FAIL) return onFail(this._v as E)
    return onDefect(this._v as DefectPayload)
  }

  /**
   * Transforms the Ok value. On Fail/Defect it passes through unchanged
   * except for an appended `through` frame; `__through` returns
   * `Outcome<never, E>`, which is assignable to `Outcome<U, E>` by
   * covariance in `T`, so no cast is needed here.
   */
  map<U>(f: (t: T) => U, site?: string): Outcome<U, E> {
    if (this._tag !== OK) return __through(this, 'map', site)
    try {
      return new Outcome<U, E>(OK, f(this._v as T), null)
    } catch (cause) {
      return __defect(cause, 'map', site)
    }
  }

  /**
   * Chains a callback that itself returns an Outcome, flattening the
   * result. On Fail/Defect it passes through unchanged except for an
   * appended `through` frame; `__through` returns `Outcome<never, E>`,
   * assignable to `Outcome<U, E | E2>` by covariance in both `T` and `E`.
   */
  andThen<U, E2>(f: (t: T) => Outcome<U, E2>, site?: string): Outcome<U, E | E2> {
    if (this._tag !== OK) return __through(this, 'andThen', site)
    try {
      return f(this._v as T)
    } catch (cause) {
      return __defect(cause, 'andThen', site)
    }
  }

  /**
   * Attaches a diagnostic note. On Ok this is a strict no-op returning the
   * same instance with zero allocation, since the happy path must never
   * allocate: context for a later failure is added via `mapFail`, not by
   * annotating a value that already succeeded. On Fail/Defect it appends a
   * `note` frame.
   */
  annotate(note: string, site?: string): Outcome<T, E> {
    if (this._tag === OK || !__isTracing()) return this
    return new Outcome<T, E>(
      this._tag,
      this._v,
      (this._fr ?? NO_FRAMES).concat(__frame(site, 'annotate', 'note', note)),
    )
  }

  /**
   * Composes 0 to 6 functions left to right, threading `this` through the
   * first one and each subsequent result through the next. The
   * implementation signature splits the first parameter (typed with
   * `this`) from the rest (typed `unknown`) because a plain
   * `Array<(x: unknown) => unknown>` for every position does not satisfy
   * the compiler's overload-compatibility check once an overload declares
   * a `this`-typed parameter; splitting keeps the implementation signature
   * on `unknown`, never `any`.
   */
  pipe(): this
  pipe<A>(ab: (o: this) => A): A
  pipe<A, B>(ab: (o: this) => A, bc: (a: A) => B): B
  pipe<A, B, C>(ab: (o: this) => A, bc: (a: A) => B, cd: (b: B) => C): C
  pipe<A, B, C, D>(ab: (o: this) => A, bc: (a: A) => B, cd: (b: B) => C, de: (c: C) => D): D
  pipe<A, B, C, D, F>(
    ab: (o: this) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => F,
  ): F
  pipe<A, B, C, D, F, G>(
    ab: (o: this) => A,
    bc: (a: A) => B,
    cd: (b: B) => C,
    de: (c: C) => D,
    ef: (d: D) => F,
    fg: (f: F) => G,
  ): G
  pipe(
    first?: (o: this) => unknown,
    ...rest: Array<(x: unknown) => unknown>
  ): unknown {
    if (!first) return this
    let acc: unknown = first(this)
    for (const f of rest) acc = f(acc)
    return acc
  }
}

export type OkOf<O> = O extends Outcome<infer T, any> ? T : never
export type FailOf<O> = O extends Outcome<any, infer E> ? E : never

/** @internal */
export function __frame(
  site: string | undefined,
  name: string,
  kind: Frame['kind'],
  note: string | undefined,
): Frame {
  return { site: site ?? `${name}@${UNKNOWN}`, kind, note }
}

/** @internal */
export function __origin(site: string | undefined, name: string): Frame[] {
  return __isTracing() ? [__frame(site, name, 'origin', undefined)] : NO_FRAMES
}

/**
 * @internal
 * The `stack` getter is lazy: V8 only materializes `Error#stack` when it is
 * read, never before, so building a defect payload stays free until someone
 * actually inspects the stack.
 */
export function __payload(cause: unknown): DefectPayload {
  return {
    cause,
    get stack() {
      return cause instanceof Error ? cause.stack : undefined
    },
  }
}

/** @internal */
export function __defect(
  cause: unknown,
  name: string,
  site: string | undefined,
): Outcome<never, never> {
  return new Outcome<never, never>(DEFECT, __payload(cause), __origin(site, name))
}

/**
 * @internal
 * Passes a Fail/Defect outcome through, appending a `through` frame
 * immutably via `.concat` so the original frame list is never mutated.
 */
export function __through<E>(
  o: Outcome<unknown, E>,
  name: string,
  site: string | undefined,
): Outcome<never, E> {
  if (!__isTracing()) return o as Outcome<never, E>
  return new Outcome<never, E>(
    o._tag,
    o._v,
    (o._fr ?? NO_FRAMES).concat(__frame(site, name, 'through', undefined)),
  )
}

/**
 * @internal
 * Typed access to `_v` in the Ok state. Confines the cast to this file so
 * the rest of the package never needs an unsafe assertion.
 */
export function __val<T>(o: Outcome<T, unknown>): T {
  return o._v as T
}

export function ok<T>(v: T): Outcome<T, never> {
  return /* @__PURE__ */ new Outcome<T, never>(OK, v, null)
}

export function fail<E>(e: E, site?: string): Outcome<never, E> {
  return new Outcome<never, E>(FAIL, e, __origin(site, 'fail'))
}

export function die(cause: unknown, site?: string): Outcome<never, never> {
  return __defect(cause, 'die', site)
}
