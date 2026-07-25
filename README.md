# rustify-ts — monorepo

| Package                                           | What it is                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| [`rustify-ts`](./packages/rustify-ts)             | The core: `Outcome<T, E>` with Ok / Fail / Defect and causal traces.    |
| [`unplugin-rustify`](./packages/unplugin-rustify) | Optional build plugin: turns `<unknown>` trace frames into `file:line`. |

Development:

    pnpm install
    pnpm test          # unit + type tests across the workspace
    pnpm lint          # tsc --noEmit
    pnpm build

Design docs and implementation plans live in `docs/superpowers/`.
