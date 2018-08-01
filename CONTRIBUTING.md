# How to Contribute
By participating, you are expected to uphold [Code of Conduct](CODE_OF_CONDUCT.md).

* [bootstrap](#bootstrap)
* [compile](#compile)
* [test](#test)
* [document](#document)
* [publish](#publish)
* [coding style](#coding-style)

## bootstrap
```
git clone https://github.com/mikolalysenko/mudb.git && cd mudb
npm i
npm run bootstrap
```

## compile
```
# watch all modules
npm run watch

# watch all socket modules
npm run watch *-socket

# watch both mudb and muweb-socket
npm run watch mudb muweb-socket
```

## test
```
# run tests in all modules
npm run test
```

## document
[`mdtoc.js`](https://github.com/kitcambridge/mdtoc.js) is required to generate TOC:
```
npm i -g mdtoc
```

Edit `README-toc.md`, **not** `README.md`.  To generate TOC,
```
npm run docs
```

## publish
```
npm run publish
```

## coding style

### naming
* Name types and enums in PascalCase.
* Name variables, properties, and functions in camelCase.
* Name constant in SCREAMING_SNAKE_CASE.
* Prefix private properties with `_`.
* Use whole words in names whenever possible.

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
* Avoid lines longer than 80 characters.
