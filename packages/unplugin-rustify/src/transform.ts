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

function parserPlugins(id: string): ParserPlugin[] {
  const file = cleanId(id)
  const isTsx = file.endsWith('.tsx') || /[?&]lang\.tsx(?:&|$)/.test(id)
  const isTs = isTsx || /\.[cm]?ts$/.test(file) || /[?&]lang\.ts(?:&|$)/.test(id)
  if (isTsx) return ['typescript', 'jsx', 'decorators-legacy']
  if (isTs) return ['typescript', 'decorators-legacy']
  return ['jsx', 'decorators-legacy']
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
    ast = parse(code, { sourceType: 'module', plugins: parserPlugins(id) })
  } catch {
    return null
  }
  const where = displayPath(id, options.root)
  const edited = new MagicString(code)
  let edits = 0
  try {
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
  } catch {
    return null
  }
  if (edits === 0) return null
  return {
    code: edited.toString(),
    map: edited.generateMap({ source: file, includeContent: true, hires: true }).toString(),
  }
}
