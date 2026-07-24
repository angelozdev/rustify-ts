/**
 * Accumulating validation. Fields are already evaluated Outcomes, so these
 * combinators inspect every one of them instead of stopping at the first
 * failure, and report what failed keyed by the shape of the input.
 */
import {
  DEFECT,
  FAIL,
  type FailOf,
  type OkOf,
  type Outcome,
  __defectThrough,
  __failAs,
  __okAs,
} from './core'

/**
 * The accumulated error: one tagged member of the error union like any other,
 * with `fields` mirroring the shape of the validated input.
 *
 * This is a type alias and never an interface on purpose: TypeScript gives
 * implicit index signatures to aliases but not to interfaces, and without one
 * `Invalid` would not be assignable to a hand-written
 * `{ _tag: 'Invalid'; fields: Record<string, unknown> }` member.
 */
export type Invalid<S> = {
  readonly _tag: 'Invalid'
  readonly fields: { [K in keyof S]?: FailOf<S[K]> }
}

type Values<S> = { [K in keyof S]: OkOf<S[K]> }

/**
 * Validates a record of outcomes. All Ok yields the record of their values; a
 * Defect in any field wins over everything and propagates with a `through`
 * frame; otherwise every failed field lands in `fields` of a single `Invalid`
 * error whose trace starts here, so the traces of the individual fields are
 * not dragged along.
 */
function struct<S extends Record<string, Outcome<any, any>>>(
  s: S,
  site?: string,
): Outcome<Values<S>, Invalid<S>> {
  const values: Record<string, unknown> = {}
  let fields: Record<string, unknown> | null = null
  for (const key of Object.keys(s)) {
    const field = s[key]!
    if (field._tag === DEFECT) return __defectThrough(field, 'V.struct', site)
    if (field._tag === FAIL) {
      fields ??= {}
      fields[key] = field._v
    } else {
      values[key] = field._v
    }
  }
  return fields === null
    ? __okAs<Values<S>>(values)
    : __failAs<Invalid<S>>({ _tag: 'Invalid', fields }, 'V.struct', site)
}

export const V = { struct }
