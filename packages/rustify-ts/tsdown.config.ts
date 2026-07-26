import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  fixedExtension: false,
  dts: { sourcemap: false },
  deps: { dts: { neverBundle: true } },
  sourcemap: true,
  clean: true,
  treeshake: true,
})
