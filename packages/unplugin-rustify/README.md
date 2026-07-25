# unplugin-rustify

Build-time site injection for [rustify-ts](https://www.npmjs.com/package/rustify-ts) traces.

Without this plugin every trace frame reads `<unknown>`:

```
Fail(RateLimited { retryInMs: 4200 })
    at fail                  <unknown>
  ↷ andThen                  <unknown>
```

With it, the same trace points at your code:

```
Fail(RateLimited { retryInMs: 4200 })
    at fail                  src/api/device.ts:41
  ↷ andThen                  src/sync/pipeline.ts:18
```

The plugin is optional. rustify-ts never depends on it, and a build without it
works exactly the same — only the locations are missing.

## Install

```bash
npm i -D unplugin-rustify
```

## Usage

```ts
// vite.config.ts
import rustify from 'unplugin-rustify/vite'

export default { plugins: [rustify()] }
```

```js
// rollup.config.js
import rustify from 'unplugin-rustify/rollup'

export default { plugins: [rustify()] }
```

```js
// webpack.config.js
const rustify = require('unplugin-rustify/webpack')

module.exports = { plugins: [rustify()] }
```

```js
// esbuild
const rustify = require('unplugin-rustify/esbuild')

require('esbuild').build({ plugins: [rustify()] })
```

```js
// rspack.config.js
const rustify = require('unplugin-rustify/rspack')

module.exports = { plugins: [rustify()] }
```

```js
// farm.config.js
import rustify from 'unplugin-rustify/farm'

export default { plugins: [rustify()] }
```

### React Native / Metro

Metro transforms with Babel rather than a bundler plugin, so it takes the Babel
entry:

```js
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['unplugin-rustify/babel'],
}
```

## Options

| Option    | Default                   | What it does                                                              |
| --------- | ------------------------- | ------------------------------------------------------------------------- |
| `include` | `[/\.[cm]?[jt]sx?$/]`     | Which module ids to transform.                                            |
| `exclude` | `[/[\\/]node_modules[\\/]/]` | Which module ids to skip.                                              |
| `sites`   | `true`                    | Set to `false` in production: no path literals reach the bundle at all.    |
| `root`    | `process.cwd()`           | Paths in a site are printed relative to this directory.                   |

`include` and `exclude` belong to the bundler adapters. Under Babel, use Babel's
own `overrides`, `test` and `ignore`.

The Babel entry takes `sites` and `root` too:

```js
plugins: [['unplugin-rustify/babel', { root: __dirname, sites: true }]]
```

## What gets transformed

Only calls the plugin can trace back, through real scope bindings, to an import
of `rustify-ts`:

- direct calls to an export that takes a site — `fail`, `die`, `attempt`,
  `ensure`, `invariant`, `tap`, `filterOrFail`, `catchTags`, `catchAll`,
  `orElse`, `catchDefect`, `refine`, `V.struct`, `V.all`;
- methods on a receiver that is an Outcome — `map`, `andThen`, `mapFail`,
  `catchTag`, `annotate` — including chains, constants bound to an outcome,
  functions built by `fromThrowable` and awaited `fromPromise` calls;
- import aliases and namespace imports.

A false positive is a bug; a missed call is not. Anything the plugin cannot
prove is left alone, and that call simply keeps `<unknown>`. In particular it
never rewrites `.map` on an unknown receiver, and it stops at `.pipe(...)`,
whose result may be any value at all.

To opt one call or one statement out, write the marker in front of it:

```ts
/* @rustify-ignore */
const result = ok(input).map(toDomain)
```

## Requirements

Node `^20.19.0 || >=22.12.0`. Works with Vite, Rollup, webpack, esbuild, rspack
and Farm through [unplugin](https://github.com/unjs/unplugin), and with Metro
through the Babel entry.
