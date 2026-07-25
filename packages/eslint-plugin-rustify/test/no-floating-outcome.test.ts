import path from 'node:path'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { noFloatingOutcome } from '../src/rules/no-floating-outcome'

const rootDir = path.join(__dirname, 'fixtures')

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: rootDir,
    },
  },
})

ruleTester.run('no-floating-outcome', noFloatingOutcome, {
  valid: [
    `
      import { ok } from 'rustify-ts'
      const r = ok(1)
    `,
    `
      import { ok, Outcome } from 'rustify-ts'
      function syncDevice(x: number): Outcome<number, never> { return ok(x) }
      return syncDevice(1)
    `,
    `
      import { ok, Outcome } from 'rustify-ts'
      function handle(o: Outcome<number, never>) {}
      function syncDevice(x: number): Outcome<number, never> { return ok(x) }
      handle(syncDevice(1))
    `,
    `
      import { ok, Outcome } from 'rustify-ts'
      function syncDevice(x: number): Outcome<number, never> { return ok(x) }
      syncDevice(1).match(v => v, e => e)
    `,
    `
      import { fromPromise } from 'rustify-ts'
      declare const p: Promise<number>
      async function main() {
        ;(await fromPromise(p, (e) => e)).match(v => v, e => e)
      }
    `,
    `
      import { ok } from 'rustify-ts'
      void ok(1)
    `,
    `
      function notAnOutcome() { return 1 }
      notAnOutcome()
    `,
    `
      class Outcome<T> { constructor(public value: T) {} }
      function make(x: number): Outcome<number> { return new Outcome(x) }
      make(1)
    `,
  ],
  invalid: [
    {
      code: `
        import { ok } from 'rustify-ts'
        ok(1)
      `,
      errors: [
        {
          messageId: 'floatingOutcome',
          suggestions: [
            {
              messageId: 'voidSuggestion',
              output: `
        import { ok } from 'rustify-ts'
        void ok(1)
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { ok, Outcome } from 'rustify-ts'
        function syncDevice(x: number): Outcome<number, never> { return ok(x) }
        syncDevice(1)
      `,
      errors: [
        {
          messageId: 'floatingOutcome',
          suggestions: [
            {
              messageId: 'voidSuggestion',
              output: `
        import { ok, Outcome } from 'rustify-ts'
        function syncDevice(x: number): Outcome<number, never> { return ok(x) }
        void syncDevice(1)
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { ok, Outcome } from 'rustify-ts'
        function syncDevice(x: number): Outcome<number, never> { return ok(x) }
        function mapIt(o: Outcome<number, never>): Outcome<number, never> { return o }
        mapIt(syncDevice(1))
      `,
      errors: [
        {
          messageId: 'floatingOutcome',
          suggestions: [
            {
              messageId: 'voidSuggestion',
              output: `
        import { ok, Outcome } from 'rustify-ts'
        function syncDevice(x: number): Outcome<number, never> { return ok(x) }
        function mapIt(o: Outcome<number, never>): Outcome<number, never> { return o }
        void mapIt(syncDevice(1))
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { fromPromise } from 'rustify-ts'
        declare const p: Promise<number>
        fromPromise(p, (e) => e)
      `,
      errors: [
        {
          messageId: 'floatingOutcome',
          suggestions: [
            {
              messageId: 'voidSuggestion',
              output: `
        import { fromPromise } from 'rustify-ts'
        declare const p: Promise<number>
        void fromPromise(p, (e) => e)
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { fromPromise } from 'rustify-ts'
        declare const p: Promise<number>
        async function main() {
          await fromPromise(p, (e) => e)
        }
      `,
      errors: [
        {
          messageId: 'floatingOutcome',
          suggestions: [
            {
              messageId: 'voidSuggestion',
              output: `
        import { fromPromise } from 'rustify-ts'
        declare const p: Promise<number>
        async function main() {
          void await fromPromise(p, (e) => e)
        }
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { ok } from 'rustify-ts'
        void ok(1)
      `,
      options: [{ ignoreVoid: false }],
      errors: [{ messageId: 'floatingOutcome' }],
    },
  ],
})
