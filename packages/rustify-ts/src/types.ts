/** Base of the catchTag/TagOf system: a domain error tagged with a discriminant. */
export type Tagged = { readonly _tag: string }

/** Union of tags on a tagged E; never if E is not tagged. */
export type TagOf<E> = E extends Tagged ? E['_tag'] : never

/** Type-level view of the Ok state — runtime is one class; this discriminated-union shape narrows `_v` after `isOk()`/`isFail()`. */
export interface Ok<T> {
  readonly _tag: 0
  readonly _v: T
}

/** Type-level view of the Fail state — see {@link Ok}. */
export interface Fail<E> {
  readonly _tag: 1
  readonly _v: E
}
