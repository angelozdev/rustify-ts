import { describe, it, expect } from "vitest";
import Result from "../result";
import Option from "../../option/option";

describe("Result - New Methods", () => {
  describe("transpose", () => {
    it("should transpose Ok(Some(value)) to Some(Ok(value))", () => {
      const resultOption = Result.ok(Option.some(42));
      const option = resultOption.transpose();

      expect(option.isSome()).toBe(true);
      const innerResult = option.unwrap();
      expect(innerResult.isOk()).toBe(true);
      expect(innerResult.unwrap()).toBe(42);
    });

    it("should transpose Ok(None) to None", () => {
      const resultOption = Result.ok(Option.none<number>());
      const option = resultOption.transpose();

      expect(option.isNone()).toBe(true);
    });

    it("should transpose Err(error) to Some(Err(error))", () => {
      const resultOption: Result<Option<number>, string> = Result.err("error");
      const option = resultOption.transpose();

      expect(option.isSome()).toBe(true);
      const innerResult = option.unwrap();
      expect(innerResult.isErr()).toBe(true);
      expect(innerResult.unwrapErr()).toBe("error");
    });
  });

  describe("toArray", () => {
    it("should convert Ok to array with value", () => {
      const result = Result.ok(42);
      expect(result.toArray()).toEqual([42]);
    });

    it("should convert Err to empty array", () => {
      const result = Result.err("error");
      expect(result.toArray()).toEqual([]);
    });

    it("should handle string values", () => {
      const result = Result.ok("hello");
      expect(result.toArray()).toEqual(["hello"]);
    });

    it("should handle object values", () => {
      const obj = { name: "test" };
      const result = Result.ok(obj);
      expect(result.toArray()).toEqual([obj]);
    });
  });

  describe("equals", () => {
    it("should return true for equal Ok values", () => {
      const res1 = Result.ok(42);
      const res2 = Result.ok(42);
      expect(res1.equals(res2)).toBe(true);
    });

    it("should return false for different Ok values", () => {
      const res1 = Result.ok(42);
      const res2 = Result.ok(43);
      expect(res1.equals(res2)).toBe(false);
    });

    it("should return true for equal Err values", () => {
      const res1 = Result.err("error");
      const res2 = Result.err("error");
      expect(res1.equals(res2)).toBe(true);
    });

    it("should return false for different Err values", () => {
      const res1 = Result.err("error1");
      const res2 = Result.err("error2");
      expect(res1.equals(res2)).toBe(false);
    });

    it("should return false for Ok vs Err", () => {
      const res1: Result<number, string> = Result.ok(42);
      const res2: Result<number, string> = Result.err("error");
      expect(res1.equals(res2)).toBe(false);
      expect(res2.equals(res1)).toBe(false);
    });

    it("should handle string equality", () => {
      const res1 = Result.ok("hello");
      const res2 = Result.ok("hello");
      const res3 = Result.ok("world");
      expect(res1.equals(res2)).toBe(true);
      expect(res1.equals(res3)).toBe(false);
    });

    it("should handle object references", () => {
      const obj = { name: "test" };
      const res1 = Result.ok(obj);
      const res2 = Result.ok(obj);
      const res3 = Result.ok({ name: "test" });
      expect(res1.equals(res2)).toBe(true);
      expect(res1.equals(res3)).toBe(false); // Different object references
    });
  });

  describe("mapAsync", () => {
    it("should map async function over Ok", async () => {
      const result = Result.ok(5);
      const mapped = await result.mapAsync(async (x) => x * 2);

      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(10);
    });

    it("should return Err unchanged for Err", async () => {
      const result = Result.err("error");
      const mapped = await result.mapAsync(async (x: number) => x * 2);

      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapErr()).toBe("error");
    });

    it("should handle async string operations", async () => {
      const result = Result.ok("hello");
      const mapped = await result.mapAsync(async (s) => s.toUpperCase());

      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe("HELLO");
    });

    it("should propagate errors from async function", async () => {
      const result = Result.ok(5);

      await expect(
        result.mapAsync(async () => {
          throw new Error("async error");
        })
      ).rejects.toThrow("async error");
    });
  });

  describe("flatMapAsync", () => {
    it("should flatMap async function over Ok", async () => {
      const result = Result.ok(5);
      const mapped = await result.flatMapAsync(async (x) =>
        x > 0 ? Result.ok(x * 2) : Result.err("negative")
      );

      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(10);
    });

    it("should return Err when async function returns Err", async () => {
      const result = Result.ok(-5);
      const mapped = await result.flatMapAsync(async (x) =>
        x > 0 ? Result.ok(x * 2) : Result.err("negative")
      );

      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapErr()).toBe("negative");
    });

    it("should return original Err for Err", async () => {
      const result = Result.err("original error");
      const mapped = await result.flatMapAsync(async (x: number) =>
        Result.ok(x * 2)
      );

      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapErr()).toBe("original error");
    });

    it("should handle type changes", async () => {
      const result = Result.ok("5");
      const mapped = await result.flatMapAsync(async (s) => {
        const num = parseInt(s);
        return isNaN(num) ? Result.err("not a number") : Result.ok(num);
      });

      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(5);
    });
  });

  describe("sequence", () => {
    it("should return Ok of array when all Results are Ok", () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const sequenced = Result.sequence(results);

      expect(sequenced.isOk()).toBe(true);
      expect(sequenced.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return first Err when any Result is Err", () => {
      const results = [Result.ok(1), Result.err("error"), Result.ok(3)];
      const sequenced = Result.sequence(results);

      expect(sequenced.isErr()).toBe(true);
      expect(sequenced.unwrapErr()).toBe("error");
    });

    it("should return Ok empty array for empty input", () => {
      const results: Result<number, string>[] = [];
      const sequenced = Result.sequence(results);

      expect(sequenced.isOk()).toBe(true);
      expect(sequenced.unwrap()).toEqual([]);
    });

    it("should handle different types", () => {
      const results = [Result.ok("a"), Result.ok("b"), Result.ok("c")];
      const sequenced = Result.sequence(results);

      expect(sequenced.isOk()).toBe(true);
      expect(sequenced.unwrap()).toEqual(["a", "b", "c"]);
    });

    it("should fail fast on first Err", () => {
      const results = [
        Result.ok(1),
        Result.err("first error"),
        Result.ok(3),
        Result.err("second error"),
      ];
      const sequenced = Result.sequence(results);

      expect(sequenced.isErr()).toBe(true);
      expect(sequenced.unwrapErr()).toBe("first error");
    });

    it("should handle mixed error types", () => {
      const results = [Result.ok(1), Result.err(404), Result.ok(3)];
      const sequenced = Result.sequence(results);

      expect(sequenced.isErr()).toBe(true);
      expect(sequenced.unwrapErr()).toBe(404);
    });
  });

  describe("traverse", () => {
    it("should map and sequence successfully", () => {
      const values = [1, 2, 3];
      const result = Result.traverse(values, (x) =>
        x > 0 ? Result.ok(x * 2) : Result.err("negative")
      );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should return first Err when any mapping returns Err", () => {
      const values = [1, -2, 3];
      const result = Result.traverse(values, (x) =>
        x > 0 ? Result.ok(x * 2) : Result.err("negative")
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("negative");
    });

    it("should handle empty array", () => {
      const values: number[] = [];
      const result = Result.traverse(values, (x) => Result.ok(x * 2));

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });

    it("should handle string transformations with validation", () => {
      const values = ["hello", "world", ""];
      const result = Result.traverse(values, (s) =>
        s.length > 0 ? Result.ok(s.toUpperCase()) : Result.err("empty string")
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("empty string");
    });

    it("should handle type transformations", () => {
      const values = ["1", "2", "3"];
      const result = Result.traverse(values, (s) => {
        const num = parseInt(s);
        return isNaN(num) ? Result.err("not a number") : Result.ok(num);
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("should fail on invalid parsing", () => {
      const values = ["1", "abc", "3"];
      const result = Result.traverse(values, (s) => {
        const num = parseInt(s);
        return isNaN(num) ? Result.err("not a number") : Result.ok(num);
      });

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("not a number");
    });
  });
});
