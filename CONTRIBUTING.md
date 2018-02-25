:tada: First off, thanks for trying to contribute! :tada:

The following is a a set of guidelines, not rules. Feel free to propose changes to this document.

**Table of Contents**

- [code of conduct](#code-of-conduct)
- [set up](#set-up)
- [coding style guide](#coding-style-guide)

## code of conduct

By participating, you are expected to uphold [Code of Conduct](CODE_OF_CONDUCT.md).

## set up

1. Install Node.js
2. Install Typescript
3. Clone repo
4. Install deps and link modules

with one of these commands:

```sh
# npm
npm run link-all
# yarn
yarn run link-all -- yarn
# yarn version >= 1.0.0
yarn run link-all yarn
```

You may need to run your linking command twice for the first time.

5. Typescript watch

```
npm run watch
```

## add new modules

**TODO** document workflow

## write docs

Notes on mdtoc

```
npm run docs
```

Edit `README-toc.md`, not `README.md`

## test

### run all tests

```
npm test
```

### add a test case

Notes on tape

## coding style guide

### naming

- Use PascalCase for type names.
- Use PascalCase for enum values.
- Use camelCase for function names.
- Use camelCase for property names and local variables.
- Use `_` as a prefix for private properties.
- Use whole words in names when possible.

### whitespace

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
    function noop () : void { }
    ```

### misc

- Avoid lines longer than 100 characters.
- Use `const` by default.
- Use single quotes for strings. And prefer template literals over concatenations.
- Always use semicolons.
- Always surround loop and conditional bodies with curly braces.
