import { assert, isFunction } from "./internals/assertions";
import Result, { Failure, Success } from "./result";

/**
 * Abstract base class for Option types, similar to Rust's Option<T>.
 *
 * Option represents a value that might or might not be present. It's an alternative
 * to nullable types that forces explicit handling of absent values. An Option can be
 * either Some(T) containing a value, or None representing the absence of a value.
 *
 * @template T - The type of the value that might be present
 */
abstract class Option<T> {
  /** The contained data, now private */
  protected abstract readonly _data: T | null;

  /** Returns true if the Option contains a value (is Some) */
  abstract isSome(): this is Some<T>;

  /** Returns true if the Option contains no value (is None) */
  abstract isNone(): this is None;

  /** Transforms the contained value using the provided function, if present */
  abstract map<U>(fn: (data: T) => U): Option<U>;

  /** Chains another Option-returning operation, if a value is present */
  abstract flatMap<U>(fn: (data: T) => Option<U>): Option<U>;

  /** Returns the Option if it contains a value that passes the predicate, otherwise None */
  abstract filter(predicate: (data: T) => boolean): Option<T>;

  /** Extracts the contained value, throwing if None */
  abstract unwrap(): T;

  /** Extracts the contained value or returns the provided default */
  abstract unwrapOr(defaultValue: T): T;

  /** Extracts the contained value with a custom error message, throwing if None */
  abstract expect(message: string): T;

  /** Extracts the contained value or computes it using the provided function */
  abstract unwrapOrElse(fn: () => T): T;

  /** Performs a side effect with the contained value, if present */
  abstract inspect(fn: (data: T) => void): Option<T>;

  /** Performs a side effect with the contained value, if present (alias for inspect) */
  abstract tap(fn: (data: T) => void): Option<T>;

  /** Chains another Option-returning operation, if a value is present (alias for flatMap) */
  abstract andThen<U>(fn: (data: T) => Option<U>): Option<U>;

  /** Returns this Option if it contains a value, otherwise returns the result of the function */
  abstract orElse(fn: () => Option<T>): Option<T>;

  /** Combines this Option with another Option, creating a tuple if both are Some */
  abstract zip<U>(other: Option<U>): Option<[T, U]>;

  /** Returns true if the Option contains the specified value */
  abstract contains(value: T): boolean;

  /** Applies a function to the contained value (if Some) or returns a default (if None) */
  abstract fold<U>(defaultValue: U, fn: (data: T) => U): U;

  /**
   * Pattern matches on this Option and executes the appropriate handler function.
   */
  match<U>(patterns: { some: (data: T) => U; none: () => U }): U {
    if (!patterns || !isFunction(patterns.some) || !isFunction(patterns.none)) {
      throw new Error(
        "Invalid pattern object: both some and none handlers must be functions"
      );
    }

    if (this.isSome()) {
      return patterns.some(this.unwrap());
    } else {
      return patterns.none();
    }
  }

  /**
   * Creates a Some Option containing the provided value.
   *
   * @template T - The type of the value
   * @param data - The value to wrap in an Option
   * @returns A Some Option containing the value
   */
  static some<T>(data: T): Some<T> {
    return new Some(data);
  }

  /**
   * Creates a None Option representing no value.
   *
   * @returns A None Option
   */
  static none(): None {
    return new None();
  }

  // ===== CONVERSION UTILITIES =====
  /**
   * Converts a nullable value into an Option.
   *
   * This function takes a value that might be null or undefined and converts it
   * into an Option. If the value is not null/undefined, it returns Some(value).
   * If the value is null or undefined, it returns None.
   *
   * @template T - The type of the non-null value
   * @param value - A value that might be null or undefined
   * @returns An Option containing either the value or None
   *
   * @example
   * ```typescript
   * // Working with potentially null API responses
   * const user = Option.fromNullable(apiResponse.user);
   *
   * if (user.isSome()) {
   *   console.log('User found:', user.unwrap().name);
   * } else {
   *   console.log('No user data available');
   * }
   * ```
   */
  static fromNullable<T>(value: T | null | undefined): Option<T> {
    return value != null ? Option.some(value) : Option.none();
  }

  /**
   * Converts a Result into an Option, discarding error information.
   *
   * This function takes a Result and converts it into an Option.
   * If the Result is successful, it returns Some(value).
   * If the Result is a failure, it returns None (error information is lost).
   *
   * @template T - The type of the success value
   * @template E - The type of the error value (discarded)
   * @param result - A Result to convert to an Option
   * @returns An Option containing either the success value or None
   *
   * @example
   * ```typescript
   * // Converting API call results
   * const userResult = await Result.tryCatch(() => fetchUser(123));
   * const userOption = Option.fromResult(userResult);
   *
   * const userName = userOption
   *   .map(user => user.name)
   *   .unwrapOr('Unknown');
   * ```
   */
  static fromResult<T, E>(result: Result<T, E>): Option<T> {
    return result.isOk() ? Option.some(result.unwrap()) : Option.none();
  }

  /**
   * Converts an Option into a Result with a custom error for None cases.
   *
   * This method provides a clean API for Option-to-Result conversion.
   * If the Option contains a value (Some), it returns a successful Result.
   * If the Option is empty (None), it returns a failed Result with the provided error.
   *
   * @template T - The type of the value
   * @template E - The type of the error
   * @param option - An Option to convert to a Result
   * @param error - The error to use if the Option is None
   * @returns A Result containing either the value or the provided error
   *
   * @example
   * ```typescript
   * // Success case
   * const maybeValue = Option.some(42);
   * const result = Option.toResult(maybeValue, 'No value found');
   * // result is Success(42)
   *
   * // Failure case
   * const empty = Option.none();
   * const emptyResult = Option.toResult(empty, 'No value found');
   * // emptyResult is Failure('No value found')
   * ```
   */
  static toResult<T, E>(option: Option<T>, error: E): any {
    return option.isSome() ? new Success(option.unwrap()) : new Failure(error);
  }

  // ===== FUNCTIONAL UTILITIES =====
  /**
   * Pattern matches on an Option and executes the appropriate handler function.
   *
   * This function provides a functional way to handle both Some and None cases
   * of an Option. It takes an Option and an object with two handler functions: one for
   * the Some case and one for the None case. The appropriate handler is called based
   * on the Option's state, and both handlers must return the same type.
   *
   * @template T - The type of the value in the Option
   * @template U - The type returned by both handler functions
   * @param option - The Option to pattern match against
   * @param patterns - Object with `some` and `none` handler functions
   * @returns The value returned by the called handler function
   *
   * @example
   * ```typescript
   * // Simple Some/None handling
   * const option = findUser(123);
   *
   * const message = Option.match(option, {
   *   some: (user) => `Welcome back, ${user.name}!`,
   *   none: () => 'Please log in to continue'
   * });
   * ```
   */
  static match<T, U>(
    option: Option<T>,
    patterns: {
      some: (data: T) => U;
      none: () => U;
    }
  ): U {
    assert(!!option, "match() requires an Option instance");
    assert(!!option.isSome, "match() requires an Option instance");

    assert(
      !!patterns,
      "Invalid pattern object: both some and none handlers must be functions"
    );
    assert(
      !!patterns.some && isFunction(patterns.some),
      "Invalid pattern object: both some and none handlers must be functions"
    );
    assert(
      !!patterns.none && isFunction(patterns.none),
      "Invalid pattern object: both some and none handlers must be functions"
    );

    if (option.isSome()) {
      return patterns.some(option.unwrap());
    } else {
      return patterns.none();
    }
  }
}

/**
 * Some variant of Option containing a value.
 *
 * Represents an Option that contains a value of type T. All operations
 * will be performed on the contained value. This is the "success" case
 * of the Option type, similar to Rust's Some(T).
 *
 * @template T - The type of the contained value
 *
 * @example
 * ```typescript
 * // Creating a Some with a value
 * const userName = new Some("Alice");
 *
 * // Transforming the value
 * const greeting = userName.map(name => `Hello, ${name}!`);
 * console.log(greeting.unwrap()); // "Hello, Alice!"
 * ```
 *
 * @example
 * ```typescript
 * // Chain operations on Some
 * const userId = new Some(42);
 * const userEmail = userId
 *   .flatMap(id => findUser(id))
 *   .map(user => user.email);
 *
 * if (userEmail.isSome()) {
 *   console.log("Email:", userEmail.unwrap());
 * }
 * ```
 */
class Some<T> extends Option<T> {
  /** The contained value, now private */
  protected readonly _data: T;

  /**
   * Creates a new Some instance containing the provided value.
   *
   * @param data - The value to contain
   */
  constructor(data: T) {
    super();
    this._data = data;
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None {
    return false;
  }

  map<U>(fn: (data: T) => U): Option<U> {
    return new Some(fn(this._data));
  }

  flatMap<U>(fn: (data: T) => Option<U>): Option<U> {
    return fn(this._data);
  }

  filter(predicate: (data: T) => boolean): Option<T> {
    return predicate(this._data) ? this : new None();
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

  inspect(fn: (data: T) => void): Option<T> {
    fn(this._data);
    return this;
  }

  tap(fn: (data: T) => void): Option<T> {
    fn(this._data);
    return this;
  }

  andThen<U>(fn: (data: T) => Option<U>): Option<U> {
    return fn(this._data);
  }

  orElse(_fn: () => Option<T>): Option<T> {
    return this;
  }

  zip<U>(other: Option<U>): Option<[T, U]> {
    return other.isSome() ? new Some([this._data, other.unwrap()]) : new None();
  }

  contains(value: T): boolean {
    return this._data === value;
  }

  fold<U>(_defaultValue: U, fn: (data: T) => U): U {
    return fn(this._data);
  }
}

/**
 * None variant of Option representing no value.
 *
 * Represents an Option that contains no value. All transforming operations
 * (map, flatMap, filter) will return None unchanged, while unwrap operations
 * will either throw or return default values. This is the "empty" case
 * of the Option type, similar to Rust's None.
 *
 * @example
 * ```typescript
 * // Creating a None
 * const emptyValue = new None();
 *
 * // Operations on None return None (except unwrapOr)
 * const result = emptyValue
 *   .map(x => x * 2)
 *   .filter(x => x > 0)
 *   .map(x => x.toString());
 *
 * console.log(result.isNone()); // true
 * ```
 *
 * @example
 * ```typescript
 * // Safe value extraction with defaults
 * const none = new None();
 *
 * const value = none.unwrapOr("default");
 * console.log(value); // "default"
 *
 * // Unsafe extraction throws
 * try {
 *   none.unwrap(); // throws Error
 * } catch (e) {
 *   console.log("Cannot unwrap None");
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Conditional logic with None
 * const maybeUser: Option<User> = new None();
 *
 * if (maybeUser.isNone()) {
 *   console.log("No user found");
 *   // Handle empty case
 * }
 *
 * // Side effects are skipped on None
 * maybeUser.inspect(user => console.log(user.name)); // Nothing logged
 * ```
 *
 * @example
 * ```typescript
 * // Chaining with None short-circuits
 * const processedData = new None()
 *   .flatMap(data => validateData(data))
 *   .map(data => transformData(data))
 *   .flatMap(data => saveData(data));
 *
 * // All operations are skipped, result is still None
 * console.log(processedData.isNone()); // true
 * ```
 */
class None extends Option<never> {
  protected readonly _data: never = null as never;

  isSome(): this is Some<never> {
    return false;
  }

  isNone(): this is None {
    return true;
  }

  map<U>(_fn: (data: never) => U): Option<U> {
    return this as any;
  }

  flatMap<U>(_fn: (data: never) => Option<U>): Option<U> {
    return this as any;
  }

  filter(_predicate: (data: never) => boolean): Option<never> {
    return this;
  }

  unwrap(): never {
    throw new Error("Called unwrap on None");
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  expect(message: string): never {
    throw new Error(message);
  }

  unwrapOrElse<T>(fn: () => T): T {
    return fn();
  }

  inspect(_fn: (data: never) => void): Option<never> {
    return this;
  }

  tap<T>(_fn: (data: T) => void): Option<T> {
    return this as any;
  }

  andThen<U>(_fn: (data: never) => Option<U>): Option<U> {
    return this as any;
  }

  orElse<T>(fn: () => Option<T>): Option<T> {
    return fn();
  }

  zip<T, U>(_other: Option<U>): Option<[T, U]> {
    return this as any;
  }

  contains<T>(_value: T): boolean {
    return false;
  }

  fold<T, U>(defaultValue: U, _fn: (data: T) => U): U {
    return defaultValue;
  }
}

export default Option;
export { Some, None };
