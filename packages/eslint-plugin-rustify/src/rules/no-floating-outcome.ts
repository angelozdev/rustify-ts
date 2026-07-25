import { ESLintUtils } from '@typescript-eslint/utils'
import { isOutcomeType } from '../is-outcome-type'

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/angelozdev/rustify-ts/blob/main/packages/eslint-plugin-rustify/docs/rules/${name}.md`,
)

type Options = [{ ignoreVoid: boolean }]
type MessageIds =
  | 'floatingOutcome'
  | 'floatingOutcomeIgnoreVoidFalse'
  | 'voidSuggestion'

export const noFloatingOutcome = createRule<Options, MessageIds>({
  name: 'no-floating-outcome',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow creating or producing an Outcome without handling it',
    },
    hasSuggestions: true,
    messages: {
      floatingOutcome:
        'This Outcome is not handled. A dropped Outcome silently discards its Fail or Defect. Consume it (.match / .matchAll / return / assign) or mark it ignored with `void`.',
      floatingOutcomeIgnoreVoidFalse:
        'This Outcome is not handled. A dropped Outcome silently discards its Fail or Defect. Consume it (.match / .matchAll / return / assign).',
      voidSuggestion: 'Prepend `void` to explicitly ignore this Outcome',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreVoid: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ ignoreVoid: true }],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    return {
      ExpressionStatement(node) {
        const original = node.expression
        let target = original
        let alreadyVoided = false

        if (target.type === 'UnaryExpression' && target.operator === 'void') {
          if (options.ignoreVoid) return
          alreadyVoided = true
          target = target.argument
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(target)
        const type = checker.getTypeAtLocation(tsNode)

        if (!isOutcomeType(type, checker, tsNode)) return

        /**
         * The `void` remedy only silences this rule when the expression
         * isn't already voided and `ignoreVoid` is `true`. Otherwise,
         * prepending `void` would still be reported on the next lint pass,
         * so neither the message nor the suggestion should promise it as a
         * fix.
         */
        const voidWouldSilenceRule = !alreadyVoided && options.ignoreVoid

        context.report({
          node: target,
          messageId:
            voidWouldSilenceRule || alreadyVoided
              ? 'floatingOutcome'
              : 'floatingOutcomeIgnoreVoidFalse',
          suggest: voidWouldSilenceRule
            ? [
                {
                  messageId: 'voidSuggestion',
                  fix: (fixer) => fixer.insertTextBefore(original, 'void '),
                },
              ]
            : [],
        })
      },
    }
  },
})
