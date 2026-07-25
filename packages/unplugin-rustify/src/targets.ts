/**
 * The rustify-ts surface this plugin knows about: which exports and which
 * prototype methods take a trailing `site`, at which argument index, and which
 * calls produce an Outcome a method chain can grow from.
 */

export const MODULE_NAME = 'rustify-ts'

/** Prototype methods that accept a trailing `site`, keyed by its argument index. */
export const METHOD_SITES: Readonly<Record<string, number>> = {
  map: 1,
  andThen: 1,
  annotate: 1,
  mapFail: 1,
  catchTag: 2,
}

/**
 * Exports that accept a trailing `site`, keyed by its argument index.
 * `V.tuple` is absent on purpose: it is variadic, so a trailing string would be
 * read as one more outcome.
 */
export const FREE_SITES: Readonly<Record<string, number>> = {
  fail: 1,
  die: 1,
  attempt: 1,
  ensure: 2,
  invariant: 2,
  tap: 1,
  filterOrFail: 2,
  catchTags: 1,
  catchAll: 1,
  orElse: 1,
  catchDefect: 1,
  refine: 1,
  'V.struct': 1,
  'V.all': 1,
}

/**
 * Exports whose direct call evaluates to an Outcome. A method call is only
 * rewritten when its receiver traces back to one of these, which is what keeps
 * `Array.prototype.map` and every other unknown receiver untouched.
 */
export const PRODUCERS: ReadonlySet<string> = new Set([
  'ok',
  'fail',
  'die',
  'attempt',
  'ensure',
  'invariant',
  'sandbox',
  'unsandbox',
  'V.struct',
  'V.all',
  'V.tuple',
])
