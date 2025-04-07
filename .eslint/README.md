# Custom ESLint Rules

This directory contains custom ESLint rules for the personal-brain project.

## Available Rules

### enforce-singleton-pattern

Enforces that classes with `getInstance()` static method (implementing the Singleton pattern) must also have:

- `resetInstance()` - To reset the singleton instance (primarily for testing)
- `createFresh()` - To create a new instance (primarily for testing)

#### Purpose

This rule ensures consistent implementation of the Singleton pattern across the codebase. The standard pattern includes:

1. A private static `instance` property
2. A public static `getInstance()` method that returns the singleton instance
3. A public static `resetInstance()` method that resets the singleton instance
4. A public static `createFresh()` method that creates a new instance without affecting the singleton

This pattern improves:
- **Code consistency**: All singletons work the same way
- **Testability**: Tests can easily get isolated instances or reset global state
- **Maintainability**: Developers know what to expect from singleton classes

#### Examples

**❌ Bad**
```typescript
class BadSingleton {
  private static instance: BadSingleton | null = null;
  
  public static getInstance(): BadSingleton {
    if (!BadSingleton.instance) {
      BadSingleton.instance = new BadSingleton();
    }
    return BadSingleton.instance;
  }
  
  // Missing resetInstance() and createFresh()
}
```

**✅ Good**
```typescript
class GoodSingleton {
  private static instance: GoodSingleton | null = null;
  
  public static getInstance(): GoodSingleton {
    if (!GoodSingleton.instance) {
      GoodSingleton.instance = new GoodSingleton();
    }
    return GoodSingleton.instance;
  }
  
  public static resetInstance(): void {
    GoodSingleton.instance = null;
  }
  
  public static createFresh(): GoodSingleton {
    return new GoodSingleton();
  }
}
```