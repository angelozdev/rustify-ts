/**
 * The pure core: source text in, rewritten source text plus source map out. It
 * never touches the filesystem and knows no bundler, so any adapter can call it
 * with whatever it happens to have. Nothing is regenerated: the only edits are
 * insertions, so formatting and comments survive untouched.
 */
import { parse, type ParserPlugin } from '@babel/parser'
import MagicString from 'magic-string'
import { createVisitor } from './analyze'
import type { ResolvedOptions } from './options'
import { cleanId, displayPath, isVirtual, siteOf } from './site'
import { MODULE_NAME } from './targets'
import { traverse } from './traverse'

export type TransformOutput = {
  readonly code: string
  readonly map: string
}

function parserPlugins(file: string): ParserPlugin[] {
  if (file.endsWith('.tsx')) return ['typescript', 'jsx']
  if (/\.[cm]?ts$/.test(file)) return ['typescript']
  return ['jsx']
}

/**
 * Returns null whenever there is nothing to do: a virtual module, a file that
 * never mentions rustify-ts, source this parser cannot read, or a file with no
 * injectable call. A parse failure is never fatal — the build goes on with the
 * original source and those traces read `<unknown>`.
 */
export function transform(
  code: string,
  id: string,
  options: ResolvedOptions,
): TransformOutput | null {
  if (!options.sites || isVirtual(id) || !code.includes(MODULE_NAME)) return null
  const file = cleanId(id)
  let ast
  try {
    ast = parse(code, { sourceType: 'module', plugins: parserPlugins(file) })
  } catch {
    return null
  }
  const where = displayPath(id, options.root)
  const edited = new MagicString(code)
  let edits = 0
  traverse(
    ast,
    createVisitor((injection) => {
      edits += 1
      edited.appendLeft(
        injection.insertAt,
        `, ${JSON.stringify(siteOf(where, injection.name, injection.line))}`,
      )
    }),
  )
  if (edits === 0) return null
  return {
    code: edited.toString(),
    map: edited.generateMap({ source: file, includeContent: true, hires: true }).toString(),
  }
}
