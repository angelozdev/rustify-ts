/**
 * Structural formatting over the {_tag, _v, _fr} shape. Does not import the
 * Outcome class, so core.ts can import toError from here without a cycle.
 */
export type Frame = {
  /** e.g. "andThen@sync/pipeline.ts:41" */
  readonly site: string
  readonly kind: 'origin' | 'through' | 'handled' | 'note'
  readonly note: string | undefined
}

export type DefectPayload = {
  readonly cause: unknown
  readonly stack: string | undefined
}

/**
 * @internal
 * Marks the payloads this package mints. `unsandbox` uses it to tell a real
 * sandboxed defect from any object that happens to have the same shape, and it
 * is a symbol key so `Object.entries`, `JSON.stringify` and the trace
 * formatter never see it.
 */
export const __PAYLOAD: unique symbol = Symbol('rustify.defect')

/**
 * A {@link DefectPayload} this package actually minted, not just an object
 * with the same shape. `sandbox` adds it to the error union and `unsandbox`
 * narrows it back out, so a hand-built lookalike passed to `unsandbox` stays
 * a Fail instead of silently becoming a Defect.
 */
export type SandboxedDefect = DefectPayload & { readonly [__PAYLOAD]: true }

/** @internal */
export function __isMinted(v: unknown): boolean {
  return typeof v === 'object' && v !== null && __PAYLOAD in v
}

/** Structural shape of Outcome; the core class satisfies it. */
export type OutcomeShape = {
  readonly _tag: 0 | 1 | 2
  readonly _v: unknown
  readonly _fr: readonly Frame[] | null
}

let tracing = true

/** Production: combinators stop pushing frames. */
export function disableTracing(): void {
  tracing = false
}

/** Symmetric counterpart, for tests. */
export function enableTracing(): void {
  tracing = true
}

/** @internal */
export function __isTracing(): boolean {
  return tracing
}

function inspectValue(v: unknown, depth: number): string {
  if (v === null) return 'null'
  const t = typeof v
  if (t === 'string') return JSON.stringify(v)
  if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') return String(v)
  if (t === 'undefined') return 'undefined'
  if (t === 'function') return '[function]'
  if (v instanceof Error) return `${v.name}: ${v.message}`
  if (Array.isArray(v)) {
    if (depth > 0) return '[…]'
    const items = v.slice(0, 5).map((x) => inspectValue(x, depth + 1))
    return `[${items.join(', ')}${v.length > 5 ? ', …' : ''}]`
  }
  if (depth > 0) return '{…}'
  const body = inspectProps(v as object, depth)
  return body ?? '{}'
}

function inspectProps(obj: object, depth: number): string | null {
  const entries = Object.entries(obj)
    .filter(([k]) => k !== '_tag')
    .slice(0, 5)
  if (entries.length === 0) return null
  const body = entries.map(([k, v]) => `${k}: ${inspectValue(v, depth + 1)}`).join(', ')
  return `{ ${body} }`
}

function isTaggedValue(v: unknown): v is { readonly _tag: string } {
  return typeof v === 'object' && v !== null && typeof (v as { _tag?: unknown })._tag === 'string'
}

function describeValue(v: unknown): string {
  if (isTaggedValue(v)) {
    const props = inspectProps(v, 0)
    return props === null ? v._tag : `${v._tag} ${props}`
  }
  return inspectValue(v, 0)
}

function header(o: OutcomeShape): string {
  if (o._tag === 0) return `Ok(${inspectValue(o._v, 0)})`
  if (o._tag === 1) {
    return __isMinted(o._v)
      ? `Fail(Defect(${describeValue((o._v as DefectPayload).cause)}))`
      : `Fail(${describeValue(o._v)})`
  }
  return `Defect(${describeValue((o._v as DefectPayload).cause)})`
}

function renderFrame(f: Frame): string {
  const at = f.site.indexOf('@')
  const name = at === -1 ? f.site : f.site.slice(0, at)
  const loc = at === -1 ? '' : f.site.slice(at + 1)
  const head =
    f.kind === 'origin'
      ? `    at ${name}`
      : f.kind === 'through'
        ? `  ↷ ${name}`
        : f.kind === 'note'
          ? `  ✎ ${name}`
          : '  ✔ handled'
  const note =
    f.note === undefined ? '' : f.kind === 'note' ? `   ${JSON.stringify(f.note)}` : `   ${f.note}`
  return `${head.padEnd(26)} ${loc}${note}`
}

export function formatTrace(o: OutcomeShape): string {
  const head = header(o)
  if (o._fr === null || o._fr.length === 0) return head
  return `${head}\n${o._fr.map(renderFrame).join('\n')}`
}

export function toError(o: OutcomeShape): Error {
  const err =
    o._tag === 2
      ? new Error(header(o), { cause: (o._v as DefectPayload).cause })
      : new Error(header(o))
  err.stack = formatTrace(o)
  return err
}
