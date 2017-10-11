:tada: First off, thanks for trying to contribute! :tada:

The following is a a set of guidelines, not rules. Feel free to propose changes to this document.

**Table of Contents**

- [Code of Conduct](#code-of-conduct)
- [Coding Style Guide](#coding-style-guide)

## Code of Conduct

By participating, you are expected to uphold [Code of Conduct](CODE_OF_CONDUCT.md).

## Coding Style Guide

### Naming

- Use PascalCase for type names.
- Use PascalCase for enum values.
- Use camelCase for function names.
- Use camelCase for property names and local variables.
- Use `_` as a prefix for private properties.
- Use whole words in names when possible.

### Whitespace

- Indent using 4 spaces.
- **No** spaces between variable/parameter/member name and type.

    ```ts
    class DBEvent {
        type:string;
        payload:any;
        timestamp:number;

        constructor(type:string, payload:any) { }
    }
    ```

- But do put spaces **around** the colon for function return types.

    ```ts
    function noop() : void { }
    ```

### Misc

- Avoid lines longer than 100 characters.
- Use `const` by default.
- Use single quotes for strings. And prefer template literals over concatenations.
- Always use semicolons.
- Use `undefined`. Do not use `null`.
- Always surround loop and conditional bodies with curly braces.
- Prefer arrow functions over anonymous function expressisons.
