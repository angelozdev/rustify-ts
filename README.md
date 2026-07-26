# rustify-ts — monorepo

| Package                                           | What it is                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| [`rustify-ts`](./packages/rustify-ts)             | The core: `Outcome<T, E>` with Ok / Fail / Defect and causal traces.    |
| [`unplugin-rustify`](./packages/unplugin-rustify) | Optional build plugin: turns `<unknown>` trace frames into `file:line`. |
| [`eslint-plugin-rustify`](./packages/eslint-plugin-rustify) | `#[must_use]` for `Outcome`: catches a created-and-never-handled Outcome at lint time. |

Development:

    pnpm install
    pnpm build
    pnpm lint          # tsc --noEmit
    pnpm test          # unit + type tests across the workspace

Benchmarks (manual, not a PR gate):

    pnpm --filter rustify-ts bench:compare   # micro + macro vs native try/catch and neverthrow
    pnpm --filter rustify-ts bench:all       # invariants I1/I4, type-check budget, and the above

Design docs and implementation plans live in `docs/superpowers/`.
