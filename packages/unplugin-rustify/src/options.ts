export type Options = {
  readonly include?: ReadonlyArray<string | RegExp>
  readonly exclude?: ReadonlyArray<string | RegExp>
  /** When false the plugin injects nothing: no path literals reach the bundle. */
  readonly sites?: boolean
  /** Paths in a site are relative to this directory. Defaults to the process cwd. */
  readonly root?: string
}

export type ResolvedOptions = {
  readonly include: Array<string | RegExp>
  readonly exclude: Array<string | RegExp>
  readonly sites: boolean
  readonly root: string
}

const DEFAULT_INCLUDE: Array<string | RegExp> = [/\.[cm]?[jt]sx?$/]
const DEFAULT_EXCLUDE: Array<string | RegExp> = [/[\\/]node_modules[\\/]/]

export function resolveOptions(options: Options | undefined): ResolvedOptions {
  return {
    include: options?.include === undefined ? DEFAULT_INCLUDE : [...options.include],
    exclude: options?.exclude === undefined ? DEFAULT_EXCLUDE : [...options.exclude],
    sites: options?.sites ?? true,
    root: options?.root ?? process.cwd(),
  }
}
