import { describe, it, expect } from "vitest";
import {
  assert,
  assertIsOk,
  assertIsErr,
  assertIsSome,
  assertIsNone,
  assertIsDefined,
  assertIsArray,
  assertIsNumber,
  assertIsPositiveNumber,
  assertIsInteger,
  isFunction,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isNumber,
  isArray,
  isObject,
  isPromise,
  isPositiveNumber,
  isInteger,
} from "../assertions";
import Option from "../../core/option/option";
import Result from "../../core/result/result";

describe("assertions", () => {
  describe("assert", () => {
    it("should not throw when condition is true", () => {
      expect(() => assert(true, "Should not throw")).not.toThrow();
    });

    it("should throw when condition is false", () => {
      expect(() => assert(false, "Should throw")).toThrow("Should throw");
    });
  });

  describe("assertIsOk", () => {
    it("should not throw for Success result", () => {
      const result = Result.ok(42);
      expect(() => assertIsOk(result)).not.toThrow();
    });

    it("should throw for Failure result", () => {
      const result = Result.err("error");
      expect(() => assertIsOk(result)).toThrow("Result is an error");
    });
  });

  describe("assertIsErr", () => {
    it("should not throw for Failure result", () => {
      const result = Result.err("error");
      expect(() => assertIsErr(result)).not.toThrow();
    });

    it("should throw for Success result", () => {
      const result = Result.ok(42);
      expect(() => assertIsErr(result)).toThrow("Result is a success");
    });
  });

  describe("assertIsSome", () => {
    it("should not throw for Some option", () => {
      const option = Option.some(42);
      expect(() => assertIsSome(option)).not.toThrow();
    });

    it("should throw for None option", () => {
      const option = Option.none();
      expect(() => assertIsSome(option)).toThrow("Option is None");
    });
  });

  describe("assertIsNone", () => {
    it("should not throw for None option", () => {
      const option = Option.none();
      expect(() => assertIsNone(option)).not.toThrow();
    });

    it("should throw for Some option", () => {
      const option = Option.some(42);
      expect(() => assertIsNone(option)).toThrow("Option is Some");
    });
  });

  describe("assertIsDefined", () => {
    it("should not throw for defined values", () => {
      expect(() => assertIsDefined(0)).not.toThrow();
      expect(() => assertIsDefined("")).not.toThrow();
      expect(() => assertIsDefined(false)).not.toThrow();
      expect(() => assertIsDefined([])).not.toThrow();
      expect(() => assertIsDefined({})).not.toThrow();
    });

    it("should throw for undefined", () => {
      expect(() => assertIsDefined(undefined)).toThrow(
        "Value is undefined or null"
      );
    });

    it("should throw for null", () => {
      expect(() => assertIsDefined(null)).toThrow("Value is undefined or null");
    });
  });

  describe("assertIsArray", () => {
    it("should not throw for arrays", () => {
      expect(() => assertIsArray([])).not.toThrow();
      expect(() => assertIsArray([1, 2, 3])).not.toThrow();
      expect(() => assertIsArray(["a", "b"])).not.toThrow();
      expect(() => assertIsArray(new Array())).not.toThrow();
      expect(() => assertIsArray(new Array(1, 2, 3))).not.toThrow();
      expect(() => assertIsArray(new Array("a", "b"))).not.toThrow();
    });

    it("should throw for non-arrays", () => {
      expect(() => assertIsArray(42)).toThrow("Value must be an array");
      expect(() => assertIsArray("string")).toThrow("Value must be an array");
      expect(() => assertIsArray({})).toThrow("Value must be an array");
      expect(() => assertIsArray(null)).toThrow("Value must be an array");
      expect(() => assertIsArray(undefined)).toThrow("Value must be an array");
    });
  });

  describe("assertIsNumber", () => {
    it("should not throw for numbers", () => {
      expect(() => assertIsNumber(0)).not.toThrow();
      expect(() => assertIsNumber(42)).not.toThrow();
      expect(() => assertIsNumber(-10)).not.toThrow();
      expect(() => assertIsNumber(3.14)).not.toThrow();
      expect(() => assertIsNumber(NaN)).not.toThrow();
      expect(() => assertIsNumber(Infinity)).not.toThrow();
    });

    it("should throw for non-numbers", () => {
      expect(() => assertIsNumber("42")).toThrow("Value must be a number");
      expect(() => assertIsNumber(true)).toThrow("Value must be a number");
      expect(() => assertIsNumber([])).toThrow("Value must be a number");
      expect(() => assertIsNumber({})).toThrow("Value must be a number");
      expect(() => assertIsNumber(null)).toThrow("Value must be a number");
      expect(() => assertIsNumber(undefined)).toThrow("Value must be a number");
    });
  });

  describe("assertIsPositiveNumber", () => {
    it("should not throw for positive numbers", () => {
      expect(() => assertIsPositiveNumber(1)).not.toThrow();
      expect(() => assertIsPositiveNumber(42)).not.toThrow();
      expect(() => assertIsPositiveNumber(0.1)).not.toThrow();
      expect(() => assertIsPositiveNumber(Infinity)).not.toThrow();
    });

    it("should throw for non-positive numbers", () => {
      expect(() => assertIsPositiveNumber(0)).toThrow(
        "Value must be a positive number"
      );
      expect(() => assertIsPositiveNumber(-1)).toThrow(
        "Value must be a positive number"
      );
      expect(() => assertIsPositiveNumber(NaN)).toThrow(
        "Value must be a positive number"
      );
    });

    it("should throw for non-numbers", () => {
      expect(() => assertIsPositiveNumber("42")).toThrow(
        "Value must be a positive number"
      );
      expect(() => assertIsPositiveNumber(null)).toThrow(
        "Value must be a positive number"
      );
    });
  });

  describe("assertIsInteger", () => {
    it("should not throw for integers", () => {
      expect(() => assertIsInteger(0)).not.toThrow();
      expect(() => assertIsInteger(42)).not.toThrow();
      expect(() => assertIsInteger(-10)).not.toThrow();
    });

    it("should throw for non-integers", () => {
      expect(() => assertIsInteger(3.14)).toThrow("Value must be an integer");
      expect(() => assertIsInteger(0.5)).toThrow("Value must be an integer");
      expect(() => assertIsInteger(NaN)).toThrow("Value must be an integer");
      expect(() => assertIsInteger(Infinity)).toThrow(
        "Value must be an integer"
      );
    });

    it("should throw for non-numbers", () => {
      expect(() => assertIsInteger("42")).toThrow("Value must be an integer");
      expect(() => assertIsInteger(null)).toThrow("Value must be an integer");
    });
  });

  describe("isFunction", () => {
    it("should return true for functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(async () => {})).toBe(true);
      expect(isFunction(Date)).toBe(true);
      expect(isFunction(Array)).toBe(true);
    });

    it("should return false for non-functions", () => {
      expect(isFunction(42)).toBe(false);
      expect(isFunction("function")).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
    });
  });

  describe("isNull", () => {
    it("should return true for null", () => {
      expect(isNull(null)).toBe(true);
    });

    it("should return false for non-null values", () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull("")).toBe(false);
      expect(isNull(false)).toBe(false);
      expect(isNull([])).toBe(false);
      expect(isNull({})).toBe(false);
    });
  });

  describe("isUndefined", () => {
    it("should return true for undefined", () => {
      expect(isUndefined(undefined)).toBe(true);
      expect(isUndefined(void 0)).toBe(true);
    });

    it("should return false for non-undefined values", () => {
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined("")).toBe(false);
      expect(isUndefined(false)).toBe(false);
      expect(isUndefined([])).toBe(false);
      expect(isUndefined({})).toBe(false);
    });
  });

  describe("isNullOrUndefined", () => {
    it("should return true for null or undefined", () => {
      expect(isNullOrUndefined(null)).toBe(true);
      expect(isNullOrUndefined(undefined)).toBe(true);
      expect(isNullOrUndefined(void 0)).toBe(true);
    });

    it("should return false for defined values", () => {
      expect(isNullOrUndefined(0)).toBe(false);
      expect(isNullOrUndefined("")).toBe(false);
      expect(isNullOrUndefined(false)).toBe(false);
      expect(isNullOrUndefined([])).toBe(false);
      expect(isNullOrUndefined({})).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("should return true for numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-10)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
    });

    it("should return false for non-numbers", () => {
      expect(isNumber("42")).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber([])).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber(() => {})).toBe(false);
    });
  });

  describe("isArray", () => {
    it("should return true for arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(["a", "b", "c"])).toBe(true);
      expect(isArray(new Array())).toBe(true);
    });

    it("should return false for non-arrays", () => {
      expect(isArray({})).toBe(false);
      expect(isArray("array")).toBe(false);
      expect(isArray(42)).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray({ length: 2 })).toBe(false);
    });
  });

  describe("isObject", () => {
    it("should return true for objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject([])).toBe(true);
      expect(isObject(new Date())).toBe(true);
      expect(isObject(/regex/)).toBe(true);
      expect(isObject(new Map())).toBe(true);
      expect(isObject(new Set())).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject("object")).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(() => {})).toBe(false);
    });
  });

  describe("isPromise", () => {
    it("should return true for promises", () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(Promise.reject().catch(() => {}))).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
      const asyncFunction = async () => {};
      expect(isPromise(asyncFunction())).toBe(true);
    });

    it("should return true for promise-like objects", () => {
      expect(isPromise({ then: () => {} })).toBe(true);
      expect(isPromise({ then: () => {}, catch: () => {} })).toBe(true);
    });

    it("should return false for non-promises", () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise(42)).toBe(false);
      expect(isPromise("promise")).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise([])).toBe(false);
      expect(isPromise(() => {})).toBe(false);
    });
  });

  describe("isPositiveNumber", () => {
    it("should return true for positive numbers", () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(42)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
      expect(isPositiveNumber(Infinity)).toBe(true);
    });

    it("should return false for non-positive numbers", () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber(-42)).toBe(false);
      expect(isPositiveNumber(-0.1)).toBe(false);
      expect(isPositiveNumber(-Infinity)).toBe(false);
      expect(isPositiveNumber(NaN)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isPositiveNumber("42")).toBe(false);
      expect(isPositiveNumber(true)).toBe(false);
      expect(isPositiveNumber([])).toBe(false);
      expect(isPositiveNumber({})).toBe(false);
      expect(isPositiveNumber(null)).toBe(false);
      expect(isPositiveNumber(undefined)).toBe(false);
    });
  });

  describe("isInteger", () => {
    it("should return true for integers", () => {
      expect(isInteger(0)).toBe(true);
      expect(isInteger(42)).toBe(true);
      expect(isInteger(-10)).toBe(true);
      expect(isInteger(1000000)).toBe(true);
    });

    it("should return false for non-integers", () => {
      expect(isInteger(3.14)).toBe(false);
      expect(isInteger(0.5)).toBe(false);
      expect(isInteger(-0.1)).toBe(false);
      expect(isInteger(NaN)).toBe(false);
      expect(isInteger(Infinity)).toBe(false);
      expect(isInteger(-Infinity)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isInteger("42")).toBe(false);
      expect(isInteger(true)).toBe(false);
      expect(isInteger([])).toBe(false);
      expect(isInteger({})).toBe(false);
      expect(isInteger(null)).toBe(false);
      expect(isInteger(undefined)).toBe(false);
    });
  });
});
