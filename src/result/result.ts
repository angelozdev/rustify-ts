import { assert, isFunction } from "../internals/assertions";
import none from "../option/none";
import { None, Some } from "../option/option";

abstract class Result<T, E> {
  protected abstract readonly _data: T | None;
  protected abstract readonly _error: E | None;

  abstract isOk(): this is Success<T>;
  abstract isErr(): this is Failure<E>;
  abstract isOkAnd(predicate: (data: T) => boolean): boolean;
  abstract isErrAnd(predicate: (error: E) => boolean): boolean;
  abstract map<U>(fn: (data: T) => U): Result<U, E>;
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;
  abstract mapOrElse<U>(errorFn: (error: E) => U, okFn: (data: T) => U): U;
  abstract flatMap<U>(fn: (data: T) => Result<U, E>): Result<U, E>;
  abstract and<U>(other: Result<U, E>): Result<U, E>;
  abstract or(other: Result<T, E>): Result<T, E>;
  abstract flatten(): Result<any, E>;
  abstract contains(value: T): boolean;
  abstract containsErr(error: E): boolean;
  abstract unwrap(): T;
  abstract unwrapOr(defaultValue: T): T;
  abstract expect(message: string): T;
  abstract unwrapOrElse(fn: () => T): T;
  abstract inspect(fn: (data: T) => void): Result<T, E>;
  abstract inspectErr(fn: (error: E) => void): Result<T, E>;
  abstract andThen<U, F = E>(fn: (data: T) => Result<U, F>): Result<U, E | F>;
  abstract orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F>;

  /**
   * Internal method to get error value - should only be used by static methods
   * @internal
   */
  abstract _getError(): E;

  /**
   * Pattern matches on this Result and executes the appropriate handler function.
   */
  match<U>(patterns: { ok: (data: T) => U; err: (error: E) => U }): U {
    assert(
      !!patterns,
      "Invalid pattern object: both ok and err handlers must be functions"
    );

    assert(
      isFunction(patterns.ok),
      "Invalid pattern object: both ok and err handlers must be functions"
    );

    assert(
      isFunction(patterns.err),
      "Invalid pattern object: both ok and err handlers must be functions"
    );

    if (this.isOk()) {
      return patterns.ok(this.unwrap());
    } else {
      return patterns.err(this._getError());
    }
  }

  static ok<T>(data: T): Success<T> {
    return new Success(data);
  }

  static err<E>(error: E): Failure<E> {
    return new Failure(error);
  }

  /**
   * Executes an async function and wraps the result in a Result type.
   *
   * This function catches any errors thrown by the provided async function
   * and returns them as a failed Result instead of throwing. This enables
   * safe error handling without try/catch blocks.
   *
   * @template T - The type of the successful return value
   * @param fn - An async function that may throw an error
   * @returns A Promise that resolves to either a successful or failed Result
   *
   * @example
   * ```typescript
   * // API call that might fail
   * const result = await Result.tryCatch(async () => {
   *   const response = await fetch('/api/users');
   *   return response.json();
   * });
   *
   * if (result.isOk()) {
   *   console.log('Users:', result.data);
   * } else {
   *   console.error('Failed to fetch users:', result.error);
   * }
   * ```
   */
  static async tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, unknown>> {
    if (!isFunction(fn))
      return Result.err(new Error("tryCatch requires a function argument"));

    try {
      const data = await fn();
      return Result.ok(data);
    } catch (error) {
      return Result.err(error);
    }
  }

  /**
   * Executes a synchronous function and wraps the result in a Result type.
   *
   * This function catches any errors thrown by the provided synchronous function
   * and returns them as a failed Result instead of throwing. This is the sync
   * version of `tryCatch`.
   *
   * @template T - The type of the successful return value
   * @param fn - A synchronous function that may throw an error
   * @returns A Result containing either the success value or the caught error
   *
   * @example
   * ```typescript
   * // JSON parsing that might fail
   * const result = Result.safeTry(() => JSON.parse(jsonString));
   *
   * if (result.isOk()) {
   *   console.log('Parsed:', result.data);
   * } else {
   *   console.error('Invalid JSON:', result.error);
   * }
   * ```
   */
  static safeTry<T>(fn: () => T): Result<T, unknown> {
    if (!isFunction(fn))
      return Result.err(new Error("safeTry requires a function argument"));

    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.err(error);
    }
  }

  /**
   * Executes an async function with exponential backoff retry logic.
   *
   * This function attempts to execute the provided async function multiple times
   * with increasing delays between attempts. If all attempts fail, it returns
   * a failed Result with attempt information.
   *
   * @template T - The type of the successful return value
   * @param fn - An async function to execute with retry logic
   * @param options - Configuration options for retry behavior
   * @returns A Promise that resolves to a Result containing either the success value or failure info
   *
   * @example
   * ```typescript
   * // Retry a flaky API call
   * const result = await Result.retry(async () => {
   *   const response = await fetch('/api/flaky-endpoint');
   *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
   *   return response.json();
   * }, {
   *   maxAttempts: 5,
   *   baseDelay: 200
   * });
   * ```
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      exponentialBase?: number;
    } = {}
  ): Promise<Result<T, { attempts: number; lastError: unknown }>> {
    if (!isFunction(fn)) {
      return Result.err({
        attempts: 0,
        lastError: new Error("retry requires a function argument"),
      });
    }

    const {
      maxAttempts = 3,
      baseDelay = 100,
      maxDelay = 5000,
      exponentialBase = 2,
    } = options;

    if (maxAttempts < 1 || !Number.isInteger(maxAttempts)) {
      return Result.err({
        attempts: 0,
        lastError: new Error("maxAttempts must be a positive integer"),
      });
    }

    if (baseDelay < 0 || maxDelay < 0 || exponentialBase <= 0) {
      return Result.err({
        attempts: 0,
        lastError: new Error(
          "Delays and exponential base must be non-negative numbers"
        ),
      });
    }

    let attempts = 0;
    let lastError: unknown;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await fn();
        return Result.ok(result);
      } catch (error) {
        lastError = error;

        if (attempts < maxAttempts) {
          const delay = Math.min(
            baseDelay * Math.pow(exponentialBase, attempts - 1),
            maxDelay
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return Result.err({ attempts, lastError });
  }

  /**
   * Wraps a Promise with a timeout, returning a failed Result if the timeout is exceeded.
   *
   * This function races the provided Promise against a timeout. If the Promise resolves
   * before the timeout, it returns a successful Result. If the timeout is reached first,
   * it returns a failed Result with a timeout error message.
   *
   * @template T - The type of the Promise's resolved value
   * @param promise - The Promise to wrap with a timeout
   * @param timeoutMs - Timeout duration in milliseconds
   * @param timeoutError - Custom error message for timeout
   * @returns A Promise that resolves to a Result containing either the Promise's value or timeout error
   *
   * @example
   * ```typescript
   * // API call with 5 second timeout
   * const result = await Result.withTimeout(
   *   fetch('/api/slow-endpoint'),
   *   5000,
   *   'API request timed out after 5 seconds'
   * );
   * ```
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError: string = "Operation timed out"
  ): Promise<Result<T, string>> {
    if (!promise || !isFunction(promise.then)) {
      return Promise.resolve(
        Result.err("withTimeout requires a Promise argument")
      );
    }

    if (typeof timeoutMs !== "number" || timeoutMs <= 0) {
      return Promise.resolve(Result.err("timeoutMs must be a positive number"));
    }

    return Promise.race([
      promise.then(Result.ok),
      new Promise<Result<T, string>>((resolve) =>
        setTimeout(() => resolve(Result.err(timeoutError)), timeoutMs)
      ),
    ]);
  }

  /**
   * Combines multiple Results into a single Result containing all success values.
   *
   * This function takes an array or tuple of Results and returns a single Result.
   * If all input Results are successful, it returns a successful Result containing
   * an array of all the success values. If any Result fails, it immediately returns
   * the first failure encountered (fail-fast behavior).
   *
   * @template T - A tuple type representing the types of all success values
   * @param results - An array or tuple of Results to combine
   * @returns A Result containing either an array of all success values or the first error
   *
   * @example
   * ```typescript
   * // Combining multiple API calls
   * const userResult = fetchUser(123);
   * const postsResult = fetchPosts(123);
   * const commentsResult = fetchComments(123);
   *
   * const combined = Result.all([userResult, postsResult, commentsResult]);
   *
   * if (combined.isSuccess()) {
   *   const [user, posts, comments] = combined.data;
   *   console.log('User:', user.name);
   *   console.log('Posts:', posts.length);
   * }
   * ```
   */
  static all<T extends readonly unknown[]>(results: {
    [K in keyof T]: Result<T[K], any>;
  }): Result<T, any> {
    if (!Array.isArray(results)) {
      return Result.err(new Error("all() requires an array of Results"));
    }

    const values: unknown[] = [];
    for (const result of results) {
      if (!result || typeof result.isErr !== "function") {
        return Result.err(
          new Error("all() requires an array containing only Result instances")
        );
      }
      if (result.isErr()) {
        return Result.err(result._getError());
      }
      values.push(result.unwrap());
    }
    return Result.ok(values as unknown as T);
  }

  /**
   * Creates a Result-returning function from a throwable function.\
   * This is useful for converting existing functions that throw errors.
   *
   * @template T - The success type
   * @template A - The argument types
   * @param fn - A function that may throw
   * @returns A function that returns a Result instead of throwing
   *
   * @example
   * ```typescript
   * const safeParseInt = Result.fromThrowable(parseInt);
   * const result = safeParseInt('123', 10);
   * ```
   */
  static fromThrowable<T, A extends any[]>(
    fn: (...args: A) => T
  ): (...args: A) => Result<T, unknown> {
    return (...args: A) => Result.safeTry(() => fn(...args));
  }

  /**
   * Alias for all() to maintain API consistency with other Result libraries.
   */
  static combine<T extends readonly unknown[]>(results: {
    [K in keyof T]: Result<T[K], any>;
  }): Result<T, any> {
    return Result.all(results);
  }

  /**
   * Like combine/all but collects ALL errors instead of failing fast.
   */
  static combineWithAllErrors<T extends readonly unknown[]>(results: {
    [K in keyof T]: Result<T[K], any>;
  }): Result<T, any[]> {
    if (!Array.isArray(results)) {
      return Result.err([
        new Error("combineWithAllErrors() requires an array of Results"),
      ]);
    }

    const values: unknown[] = [];
    const errors: any[] = [];

    for (const result of results) {
      if (!result || !isFunction(result.isErr)) {
        errors.push(
          new Error(
            "combineWithAllErrors() requires an array containing only Result instances"
          )
        );
      } else if (result.isErr()) {
        errors.push(result._getError());
      } else {
        values.push(result.unwrap());
      }
    }

    return errors.length > 0
      ? Result.err(errors)
      : Result.ok(values as unknown as T);
  }

  /**
   * Collects successful values from an array of Results with the same error type.
   *
   * This function is similar to `all`, but works specifically with arrays of Results
   * that have the same success and error types. It returns the first error encountered
   * or an array of all success values.
   *
   * @template T - The type of successful values
   * @template E - The type of error values
   * @param results - An array of Results with the same types
   * @returns A Result containing either an array of all success values or the first error
   *
   * @example
   * ```typescript
   * // Processing a list of user IDs
   * const userIds = [1, 2, 3, 4, 5];
   * const userResults = userIds.map(id => fetchUser(id));
   *
   * const allUsers = Result.collect(userResults);
   * ```
   */
  static collect<T, E>(results: Result<T, E>[]): Result<T[], E> {
    if (!Array.isArray(results)) {
      return Result.err(
        new Error("collect() requires an array of Results") as unknown as E
      );
    }

    const values: T[] = [];
    for (const result of results) {
      if (!result || !isFunction(result.isErr)) {
        return Result.err(
          new Error(
            "collect() requires an array containing only Result instances"
          ) as unknown as E
        );
      }
      if (result.isErr()) {
        return Result.err(result._getError());
      }
      values.push(result.unwrap());
    }
    return Result.ok(values);
  }

  /**
   * Separates an array of Results into successful values and errors.
   *
   * This function takes an array of Results and partitions them into two separate
   * arrays: one containing all the successful values and another containing all
   * the error values. This is useful when you want to process both successes and
   * failures rather than failing fast.
   *
   * @template T - The type of successful values
   * @template E - The type of error values
   * @param results - An array of Results to partition
   * @returns An object with separate arrays for successes and failures
   *
   * @example
   * ```typescript
   * // Processing mixed success/failure results
   * const operations = [
   *   Result.ok(1),
   *   Result.err('failed operation'),
   *   Result.ok(2),
   *   Result.ok(3)
   * ];
   *
   * const { successes, failures } = Result.partition(operations);
   * console.log('Successful values:', successes); // [1, 2, 3]
   * console.log('Errors:', failures); // ['failed operation']
   * ```
   */
  static partition<T, E>(
    results: Result<T, E>[]
  ): { successes: T[]; failures: E[] } {
    const successes: T[] = [];
    const failures: E[] = [];

    for (const result of results) {
      if (result.isOk()) {
        successes.push(result.unwrap());
      } else {
        failures.push(result._getError());
      }
    }

    return { successes, failures };
  }

  /**
   * Processes all Results and returns separate arrays for successful and failed results.
   *
   * Similar to `Promise.allSettled()`, this function processes all Results regardless
   * of whether they succeed or fail, and returns arrays containing all the results.
   * This is useful when you want to know the outcome of all operations.
   *
   * @template T - The type of successful values
   * @template E - The type of error values
   * @param results - An array of Results to process
   * @returns An object with arrays of successful and failed Results
   *
   * @example
   * ```typescript
   * const operations = [
   *   Result.ok(1),
   *   Result.err('error1'),
   *   Result.ok(2)
   * ];
   *
   * const { successes, failures } = Result.allSettled(operations);
   * ```
   */
  static allSettled<T, E>(
    results: Result<T, E>[]
  ): { successes: Success<T>[]; failures: Failure<E>[] } {
    const successes: Success<T>[] = [];
    const failures: Failure<E>[] = [];

    for (const result of results) {
      if (result.isOk()) {
        successes.push(result);
      } else {
        failures.push(result as Failure<E>);
      }
    }

    return { successes, failures };
  }

  // ===== CONDITIONAL UTILITIES =====

  /**
   * Creates a Result based on a boolean condition.
   *
   * This function returns a successful Result containing the success value if the
   * condition is true, or a failed Result containing the error value if the condition
   * is false. This is useful for converting boolean checks into Result-based flows.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value
   * @param condition - The boolean condition to evaluate
   * @param successValue - The value to return if condition is true
   * @param errorValue - The error to return if condition is false
   * @returns A Result containing either the success or error value based on the condition
   *
   * @example
   * ```typescript
   * // Age validation
   * const ageCheck = Result.when(
   *   user.age >= 18,
   *   user,
   *   'User must be at least 18 years old'
   * );
   * ```
   */
  static when<T, E>(
    condition: boolean,
    successValue: T,
    errorValue: E
  ): Result<T, E> {
    return condition ? Result.ok(successValue) : Result.err(errorValue);
  }

  /**
   * Creates a Result based on the negation of a boolean condition.
   *
   * This function returns a successful Result containing the success value if the
   * condition is false, or a failed Result containing the error value if the condition
   * is true. This is the inverse of `when` and is useful for expressing negative conditions.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value
   * @param condition - The boolean condition to evaluate (will be negated)
   * @param successValue - The value to return if condition is false
   * @param errorValue - The error to return if condition is true
   * @returns A Result containing either the success or error value based on the negated condition
   *
   * @example
   * ```typescript
   * // Ensure user is not banned
   * const userCheck = Result.unless(
   *   user.isBanned,
   *   user,
   *   'User account is banned'
   * );
   * ```
   */
  static unless<T, E>(
    condition: boolean,
    successValue: T,
    errorValue: E
  ): Result<T, E> {
    return !condition ? Result.ok(successValue) : Result.err(errorValue);
  }

  /**
   * Validates a value using a predicate function and returns a Result.
   *
   * This function applies a predicate function to a value and returns a successful
   * Result containing the original value if the predicate returns true, or a failed
   * Result with an error message if the predicate returns false.
   *
   * @template T - The type of the value being validated
   * @param value - The value to validate
   * @param predicate - A function that returns true if the value is valid
   * @param error - The error message to use if validation fails
   * @returns A Result containing either the original value or the error message
   *
   * @example
   * ```typescript
   * // Email validation
   * const emailResult = Result.validate(
   *   email,
   *   (e) => e.includes('@') && e.includes('.'),
   *   'Invalid email format'
   * );
   * ```
   */
  static validate<T>(
    value: T,
    predicate: (value: T) => boolean,
    error: string
  ): Result<T, string> {
    return predicate(value) ? Result.ok(value) : Result.err(error);
  }

  // ===== CONVERSION UTILITIES =====

  /**
   * Converts a nullable value into a Result.
   *
   * This function takes a value that might be null or undefined and converts it
   * into a Result. If the value is not null/undefined, it returns a successful Result.
   * If the value is null or undefined, it returns a failed Result with "missing_value" error.
   *
   * @template T - The type of the non-null value
   * @param value - A value that might be null or undefined
   * @returns A Result containing either the non-null value or "missing_value" error
   *
   * @example
   * ```typescript
   * // Working with potentially null API responses
   * const user = Result.fromNullable(apiResponse.user);
   *
   * if (user.isOk()) {
   *   console.log('User found:', user.unwrap().name);
   * } else {
   *   console.log('No user data available');
   * }
   * ```
   */
  static fromNullable<T>(
    value: T | null | undefined
  ): Result<T, "missing_value">;
  static fromNullable<T, E>(
    value: T | null | undefined,
    error: E
  ): Result<T, E>;
  static fromNullable<T, E>(
    value: T | null | undefined,
    error?: E
  ): Result<T, E | "missing_value"> {
    if (value != null) {
      return Result.ok(value);
    }
    return Result.err(error !== undefined ? error : ("missing_value" as any));
  }

  /**
   * Converts a Promise into a Result, catching any rejections.
   *
   * This function takes a Promise and converts it into a Promise that resolves
   * to a Result. If the original Promise resolves, the Result will be successful.
   * If the original Promise rejects, the Result will contain the rejection reason
   * as an error.
   *
   * @template T - The type of the Promise's resolved value
   * @param promise - The Promise to convert to a Result
   * @returns A Promise that resolves to a Result
   *
   * @example
   * ```typescript
   * // Convert fetch Promise to Result
   * const result = await Result.fromPromise(
   *   fetch('/api/data').then(r => r.json())
   * );
   *
   * if (result.isOk()) {
   *   console.log('Data:', result.data);
   * } else {
   *   console.error('Request failed:', result.error);
   * }
   * ```
   */
  static async fromPromise<T>(
    promise: Promise<T>
  ): Promise<Result<T, unknown>> {
    return promise.then(Result.ok).catch(Result.err);
  }

  /**
   * Converts a tuple with None sentinel into a Result.
   *
   * This function takes a tuple in the format [value, None] for success or
   * [None, error] for failure and converts it into a Result.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value
   * @param tuple - A tuple representing either success or failure
   * @returns A Result containing either the value or the error
   *
   * @example
   * ```typescript
   * // Converting tuples with None
   * const successTuple: [string, None] = ['data', none()];
   * const failureTuple: [None, string] = [none(), 'error'];
   *
   * const success = Result.fromTuple(successTuple); // Ok('data')
   * const failure = Result.fromTuple(failureTuple); // Err('error')
   * ```
   */
  static fromTuple<T, E>(tuple: [T, None] | [None, E]): Result<T, E> {
    return tuple[1] instanceof Object &&
      "isNone" in tuple[1] &&
      tuple[1].isNone()
      ? Result.ok(tuple[0] as T)
      : Result.err(tuple[1] as E);
  }

  /**
   * Converts a Result into an Option, discarding error information.
   *
   * This provides the inverse of `Option.fromResult()`, completing the conversion API.
   * If the Result is successful, it returns Some(value). If the Result is a failure,
   * it returns None (error information is discarded).
   *
   * @template T - The type of the success value
   * @param result - A Result to convert to an Option
   * @returns An Option containing either the success value or None
   *
   * @example
   * ```typescript
   * // Success case
   * const successResult = Result.ok('data');
   * const option = Result.toOption(successResult);
   * // option is Some('data')
   *
   * // Failure case
   * const errorResult = Result.err('something went wrong');
   * const emptyOption = Result.toOption(errorResult);
   * // emptyOption is None (error information discarded)
   *
   * // Complete conversion cycle
   * const original = Option.some('value');
   * const result = Option.toResult(original, 'error'); // Option → Result
   * const back = Result.toOption(result);              // Result → Option
   * // back === Some('value')
   * ```
   */
  static toOption<T>(result: Result<T, any>): any {
    if (!result || typeof result.isOk !== "function") {
      return new None();
    }

    return result.isOk() ? new Some(result.unwrap()) : new None();
  }

  /**
   * Creates an iterator over the success value (if Ok), or empty iterator (if Err).
   *
   * @param result - The Result to iterate over
   * @returns An iterator that yields the success value once, or nothing
   */
  static iter<T, E>(result: Result<T, E>): IterableIterator<T> {
    return result.isOk()
      ? [result.unwrap()][Symbol.iterator]()
      : [][Symbol.iterator]();
  }

  /**
   * Pattern matches on a Result and executes the appropriate handler function.
   *
   * This function provides a functional way to handle both success and failure cases
   * of a Result. It takes a Result and an object with two handler functions: one for
   * the success case (`ok`) and one for the failure case (`err`). The appropriate
   * handler is called based on the Result's state, and both handlers must return
   * the same type.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value
   * @template U - The type returned by both handler functions
   * @param result - The Result to pattern match against
   * @param patterns - Object with `ok` and `err` handler functions
   * @returns The value returned by the called handler function
   *
   * @example
   * ```typescript
   * // Simple success/error handling
   * const result = Result.ok('hello');
   *
   * const message = Result.match(result, {
   *   ok: (value) => `Success: ${value}`,
   *   err: (error) => `Failed: ${error}`
   * });
   * ```
   */
  static match<T, E, U>(
    result: Result<T, E>,
    patterns: {
      ok: (data: T) => U;
      err: (error: E) => U;
    }
  ): U {
    assert(!!result, "match() requires a Result instance");
    assert(isFunction(result.isOk), "match() requires a Result instance");

    assert(
      isFunction(patterns.ok),
      "Invalid pattern object: both ok and err handlers must be functions"
    );

    assert(
      isFunction(patterns.err),
      "Invalid pattern object: both ok and err handlers must be functions"
    );

    if (result.isOk()) {
      return patterns.ok(result.unwrap());
    } else {
      return patterns.err(result._getError());
    }
  }

  /**
   * Creates a function that chains multiple Result-returning functions together.
   *
   * This function takes a series of functions that each take a value and return a Result,
   * and composes them into a single function. The chained function will execute each
   * function in sequence, passing the success value from one to the next. If any function
   * in the chain returns a failure, the chain stops and returns that failure.
   *
   * @template T - The type of values being passed through the chain
   * @template E - The type of errors that can occur
   * @param fns - Functions to chain together, each taking T and returning Result<T, E>
   * @returns A function that applies all the chained functions to an initial value
   *
   * @example
   * ```typescript
   * // Data processing pipeline
   * const processUser = Result.chain(
   *   (user: User) => Result.validate(user, u => u.email.length > 0, 'Email required'),
   *   (user: User) => Result.validate(user, u => u.age >= 18, 'Must be 18+'),
   *   (user: User) => Result.validate(user, u => u.name.length > 0, 'Name required')
   * );
   *
   * const result = processUser(userData);
   * ```
   */
  static chain<T, E>(...fns: Array<(value: T) => Result<T, E>>) {
    if (fns.length === 0) {
      return (initialValue: T): Result<T, E> => Result.ok(initialValue);
    }

    for (let i = 0; i < fns.length; i++) {
      assert(
        isFunction(fns[i]),
        `chain() argument at index ${i} must be a function`
      );
    }

    return (initialValue: T): Result<T, E> => {
      let current: Result<T, E> = Result.ok(initialValue);
      for (const fn of fns) {
        current = current.flatMap(fn);
        if (current.isErr()) break;
      }
      return current;
    };
  }
}

class Success<T> extends Result<T, never> {
  protected readonly _data: T;
  protected readonly _error: None = none();

  constructor(data: T) {
    super();
    this._data = data;
  }

  isOk(): this is Success<T> {
    return true;
  }

  isErr(): this is Failure<never> {
    return false;
  }

  isOkAnd(predicate: (data: T) => boolean): boolean {
    return predicate(this._data);
  }

  isErrAnd(_predicate: (error: never) => boolean): boolean {
    return false;
  }

  map<U>(fn: (data: T) => U): Result<U, never> {
    return new Success(fn(this._data));
  }

  mapError<F>(_fn: (error: never) => F): Result<T, F> {
    return this as any;
  }

  mapOrElse<U>(_errorFn: (error: never) => U, okFn: (data: T) => U): U {
    return okFn(this._data);
  }

  flatMap<U>(fn: (data: T) => Result<U, never>): Result<U, never> {
    return fn(this._data);
  }

  and<U>(other: Result<U, never>): Result<U, never> {
    return other;
  }

  or(_other: Result<T, never>): Result<T, never> {
    return this;
  }

  flatten(): Result<any, never> {
    if (
      this._data &&
      typeof this._data === "object" &&
      "isOk" in this._data &&
      typeof this._data.isOk === "function"
    ) {
      return this._data as any;
    }
    return this as any;
  }

  contains(value: T): boolean {
    return this._data === value;
  }

  containsErr(_error: never): boolean {
    return false;
  }

  unwrap(): T {
    return this._data;
  }

  unwrapOr(_defaultValue: T): T {
    return this._data;
  }

  expect(_message: string): T {
    return this._data;
  }

  unwrapOrElse(_fn: () => T): T {
    return this._data;
  }

  inspect(fn: (data: T) => void): this {
    fn(this._data);
    return this;
  }

  inspectErr<E>(_fn: (error: E) => void): Result<T, E> {
    return this as any;
  }

  andThen<U, F = never>(fn: (data: T) => Result<U, F>): Result<U, never | F> {
    return fn(this._data);
  }

  orElse<F>(_fn: (error: never) => Result<T, F>): Result<T, F> {
    return this as any;
  }

  _getError(): never {
    throw new Error("Success has no error");
  }
}

class Failure<E> extends Result<never, E> {
  protected readonly _data: None = none();
  protected readonly _error: E;

  constructor(error: E) {
    super();
    this._error = error;
  }

  isOk(): this is Success<never> {
    return false;
  }

  isErr(): this is Failure<E> {
    return true;
  }

  isOkAnd(_predicate: (data: never) => boolean): boolean {
    return false;
  }

  isErrAnd(predicate: (error: E) => boolean): boolean {
    return predicate(this._error);
  }

  map<U>(_fn: (data: never) => U): Result<U, E> {
    return this as any;
  }

  mapError<F>(fn: (error: E) => F): Result<never, F> {
    return new Failure(fn(this._error));
  }

  mapOrElse<U>(errorFn: (error: E) => U, _okFn: (data: never) => U): U {
    return errorFn(this._error);
  }

  flatMap<U>(_fn: (data: never) => Result<U, E>): Result<U, E> {
    return this as any;
  }

  and<U>(_other: Result<U, E>): Result<U, E> {
    return this as any;
  }

  or<T>(other: Result<T, E>): Result<T, E> {
    return other;
  }

  flatten(): Result<any, E> {
    return this as any;
  }

  contains(_value: never): boolean {
    return false;
  }

  containsErr(error: E): boolean {
    return this._error === error;
  }

  unwrap(): never {
    throw new Error(`Called unwrap on failure: ${this._error}`);
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  expect<T>(message: string): T {
    throw new Error(`${message}: ${this._error}`);
  }

  unwrapOrElse<T>(fn: () => T): T {
    return fn();
  }

  inspect<T>(_fn: (data: T) => void): Result<T, E> {
    return this as any;
  }

  inspectErr(fn: (error: E) => void): this {
    fn(this._error);
    return this;
  }

  andThen<U, F = E>(_fn: (data: never) => Result<U, F>): Result<U, E | F> {
    return this as any;
  }

  orElse<T, F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return fn(this._error);
  }

  _getError(): E {
    return this._error;
  }
}

export default Result;
export { Success, Failure };
