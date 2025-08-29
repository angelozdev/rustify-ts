import Option, { Some } from "./option";

/**
 * Creates a Some Option containing the provided value.
 *
 * This is a convenience function that provides a more concise way to create
 * Some instances, similar to Rust's Option API.
 *
 * @template T - The type of the value
 * @param data - The value to wrap in a Some Option
 * @returns A Some Option containing the value
 *
 * @example
 * ```typescript
 * import { some } from './some';
 *
 * const value = some('hello world');
 * console.log(value.unwrap()); // 'hello world'
 *
 * // Chain operations
 * const result = some(42)
 *   .map(x => x * 2)
 *   .map(x => `Result: ${x}`);
 * console.log(result.unwrap()); // 'Result: 84'
 * ```
 */
export function some<T>(data: T): Some<T> {
  return Option.some(data);
}

export default some;
