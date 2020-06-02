# How to Contribute
By participating, you are expected to uphold [Code of Conduct](CODE_OF_CONDUCT.md).

* [setup](#setup)
* [compile](#compile)
* [test](#test)
* [coverage](#coverage)
* [release](#release)
* [coding style](#coding-style)

## setup
```
git clone git@github.com:mikolalysenko/mudb.git && cd mudb
npm i
npm run watch
```

## compile
```
npm run build
```

## test
```
# run all tests
npm run test-all

# run tests in a module
npm run test [module]
# run tests in rda
npm run test rda
# run tests in socket/web
npm run test socket/web

# run tests in a file
npm run test [module test_file]
# run tests in rda/test/inverse.ts
npm run test rda inverse
# run tests in socket/web/test/server.ts
npm run test socket/web server
```

## coverage
```
npm run coverage [module]
open coverage/index.html
```

## release
```
npm run release
```

## coding style

### naming
* Name types and enums in PascalCase.
* Name variables, properties, and functions in camelCase.
* Name constant in SCREAMING_SNAKE_CASE.
* Prefix private properties with `_`.
* Prefer whole words in names.

### whitespace
* Indent with 4 spaces.
* **No spaces around** the colon between name and type.
    ```ts
    class DBEvent {
        type:string;
        payload:any;
        timestamp:number;
        constructor(type:string, payload:any) { }
    }
    ```
* But do put a space **after** the function name and spaces **around** the colon for function return types.
    ```ts
    function noop () : void { }
    ```

### misc
* Use `const` by default.
* Use single quotes for strings. Use template literals instead of concatenations.
* Always surround loop and conditional bodies with curly braces.
