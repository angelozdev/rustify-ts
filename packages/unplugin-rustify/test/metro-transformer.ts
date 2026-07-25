/**
 * The shape Metro expects from a babel transformer: it hands over the source of
 * one file and takes back the AST. This is the same wiring a React Native app
 * gets when its babel.config.js lists `unplugin-rustify/babel`.
 */
import { transformSync, type BabelFileResult } from '@babel/core'
import rustifyBabel from '../src/babel'

export type MetroTransformInput = {
  readonly filename: string
  readonly src: string
  readonly options: { readonly projectRoot: string }
}

export type MetroTransformOutput = {
  readonly ast: NonNullable<BabelFileResult['ast']>
  readonly code: string
}

export function transform(input: MetroTransformInput): MetroTransformOutput {
  const result = transformSync(input.src, {
    filename: input.filename,
    cwd: process.cwd(),
    babelrc: false,
    configFile: false,
    ast: true,
    code: true,
    presets: ['@babel/preset-typescript'],
    plugins: [[rustifyBabel, { root: input.options.projectRoot }]],
  })
  const ast = result?.ast
  const code = result?.code
  if (ast === null || ast === undefined || code === null || code === undefined) {
    throw new Error(`babel produced nothing for ${input.filename}`)
  }
  return { ast, code }
}
