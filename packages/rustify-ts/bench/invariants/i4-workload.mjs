/**
 * I4: one hidden class in runtime. Runs a workload mixing the three states
 * through every combinator and then compares the V8 map of outcomes produced
 * by different paths. Must run with --allow-natives-syntax.
 */
import {
  ok,
  fail,
  die,
  catchAll,
  catchDefect,
  refine,
  sandbox,
  unsandbox,
  V,
} from '../../dist/index.js'

const N = 200_000
const seeds = [() => ok(1), () => fail({ _tag: 'E', n: 1 }), () => die(new Error('bug'))]

let acc = 0
for (let i = 0; i < N; i++) {
  const o = seeds[i % 3]()
    .map((n) => n + 1)
    .andThen((n) => ok(n * 2))
    .mapFail((e) => e)
    .catchTag('E', () => fail({ _tag: 'E', n: 2 }))
    .annotate('n')
    .pipe(refine(() => i % 2 === 0))
    .pipe(catchDefect(() => fail({ _tag: 'E', n: 3 })))
  const s = sandbox(o)
  const u = unsandbox(s)
  const v = V.struct({ a: u, b: ok(1) }).pipe(catchAll(() => ok({ a: 0, b: 0 })))
  acc += o._tag + s._tag + u._tag + v._tag
}

const f = fail({ _tag: 'E', n: 1 })
const d = die(new Error('x'))
const probes = [
  ['ok', ok(1)],
  ['fail', f],
  ['die', d],
  ['map over Ok', ok(1).map((n) => n)],
  ['map over Fail', f.map((n) => n)],
  ['andThen', ok(1).andThen((n) => ok(n))],
  ['catchTag', f.catchTag('E', () => ok(1))],
  ['annotate', f.annotate('x')],
  ['refine', f.pipe(refine(() => false))],
  ['sandbox', sandbox(d)],
  ['unsandbox', unsandbox(sandbox(d))],
  ['V.struct', V.struct({ a: ok(1) })],
  ['V.all', V.all([f])],
]
const [, reference] = probes[0]
const differing = probes.filter(([, o]) => !%HaveSameMap(reference, o)).map(([name]) => name)

const payloads = [
  d._v,
  f.pipe(refine(() => false))._v,
  ok(1).map(() => {
    throw new Error('captured')
  })._v,
]
const payloadsAgree =
  %HaveSameMap(payloads[0], payloads[1]) && %HaveSameMap(payloads[1], payloads[2])

console.log(`I4 workload done (${N.toLocaleString()} mixed-state chains, acc ${acc})`)
console.log(
  `I4 outcome shapes checked: ${probes.length}, differing: ${
    differing.length === 0 ? 'none' : differing.join(', ')
  }`,
)
console.log(`I4 defect payloads share one shape: ${payloadsAgree}`)

if (differing.length > 0 || !payloadsAgree) {
  console.error('I4 VIOLATION: more than one hidden class in play')
  process.exit(1)
}
