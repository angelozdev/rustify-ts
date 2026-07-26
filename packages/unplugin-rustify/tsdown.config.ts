import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/vite.ts',
    'src/rollup.ts',
    'src/webpack.ts',
    'src/esbuild.ts',
    'src/rspack.ts',
    'src/farm.ts',
    'src/babel.ts',
  ],
  format: ['esm', 'cjs'],
  fixedExtension: false,
  dts: { sourcemap: false },
  deps: { dts: { neverBundle: true } },
  sourcemap: true,
  clean: true,
  treeshake: true,
})
