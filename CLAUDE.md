# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rustify-ts** is a TypeScript library that brings Rust's `Result<T, E>` and `Option<T>` monads to TypeScript. It provides safe, functional error handling patterns without exceptions, inspired by Rust's approach to error handling and null safety.

## Development Commands

```bash
# Build the library
pnpm build

# Development with watch mode
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking (lint)
pnpm lint

# Build before publishing
pnpm prepublishOnly
```

## Architecture

### Core Structure

The library follows a modular architecture with two main monads:

1. **Result<T, E>** (`src/core/result/`) - For error handling
   - `result.ts` - Abstract base class with all methods
   - `ok.ts` - Success variant constructor 
   - `err.ts` - Error variant constructor
   - `index.ts` - Exports

2. **Option<T>** (`src/core/option/`) - For null safety
   - `option.ts` - Abstract base class with all methods
   - `some.ts` - Value present constructor
   - `none.ts` - No value constructor  
   - `index.ts` - Exports

3. **Utilities** (`src/internals/`) - Shared utilities
   - `assertions.ts` - Type checking and validation utilities

### Key Design Patterns

- **Abstract base classes**: Both `Option<T>` and `Result<T, E>` are abstract classes with concrete implementations as inner classes
- **Static factory methods**: Constructors like `Result.ok()`, `Option.some()` alongside standalone functions `ok()`, `some()`
- **Monadic operations**: `map`, `flatMap`, `filter` for chaining operations
- **Pattern matching**: `match()` method for handling both success/failure cases
- **Rust-inspired API**: Method names and behavior closely follow Rust's `Option` and `Result` types

### Type Safety

- Uses strict TypeScript with comprehensive type checking
- Extensive use of type guards (`isSome()`, `isOk()`, etc.)
- Generic types ensure type safety throughout transformations
- Helper utilities in `assertions.ts` for runtime type checking

### Testing Strategy

- Comprehensive test coverage with Vitest
- Tests organized parallel to source code in `__test__` directories
- Tests cover both existing functionality and new methods being added
- Property-based testing approach for edge cases

### Build Configuration

- **tsup** for building with dual ESM/CJS output
- **TypeScript** for type checking and `.d.ts` generation  
- Tree-shaking enabled for optimal bundle size
- Source maps generated for debugging

## Development Notes

- The library prioritizes zero-cost abstractions and performance
- New methods should follow Rust's `Option`/`Result` API conventions
- Always include comprehensive tests for new functionality
- Maintain backward compatibility when adding features
- Use the existing assertion utilities from `src/internals/assertions.ts`