// Capa 1 (R2): formateo estructural. No importa la clase Outcome —
// opera sobre la forma {_tag, _v, _fr}, así core puede usar toError sin ciclo.

export type Frame = {
  readonly site: string // "andThen@sync/pipeline.ts:41"
  readonly kind: 'origin' | 'through' | 'handled' | 'note'
  readonly note: string | undefined
}

export type DefectPayload = {
  readonly cause: unknown
  readonly stack: string | undefined
}

/** Forma estructural de Outcome. La clase de core la satisface. */
export type OutcomeShape = {
  readonly _tag: 0 | 1 | 2
  readonly _v: unknown
  readonly _fr: readonly Frame[] | null
}

let tracing = true

/** Producción: los combinadores dejan de pushear frames. */
export function disableTracing(): void {
  tracing = false
}

/** Simétrico, para tests. */
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

function header(o: OutcomeShape): string {
  if (o._tag === 0) return `Ok(${inspectValue(o._v, 0)})`
  if (o._tag === 1) {
    if (isTaggedValue(o._v)) {
      const props = inspectProps(o._v, 0)
      return props === null ? `Fail(${o._v._tag})` : `Fail(${o._v._tag} ${props})`
    }
    return `Fail(${inspectValue(o._v, 0)})`
  }
  const cause = (o._v as DefectPayload).cause
  return `Defect(${inspectValue(cause, 0)})`
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
