/**
 * Micro-benchmarks: the four hot shapes from the spec — construction, a healthy
 * chain, the fail path, and recovering a tagged failure — each written with
 * native try/catch, rustify-ts and neverthrow. Run under RUSTIFY_TRACE=off to
 * see the fail path with the causal trace switched off, the way production ships.
 */
import { bench, do_not_optimize, group, run, summary } from 'mitata'
import { disableTracing, fail, ok } from '../../dist/index.js'
import { err as nerr, ok as nok } from 'neverthrow'

if (process.env.RUSTIFY_TRACE === 'off') disableTracing()

const inc = (n) => n + 1
const dbl = (n) => n * 2

group('creation', () => {
  summary(() => {
    bench('native object literal', () => do_not_optimize({ ok: true, value: 1 }))
    bench('rustify ok', () => do_not_optimize(ok(1)))
    bench('neverthrow ok', () => do_not_optimize(nok(1)))
  })
})

group('happy chain (map x3, andThen)', () => {
  summary(() => {
    bench('native arithmetic', () => {
      let v = 1
      v = inc(v)
      v = dbl(v)
      v = inc(v)
      do_not_optimize(v + 1)
    })
    bench('rustify', () => do_not_optimize(ok(1).map(inc).map(dbl).map(inc).andThen((n) => ok(n + 1))))
    bench('neverthrow', () =>
      do_not_optimize(nok(1).map(inc).map(dbl).map(inc).andThen((n) => nok(n + 1))))
  })
})

group('fail path (create + propagate through map x3)', () => {
  summary(() => {
    bench('native throw/catch', () => {
      try {
        throw { _tag: 'Boom' }
      } catch (error) {
        do_not_optimize(error)
      }
    })
    bench('rustify', () => do_not_optimize(fail({ _tag: 'Boom' }).map(inc).map(dbl).map(inc)))
    bench('neverthrow', () => do_not_optimize(nerr({ _tag: 'Boom' }).map(inc).map(dbl).map(inc)))
  })
})

group('recover a tagged failure (catchTag / orElse)', () => {
  summary(() => {
    bench('native throw/catch', () => {
      try {
        throw { _tag: 'NotFound' }
      } catch (error) {
        do_not_optimize(error._tag === 'NotFound' ? 'cached' : 'other')
      }
    })
    bench('rustify', () =>
      do_not_optimize(fail({ _tag: 'NotFound' }).catchTag('NotFound', () => ok('cached'))))
    bench('neverthrow', () =>
      do_not_optimize(
        nerr({ _tag: 'NotFound' }).orElse((e) => (e._tag === 'NotFound' ? nok('cached') : nerr(e))),
      ))
  })
})

await run()
