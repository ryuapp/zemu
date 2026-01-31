# Zemu

A tiny JavaScript runtime built with [Zig](https://ziglang.org/) using [Micro QuickJS](https://github.com/bellard/mquickjs) engine. The binary size is under 500KB.

## Usage

Execute a JavaScript file:

```sh
zemu examples/hello.js
```

Evaluate JavaScript code directly:

```sh
zemu -e "console.log('Hello World')"
zemu -e "48 + 19"
```

### Command Line Options

```sh
Usage: zemu [options] <file>

Options:
  -h, --help       Print this help message
  -v, --version    Print this version
  -e, --eval CODE  Evaluate inline JavaScript code

Examples:
  zemu hello.js                   Run a JavaScript file
  zemu -e "console.log(48 + 19)"  Evaluate inline code
```

## Available JavaScript APIs

Zemu supports a subset of JavaScript close to **ES5** (ECMAScript 2009). Only `var` declarations are supported. ES6+ features like `let`, `const`, arrow functions, classes, `Promise`, `async`/`await`, and `import`/`export` are **not supported**.

For detailed API documentation, please refer to [Micro QuickJS](https://github.com/bellard/mquickjs).

The following sections describe Zemu-specific APIs:

### Console Object

```js
console.log("message"); // Print to stdout
console.info("info"); // Print to stdout
console.error("error"); // Print to stderr
console.warn("warning"); // Print to stderr
```

### Command-Line Arguments

`Zemu.args` returns the script arguments to the program.

```js
// Run: zemu script.js -i --verbose hello
console.log(Zemu.args); // ["-i", "--verbose", "hello"]
console.log(Zemu.args[0]); // "-i"
console.log(Zemu.args.length); // 3

// Also works with -e flag
// Run: zemu -e "console.log(Zemu.args)" -i --verbose hello
// Output: -i,--verbose,hello
```

## Examples

See the `examples/` directory for sample scripts:

- `hello.js` - Basic console output
- `fibonacci.js` - Recursive function example
- `error.js` - Error handling demonstration
- `args.js` - Command-line arguments usage

## License

MIT License

### Third-party License

Zemu includes a modified copy of [mitchellh/zig-mquickjs](https://github.com/mitchellh/zig-mquickjs). See [lib/mquickjs/LICENSE](./lib/mquickjs/LICENSE) for the original MIT License.
