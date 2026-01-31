if (Zemu.args.length === 0) {
  console.log("No arguments provided.");
  console.log("Try: zemu examples/args.js arg1 arg2 arg3");
} else {
  console.log("Arguments:", JSON.stringify(Zemu.args));

  // Process each argument
  Zemu.args.forEach(function (arg, index) {
    console.log("  [" + index + "]:", arg);
  });
}
