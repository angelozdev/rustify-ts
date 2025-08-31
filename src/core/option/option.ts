import {
  assert,
  isFunction,
  isNullOrUndefined,
} from "../../internals/assertions";
import Result, { Failure, Success } from "../result/result";

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
  /** Returns true if the Option contains a value (is Some) */
  abstract isSome(): this is Some<T>;

  /** Returns true if the Option contains no value (is None) */
  abstract isNone(): this is None<T>;

  /** Returns true if Option is Some and the value matches the predicate */
  abstract isSomeAnd(predicate: (data: T) => boolean): boolean;

  /** Returns true if Option is None or if Option is Some and the value matches the predicate */
  abstract isNoneOr(predicate: (data: T) => boolean): boolean;

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

  /** Chains another Option-returning operation, if a value is present (alias for flatMap) */
  abstract andThen<U>(fn: (data: T) => Option<U>): Option<U>;

  /** Returns this Option if it contains a value, otherwise returns the result of the function */
  abstract orElse(fn: () => Option<T>): Option<T>;

  /** Returns other if this Option is Some, otherwise None */
  abstract and<U>(other: Option<U>): Option<U>;

  /** Returns this Option if Some, otherwise returns other */
  abstract or(other: Option<T>): Option<T>;

  /** Returns Some if exactly one of the Options is Some, otherwise None */
  abstract xor(other: Option<T>): Option<T>;

  /** Combines this Option with another Option, creating a tuple if both are Some */
  abstract zip<U>(other: Option<U>): Option<[T, U]>;

  /** Returns true if the Option contains the specified value */
  abstract contains(value: T): boolean;

  /** Converts to Result with provided error for None case */
  abstract okOr<E>(error: E): Result<T, E>;

  /** Converts to Result with computed error for None case */
  abstract okOrElse<E>(errorFn: () => E): Result<T, E>;

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
  static none<T>(): None<T> {
    return new None<T>();
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
    return !isNullOrUndefined(value) ? Option.some(value) : Option.none();
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
  static toResult<T, E>(option: Option<T>, error: E): Result<T, E> {
    assert(!!option, "toResult() requires an Option instance");
    return option.isSome() ? new Success(option.unwrap()) : new Failure(error);
  }

  // ===== FUNCTIONAL UTILITIES =====
  /**
   * Creates an iterator over the contained value (if Some), or empty iterator (if None).
   *
   * @param option - The Option to iterate over
   * @returns An iterator that yields the contained value once, or nothing
   */
  static iter<T>(option: Option<T>): IterableIterator<T> {
    return option.isSome()
      ? [option.unwrap()][Symbol.iterator]()
      : [][Symbol.iterator]();
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

  /**
   * Creates a new Some instance containing the provided value.
   *
   * @param data - The value to contain
   */
  constructor(private readonly data: T) {
    super();

    if (isNullOrUndefined(data)) {
      throw new Error("Some() requires a value");
    }
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None<T> {
    return false;
  }

  isSomeAnd(predicate: (data: T) => boolean): boolean {
    return predicate(this.data);
  }

  isNoneOr(predicate: (data: T) => boolean): boolean {
    return predicate(this.data);
  }

  map<U>(fn: (data: T) => U): Option<U> {
    return new Some(fn(this.data));
  }

  flatMap<U>(fn: (data: T) => Option<U>): Option<U> {
    return fn(this.data);
  }

  filter(predicate: (data: T) => boolean): Option<T> {
    return predicate(this.data) ? this : new None();
  }

  unwrap(): T {
    return this.data;
  }

  unwrapOr(_defaultValue: T): T {
    return this.data;
  }

  expect(_message: string): T {
    return this.data;
  }

  unwrapOrElse(_fn: () => T): T {
    return this.data;
  }

  inspect(fn: (data: T) => void): Option<T> {
    fn(this.data);
    return this;
  }

  andThen<U>(fn: (data: T) => Option<U>): Option<U> {
    return fn(this.data);
  }

  orElse(_fn: () => Option<T>): Option<T> {
    return this;
  }

  and<U>(other: Option<U>): Option<U> {
    return other;
  }

  or(_other: Option<T>): Option<T> {
    return this;
  }

  xor(other: Option<T>): Option<T> {
    return other.isSome() ? new None() : this;
  }

  zip<U>(other: Option<U>): Option<[T, U]> {
    return other.isSome() ? new Some([this.data, other.unwrap()]) : new None();
  }

  contains(value: T): boolean {
    return this.data === value;
  }

  okOr<E>(_error: E): Result<T, E> {
    return new Success(this.data);
  }

  okOrElse<E>(_errorFn: () => E): Result<T, E> {
    return new Success(this.data);
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
class None<T> extends Option<T> {
  isSome(): this is Some<T> {
    return false;
  }

  isNone(): this is None<T> {
    return true;
  }

  isSomeAnd(_predicate: (data: T) => boolean): boolean {
    return false;
  }

  isNoneOr(_predicate: (data: T) => boolean): boolean {
    return true;
  }

  map<U>(_fn: (data: T) => U): Option<U> {
    return new None();
  }

  flatMap<U>(_fn: (data: T) => Option<U>): Option<U> {
    return new None();
  }

  filter(_predicate: (data: T) => boolean): Option<T> {
    return this;
  }

  unwrap(): T {
    throw new Error("Called unwrap on None");
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  expect(message: string): T {
    throw new Error(message);
  }

  unwrapOrElse(fn: () => T): T {
    return fn();
  }

  inspect(_fn: (data: T) => void): Option<T> {
    return this;
  }

  andThen<U>(_fn: (data: T) => Option<U>): Option<U> {
    return new None();
  }

  orElse(fn: () => Option<T>): Option<T> {
    return fn();
  }

  and<U>(_other: Option<U>): Option<U> {
    return new None();
  }

  or(other: Option<T>): Option<T> {
    return other;
  }

  xor(other: Option<T>): Option<T> {
    return other.isSome() ? other : new None();
  }

  zip<U>(_other: Option<U>): Option<[T, U]> {
    return new None();
  }

  contains(_value: T): boolean {
    return false;
  }

  okOr<E>(error: E): Result<T, E> {
    return new Failure(error);
  }

  okOrElse<E>(errorFn: () => E): Result<T, E> {
    return new Failure(errorFn());
  }
}

export default Option;
export { Some, None };
