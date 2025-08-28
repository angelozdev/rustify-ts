import Option, { None } from "./option";

/**
 * Creates a None Option representing no value.
 *
 * This is a convenience function that provides a more concise way to create
 * None instances, similar to Rust's Option API.
 *
 * @returns A None Option
 *
 * @example
 * ```typescript
 * import { none } from './none';
 *
 * const empty = none();
 * console.log(empty.isNone()); // true
 * console.log(empty.unwrapOr('default')); // 'default'
 *
 * // Chain operations (all return None)
 * const result = none()
 *   .map(x => x * 2)
 *   .filter(x => x > 0)
 *   .map(x => `Value: ${x}`);
 * console.log(result.isNone()); // true
 * ```
 */
export function none(): None {
  return Option.none();
}

export default none;
