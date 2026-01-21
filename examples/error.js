console.log("Testing error handling...");

try {
  throw new Error("This is a test error");
} catch (e) {
  console.error("Caught error:", e.message);
}

console.log("After error handling");
console.info("This is an info message");
console.warn("This is a warning message");
console.error("This is an error message");
