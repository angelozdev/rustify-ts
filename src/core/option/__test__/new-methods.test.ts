import { describe, it, expect } from "vitest";
import Option from "../option";
import Result from "../../result/result";

describe("Option - New Methods", () => {
  describe("transpose", () => {
    it("should transpose Some(Ok(value)) to Ok(Some(value))", () => {
      const optionResult = Option.some(Result.ok(42));
      const result = optionResult.transpose();
      
      expect(result.isOk()).toBe(true);
      const innerOption = result.unwrap();
      expect(innerOption.isSome()).toBe(true);
      expect(innerOption.unwrap()).toBe(42);
    });

    it("should transpose Some(Err(error)) to Err(error)", () => {
      const optionResult = Option.some(Result.err("error"));
      const result = optionResult.transpose();
      
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    it("should transpose None to Ok(None)", () => {
      const optionResult: Option<Result<number, string>> = Option.none();
      const result = optionResult.transpose();
      
      expect(result.isOk()).toBe(true);
      const innerOption = result.unwrap();
      expect(innerOption.isNone()).toBe(true);
    });
  });

  describe("toArray", () => {
    it("should convert Some to array with value", () => {
      const option = Option.some(42);
      expect(option.toArray()).toEqual([42]);
    });

    it("should convert None to empty array", () => {
      const option = Option.none<number>();
      expect(option.toArray()).toEqual([]);
    });
  });

  describe("toNullable", () => {
    it("should convert Some to value", () => {
      const option = Option.some(42);
      expect(option.toNullable()).toBe(42);
    });

    it("should convert None to null", () => {
      const option = Option.none<number>();
      expect(option.toNullable()).toBe(null);
    });

    it("should handle string values", () => {
      const option = Option.some("hello");
      expect(option.toNullable()).toBe("hello");
    });

    it("should handle object values", () => {
      const obj = { name: "test" };
      const option = Option.some(obj);
      expect(option.toNullable()).toBe(obj);
    });
  });

  describe("equals", () => {
    it("should return true for equal Some values", () => {
      const opt1 = Option.some(42);
      const opt2 = Option.some(42);
      expect(opt1.equals(opt2)).toBe(true);
    });

    it("should return false for different Some values", () => {
      const opt1 = Option.some(42);
      const opt2 = Option.some(43);
      expect(opt1.equals(opt2)).toBe(false);
    });

    it("should return true for equal None values", () => {
      const opt1 = Option.none<number>();
      const opt2 = Option.none<number>();
      expect(opt1.equals(opt2)).toBe(true);
    });

    it("should return false for Some vs None", () => {
      const opt1 = Option.some(42);
      const opt2 = Option.none<number>();
      expect(opt1.equals(opt2)).toBe(false);
      expect(opt2.equals(opt1)).toBe(false);
    });

    it("should handle string equality", () => {
      const opt1 = Option.some("hello");
      const opt2 = Option.some("hello");
      const opt3 = Option.some("world");
      expect(opt1.equals(opt2)).toBe(true);
      expect(opt1.equals(opt3)).toBe(false);
    });

    it("should handle object references", () => {
      const obj = { name: "test" };
      const opt1 = Option.some(obj);
      const opt2 = Option.some(obj);
      const opt3 = Option.some({ name: "test" });
      expect(opt1.equals(opt2)).toBe(true);
      expect(opt1.equals(opt3)).toBe(false); // Different object references
    });
  });

  describe("mapAsync", () => {
    it("should map async function over Some", async () => {
      const option = Option.some(5);
      const result = await option.mapAsync(async (x) => x * 2);
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(10);
    });

    it("should return None for None", async () => {
      const option = Option.none<number>();
      const result = await option.mapAsync(async (x) => x * 2);
      
      expect(result.isNone()).toBe(true);
    });

    it("should handle async string operations", async () => {
      const option = Option.some("hello");
      const result = await option.mapAsync(async (s) => s.toUpperCase());
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe("HELLO");
    });

    it("should handle errors in async function", async () => {
      const option = Option.some(5);
      
      await expect(
        option.mapAsync(async () => {
          throw new Error("async error");
        })
      ).rejects.toThrow("async error");
    });
  });

  describe("flatMapAsync", () => {
    it("should flatMap async function over Some", async () => {
      const option = Option.some(5);
      const result = await option.flatMapAsync(async (x) => 
        x > 0 ? Option.some(x * 2) : Option.none()
      );
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(10);
    });

    it("should return None when async function returns None", async () => {
      const option = Option.some(-5);
      const result = await option.flatMapAsync(async (x) => 
        x > 0 ? Option.some(x * 2) : Option.none()
      );
      
      expect(result.isNone()).toBe(true);
    });

    it("should return None for None", async () => {
      const option = Option.none<number>();
      const result = await option.flatMapAsync(async (x) => Option.some(x * 2));
      
      expect(result.isNone()).toBe(true);
    });
  });

  describe("zipWith", () => {
    it("should combine two Some values with function", () => {
      const opt1 = Option.some(5);
      const opt2 = Option.some(3);
      const result = opt1.zipWith(opt2, (a, b) => a + b);
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(8);
    });

    it("should return None if first Option is None", () => {
      const opt1 = Option.none<number>();
      const opt2 = Option.some(3);
      const result = opt1.zipWith(opt2, (a, b) => a + b);
      
      expect(result.isNone()).toBe(true);
    });

    it("should return None if second Option is None", () => {
      const opt1 = Option.some(5);
      const opt2 = Option.none<number>();
      const result = opt1.zipWith(opt2, (a, b) => a + b);
      
      expect(result.isNone()).toBe(true);
    });

    it("should return None if both Options are None", () => {
      const opt1 = Option.none<number>();
      const opt2 = Option.none<number>();
      const result = opt1.zipWith(opt2, (a, b) => a + b);
      
      expect(result.isNone()).toBe(true);
    });

    it("should handle different types", () => {
      const opt1 = Option.some("hello");
      const opt2 = Option.some(5);
      const result = opt1.zipWith(opt2, (s, n) => s.repeat(n));
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe("hellohellohellohellohello");
    });
  });

  describe("unzip", () => {
    it("should unzip Some tuple into tuple of Some values", () => {
      const option = Option.some([42, "hello"] as [number, string]);
      const [opt1, opt2] = option.unzip();
      
      expect(opt1.isSome()).toBe(true);
      expect(opt1.unwrap()).toBe(42);
      expect(opt2.isSome()).toBe(true);
      expect(opt2.unwrap()).toBe("hello");
    });

    it("should unzip None into tuple of None values", () => {
      const option = Option.none<[number, string]>();
      const [opt1, opt2] = option.unzip();
      
      expect(opt1.isNone()).toBe(true);
      expect(opt2.isNone()).toBe(true);
    });
  });

  describe("fromTruthy", () => {
    it("should return Some for truthy values", () => {
      expect(Option.fromTruthy(42).isSome()).toBe(true);
      expect(Option.fromTruthy("hello").isSome()).toBe(true);
      expect(Option.fromTruthy(true).isSome()).toBe(true);
      expect(Option.fromTruthy({}).isSome()).toBe(true);
      expect(Option.fromTruthy([]).isSome()).toBe(true);
      expect(Option.fromTruthy(1).isSome()).toBe(true);
    });

    it("should return None for falsy values", () => {
      expect(Option.fromTruthy(0).isNone()).toBe(true);
      expect(Option.fromTruthy("").isNone()).toBe(true);
      expect(Option.fromTruthy(false).isNone()).toBe(true);
      expect(Option.fromTruthy(null).isNone()).toBe(true);
      expect(Option.fromTruthy(undefined).isNone()).toBe(true);
      expect(Option.fromTruthy(NaN).isNone()).toBe(true);
    });

    it("should preserve truthy values", () => {
      const obj = { name: "test" };
      const result = Option.fromTruthy(obj);
      expect(result.unwrap()).toBe(obj);
      
      const str = "hello";
      const result2 = Option.fromTruthy(str);
      expect(result2.unwrap()).toBe(str);
    });
  });

  describe("sequence", () => {
    it("should return Some of array when all Options are Some", () => {
      const options = [Option.some(1), Option.some(2), Option.some(3)];
      const result = Option.sequence(options);
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("should return None when any Option is None", () => {
      const options = [Option.some(1), Option.none<number>(), Option.some(3)];
      const result = Option.sequence(options);
      
      expect(result.isNone()).toBe(true);
    });

    it("should return Some empty array for empty input", () => {
      const options: Option<number>[] = [];
      const result = Option.sequence(options);
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });

    it("should handle different types", () => {
      const options = [Option.some("a"), Option.some("b"), Option.some("c")];
      const result = Option.sequence(options);
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual(["a", "b", "c"]);
    });

    it("should fail fast on first None", () => {
      const options = [
        Option.some(1), 
        Option.none<number>(), 
        Option.some(3),
        Option.some(4)
      ];
      const result = Option.sequence(options);
      
      expect(result.isNone()).toBe(true);
    });
  });

  describe("traverse", () => {
    it("should map and sequence successfully", () => {
      const values = [1, 2, 3];
      const result = Option.traverse(values, x => 
        x > 0 ? Option.some(x * 2) : Option.none()
      );
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual([2, 4, 6]);
    });

    it("should return None when any mapping returns None", () => {
      const values = [1, -2, 3];
      const result = Option.traverse(values, x => 
        x > 0 ? Option.some(x * 2) : Option.none()
      );
      
      expect(result.isNone()).toBe(true);
    });

    it("should handle empty array", () => {
      const values: number[] = [];
      const result = Option.traverse(values, x => Option.some(x * 2));
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });

    it("should handle string transformations", () => {
      const values = ["hello", "world"];
      const result = Option.traverse(values, s => 
        s.length > 0 ? Option.some(s.toUpperCase()) : Option.none()
      );
      
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toEqual(["HELLO", "WORLD"]);
    });
  });
});