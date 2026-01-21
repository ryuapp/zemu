function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10) =", fibonacci(10));
console.log("Fibonacci(15) =", fibonacci(15));

// Test some other operations
var result = fibonacci(8);
console.log("Result stored in variable:", result);
