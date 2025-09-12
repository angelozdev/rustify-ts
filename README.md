# rustify-ts

A TypeScript library that brings Rust's `Result<T, E>` and `Option<T>` patterns to TypeScript for safer error handling and null safety.

[![NPM Version](https://img.shields.io/npm/v/rustify-ts.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/rustify-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/rustify-ts.svg?style=flat-square&color=blue)](https://github.com/angelozdev/rustify-ts/blob/main/LICENSE)

## Features

- 🛡️ **Type-safe error handling** with `Result<T, E>`
- 🎯 **Null safety** with `Option<T>`
- 🔗 **Monadic operations** for chaining transformations
- 🎨 **Pattern matching** for clean control flow
- 📦 **Tree-shakeable** and lightweight
- 🌐 **Universal** - works in Node.js, browsers, and other JavaScript environments

## Installation

```bash
# npm
npm install rustify-ts

# pnpm
pnpm add rustify-ts

# yarn
yarn add rustify-ts

# bun
bun add rustify-ts
```

## Quick Start

### Result<T, E> - Error Handling

```typescript
import { ok, err, Result } from "rustify-ts";

// Create Results
const success = ok("Data loaded successfully");
const failure = err("Network timeout");

// Safe async operations
const apiResult = await Result.tryCatch(async () => {
  const response = await fetch("/api/data");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
});

// Chain operations safely
const processedData = apiResult
  .map((data) => data.items)
  .flatMap((items) => validateItems(items))
  .map((items) => items.slice(0, 10));

// Handle results with pattern matching
const outcome = processedData.match({
  ok: (data) => ({ success: true, data }),
  err: (error) => ({ success: false, error: error.message }),
});
```

### Option<T> - Null Safety

```typescript
import { some, none, Option } from "rustify-ts";

// Create Options
const user = some({ name: "John", age: 30 });
const empty = none();

// Convert nullable values safely
const currentUser = Option.fromNullable(getCurrentUser());

// Chain transformations without null checks
const greeting = currentUser
  .map((user) => user.profile)
  .flatMap((profile) => Option.fromNullable(profile.displayName))
  .or(currentUser.map((user) => user.email))
  .unwrapOr("Anonymous User");

// Pattern matching
const userStatus = currentUser.match({
  some: (user) => `Welcome back, ${user.name}!`,
  none: () => "Please log in to continue",
});
```

## API Documentation

### Result<T, E>

#### Core Constructors

```typescript
import { ok, err, Result } from "rustify-ts";

const success = ok("Operation completed");
const failure = err("Something went wrong");

// Static methods
Result.ok<T>(value: T)
Result.err<E>(error: E)
```

#### Safe Execution

```typescript
// Async operations with automatic error catching
const apiResult = await Result.tryCatch(async () => {
  const response = await fetch("/api/data");
  return response.json();
});

// Sync operations with automatic error catching
const parsed = Result.safeTry(() => JSON.parse(jsonString));

// Convert nullable values
const user = Result.fromNullable(getUserById(123), "User not found");
```

#### Transformations

```typescript
// Transform success values
result.map((data) => data.toUpperCase());

// Transform error values
result.mapError((err) => `Failed: ${err}`);

// Chain operations that can fail
result.flatMap((data) => validateData(data));
result.andThen((data) => processData(data)); // Alias for flatMap

// Pattern matching
const outcome = result.match({
  ok: (data) => `Success: ${data}`,
  err: (error) => `Error: ${error}`,
});
```

#### State Checking & Extraction

```typescript
// Check state
if (result.isOk()) {
  console.log("Success!");
} else if (result.isErr()) {
  console.log("Failed!");
}

// Extract values
const value = result.unwrap(); // Throws if error
const safeValue = result.unwrapOr("default");
const errorValue = result.unwrapErr(); // Get error (only for failures)
```

### Option<T>

#### Core Constructors

```typescript
import { some, none, Option } from "rustify-ts";

const user = some({ name: "John", age: 30 });
const empty = none();

// Static methods
Option.some<T>(value: T)
Option.none<T>()
```

#### Smart Conversions

```typescript
// Convert nullable values safely
const maybeUser = Option.fromNullable(getUserById(123));

// Convert from Result (discards error info)
const optionFromResult = Option.fromResult(someResult);

// Convert to Result with custom error
const resultFromOption = Option.toResult(maybeUser, "User not found");
```

#### Transformations

```typescript
// Transform contained values
option.map((user) => user.name);

// Chain operations that might fail
option.flatMap((user) => findUserProfile(user));
option.andThen((user) => validateUser(user)); // Alias for flatMap

// Filter values conditionally
option.filter((user) => user.isActive);

// Pattern matching
const greeting = option.match({
  some: (user) => `Hello, ${user.name}!`,
  none: () => "Hello, stranger!",
});
```

#### State Checking & Extraction

```typescript
// Check state
if (option.isSome()) {
  console.log("Has value!");
} else if (option.isNone()) {
  console.log("No value!");
}

// Extract values
const value = option.unwrap(); // Throws if None
const safeValue = option.unwrapOr("default");
const computedValue = option.unwrapOrElse(() => computeDefault());
```

#### Combinators

```typescript
// Fallback chaining
const finalOption = option1.or(option2).or(option3);

// Combine with another Option
const both = option1.and(option2); // None if either is None

// Combine into tuple
const tuple = option1.zip(option2); // Option<[T, U]>

// Exclusive or
const exclusive = option1.xor(option2); // Some only if exactly one is Some
```

## Advanced Features

### New Methods

#### Transpose Operations

```typescript
// Transform nested structures between Option<Result<T, E>> and Result<Option<T>, E>
const optionResult = Option.some(Result.ok(42));
const resultOption = optionResult.transpose(); // Result.ok(Option.some(42))

const resultOption = Result.ok(Option.some(42));
const optionResult = resultOption.transpose(); // Option.some(Result.ok(42))
```

#### Array & Nullable Conversion

```typescript
// Convert to arrays
Option.some(42).toArray(); // [42]
Option.none().toArray(); // []
Result.ok(42).toArray(); // [42]
Result.err("error").toArray(); // []

// Convert Option to nullable
Option.some(42).toNullable(); // 42
Option.none().toNullable(); // null

// Create Option from truthy/falsy values
Option.fromTruthy("hello"); // Option.some("hello")
Option.fromTruthy(""); // Option.none()
```

#### Async Operations

```typescript
// Async transformations
const option = Option.some(5);
const asyncMapped = await option.mapAsync(async (x) => x * 2); // Option.some(10)

const result = Result.ok(5);
const asyncResult = await result.mapAsync(async (x) => x * 2); // Result.ok(10)
```

#### Equality Checking

```typescript
// Structural equality comparison
Option.some(42).equals(Option.some(42)); // true
Option.some(42).equals(Option.none()); // false

Result.ok(42).equals(Result.ok(42)); // true
Result.err("error").equals(Result.err("error")); // true
```

#### Sequence & Traverse

```typescript
// Convert [Option<T>] → Option<[T]>
const options = [Option.some(1), Option.some(2), Option.some(3)];
const sequenced = Option.sequence(options); // Option.some([1, 2, 3])

// Map then sequence in one operation
const numbers = [1, 2, 3];
const doubled = Option.traverse(numbers, (x) =>
  x > 0 ? Option.some(x * 2) : Option.none()
); // Option.some([2, 4, 6])

// Same patterns work for Result
const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
const allOk = Result.sequence(results); // Result.ok([1, 2, 3])
```

## Common Patterns

### Converting from try/catch

```typescript
// Before
async function fetchUser(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
}

// After
async function fetchUser(id: string): Promise<Result<User, string>> {
  return await Result.tryCatch(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  });
}

// Usage
const userResult = await fetchUser("123");
const message = userResult.match({
  ok: (user) => `Welcome ${user.name}!`,
  err: (error) => `Failed to load user: ${error}`,
});
```

### Chaining Operations

```typescript
// Chain multiple operations that can fail
const processUserData = (rawData: string) => {
  return Result.safeTry(() => JSON.parse(rawData))
    .flatMap((data) => validateUserSchema(data))
    .flatMap((user) => enrichWithProfile(user))
    .flatMap((user) => saveToDatabase(user))
    .map((user) => ({ success: true, userId: user.id }));
};
```

### Null Safety with Options

```typescript
// Before
function getUserDisplayName(userId?: string): string {
  if (!userId) return "Guest";
  const user = findUserById(userId);
  if (!user) return "Unknown User";
  if (!user.profile) return user.email || "No Email";
  return user.profile.displayName || user.profile.firstName || "Anonymous";
}

// After
function getUserDisplayName(userId?: string): string {
  return Option.fromNullable(userId)
    .flatMap((id) => Option.fromNullable(findUserById(id)))
    .flatMap((user) =>
      Option.fromNullable(user.profile?.displayName)
        .or(Option.fromNullable(user.profile?.firstName))
        .or(Option.fromNullable(user.email))
    )
    .unwrapOr("Guest");
}
```

## Development

```bash
# Setup
pnpm install

# Development
pnpm dev          # Watch mode
pnpm test         # Run tests
pnpm test:coverage # Test coverage
pnpm lint         # Type checking
pnpm build        # Production build
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
