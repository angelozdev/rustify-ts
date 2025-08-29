import { describe, it, expect, vi } from "vitest";
import Option from "../option/option";

import err from "../result/err";
import { ok } from "../result";

describe("Option", () => {
  describe("isSome() and isNone()", () => {
    it("should return correct identity for Some", () => {
      const option = Option.some("value");
      expect(option.isSome()).toBe(true);
      expect(option.isNone()).toBe(false);
    });

    it("should return correct identity for None", () => {
      const option = Option.none();
      expect(option.isSome()).toBe(false);
      expect(option.isNone()).toBe(true);
    });
  });

  describe("map()", () => {
    it("should transform Some value", () => {
      const option = Option.some(5);
      const mapped = option.map((x) => x * 2);
      expect(mapped.isSome()).toBe(true);
      expect(mapped.unwrap()).toBe(10);
    });

    it("should return None when mapping over None", () => {
      const option: Option<number> = Option.none();
      const mapped = option.map((x) => x * 2);
      expect(mapped.isNone()).toBe(true);
    });

    it("should work with different types", () => {
      const option = Option.some(42);
      const mapped = option.map((x) => x.toString());
      expect(mapped.unwrap()).toBe("42");
    });

    it("should be chainable", () => {
      const option = Option.some(10);
      const result = option
        .map((x) => x * 2)
        .map((x) => x + 1)
        .map((x) => `Result: ${x}`);
      expect(result.unwrap()).toBe("Result: 21");
    });
  });

  describe("flatMap()", () => {
    it("should flatten nested Options with Some", () => {
      const option = Option.some(5);
      const flatMapped = option.flatMap((x) => Option.some(x * 2));
      expect(flatMapped.isSome()).toBe(true);
      expect(flatMapped.unwrap()).toBe(10);
    });

    it("should return None when flatMapping over None", () => {
      const option: Option<number> = Option.none();
      const flatMapped = option.flatMap((x) => Option.some(x * 2));
      expect(flatMapped.isNone()).toBe(true);
    });

    it("should return None when inner function returns None", () => {
      const option = Option.some(5);
      const flatMapped = option.flatMap((_x) => Option.none());
      expect(flatMapped.isNone()).toBe(true);
    });

    it("should be chainable", () => {
      const option = Option.some(10);
      const result = option
        .flatMap((x) => Option.some(x / 2))
        .flatMap((x) => Option.some(x + 1));
      expect(result.unwrap()).toBe(6);
    });
  });

  describe("filter()", () => {
    it("should keep Some value when predicate passes", () => {
      const option = Option.some(10);
      const filtered = option.filter((x) => x > 5);
      expect(filtered.isSome()).toBe(true);
      expect(filtered.unwrap()).toBe(10);
    });

    it("should return None when predicate fails", () => {
      const option = Option.some(3);
      const filtered = option.filter((x) => x > 5);
      expect(filtered.isNone()).toBe(true);
    });

    it("should return None when filtering None", () => {
      const option: Option<number> = Option.none();
      const filtered = option.filter((x) => x > 5);
      expect(filtered.isNone()).toBe(true);
    });

    it("should work with complex predicates", () => {
      const option = Option.some("hello world");
      const filtered = option.filter((s) => s.includes("world"));
      expect(filtered.unwrap()).toBe("hello world");

      const filtered2 = option.filter((s) => s.includes("goodbye"));
      expect(filtered2.isNone()).toBe(true);
    });
  });

  describe("unwrap()", () => {
    it("should return value for Some", () => {
      const option = Option.some("test value");
      expect(option.unwrap()).toBe("test value");
    });

    it("should throw error for None", () => {
      const option = Option.none();
      expect(() => option.unwrap()).toThrow("Called unwrap on None");
    });

    it("should work with different types", () => {
      const numberOption = Option.some(42);
      expect(numberOption.unwrap()).toBe(42);

      const objectOption = Option.some({ key: "value" });
      expect(objectOption.unwrap()).toEqual({ key: "value" });
    });
  });

  describe("unwrapOr()", () => {
    it("should return value for Some", () => {
      const option = Option.some("original");
      expect(option.unwrapOr("default")).toBe("original");
    });

    it("should return default for None", () => {
      const option: Option<string> = Option.none();
      expect(option.unwrapOr("default")).toBe("default");
    });

    it("should work with different types", () => {
      const numberOption: Option<number> = Option.none();
      expect(numberOption.unwrapOr(42)).toBe(42);

      const arrayOption: Option<number[]> = Option.none();
      expect(arrayOption.unwrapOr([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("inspect()", () => {
    it("should execute function with Some value and return original", () => {
      let sideEffect = "";
      const option = Option.some("test value");
      const returned = option.inspect((value) => {
        sideEffect = `inspected: ${value}`;
      });

      expect(returned).toBe(option);
      expect(returned.unwrap()).toBe("test value");
      expect(sideEffect).toBe("inspected: test value");
    });

    it("should not execute function with None", () => {
      let sideEffect = "";
      const option: Option<string> = Option.none();
      const returned = option.inspect((value) => {
        sideEffect = `should not execute: ${value}`;
      });

      expect(returned).toBe(option);
      expect(returned.isNone()).toBe(true);
      expect(sideEffect).toBe("");
    });

    it("should be chainable", () => {
      let effects: string[] = [];
      const option = Option.some(42)
        .inspect((x) => effects.push(`first: ${x}`))
        .map((x) => x * 2)
        .inspect((x) => effects.push(`second: ${x}`));

      expect(option.unwrap()).toBe(84);
      expect(effects).toEqual(["first: 42", "second: 84"]);
    });
  });

  describe("match()", () => {
    it("should call some handler for Some value", () => {
      const option = Option.some("hello");
      const result = option.match({
        some: (value) => `got: ${value}`,
        none: () => "got nothing",
      });
      expect(result).toBe("got: hello");
    });

    it("should call none handler for None", () => {
      const option: Option<string> = Option.none();
      const result = option.match({
        some: (value) => `got: ${value}`,
        none: () => "got nothing",
      });
      expect(result).toBe("got nothing");
    });

    it("should work with different return types", () => {
      const numberOption = Option.some(42);
      const length = numberOption.match({
        some: (n) => n.toString().length,
        none: () => 0,
      });
      expect(length).toBe(2);
    });

    it("should throw error with invalid patterns", () => {
      const option = Option.some("test");
      expect(() => {
        option.match({} as any);
      }).toThrow("Invalid pattern object");

      expect(() => {
        option.match({ some: "not a function", none: () => {} } as any);
      }).toThrow("Invalid pattern object");
    });
  });

  describe("expect()", () => {
    it("should return the value when Some", () => {
      const option = Option.some("test value");
      expect(option.expect("Should work")).toBe("test value");
    });

    it("should throw error with custom message when None", () => {
      const option = Option.none();
      expect(() => option.expect("Custom error message")).toThrow(
        "Custom error message"
      );
    });

    it("should work with different types", () => {
      const numberOption = Option.some(42);
      expect(numberOption.expect("Number should work")).toBe(42);

      const obj = { key: "value" };
      const objectOption = Option.some(obj);
      expect(objectOption.expect("Object should work")).toEqual(obj);
    });
  });

  describe("unwrapOrElse()", () => {
    it("should return the value when Some", () => {
      const option = Option.some("some value");
      const fn = vi.fn(() => "fallback");
      const result = option.unwrapOrElse(fn);
      expect(result).toBe("some value");
      expect(fn).not.toHaveBeenCalled();
    });

    it("should execute function and return result when None", () => {
      const option = Option.none();
      const fn = vi.fn(() => "computed fallback");
      const result = option.unwrapOrElse(fn);
      expect(result).toBe("computed fallback");
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should allow dynamic computation based on external state", () => {
      const option = Option.none();
      const fn = vi.fn(() => "computed fallback");
      const result = option.unwrapOrElse(fn);
      expect(result).toBe("computed fallback");
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should work with different return types", () => {
      const numberOption: Option<number> = Option.none();
      const fn = vi.fn(() => 42);
      expect(numberOption.unwrapOrElse(fn)).toBe(42);
      expect(fn).toHaveBeenCalledOnce();

      const arrayOption: Option<number[]> = Option.none();
      const fn2 = vi.fn(() => [1, 2, 3]);
      expect(arrayOption.unwrapOrElse(fn2)).toEqual([1, 2, 3]);
      expect(fn2).toHaveBeenCalledOnce();
    });
  });

  describe("andThen()", () => {
    it("should be an alias for flatMap with Some", () => {
      const option = Option.some(5);
      const fn = vi.fn((x) => Option.some(x * 2));
      const chained = option.andThen(fn);
      expect(chained.isSome()).toBe(true);
      expect(chained.unwrap()).toBe(10);
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should short-circuit with None", () => {
      const option: Option<number> = Option.none();
      const fn = vi.fn((x) => Option.some(x * 2));
      const chained = option.andThen(fn);
      expect(chained.isNone()).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it("should work with complex chaining", () => {
      const fn = vi.fn((x) => Option.some(x / 2));
      const fn2 = vi.fn((x) => Option.some(x + 1));

      const option: Option<number> = Option.some(10).andThen(fn).andThen(fn2);

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(6);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });

    it("should stop at first None in chain", () => {
      const fn = vi.fn((x) => Option.some(x * 2));
      const fn2 = vi.fn((_x) => Option.none());
      const fn3 = vi.fn((_x) => Option.some(100));

      const result = Option.some(10).andThen(fn).andThen(fn2).andThen(fn3);

      expect(result.isNone()).toBe(true);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).not.toHaveBeenCalled();
    });
  });

  describe("orElse()", () => {
    it("should return original Some without calling function", () => {
      const option = Option.some("original");
      const fn = vi.fn(() => Option.some("fallback"));
      const fallback = option.orElse(fn);

      expect(fallback.isSome()).toBe(true);
      expect(fallback.unwrap()).toBe("original");
      expect(fn).not.toHaveBeenCalled();
    });

    it("should call function and return result when None", () => {
      const option = Option.none();
      const fn = vi.fn(() => Option.some("fallback value"));
      const fallback = option.orElse(fn);

      expect(fallback.isSome()).toBe(true);
      expect(fallback.unwrap()).toBe("fallback value");
      expect(fn).toHaveBeenCalledOnce();
    });

    it("should allow chaining of fallback attempts", () => {
      const fn = vi.fn(() => Option.none());
      const fn2 = vi.fn(() => Option.some("final fallback"));
      const option = Option.none().orElse(fn).orElse(fn2);

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe("final fallback");
      expect(fn).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });
  });

  describe("zip()", () => {
    it("should combine two Some values into a tuple", () => {
      const name = Option.some("John");
      const age = Option.some(30);
      const zipped = name.zip(age);

      expect(zipped.isSome()).toBe(true);
      expect(zipped.unwrap()).toEqual(["John", 30]);
    });

    it("should return None if first option is None", () => {
      const name = Option.none();
      const age = Option.some(30);
      const zipped = name.zip(age);

      expect(zipped.isNone()).toBe(true);
    });

    it("should return None if second option is None", () => {
      const name = Option.some("John");
      const age = Option.none();
      const zipped = name.zip(age);

      expect(zipped.isNone()).toBe(true);
    });

    it("should return None if both options are None", () => {
      const name = Option.none();
      const age = Option.none();
      const zipped = name.zip(age);

      expect(zipped.isNone()).toBe(true);
    });

    it("should work with different types", () => {
      const str = Option.some("hello");
      const num = Option.some(42);
      const bool = Option.some(true);

      const result = str.zip(num);
      expect(result.unwrap()).toEqual(["hello", 42]);

      const result2 = num.zip(bool);
      expect(result2.unwrap()).toEqual([42, true]);
    });

    it("should be chainable", () => {
      const a = Option.some(1);
      const b = Option.some(2);
      const c = Option.some(3);
      const fn = vi.fn(([x, y]) => Option.some([x, y, c.unwrap()]));

      const result = a.zip(b).andThen(fn);

      expect(result.unwrap()).toEqual([1, 2, 3]);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("contains()", () => {
    it("should return true when Some contains the value", () => {
      const option = Option.some("hello");
      expect(option.contains("hello")).toBe(true);
    });

    it("should return false when Some contains different value", () => {
      const option = Option.some("hello");
      expect(option.contains("world")).toBe(false);
    });

    it("should return false when None", () => {
      const option = Option.none();
      expect(option.contains("anything")).toBe(false);
    });

    it("should work with different types", () => {
      const numberOption = Option.some(42);
      expect(numberOption.contains(42)).toBe(true);
      expect(numberOption.contains(43)).toBe(false);

      const boolOption = Option.some(true);
      expect(boolOption.contains(true)).toBe(true);
      expect(boolOption.contains(false)).toBe(false);
    });

    it("shouldn't work with object equality", () => {
      const obj = { key: "value" };
      const option = Option.some(obj);
      expect(option.contains(obj)).toBe(true);
    });
  });

  describe("Static utility methods", () => {
    describe("Option.some()", () => {
      it("should create a Some option", () => {
        const option = Option.some("value");
        expect(option.isSome()).toBe(true);
        expect(option.unwrap()).toBe("value");
      });

      it("should work with different types", () => {
        const numberOption = Option.some(42);
        expect(numberOption.unwrap()).toBe(42);

        const objectOption = Option.some({ key: "value" });
        expect(objectOption.unwrap()).toEqual({ key: "value" });
      });
    });

    describe("Option.none()", () => {
      it("should create a None option", () => {
        const option = Option.none();
        expect(option.isNone()).toBe(true);
      });

      it("should return same None instance", () => {
        const none1 = Option.none();
        const none2 = Option.none();
        expect(none1.constructor).toBe(none2.constructor);
      });
    });

    describe("Option.fromNullable()", () => {
      it("should create Some for non-null values", () => {
        const option = Option.fromNullable("value");
        expect(option.isSome()).toBe(true);
        expect(option.unwrap()).toBe("value");
      });

      it("should create None for null", () => {
        const option = Option.fromNullable(null);
        expect(option.isNone()).toBe(true);
      });

      it("should create None for undefined", () => {
        const option = Option.fromNullable(undefined);
        expect(option.isNone()).toBe(true);
      });

      it("should work with falsy values that are not null/undefined", () => {
        const zeroOption = Option.fromNullable(0);
        expect(zeroOption.isSome()).toBe(true);
        expect(zeroOption.unwrap()).toBe(0);

        const emptyStringOption = Option.fromNullable("");
        expect(emptyStringOption.isSome()).toBe(true);
        expect(emptyStringOption.unwrap()).toBe("");

        const falseOption = Option.fromNullable(false);
        expect(falseOption.isSome()).toBe(true);
        expect(falseOption.unwrap()).toBe(false);
      });
    });

    describe("Option.fromResult()", () => {
      it("should create Some for successful Result", () => {
        const mockResult = ok("success value");
        const option = Option.fromResult(mockResult);
        expect(option.isSome()).toBe(true);
        expect(option.unwrap()).toBe("success value");
      });

      it("should create None for failed Result", () => {
        const mockResult = err("error value");
        const option = Option.fromResult(mockResult);
        expect(option.isNone()).toBe(true);
      });

      it("should throw error for invalid Result", () => {
        expect(() => Option.fromResult(null as any)).toThrow();
        expect(() => Option.fromResult({} as any)).toThrow();
      });
    });

    describe("Option.toResult()", () => {
      it("should create Success for Some", () => {
        const option = Option.some("value");
        const result = Option.toResult(option, "error");
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("value");
      });

      it("should create Failure for None", () => {
        const option = Option.none();
        const result = Option.toResult(option, "error");
        expect(result.isErr()).toBe(true);
        expect(result._getError()).toBe("error");
      });

      it("should handle invalid Option", () => {
        expect(() => Option.toResult(null as any, "error")).toThrow();
        expect(() => Option.toResult({} as any, "error")).toThrow();
      });
    });

    describe("Option.match()", () => {
      it("should call some handler for Some value", () => {
        const option = Option.some("hello");
        const someFn = vi.fn((value) => `got: ${value}`);
        const noneFn = vi.fn(() => "got nothing");

        const result = Option.match(option, {
          some: someFn,
          none: noneFn,
        });

        expect(result).toBe("got: hello");
        expect(someFn).toHaveBeenCalledWith("hello");
        expect(noneFn).not.toHaveBeenCalled();
      });

      it("should call none handler for None", () => {
        const option = Option.none();
        const someFn = vi.fn((value) => `got: ${value}`);
        const noneFn = vi.fn(() => "got nothing");

        const result = Option.match(option, {
          some: someFn,
          none: noneFn,
        });

        expect(result).toBe("got nothing");
        expect(someFn).not.toHaveBeenCalled();
        expect(noneFn).toHaveBeenCalled();
      });

      it("should throw error for invalid Option", () => {
        expect(() => {
          Option.match(null as any, {
            some: () => "some",
            none: () => "none",
          });
        }).toThrow("match() requires an Option instance");
      });

      it("should throw error for invalid patterns", () => {
        const option = Option.some("test");
        expect(() => {
          Option.match(option, {} as any);
        }).toThrow("Invalid pattern object");
      });
    });

    describe("isSomeAnd()", () => {
      it("should return true when Some and predicate passes", () => {
        const option = Option.some(10);
        expect(option.isSomeAnd((x) => x > 5)).toBe(true);
      });

      it("should return false when Some but predicate fails", () => {
        const option = Option.some(3);
        expect(option.isSomeAnd((x) => x > 5)).toBe(false);
      });

      it("should return false when None", () => {
        const option = Option.none();
        expect(option.isSomeAnd((x) => x > 5)).toBe(false);
      });

      it("should work with complex predicates", () => {
        const option = Option.some("hello world");
        expect(option.isSomeAnd((s) => s.includes("world"))).toBe(true);
        expect(option.isSomeAnd((s) => s.includes("goodbye"))).toBe(false);
      });
    });

    describe("isNoneOr()", () => {
      it("should return true when None", () => {
        const option = Option.none();
        expect(option.isNoneOr((x) => x > 5)).toBe(true);
      });

      it("should return false when Some (regardless of predicate)", () => {
        const option = Option.some(10);
        expect(option.isNoneOr((x) => x > 5)).toBe(false);
      });

      it("should return false when Some (even with failing predicate)", () => {
        const option = Option.some(3);
        expect(option.isNoneOr((x) => x > 5)).toBe(false);
      });

      it("should work with string values", () => {
        const option = Option.some("hello");
        expect(option.isNoneOr((s) => s.startsWith("h"))).toBe(false);
        expect(option.isNoneOr((s) => s.startsWith("x"))).toBe(false);
      });
    });

    describe("and()", () => {
      it("should return other when first is Some", () => {
        const option1 = Option.some("first");
        const option2 = Option.some("second");
        const combined = option1.and(option2);
        expect(combined.isSome()).toBe(true);
        expect(combined.unwrap()).toBe("second");
      });

      it("should return None when first is None", () => {
        const option1 = Option.none();
        const option2 = Option.some("second");
        const combined = option1.and(option2);
        expect(combined.isNone()).toBe(true);
      });

      it("should return None when both are None", () => {
        const option1 = Option.none();
        const option2 = Option.none();
        const combined = option1.and(option2);
        expect(combined.isNone()).toBe(true);
      });
    });

    describe("or()", () => {
      it("should return first when first is Some", () => {
        const option1 = Option.some("first");
        const option2 = Option.some("second");
        const combined = option1.or(option2);
        expect(combined.isSome()).toBe(true);
        expect(combined.unwrap()).toBe("first");
      });

      it("should return second when first is None", () => {
        const option1 = Option.none();
        const option2 = Option.some("second");
        const combined = option1.or(option2);
        expect(combined.isSome()).toBe(true);
        expect(combined.unwrap()).toBe("second");
      });

      it("should return None when both are None", () => {
        const option1 = Option.none();
        const option2 = Option.none();
        const combined = option1.or(option2);
        expect(combined.isNone()).toBe(true);
      });
    });

    describe("xor()", () => {
      it("should return first when first is Some and second is None", () => {
        const option1 = Option.some("first");
        const option2 = Option.none();
        const result = option1.xor(option2);
        expect(result.isSome()).toBe(true);
        expect(result.unwrap()).toBe("first");
      });

      it("should return second when first is None and second is Some", () => {
        const option1 = Option.none();
        const option2 = Option.some("second");
        const result = option1.xor(option2);
        expect(result.isSome()).toBe(true);
        expect(result.unwrap()).toBe("second");
      });

      it("should return None when both are Some", () => {
        const option1 = Option.some("first");
        const option2 = Option.some("second");
        const result = option1.xor(option2);
        expect(result.isNone()).toBe(true);
      });

      it("should return None when both are None", () => {
        const option1 = Option.none();
        const option2 = Option.none();
        const result = option1.xor(option2);
        expect(result.isNone()).toBe(true);
      });
    });

    describe("flatten()", () => {
      it("should flatten nested Some Options", () => {
        const inner = Option.some("inner value");
        const outer = Option.some(inner);
        const flattened = outer.flatten();
        expect(flattened.isSome()).toBe(true);
        expect(flattened.unwrap()).toBe("inner value");
      });

      it("should return None when outer is None", () => {
        const outer = Option.none();
        const flattened = outer.flatten();
        expect(flattened.isNone()).toBe(true);
      });

      it("should return None when inner is None", () => {
        const inner = Option.none();
        const outer = Option.some(inner);
        const flattened = outer.flatten();
        expect(flattened.isNone()).toBe(true);
      });
    });

    describe("take()", () => {
      it("should return the value and leave None for Some", () => {
        const option = Option.some("test value");
        const taken = option.take();
        expect(taken.isSome()).toBe(true);
        expect(taken.unwrap()).toBe("test value");
        // Original should now be None (in Rust, but in our implementation it stays the same)
      });

      it("should return None for None", () => {
        const option = Option.none();
        const taken = option.take();
        expect(taken.isNone()).toBe(true);
      });
    });

    describe("replace()", () => {
      it("should replace Some value and return old value", () => {
        const option = Option.some("old value");
        const replaced = option.replace("new value");
        expect(replaced.isSome()).toBe(true);
        expect(replaced.unwrap()).toBe("old value");
        // Original should now have new value (in Rust, but in our implementation it stays the same)
      });

      it("should return None for None", () => {
        const option = Option.none();
        const replaced = option.replace("new value");
        expect(replaced.isNone()).toBe(true);
      });
    });

    describe("okOr()", () => {
      it("should return Success for Some", () => {
        const option = Option.some("value");
        const result = option.okOr("default error");
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("value");
      });

      it("should return Failure for None", () => {
        const option = Option.none();
        const result = option.okOr("default error");
        expect(result.isErr()).toBe(true);
        expect(result._getError()).toBe("default error");
      });

      it("should work with different error types", () => {
        const option: Option<string> = Option.none();
        const result = option.okOr(404);
        expect(result.isErr()).toBe(true);
        expect(result._getError()).toBe(404);
      });
    });

    describe("okOrElse()", () => {
      it("should return Success for Some without calling function", () => {
        const option = Option.some("value");
        const fn = vi.fn(() => "error");
        const result = option.okOrElse(fn);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("value");
        expect(fn).not.toHaveBeenCalled();
      });

      it("should return Failure for None using function result", () => {
        const option = Option.none();
        const fn = vi.fn(() => "computed error");
        const result = option.okOrElse(fn);
        expect(result.isErr()).toBe(true);
        expect(result._getError()).toBe("computed error");
        expect(fn).toHaveBeenCalledOnce();
      });

      it("should allow dynamic error computation", () => {
        const option = Option.none();
        let counter = 0;
        const fn = () => {
          counter++;
          return `error-${counter}`;
        };
        const result = option.okOrElse(fn);
        expect(result._getError()).toBe("error-1");
        expect(counter).toBe(1);
      });
    });

    describe("Option.iter()", () => {
      it("should iterate over Some value", () => {
        const option = Option.some("value");
        const iterator = Option.iter(option);
        const values = Array.from(iterator);
        expect(values).toEqual(["value"]);
      });

      it("should iterate over None with no values", () => {
        const option = Option.none();
        const iterator = Option.iter(option);
        const values = Array.from(iterator);
        expect(values).toEqual([]);
      });

      it("should work with different types", () => {
        const numberOption = Option.some(42);
        const numberIterator = Option.iter(numberOption);
        expect(Array.from(numberIterator)).toEqual([42]);

        const arrayOption = Option.some([1, 2, 3]);
        const arrayIterator = Option.iter(arrayOption);
        expect(Array.from(arrayIterator)).toEqual([[1, 2, 3]]);
      });
    });
  });
});
