import { createUnplugin, type UnpluginInstance } from 'unplugin'
import { resolveOptions, type Options } from './options'
import { transform } from './transform'

/**
 * The plugin every bundler adapter is built from. It runs before the rest of
 * the pipeline so it reads the source the developer wrote, and it declares the
 * id filter natively so bundlers that support filtering never even hand it the
 * files it would skip.
 */
export const rustify: UnpluginInstance<Options | undefined, false> = createUnplugin<
  Options | undefined,
  false
>((raw) => {
  const options = resolveOptions(raw)
  return {
    name: 'unplugin-rustify',
    enforce: 'pre',
    transform: {
      filter: { id: { include: options.include, exclude: options.exclude } },
      handler(code, id) {
        return transform(code, id, options)
      },
    },
  }
})

export default rustify
export { transform, type TransformOutput } from './transform'
export type { Options } from './options'
