/**
 * Babel adapter, the entry Metro consumes: `unplugin-rustify/babel` inside the
 * babel.config.js of a React Native app. It injects the same sites as the
 * bundler adapter, straight into the AST Babel already parsed.
 */
import type { PluginObj, PluginPass, types as BabelTypes } from '@babel/core'
import { createVisitor } from './analyze'
import { displayPath, siteOf } from './site'

export type BabelOptions = {
  readonly sites?: boolean
  readonly root?: string
}

function readOptions(opts: object): { sites: boolean; root: string | undefined } {
  const sites = 'sites' in opts && typeof opts.sites === 'boolean' ? opts.sites : true
  const root = 'root' in opts && typeof opts.root === 'string' ? opts.root : undefined
  return { sites, root }
}

export default function rustifyBabel(api: { types: typeof BabelTypes }): PluginObj<PluginPass> {
  return {
    name: 'unplugin-rustify',
    visitor: {
      Program(path, state) {
        const { sites, root } = readOptions(state.opts)
        const filename = state.filename
        if (!sites || filename === undefined) return
        const where = displayPath(filename, root ?? state.cwd)
        try {
          path.traverse(
            createVisitor((injection) => {
              injection.path.node.arguments.push(
                api.types.stringLiteral(siteOf(where, injection.name, injection.line)),
              )
            }),
          )
        } catch {
          return
        }
      },
    },
  }
}
