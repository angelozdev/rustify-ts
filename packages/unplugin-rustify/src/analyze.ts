/**
 * Decides where a `site` argument may be injected. It works on Babel paths and
 * knows nothing about bundlers or source text, so the bundler driver and the
 * Babel driver share exactly the same rules.
 *
 * The guiding rule: a false positive is forbidden, a false negative is fine. A
 * call is only rewritten when its callee resolves, through real scope bindings,
 * to an import of rustify-ts.
 */
import type { NodePath, Visitor } from '@babel/traverse'
import type * as t from '@babel/types'
import { FREE_SITES, METHOD_SITES, MODULE_NAME, PRODUCERS } from './targets'

export type Injection = {
  readonly name: string
  readonly line: number
  readonly insertAt: number
  readonly path: NodePath<t.CallExpression>
}

type AnyPath = NodePath<t.Node>

const IGNORE = '@rustify-ignore'

/**
 * Sheds the wrappers that carry no runtime meaning — `as`, `satisfies`, `!` and
 * parentheses — so `(ok(1) as Outcome<number, never>).map(f)` reads like
 * `ok(1).map(f)`. The cast is the price of `NodePath#get` widening its result to
 * `NodePath<Node> | NodePath<Node>[]` over a union of node types; every branch
 * here is a node whose `expression` is a single expression.
 */
function unwrap(path: AnyPath): AnyPath {
  let current: AnyPath = path
  while (
    current.isTSAsExpression() ||
    current.isTSSatisfiesExpression() ||
    current.isTSNonNullExpression() ||
    current.isParenthesizedExpression()
  ) {
    current = current.get('expression') as AnyPath
  }
  return current
}

function propertyName(path: AnyPath): string | undefined {
  if (!path.isMemberExpression() || path.node.computed) return undefined
  const property = path.node.property
  return property.type === 'Identifier' ? property.name : undefined
}

/**
 * The name this expression has inside the rustify-ts module, or undefined when
 * it does not come from there. A namespace import answers `*`, so `R.fail`
 * reads as `fail` and `R.V.struct` as `V.struct`.
 */
function importedName(raw: AnyPath): string | undefined {
  const path = unwrap(raw)
  if (path.isIdentifier()) {
    const binding = path.scope.getBinding(path.node.name)
    if (binding === undefined || binding.kind !== 'module') return undefined
    const specifier = binding.path
    const declaration = specifier.parentPath
    if (declaration === null || !declaration.isImportDeclaration()) return undefined
    if (declaration.node.source.value !== MODULE_NAME) return undefined
    if (specifier.isImportNamespaceSpecifier()) return '*'
    if (specifier.isImportSpecifier() && specifier.node.imported.type === 'Identifier') {
      return specifier.node.imported.name
    }
    return undefined
  }
  const property = propertyName(path)
  if (property === undefined || !path.isMemberExpression()) return undefined
  const object = importedName(path.get('object'))
  if (object === '*') return property
  if (object === 'V') return `V.${property}`
  return undefined
}

function isThrowableWrapper(path: NodePath<t.Identifier>): boolean {
  const binding = path.scope.getBinding(path.node.name)
  if (binding === undefined || !binding.constant || !binding.path.isVariableDeclarator()) return false
  if (!binding.path.get('id').isIdentifier()) return false
  const init = binding.path.get('init')
  if (!init.isCallExpression()) return false
  return importedName(init.get('callee')) === 'fromThrowable'
}

/**
 * Whether this expression evaluates to an Outcome minted by rustify-ts.
 * `.pipe(...)` deliberately breaks the chain: it returns whatever its last
 * function returns, which may well be a plain array. The cast reaches an
 * initializer that the types describe as possibly absent, and which the line
 * above has just proven present.
 */
function isOutcome(raw: AnyPath, seen: Set<unknown>): boolean {
  const path = unwrap(raw)
  if (path.isCallExpression()) {
    const callee = unwrap(path.get('callee'))
    const name = importedName(callee)
    if (name !== undefined) return PRODUCERS.has(name)
    const method = propertyName(callee)
    if (method !== undefined && callee.isMemberExpression()) {
      return Object.hasOwn(METHOD_SITES, method) && isOutcome(callee.get('object'), seen)
    }
    return callee.isIdentifier() ? isThrowableWrapper(callee) : false
  }
  if (path.isAwaitExpression()) {
    const argument = unwrap(path.get('argument'))
    return argument.isCallExpression() && importedName(argument.get('callee')) === 'fromPromise'
  }
  if (path.isIdentifier()) {
    const binding = path.scope.getBinding(path.node.name)
    if (binding === undefined || !binding.constant || seen.has(binding)) return false
    const declarator = binding.path
    if (!declarator.isVariableDeclarator()) return false
    if (!declarator.get('id').isIdentifier()) return false
    const init = declarator.get('init')
    if (init.node === null || init.node === undefined) return false
    seen.add(binding)
    return isOutcome(init as AnyPath, seen)
  }
  return false
}

function hasIgnore(comments: ReadonlyArray<t.Comment> | null | undefined): boolean {
  return comments !== null && comments !== undefined && comments.some((c) => c.value.includes(IGNORE))
}

/**
 * The marker is honoured where a reader would expect it: right before the call,
 * or before the statement holding it. A comment in the middle of a chain is not
 * supported, because which node Babel attaches it to depends on the formatting.
 */
function isIgnored(path: NodePath<t.CallExpression>): boolean {
  if (hasIgnore(path.node.leadingComments)) return true
  const statement = path.getStatementParent()
  return statement !== null && hasIgnore(statement.node.leadingComments)
}

function target(path: NodePath<t.CallExpression>): { name: string; index: number } | undefined {
  const callee = unwrap(path.get('callee'))
  const free = importedName(callee)
  if (free !== undefined) {
    if (!Object.hasOwn(FREE_SITES, free)) return undefined
    const index = FREE_SITES[free]
    return index === undefined ? undefined : { name: free, index }
  }
  const method = propertyName(callee)
  if (method === undefined || !callee.isMemberExpression()) return undefined
  if (!Object.hasOwn(METHOD_SITES, method)) return undefined
  const index = METHOD_SITES[method]
  if (index === undefined) return undefined
  return isOutcome(callee.get('object'), new Set()) ? { name: method, index } : undefined
}

function anchorLine(path: NodePath<t.CallExpression>): number | undefined {
  const callee = unwrap(path.get('callee'))
  const node = callee.isMemberExpression() && !callee.node.computed ? callee.node.property : callee.node
  return node.loc?.start.line
}

/**
 * A fresh visitor per file: it holds no state of its own, and every decision is
 * taken from the scope of the path it is handed. A call is left alone unless it
 * carries exactly the arguments that precede the site, so a hand-written site
 * survives and a spread — whose arity is unknown — is never touched.
 */
export function createVisitor(report: (injection: Injection) => void): Visitor {
  return {
    CallExpression(path) {
      const found = target(path)
      if (found === undefined) return
      const args = path.node.arguments
      if (args.length !== found.index) return
      if (args.some((argument) => argument.type === 'SpreadElement')) return
      if (isIgnored(path)) return
      const insertAt = args[args.length - 1]?.end
      const line = anchorLine(path)
      if (insertAt === null || insertAt === undefined || line === undefined) return
      report({ name: found.name, line, insertAt, path })
    },
  }
}
