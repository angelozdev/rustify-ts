import { execFileSync } from 'node:child_process'

const BUDGET_SECONDS = 2

const out = execFileSync(
  'node',
  [
    './node_modules/typescript/bin/tsc',
    '--noEmit',
    '--extendedDiagnostics',
    '-p',
    'bench/types/tsconfig.json',
  ],
  { encoding: 'utf8' },
)

const checkTime = out.match(/Check time:\s+([\d.]+)s/)
const instantiations = out.match(/Instantiations:\s+(\d+)/)

if (checkTime === null) {
  console.error(out)
  throw new Error('could not read "Check time" from tsc --extendedDiagnostics')
}

const seconds = Number(checkTime[1])
console.log(`checkTime: ${seconds}s (budget ${BUDGET_SECONDS}s)`)
console.log(`instantiations: ${instantiations === null ? 'n/a' : instantiations[1]}`)

if (seconds > BUDGET_SECONDS) {
  console.error(`FAIL: checkTime ${seconds}s is over the ${BUDGET_SECONDS}s budget`)
  console.error('Report these numbers before simplifying any type.')
  process.exit(1)
}

console.log('types perf OK')
