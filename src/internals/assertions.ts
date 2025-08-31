import Option, { None, Some } from "../core/option/option";
import Result, { Failure, Success } from "../core/result/result";

export function assert(
  condition: boolean,
  message: string
): asserts condition is true {
  if (!condition) throw new Error(message);
}

export function assertIsOk<T, E>(
  result: Result<T, E>
): asserts result is Success<T> {
  assert(result.isOk(), "Result is an error");
}

export function assertIsErr<T, E>(
  result: Result<T, E>
): asserts result is Failure<E> {
  assert(result.isErr(), "Result is a success");
}

export function assertIsSome<T>(option: Option<T>): asserts option is Some<T> {
  assert(option.isSome(), "Option is None");
}

export function assertIsNone<T>(option: Option<T>): asserts option is None<T> {
  assert(option.isNone(), "Option is Some");
}

export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  assert(value !== undefined && value !== null, "Value is undefined or null");
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value != null && typeof (value as any).then === "function";
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function assertIsArray<T = unknown>(
  value: unknown
): asserts value is T[] {
  assert(isArray(value), "Value must be an array");
}

export function assertIsNumber(value: unknown): asserts value is number {
  assert(isNumber(value), "Value must be a number");
}

export function assertIsPositiveNumber(
  value: unknown
): asserts value is number {
  assert(isPositiveNumber(value), "Value must be a positive number");
}

export function assertIsInteger(value: unknown): asserts value is number {
  assert(isInteger(value), "Value must be an integer");
}
