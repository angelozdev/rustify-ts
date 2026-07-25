import babelTraverse from '@babel/traverse'

type Traverse = typeof babelTraverse

/**
 * `@babel/traverse` ships as CommonJS: depending on the loader, the default
 * import is either the function itself or the interop namespace holding it
 * under `default`. This module is the single place that difference is resolved.
 */
export const traverse: Traverse =
  (babelTraverse as Traverse & { default?: Traverse }).default ?? babelTraverse
