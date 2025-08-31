import { describe, it, expect, vi } from "vitest";
import Result from "../result";

describe("Result", () => {
  describe("isOk() and isErr()", () => {
    it("should return correct identity for Success", () => {
      const result = Result.ok("value");
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it("should return correct identity for Failure", () => {
      const result = Result.err("error");
      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
    });

    it("should work with different value types", () => {
      const numberResult = Result.ok(42);
      expect(numberResult.isOk()).toBe(true);

      const objectResult = Result.ok({ key: "value" });
      expect(objectResult.isOk()).toBe(true);

      const nullResult = Result.ok(null);
      expect(nullResult.isOk()).toBe(true);
    });
  });

  describe("isOkAnd()", () => {
    it("should return true when Success and predicate passes", () => {
      const result = Result.ok(10);
      expect(result.isOkAnd((x) => x > 5)).toBe(true);
    });

    it("should return false when Success but predicate fails", () => {
      const result = Result.ok(3);
      expect(result.isOkAnd((x) => x > 5)).toBe(false);
    });

    it("should return false when Failure", () => {
      const result = Result.err("error");
      expect(result.isOkAnd((x) => x > 5)).toBe(false);
    });

    it("should work with complex predicates", () => {
      const result = Result.ok("hello world");
      expect(result.isOkAnd((s) => s.includes("world"))).toBe(true);
      expect(result.isOkAnd((s) => s.includes("goodbye"))).toBe(false);
    });
  });

  describe("isErrAnd()", () => {
    it("should return true when Failure and predicate passes", () => {
      const result = Result.err(404);
      expect(result.isErrAnd((code) => code >= 400)).toBe(true);
    });

    it("should return false when Failure but predicate fails", () => {
      const result = Result.err(200);
      expect(result.isErrAnd((code) => code >= 400)).toBe(false);
    });

    it("should return false when Success", () => {
      const result = Result.ok("value");
      expect(result.isErrAnd((err) => err === "error")).toBe(false);
    });

    it("should work with string error predicates", () => {
      const result = Result.err("network_error");
      expect(result.isErrAnd((err) => err.startsWith("network"))).toBe(true);
      expect(result.isErrAnd((err) => err.startsWith("database"))).toBe(false);
    });
  });

  describe("map()", () => {
    it("should transform Success value", () => {
      const result = Result.ok(5);
      const mapped = result.map((x) => x * 2);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(10);
    });

    it("should not transform Failure", () => {
      const result = Result.err("error");
      const mapped = result.map((x: number) => x * 2);
      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapErr()).toBe("error");
    });

    it("should work with type transformations", () => {
      const result = Result.ok(42);
      const mapped = result.map((x) => x.toString());
      expect(mapped.unwrap()).toBe("42");
    });

    it("should be chainable", () => {
      const result = Result.ok(10);
      const chained = result
        .map((x) => x * 2)
        .map((x) => x + 1)
        .map((x) => `Result: ${x}`);
      expect(chained.unwrap()).toBe("Result: 21");
    });
  });

  describe("mapError()", () => {
    it("should transform Failure error", () => {
      const result = Result.err("network_error");
      const mapped = result.mapError((err) => `Failed: ${err}`);
      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapErr()).toBe("Failed: network_error");
    });

    it("should not transform Success", () => {
      const result = Result.ok("value");
      const mapped = result.mapError((err: string) => `Failed: ${err}`);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe("value");
    });

    it("should work with error type transformations", () => {
      const result = Result.err(404);
      const mapped = result.mapError((code) => `HTTP Error ${code}`);
      expect(mapped.unwrapErr()).toBe("HTTP Error 404");
    });

    it("should be chainable", () => {
      const result = Result.err("error");
      const chained = result
        .mapError((err) => `Step1: ${err}`)
        .mapError((err) => `Step2: ${err}`);
      expect(chained.unwrapErr()).toBe("Step2: Step1: error");
    });
  });

  describe("mapOrElse()", () => {
    it("should use ok function for Success", () => {
      const result = Result.ok(5);
      const mapped = result.mapOrElse(
        (err) => `Error: ${err}`,
        (x) => `Value: ${x * 2}`
      );
      expect(mapped).toBe("Value: 10");
    });

    it("should use error function for Failure", () => {
      const result = Result.err("network_error");
      const mapped = result.mapOrElse(
        (err) => `Error: ${err}`,
        (x: number) => `Value: ${x * 2}`
      );
      expect(mapped).toBe("Error: network_error");
    });

    it("should work with same return type", () => {
      const okResult = Result.ok(42);
      const errResult = Result.err("error");

      expect(
        okResult.mapOrElse(
          () => 0,
          (x) => x
        )
      ).toBe(42);
      expect(
        errResult.mapOrElse(
          () => 0,
          (x: number) => x
        )
      ).toBe(0);
    });
  });

  describe("flatMap()", () => {
    it("should flatten nested Results with Success", () => {
      const result = Result.ok(5);
      const flatMapped = result.flatMap((x) => Result.ok(x * 2));
      expect(flatMapped.isOk()).toBe(true);
      expect(flatMapped.unwrap()).toBe(10);
    });

    it("should return Failure when flatMapping over Failure", () => {
      const result = Result.err("error");
      const flatMapped = result.flatMap((x: number) => Result.ok(x * 2));
      expect(flatMapped.isErr()).toBe(true);
      expect(flatMapped.unwrapErr()).toBe("error");
    });

    it("should return Failure when inner function returns Failure", () => {
      const result: Result<number, string> = Result.ok(5);
      const flatMapped = result.flatMap((_x) => Result.err("inner error"));
      expect(flatMapped.isErr()).toBe(true);
      expect(flatMapped.unwrapErr()).toBe("inner error");
    });

    it("should be chainable", () => {
      const result = Result.ok(10);
      const chained = result
        .flatMap((x) => Result.ok(x / 2))
        .flatMap((x) => Result.ok(x + 1));
      expect(chained.unwrap()).toBe(6);
    });
  });

  describe("and()", () => {
    it("should return other when first is Success", () => {
      const result1 = Result.ok("first");
      const result2 = Result.ok("second");
      const combined = result1.and(result2);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe("second");
    });

    it("should return first Failure when first is Failure", () => {
      const result1 = Result.err("first error");
      const result2 = Result.ok("second");
      const combined = result1.and(result2);
      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("first error");
    });

    it("should return first Failure when both are Failures", () => {
      const result1 = Result.err("first error");
      const result2 = Result.err("second error");
      const combined = result1.and(result2);
      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("first error");
    });
  });

  describe("or()", () => {
    it("should return first when first is Success", () => {
      const result1 = Result.ok("first");
      const result2 = Result.ok("second");
      const combined = result1.or(result2);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe("first");
    });

    it("should return second when first is Failure", () => {
      const result1 = Result.err("error");
      const result2 = Result.ok("second");
      const combined = result1.or(result2);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe("second");
    });

    it("should return second Failure when both are Failures", () => {
      const result1 = Result.err("first error");
      const result2 = Result.err("second error");
      const combined = result1.or(result2);
      expect(combined.isErr()).toBe(true);
      expect(combined.unwrapErr()).toBe("second error");
    });
  });


  describe("contains() and containsErr()", () => {
    it("should return true when Success contains the value", () => {
      const result = Result.ok("hello");
      expect(result.contains("hello")).toBe(true);
      expect(result.contains("world")).toBe(false);
    });

    it("should return false when Failure for contains()", () => {
      const result: Result<string, string> = Result.err("error");
      expect(result.contains("anything")).toBe(false);
    });

    it("should return true when Failure contains the error", () => {
      const result = Result.err("network_error");
      expect(result.containsErr("network_error")).toBe(true);
      expect(result.containsErr("database_error")).toBe(false);
    });

    it("should return false when Success for containsErr()", () => {
      const result: Result<string, string> = Result.ok("value");
      expect(result.containsErr("error")).toBe(false);
    });
  });

  describe("unwrap() and unwrapOr()", () => {
    it("should return value for Success", () => {
      const result = Result.ok("test value");
      expect(result.unwrap()).toBe("test value");
      expect(result.unwrapOr("default")).toBe("test value");
    });

    it("should throw/default for Failure", () => {
      const result = Result.err("error message");
      expect(() => result.unwrap()).toThrow(
        "Called unwrap on failure: error message"
      );
      expect(result.unwrapOr("default")).toBe("default");
    });
  });

  describe("match()", () => {
    it("should call ok handler for Success", () => {
      const result = Result.ok("hello");
      const matched = result.match({
        ok: (value) => `got: ${value}`,
        err: (error) => `error: ${error}`,
      });
      expect(matched).toBe("got: hello");
    });

    it("should call err handler for Failure", () => {
      const result = Result.err("network_error");
      const matched = result.match({
        ok: (value: string) => `got: ${value}`,
        err: (error) => `error: ${error}`,
      });
      expect(matched).toBe("error: network_error");
    });

    it("should throw error with invalid patterns", () => {
      const result = Result.ok("test");
      expect(() => {
        result.match({} as any);
      }).toThrow("Invalid pattern object");
    });
  });

  describe("Static factory methods", () => {
    it("should create Success with Result.ok()", () => {
      const result = Result.ok("value");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("value");
    });

    it("should create Failure with Result.err()", () => {
      const result = Result.err("error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("Static utility methods", () => {
    describe("Result.tryCatch()", () => {
      it("should return Success for successful async function", async () => {
        const result = await Result.tryCatch(async () => "success");
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("success");
      });

      it("should return Failure for failing async function", async () => {
        const result = await Result.tryCatch(async () => {
          throw new Error("async error");
        });
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBeInstanceOf(Error);
      });

      it("should return Failure for invalid function", async () => {
        const result = await Result.tryCatch(null as any);
        expect(result.isErr()).toBe(true);
      });
    });

    describe("Result.safeTry()", () => {
      it("should return Success for successful sync function", () => {
        const result = Result.safeTry(() => "success");
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("success");
      });

      it("should return Failure for failing sync function", () => {
        const result = Result.safeTry(() => {
          throw new Error("sync error");
        });
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBeInstanceOf(Error);
      });

      it("should return Failure for invalid function", () => {
        const result = Result.safeTry(null as any);
        expect(result.isErr()).toBe(true);
      });
    });

    describe("Result.fromNullable()", () => {
      it("should create Success for non-null values", () => {
        const result = Result.fromNullable("value");
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("value");
      });

      it("should create Failure for null", () => {
        const result = Result.fromNullable(null);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe("missing_value");
      });

      it("should create Failure for undefined", () => {
        const result = Result.fromNullable(undefined);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe("missing_value");
      });

      it("should work with falsy values that are not null/undefined", () => {
        const zeroResult = Result.fromNullable(0);
        expect(zeroResult.isOk()).toBe(true);
        expect(zeroResult.unwrap()).toBe(0);

        const emptyStringResult = Result.fromNullable("");
        expect(emptyStringResult.isOk()).toBe(true);
        expect(emptyStringResult.unwrap()).toBe("");
      });
    });
  });

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
        expect(chained.isOk()).toBe(true);
        expect(chained.unwrap()).toBe(10);
      });

      it("should short-circuit with Failure", () => {
        const result = Result.err("error");
        const chained = result.andThen((x: number) => Result.ok(x * 2));
        expect(chained.isErr()).toBe(true);
        expect(chained.unwrapErr()).toBe("error");
      });

      it("should work with complex chaining", () => {
        const result = Result.ok(10)
          .andThen((x) => Result.ok(x / 2))
          .andThen((x) => Result.ok(x + 1));

        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(6);
      });

      it("should stop at first failure in chain", () => {
        const executed = vi.fn();
        const result = Result.ok(10)
          .andThen((x) => Result.ok(x * 2))
          .andThen((_x) => Result.err("chain error"))
          .andThen((_x) => {
            executed();
            return Result.ok(100);
          });

        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe("chain error");
        expect(executed).not.toHaveBeenCalled();
      });
    });

    describe("orElse()", () => {
      it("should return original Success without calling function", () => {
        const result = Result.ok("original");
        const called = vi.fn();
        const recovered = result.orElse((_err) => {
          called();
          return Result.ok("recovery");
        });

        expect(recovered.isOk()).toBe(true);
        expect(recovered.unwrap()).toBe("original");
        expect(called).not.toHaveBeenCalled();
      });

      it("should call function and return result when Failure", () => {
        const result = Result.err("original error");
        const recovered = result.orElse((err) =>
          Result.ok(`recovered from: ${err}`)
        );

        expect(recovered.isOk()).toBe(true);
        expect(recovered.unwrap()).toBe("recovered from: original error");
      });

      it("should allow chaining of recovery attempts", () => {
        const result = Result.err("error1")
          .orElse((_err) => Result.err("error2"))
          .orElse((err) => Result.ok(`final recovery from ${err}`));

        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe("final recovery from error2");
      });

      it("should work with different error types", () => {
        const result: Result<string, number> = Result.err(404);
        const recovered = result.orElse((code) =>
          code === 404 ? Result.ok("Not found handled") : Result.err(code)
        );

        expect(recovered.isOk()).toBe(true);
        expect(recovered.unwrap()).toBe("Not found handled");
      });
    });

    describe("inspect()", () => {
      it("should execute function with Success value and return original", () => {
        const sideEffect = vi.fn();
        const result = Result.ok("test value");
        const returned = result.inspect((value) => {
          sideEffect(`logged: ${value}`);
        });

        expect(returned).toBe(result); // Same instance
        expect(returned.unwrap()).toBe("test value");
        expect(sideEffect).toHaveBeenCalledWith("logged: test value");
      });

      it("should not execute function with Failure", () => {
        const sideEffect = vi.fn();
        const result = Result.err("error");
        const returned = result.inspect((value) => {
          sideEffect(`should not execute: ${value}`);
        });

        expect(returned).toBe(result); // Same instance
        expect(returned.isErr()).toBe(true);
        expect(sideEffect).not.toHaveBeenCalled();
      });

      it("should be chainable", () => {
        const effects = vi.fn();
        const result = Result.ok(42)
          .inspect((x) => effects(`first: ${x}`))
          .map((x) => x * 2)
          .inspect((x) => effects(`second: ${x}`));

        expect(result.unwrap()).toBe(84);
        expect(effects).toHaveBeenCalledWith("first: 42");
        expect(effects).toHaveBeenCalledWith("second: 84");
      });
    });

    describe("inspectErr()", () => {
      it("should execute function with Failure error and return original", () => {
        const sideEffect = vi.fn();
        const result = Result.err("test error");
        const returned = result.inspectErr((error) => {
          sideEffect(`logged error: ${error}`);
        });

        expect(returned).toBe(result); // Same instance
        expect(returned.isErr()).toBe(true);
        expect(sideEffect).toHaveBeenCalledWith("logged error: test error");
      });

      it("should not execute function with Success", () => {
        const sideEffect = vi.fn();
        const result = Result.ok("value");
        const returned = result.inspectErr((error) => {
          sideEffect(`should not execute: ${error}`);
        });

        expect(returned).toBe(result); // Same instance
        expect(returned.isOk()).toBe(true);
        expect(sideEffect).not.toHaveBeenCalled();
      });

      it("should be chainable with other operations", () => {
        const errorLog = vi.fn();
        const result = Result.err("first error")
          .inspectErr((err) => errorLog(`logged: ${err}`))
          .orElse((err) => Result.err(`transformed: ${err}`))
          .inspectErr((err) => errorLog(`logged again: ${err}`));

        expect(result.isErr()).toBe(true);
        expect(errorLog).toHaveBeenCalledWith("logged: first error");
        expect(errorLog).toHaveBeenCalledWith(
          "logged again: transformed: first error"
        );
      });
    });

    describe("Integration Tests", () => {
      it("should work together in complex scenarios", () => {
        const sideEffects = vi.fn();

        const processUser = (id: number): Result<string, string> => {
          if (id > 0) {
            sideEffects(`processing user ${id}`);
            return Result.ok(`user-${id}`);
          } else {
            sideEffects(`processing user ${id}`);
            sideEffects(`error: invalid id`);
            sideEffects(`recovering from: invalid id`);
            return Result.ok("guest-user");
          }
        };

        const result1 = processUser(123);
        expect(result1.unwrap()).toBe("user-123");
        expect(sideEffects).toHaveBeenCalledWith("processing user 123");

        sideEffects.mockReset();
        const result2 = processUser(-1);
        expect(result2.unwrap()).toBe("guest-user");
        expect(sideEffects).toHaveBeenCalledWith("processing user -1");
        expect(sideEffects).toHaveBeenCalledWith("error: invalid id");
        expect(sideEffects).toHaveBeenCalledWith("recovering from: invalid id");
      });

      it("should handle dynamic defaults with expect", () => {
        const getConfig = (key: string): Result<string, string> => {
          const configs: Record<string, string> = {
            api_url: "https://api.example.com",
          };
          return Result.fromNullable(configs[key], `Config ${key} not found`);
        };

        // Using expect with Success
        const apiUrl = getConfig("api_url").expect(
          "API URL must be configured"
        );
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
});
