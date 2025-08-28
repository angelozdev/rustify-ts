import Option, { None, Some } from "../option";
import Result, { Failure, Success } from "../result";

export function assert(
  condition: boolean,
  message: string
): asserts condition is true {
  if (!condition) throw new Error(message);
}

export function assertIsOk<T>(
  result: Result<T, any>
): asserts result is Success<T> {
  assert(result.isOk(), "Result is an error");
}

export function assertIsErr<E>(
  result: Result<any, E>
): asserts result is Failure<E> {
  assert(result.isErr(), "Result is a success");
}

export function assertIsSome<T>(option: Option<T>): asserts option is Some<T> {
  assert(option.isSome(), "Option is None");
}

export function assertIsNone<T>(option: Option<T>): asserts option is None {
  assert(option.isNone(), "Option is Some");
}

export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  assert(value !== undefined && value !== null, "Value is undefined or null");
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}
