import { describe, it, expect } from "vitest";
import Result, { Success, Failure } from "../result";

describe("Result - New Methods", () => {
  describe("expect()", () => {
    it("should return the value when Success", () => {
      const result = Result.ok("test value");
      expect(result.expect("Should work")).toBe("test value");
    });

    it("should throw error with custom message when Failure", () => {
      const result = Result.err("original error");
      expect(() => result.expect("Custom error message")).toThrow(
        "Custom error message: original error"
      );
    });

    it("should work with different types", () => {
      const numberResult = Result.ok(42);
      expect(numberResult.expect("Number should work")).toBe(42);

      const objectResult = Result.ok({ key: "value" });
      expect(objectResult.expect("Object should work")).toEqual({
        key: "value",
      });
    });
  });

  describe("unwrapOrElse()", () => {
    it("should return the value when Success", () => {
      const result = Result.ok("success value");
      const computed = result.unwrapOrElse(() => "fallback");
      expect(computed).toBe("success value");
    });

    it("should execute function and return result when Failure", () => {
      const result = Result.err("error");
      const computed = result.unwrapOrElse(() => "computed fallback");
      expect(computed).toBe("computed fallback");
    });

    it("should allow dynamic computation based on external state", () => {
      const result = Result.err("error");
      let counter = 0;
      const computed = result.unwrapOrElse(() => {
        counter++;
        return `computed-${counter}`;
      });
      expect(computed).toBe("computed-1");
      expect(counter).toBe(1);
    });

    it("should work with different return types", () => {
      const numberResult = Result.err("error");
      expect(numberResult.unwrapOrElse(() => 42)).toBe(42);

      const arrayResult = Result.err("error");
      expect(arrayResult.unwrapOrElse(() => [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("andThen()", () => {
    it("should be an alias for flatMap with Success", () => {
      const result = Result.ok(5);
      const chained = result.andThen((x) => Result.ok(x * 2));
      expect(chained.isSuccess()).toBe(true);
      expect(chained.unwrap()).toBe(10);
    });

    it("should short-circuit with Failure", () => {
      const result = Result.err("error");
      const chained = result.andThen((x: number) => Result.ok(x * 2));
      expect(chained.isFailure()).toBe(true);
      expect(chained._getError()).toBe("error");
    });

    it("should work with complex chaining", () => {
      const result = Result.ok(10)
        .andThen((x) => Result.ok(x / 2))
        .andThen((x) => Result.ok(x + 1));

      expect(result.isSuccess()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });

    it("should stop at first failure in chain", () => {
      // Test that andThen short-circuits properly
      let executed = false;
      const result = Result.ok(10)
        .andThen(x => Result.ok(x * 2))
        .andThen(_x => Result.err("chain error"))
        .andThen(_x => {
          executed = true;
          return Result.ok(100);
        });

      expect(result.isFailure()).toBe(true);
      expect(result._getError()).toBe("chain error");
      expect(executed).toBe(false); // Should not execute after error
    });
  });

  describe("orElse()", () => {
    it("should return original Success without calling function", () => {
      const result = Result.ok("original");
      let called = false;
      const recovered = result.orElse((_err) => {
        called = true;
        return Result.ok("recovery");
      });

      expect(recovered.isSuccess()).toBe(true);
      expect(recovered.unwrap()).toBe("original");
      expect(called).toBe(false);
    });

    it("should call function and return result when Failure", () => {
      const result = Result.err("original error");
      const recovered = result.orElse((err) =>
        Result.ok(`recovered from: ${err}`)
      );

      expect(recovered.isSuccess()).toBe(true);
      expect(recovered.unwrap()).toBe("recovered from: original error");
    });

    it("should allow chaining of recovery attempts", () => {
      const result = Result.err("error1")
        .orElse((_err) => Result.err("error2"))
        .orElse((err) => Result.ok(`final recovery from ${err}`));

      expect(result.isSuccess()).toBe(true);
      expect(result.unwrap()).toBe("final recovery from error2");
    });

    it("should work with different error types", () => {
      const result: Result<string, number> = Result.err(404);
      const recovered = result.orElse((code) =>
        code === 404 ? Result.ok("Not found handled") : Result.err(code)
      );

      expect(recovered.isSuccess()).toBe(true);
      expect(recovered.unwrap()).toBe("Not found handled");
    });
  });

  describe("tap()", () => {
    it("should execute function with Success value and return original", () => {
      let sideEffect = "";
      const result = Result.ok("test value");
      const returned = result.tap((value) => {
        sideEffect = `logged: ${value}`;
      });

      expect(returned).toBe(result); // Same instance
      expect(returned.unwrap()).toBe("test value");
      expect(sideEffect).toBe("logged: test value");
    });

    it("should not execute function with Failure", () => {
      let sideEffect = "";
      const result = Result.err("error");
      const returned = result.tap((value) => {
        sideEffect = `should not execute: ${value}`;
      });

      expect(returned).toBe(result); // Same instance
      expect(returned.isFailure()).toBe(true);
      expect(sideEffect).toBe("");
    });

    it("should be chainable", () => {
      let effects: string[] = [];
      const result = Result.ok(42)
        .tap((x) => effects.push(`first: ${x}`))
        .map((x) => x * 2)
        .tap((x) => effects.push(`second: ${x}`));

      expect(result.unwrap()).toBe(84);
      expect(effects).toEqual(["first: 42", "second: 84"]);
    });
  });

  describe("tapError()", () => {
    it("should execute function with Failure error and return original", () => {
      let sideEffect = "";
      const result = Result.err("test error");
      const returned = result.tapError((error) => {
        sideEffect = `logged error: ${error}`;
      });

      expect(returned).toBe(result); // Same instance
      expect(returned.isFailure()).toBe(true);
      expect(sideEffect).toBe("logged error: test error");
    });

    it("should not execute function with Success", () => {
      let sideEffect = "";
      const result = Result.ok("value");
      const returned = result.tapError((error) => {
        sideEffect = `should not execute: ${error}`;
      });

      expect(returned).toBe(result); // Same instance
      expect(returned.isSuccess()).toBe(true);
      expect(sideEffect).toBe("");
    });

    it("should be chainable with other operations", () => {
      let errorLog: string[] = [];
      const result = Result.err("first error")
        .tapError((err) => errorLog.push(`logged: ${err}`))
        .orElse((err) => Result.err(`transformed: ${err}`))
        .tapError((err) => errorLog.push(`logged again: ${err}`));

      expect(result.isFailure()).toBe(true);
      expect(errorLog).toEqual([
        "logged: first error",
        "logged again: transformed: first error",
      ]);
    });
  });

  // Integration tests combining multiple new methods
  describe("Integration Tests", () => {
    it("should work together in complex scenarios", () => {
      let sideEffects: string[] = [];

      const processUser = (id: number): Result<string, string> => {
        if (id > 0) {
          sideEffects.push(`processing user ${id}`);
          return Result.ok(`user-${id}`);
        } else {
          sideEffects.push(`processing user ${id}`);
          sideEffects.push(`error: invalid id`);
          sideEffects.push(`recovering from: invalid id`);
          return Result.ok("guest-user");
        }
      };

      // Success case
      const result1 = processUser(123);
      expect(result1.unwrap()).toBe("user-123");
      expect(sideEffects).toEqual(["processing user 123"]);

      // Error recovery case
      sideEffects = [];
      const result2 = processUser(-1);
      expect(result2.unwrap()).toBe("guest-user");
      expect(sideEffects).toEqual([
        "processing user -1",
        "error: invalid id",
        "recovering from: invalid id",
      ]);
    });

    it("should handle dynamic defaults with expect", () => {
      const getConfig = (key: string): Result<string, string> => {
        const configs: Record<string, string> = {
          api_url: "https://api.example.com",
        };
        return configs[key]
          ? Result.ok(configs[key])
          : Result.err(`Config ${key} not found`);
      };

      // Using expect with Success
      const apiUrl = getConfig("api_url").expect("API URL must be configured");
      expect(apiUrl).toBe("https://api.example.com");

      // Using unwrapOrElse with Failure
      const defaultPort = getConfig("port").unwrapOrElse(() => "8080");
      expect(defaultPort).toBe("8080");

      // Expect with Failure should throw
      expect(() => getConfig("missing").expect("Required config")).toThrow(
        "Required config: Config missing not found"
      );
    });
  });
});
