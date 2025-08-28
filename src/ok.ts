import Result, { Success } from "./result";

/**
 * Creates a new Success Result with the given data.
 *
 * @template T - The type of the success value
 * @param data - The value to wrap in a Success
 * @returns A new Success Result containing the provided data
 *
 * @example
 * ```typescript
 * const success = Result.ok('hello');
 * ```
 */
function ok<T>(data: T): Success<T> {
  return Result.ok(data);
}

export default ok;
