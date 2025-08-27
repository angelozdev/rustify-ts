# try-catch

A TypeScript library implementing functional programming monads **Result** and **Option**, similar to Rust's error handling patterns. Provides utilities for safe error handling and working with optional values.

## 🚀 Features

- **Result<T, E>**: Safe error handling without exceptions
- **Option<T>**: Explicit handling of optional values
- **Rich API**: Comprehensive utility methods (retry, timeout, validation, etc.)
- **Type Safety**: Full TypeScript support with proper generics
- **Zero Dependencies**: Lightweight and self-contained
- **Tree Shakeable**: Only import what you need
- **Async Support**: Built-in async utilities and Promise integration

## 📦 Installation

```bash
npm install try-catch
# or
pnpm add try-catch
# or
yarn add try-catch
```

## 🔧 Quick Start

### Result<T, E> - Error Handling

```typescript
import { Result } from "try-catch";

// Basic usage
const success = Result.ok("Hello World");
const failure = Result.err("Something went wrong");

// Safe async operations
const apiResult = await Result.tryCatch(async () => {
  const response = await fetch("/api/users");
  return response.json();
});

if (apiResult.isSuccess()) {
  console.log("Users:", apiResult.unwrap());
} else {
  console.error("API Error:", apiResult._getError());
}

// Pattern matching
const message = apiResult.match({
  ok: (users) => `Found ${users.length} users`,
  err: (error) => `Failed to load users: ${error}`,
});
```

### Option<T> - Optional Values

```typescript
import { Option } from "try-catch";

// Basic usage
const some = Option.some("value");
const none = Option.none();

// Working with nullable values
const user = Option.fromNullable(apiResponse.user);

const greeting = user
  .map((u) => u.name)
  .map((name) => `Hello, ${name}!`)
  .unwrapOr("Hello, Guest!");

// Pattern matching
const status = user.match({
  some: (user) => `Logged in as ${user.name}`,
  none: () => "Not logged in",
});
```

## 🔄 Conversions

Complete bidirectional conversion between Result and Option:

```typescript
import { Result, Option } from "try-catch";

// Option ↔ Result conversions using clean static methods
const option = Option.some("data");
const result = Option.toResult(option, "No data"); // Option → Result
const back = Result.toOption(result); // Result → Option

// Alternative: Result → Option conversion
const option2 = Option.fromResult(someResult); // Result → Option
const result2 = Option.toResult(option2, "error"); // Option → Result
const option3 = Result.toOption(result2); // Result → Option
```

## 📚 API Reference

### Result Methods

#### Static Constructors

- `Result.ok<T>(data: T)` - Create successful result
- `Result.err<E>(error: E)` - Create failed result
- `Result.tryCatch<T>(fn: () => Promise<T>)` - Safe async execution
- `Result.safeTry<T>(fn: () => T)` - Safe sync execution
- `Result.retry<T>(fn, options)` - Retry with exponential backoff
- `Result.withTimeout<T>(promise, ms)` - Promise with timeout

#### Array Operations

- `Result.all<T>(results: Result<T, E>[])` - Collect all success values
- `Result.collect<T, E>(results)` - Collect same-typed results
- `Result.partition<T, E>(results)` - Split successes and failures
- `Result.allSettled<T, E>(results)` - Process all regardless of outcome

#### Utility Methods

- `Result.when<T, E>(condition, success, error)` - Conditional result
- `Result.unless<T, E>(condition, success, error)` - Negated conditional
- `Result.validate<T>(value, predicate, error)` - Value validation
- `Result.fromNullable<T>(value)` - Convert nullable to Result
- `Result.fromPromise<T>(promise)` - Convert Promise to Result
- `Result.fromTuple<T, E>(tuple)` - Convert Go-style tuple
- `Result.toOption<T>(result)` - Convert to Option (discards error)

#### Instance Methods

- `.map<U>(fn: (T) => U)` - Transform success value
- `.mapError<F>(fn: (E) => F)` - Transform error value
- `.flatMap<U>(fn: (T) => Result<U, E>)` - Chain operations
- `.unwrap()` - Extract value (throws on error)
- `.unwrapOr(default)` - Extract value with fallback
- `.match({ ok, err })` - Pattern matching
- `.inspect(fn)` - Side effect on success
- `.inspectErr(fn)` - Side effect on error

### Option Methods

#### Static Constructors

- `Option.some<T>(data: T)` - Create Some with value
- `Option.none()` - Create None (empty)
- `Option.fromNullable<T>(value)` - Convert nullable to Option
- `Option.fromResult<T>(result)` - Convert Result to Option
- `Option.toResult<T, E>(option, error)` - Convert to Result with error

#### Static Utilities

- `Option.match<T, U>(option, { some, none })` - Pattern matching
- `Option.pipe<T>(option)` - Fluent chaining interface

#### Instance Methods

- `.map<U>(fn: (T) => U)` - Transform Some value
- `.flatMap<U>(fn: (T) => Option<U>)` - Chain operations
- `.filter(predicate)` - Filter Some values
- `.unwrap()` - Extract value (throws on None)
- `.unwrapOr(default)` - Extract value with fallback
- `.match({ some, none })` - Pattern matching
- `.inspect(fn)` - Side effect on Some

## 🔧 Advanced Examples

### Error Recovery Chain

```typescript
const processData = Result.chain(
  (data: string) => Result.validate(data, (d) => d.length > 0, "Empty data"),
  (data: string) => Result.safeTry(() => JSON.parse(data)),
  (parsed: any) => Result.validate(parsed, (p) => p.id, "Missing ID")
);

const result = processData(rawInput);
```

### Retry with Exponential Backoff

```typescript
const resilientApiCall = await Result.retry(
  async () => {
    const response = await fetch("/api/flaky-endpoint");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
  }
);
```

### Combined Processing

```typescript
// Combine multiple async operations
const userDataResults = await Promise.all([
  Result.tryCatch(() => fetchUser(userId)),
  Result.tryCatch(() => fetchPosts(userId)),
  Result.tryCatch(() => fetchComments(userId)),
]);

const combinedResult = Result.all(userDataResults);

const summary = combinedResult.match({
  ok: ([user, posts, comments]) => ({
    user: user.name,
    stats: { posts: posts.length, comments: comments.length },
  }),
  err: (error) => ({ error: `Failed to load user data: ${error}` }),
});
```

## 🏗️ Build & Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```

## 📄 License

ISC License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
