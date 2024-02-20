function foo(a, b) {
  console.log(`a: ${a}, b: ${b}`);
  // throw new Error("This is an error");
  const c = Math.sqrt(a * a + b * b);
  console.log(`c: ${c}`);
}

// foo(10, 20);
