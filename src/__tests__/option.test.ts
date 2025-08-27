import { describe, it, expect } from "vitest";
import Option, { Some, None } from "../option";

describe("Option - New Methods", () => {
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

      const objectOption = Option.some({ key: "value" });
      expect(objectOption.expect("Object should work")).toEqual({
        key: "value",
      });
    });
  });

  describe("unwrapOrElse()", () => {
    it("should return the value when Some", () => {
      const option = Option.some("some value");
      const result = option.unwrapOrElse(() => "fallback");
      expect(result).toBe("some value");
    });

    it("should execute function and return result when None", () => {
      const option = Option.none();
      const result = option.unwrapOrElse(() => "computed fallback");
      expect(result).toBe("computed fallback");
    });

    it("should allow dynamic computation based on external state", () => {
      const option = Option.none();
      let counter = 0;
      const result = option.unwrapOrElse(() => {
        counter++;
        return `computed-${counter}`;
      });
      expect(result).toBe("computed-1");
      expect(counter).toBe(1);
    });

    it("should work with different return types", () => {
      const numberOption: Option<number> = Option.none();
      expect(numberOption.unwrapOrElse(() => 42)).toBe(42);

      const arrayOption: Option<number[]> = Option.none();
      expect(arrayOption.unwrapOrElse(() => [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("andThen()", () => {
    it("should be an alias for flatMap with Some", () => {
      const option = Option.some(5);
      const chained = option.andThen((x) => Option.some(x * 2));
      expect(chained.isSome()).toBe(true);
      expect(chained.unwrap()).toBe(10);
    });

    it("should short-circuit with None", () => {
      const option: Option<number> = Option.none();
      const chained = option.andThen((x) => Option.some(x * 2));
      expect(chained.isNone()).toBe(true);
    });

    it("should work with complex chaining", () => {
      const option = Option.some(10)
        .andThen((x) => Option.some(x / 2))
        .andThen((x) => Option.some(x + 1));

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(6);
    });

    it("should stop at first None in chain", () => {
      // Test that andThen short-circuits properly
      let executed = false;
      const result = Option.some(10)
        .andThen(x => Option.some(x * 2))
        .andThen(_x => Option.none())
        .andThen(_x => {
          executed = true;
          return Option.some(100);
        });

      expect(result.isNone()).toBe(true);
      expect(executed).toBe(false); // Should not execute after None
    });
  });

  describe("orElse()", () => {
    it("should return original Some without calling function", () => {
      const option = Option.some("original");
      let called = false;
      const fallback = option.orElse(() => {
        called = true;
        return Option.some("fallback");
      });

      expect(fallback.isSome()).toBe(true);
      expect(fallback.unwrap()).toBe("original");
      expect(called).toBe(false);
    });

    it("should call function and return result when None", () => {
      const option = Option.none();
      const fallback = option.orElse(() => Option.some("fallback value"));

      expect(fallback.isSome()).toBe(true);
      expect(fallback.unwrap()).toBe("fallback value");
    });

    it("should allow chaining of fallback attempts", () => {
      const option = Option.none()
        .orElse(() => Option.none())
        .orElse(() => Option.some("final fallback"));

      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe("final fallback");
    });

    it("should work with dynamic fallback generation", () => {
      let attempt = 0;
      const option = Option.none().orElse(() => {
        attempt++;
        return Option.some(`attempt-${attempt}`);
      });

      expect(option.unwrap()).toBe("attempt-1");
      expect(attempt).toBe(1);
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

      const result = a
        .zip(b)
        .andThen(([x, y]) => Option.some([x, y, c.unwrap()]));

      expect(result.unwrap()).toEqual([1, 2, 3]);
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

    it("should work with object equality", () => {
      const obj = { key: "value" };
      const option = Option.some(obj);
      expect(option.contains(obj)).toBe(true);
      expect(option.contains({ key: "value" })).toBe(false); // Different reference
    });
  });

  describe("fold()", () => {
    it("should apply function to Some value", () => {
      const option = Option.some(5);
      const result = option.fold(0, (x) => x * 2);
      expect(result).toBe(10);
    });

    it("should return default value for None", () => {
      const option: Option<number> = Option.none();
      const result = option.fold(42, (x) => x * 2);
      expect(result).toBe(42);
    });

    it("should work with different types", () => {
      const stringOption = Option.some("hello");
      const length = stringOption.fold(0, (s) => s.length);
      expect(length).toBe(5);

      const noneOption: Option<string> = Option.none();
      const defaultLength = noneOption.fold(0, (s) => s.length);
      expect(defaultLength).toBe(0);
    });

    it("should be equivalent to match in functionality", () => {
      const option = Option.some(10);

      const foldResult = option.fold("none", (x) => `value: ${x}`);
      const matchResult = option.match({
        some: (x) => `value: ${x}`,
        none: () => "none",
      });

      expect(foldResult).toBe(matchResult);
      expect(foldResult).toBe("value: 10");
    });

    it("should handle complex transformations", () => {
      const option = Option.some([1, 2, 3, 4, 5]);
      const result = option.fold(0, (arr) =>
        arr.filter((x) => x % 2 === 0).reduce((sum, x) => sum + x, 0)
      );
      expect(result).toBe(6); // 2 + 4
    });
  });

  // Integration tests combining multiple new methods
  describe("Integration Tests", () => {
    it("should work together in complex scenarios", () => {
      const findUser = (id: number): Option<string> => {
        const users: Record<number, string> = {
          1: "Alice",
          2: "Bob",
        };
        return users[id] ? Option.some(users[id]) : Option.none();
      };

      const getUserInfo = (id: number): string => {
        return findUser(id)
          .andThen((name) => Option.some(name.toUpperCase()))
          .zip(Option.some(id))
          .fold("Unknown user", ([name, userId]) => `${name} (ID: ${userId})`);
      };

      expect(getUserInfo(1)).toBe("ALICE (ID: 1)");
      expect(getUserInfo(999)).toBe("Unknown user");
    });

    it("should handle chaining with fallbacks", () => {
      const config = {
        primary: Option.none(),
        secondary: Option.some("backup-value"),
        default: "final-fallback",
      };

      const result = config.primary
        .orElse(() => config.secondary)
        .orElse(() => Option.some(config.default))
        .expect("Configuration must exist");

      expect(result).toBe("backup-value");
    });

    it("should combine with contains and fold for validation", () => {
      const validateEmail = (email: string): Option<string> => {
        return email.includes("@") ? Option.some(email) : Option.none();
      };

      const processEmails = (emails: string[]): string => {
        const validEmails = emails
          .map(validateEmail)
          .filter((opt) => opt.isSome())
          .map((opt) => opt.unwrap());

        return Option.some(validEmails)
          .filter((arr) => arr.length > 0)
          .fold(
            "No valid emails found",
            (arr) => `Found ${arr.length} valid emails: ${arr.join(", ")}`
          );
      };

      const result1 = processEmails([
        "test@example.com",
        "invalid",
        "user@test.org",
      ]);
      expect(result1).toBe(
        "Found 2 valid emails: test@example.com, user@test.org"
      );

      const result2 = processEmails(["invalid1", "invalid2"]);
      expect(result2).toBe("No valid emails found");
    });

    it("should demonstrate practical usage patterns", () => {
      // Simulating a user profile loading scenario
      interface UserProfile {
        name: string;
        email: string;
        age?: number;
      }

      const loadProfile = (userId: number): Option<UserProfile> => {
        if (userId === 1) {
          return Option.some({
            name: "John",
            email: "john@example.com",
            age: 30,
          });
        }
        return Option.none();
      };

      const getDisplayName = (userId: number): string => {
        return loadProfile(userId)
          .andThen((profile) => Option.some(profile.name))
          .orElse(() => Option.some("Anonymous"))
          .fold("Error", (name) => name);
      };

      const getAge = (userId: number): string => {
        return loadProfile(userId)
          .andThen((profile) =>
            profile.age ? Option.some(profile.age) : Option.none()
          )
          .fold("Age unknown", (age) => `${age} years old`);
      };

      expect(getDisplayName(1)).toBe("John");
      expect(getDisplayName(999)).toBe("Anonymous");
      expect(getAge(1)).toBe("30 years old");
      expect(getAge(999)).toBe("Age unknown");
    });
  });
});
