import { describe, expect, it, vi } from 'vitest'
import { type Outcome, die, fail, ok } from '../src/core'
import { formatTrace, type DefectPayload } from '../src/trace'
import { V } from '../src/validation'

type SyncErr =
  | { _tag: 'Invalid'; fields: Record<string, unknown> }
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'Forbidden'; tenant: string }
  | { _tag: 'RateLimited'; retryInMs: number }
  | { _tag: 'Network' }

type Device = { id: string; name: string }
type Input = { id: string; token: string }
type Empty = { _tag: 'Empty'; field: string }

const validId = (raw: unknown): Outcome<string, Empty> =>
  typeof raw === 'object' && raw !== null && typeof (raw as { id?: unknown }).id === 'string'
    ? ok((raw as { id: string }).id)
    : fail({ _tag: 'Empty' as const, field: 'id' }, 'validId@sync.ts:10')

const validToken = (raw: unknown): Outcome<string, Empty> =>
  typeof raw === 'object' && raw !== null && typeof (raw as { token?: unknown }).token === 'string'
    ? ok((raw as { token: string }).token)
    : fail({ _tag: 'Empty' as const, field: 'token' }, 'validToken@sync.ts:16')

const authorize = (
  input: Input,
  tenant: string,
): Outcome<Input, { _tag: 'Forbidden'; tenant: string }> =>
  input.token === 'good' ? ok(input) : fail({ _tag: 'Forbidden' as const, tenant })

const fetchDevice = (
  input: Input,
): Outcome<
  { raw: string },
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'Network' }
  | { _tag: 'RateLimited'; retryInMs: number }
> => {
  if (input.id === 'missing') return fail({ _tag: 'NotFound' as const, id: input.id })
  if (input.id === 'busy') return fail({ _tag: 'RateLimited' as const, retryInMs: 4200 })
  if (input.id === 'down') return fail({ _tag: 'Network' as const })
  return ok({ raw: input.id })
}

const toDomain = (r: { raw: string }): Device => ({ id: r.raw, name: `device-${r.raw}` })

const withTenant =
  (tenant: string) =>
  <E extends { _tag: string }>(e: E) => ({ ...e, tenant })

const syncDevice = (raw: unknown, tenant: string) =>
  V.struct({ id: validId(raw), token: validToken(raw) }, 'V.struct@sync.ts:30')
    .annotate(`tenant:${tenant}`)
    .andThen((input) => authorize(input, tenant))
    .andThen(fetchDevice)
    .map(toDomain)
    .mapFail(withTenant(tenant))

const cached: Device = { id: 'cached', name: 'cached' }
const reply = (status: number, body: unknown) => ({ status, body })

const handle = (
  res: ReturnType<typeof syncDevice>,
  sentry: { captureException: (cause: unknown, extra: unknown) => void },
) =>
  res
    .catchTag('RateLimited', () => ok(cached))
    .catchTag('Network', () => ok(cached))
    .matchAll(
      (device) => reply(200, device),
      (f) => {
        switch (f._tag) {
          case 'Invalid':
            return reply(422, { fields: f.fields })
          case 'NotFound':
            return reply(404, { id: f.id })
          case 'Forbidden':
            return reply(403, { tenant: f.tenant })
        }
      },
      (dfx: DefectPayload) => {
        sentry.captureException(dfx.cause, { extra: { trace: formatTrace(res) } })
        return reply(500, { error: 'internal' })
      },
    )

describe('the reference example', () => {
  it('422 with every failed field accumulated', () => {
    const sentry = { captureException: vi.fn() }
    const r = handle(syncDevice({}, 'acme'), sentry)
    expect(r.status).toBe(422)
    expect(r.body).toEqual({
      fields: { id: { _tag: 'Empty', field: 'id' }, token: { _tag: 'Empty', field: 'token' } },
    })
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('the annotate note is in the trace only because the validation failed', () => {
    const failed = syncDevice({}, 'acme')
    const passed = syncDevice({ id: 'a', token: 'good' }, 'acme')
    expect(formatTrace(failed)).toContain('tenant:acme')
    expect(passed._fr).toBeNull()
  })

  it('200 on the happy path', () => {
    const sentry = { captureException: vi.fn() }
    const r = handle(syncDevice({ id: 'a', token: 'good' }, 'acme'), sentry)
    expect(r).toEqual({ status: 200, body: { id: 'a', name: 'device-a' } })
  })

  it('404 keeps the id and the tenant added by mapFail', () => {
    const sentry = { captureException: vi.fn() }
    const res = syncDevice({ id: 'missing', token: 'good' }, 'acme')
    expect(handle(res, sentry).status).toBe(404)
    expect(res._v).toEqual({ _tag: 'NotFound', id: 'missing', tenant: 'acme' })
  })

  it('403 when authorize rejects', () => {
    const sentry = { captureException: vi.fn() }
    expect(handle(syncDevice({ id: 'a', token: 'bad' }, 'acme'), sentry).status).toBe(403)
  })

  it('RateLimited and Network leave the union through catchTag', () => {
    const sentry = { captureException: vi.fn() }
    expect(handle(syncDevice({ id: 'busy', token: 'good' }, 'acme'), sentry).body).toBe(cached)
    expect(handle(syncDevice({ id: 'down', token: 'good' }, 'acme'), sentry).body).toBe(cached)
  })

  it('a bug reaches the defect branch with its cause and its trace', () => {
    const sentry = { captureException: vi.fn() }
    const boom = new Error('undefined is not a function')
    const res = syncDevice({ id: 'a', token: 'good' }, 'acme').andThen(() =>
      die(boom, 'toDomain@sync.ts:44'),
    )
    const r = handle(res, sentry)
    expect(r.status).toBe(500)
    expect(sentry.captureException).toHaveBeenCalledWith(boom, {
      extra: { trace: expect.stringContaining('sync.ts:44') },
    })
  })

  it('the whole chain fits the hand-written error union', () => {
    const res: Outcome<Device, SyncErr> = syncDevice({}, 'acme')
    expect(res.isFail()).toBe(true)
  })
})
