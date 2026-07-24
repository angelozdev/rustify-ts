// Capa 0 (R2): solo tipos, cero imports.

/** Un error de dominio etiquetado. Base del sistema catchTag/TagOf. */
export type Tagged = { readonly _tag: string }

/** Unión de tags de un E tagged; never si E no es tagged. */
export type TagOf<E> = E extends Tagged ? E['_tag'] : never

// Vistas de tipos: runtime = una clase; tipos = unión discriminada
// para narrowing de _v tras isOk()/isFail().
export interface Ok<T> {
  readonly _tag: 0
  readonly _v: T
}

export interface Fail<E> {
  readonly _tag: 1
  readonly _v: E
}
