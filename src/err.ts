import Result, { Failure } from "./result";

/**
 * Creates a new Failure Result with the given error.
 *
 * @template E - The type of the error
 * @param error - The error to wrap in a Failure
 * @returns A new Failure Result containing the provided error
 *
 * @example
 * ```typescript
 * const failure = Result.err('error');
 * ```
 */
function err<E>(error: E): Failure<E> {
  return Result.err(error);
}

export default err;
