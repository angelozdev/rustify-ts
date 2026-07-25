import fs from 'node:fs'
import path from 'node:path'
import * as tsutils from 'ts-api-utils'
import type * as ts from 'typescript'

const RUSTIFY_TS_PACKAGE_NAME = 'rustify-ts'
const MAX_ANCESTOR_LOOKUPS = 8

const nearestPackageNameCache = new Map<string, string | undefined>()

/**
 * Walks up from `dir` to the nearest `package.json` and returns its `name`
 * field. Caches per directory since the same declaration file is looked up
 * for every floating-Outcome candidate in a lint run.
 */
function nearestPackageName(dir: string): string | undefined {
  if (nearestPackageNameCache.has(dir)) return nearestPackageNameCache.get(dir)

  let current = dir
  let result: string | undefined
  for (let i = 0; i < MAX_ANCESTOR_LOOKUPS; i++) {
    const pkgPath = path.join(current, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
          name?: unknown
        }
        result = typeof pkg.name === 'string' ? pkg.name : undefined
      } catch {
        result = undefined
      }
      break
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  nearestPackageNameCache.set(dir, result)
  return result
}

/**
 * True when `declarationFileName` belongs to the installed `rustify-ts`
 * package, found by walking up to the nearest `package.json` and checking
 * its declared name. This is resolved from the file's real (symlink-free)
 * path, so it is correct for both a plain npm install and a pnpm workspace
 * symlink into `packages/rustify-ts`, and it doesn't misfire for user code
 * that merely lives under a directory named "rustify-ts".
 */
function isDeclaredInRustifyTsPackage(declarationFileName: string): boolean {
  return nearestPackageName(path.dirname(declarationFileName)) === RUSTIFY_TS_PACKAGE_NAME
}

export function isOutcomeType(
  type: ts.Type,
  checker: ts.TypeChecker,
  node: ts.Node,
): boolean {
  if (type.isUnion()) {
    return type.types.some((member) => isOutcomeType(member, checker, node))
  }

  if (tsutils.isThenableType(checker, node, type)) {
    const awaited = checker.getAwaitedType(type)
    if (awaited && awaited !== type) {
      return isOutcomeType(awaited, checker, node)
    }
  }

  const symbol = type.aliasSymbol ?? type.symbol
  if (!symbol || symbol.name !== 'Outcome') return false

  const declarations = symbol.getDeclarations() ?? []
  return declarations.some((decl) =>
    isDeclaredInRustifyTsPackage(decl.getSourceFile().fileName),
  )
}
