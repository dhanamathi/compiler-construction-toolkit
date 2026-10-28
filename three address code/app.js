
const expressionInput = document.getElementById("expression");
const output = document.getElementById("output");
const errorBox = document.getElementById("error");

let generatedCode = [];

// Convert the input into tokens
function tokenize(source) {
  const tokens = [];
  const pattern =
    /\s*([A-Za-z_]\w*|\d+(?:\.\d+)?|[()+\-*/=])/y;

  let position = 0;

  while (position < source.length) {
    if (source.slice(position).trim() === "") break;

    pattern.lastIndex = position;
    const match = pattern.exec(source);

    if (!match) {
      throw new Error(
        "Invalid character near: " + source.slice(position)
      );
    }

    tokens.push(match[1]);
    position = pattern.lastIndex;
  }

  if (tokens.length === 0) {
    throw new Error("Please enter an expression.");
  }

  return tokens;
}

// Parse the expression and generate TAC
function generateTAC(source) {
  const tokens = tokenize(source);
  let position = 0;
  let tempCount = 1;
  const code = [];

  function peek() {
    return tokens[position];
  }

  function consume(expected) {
    if (peek() !== expected) {
      throw new Error("Expected '" + expected + "'.");
    }
    position++;
  }

  function newTemp() {
    return "t" + tempCount++;
  }

  // Handles numbers, identifiers, parentheses and unary signs
  function primary() {
    const token = peek();

    if (token === undefined) {
      throw new Error("Unexpected end of expression.");
    }

    if (token === "(") {
      position++;
      const value = expression();
      consume(")");
      return value;
    }

    if (token === "+" || token === "-") {
      position++;
      const value = primary();

      if (token === "+") return value;

      const temp = newTemp();
      code.push(`${temp} = 0 - ${value}`);
      return temp;
    }

    if (/^[A-Za-z_]\w*$/.test(token) ||
        /^\d+(?:\.\d+)?$/.test(token)) {
      position++;
      return token;
    }

    throw new Error("Unexpected token: " + token);
  }

  // Handles multiplication and division first
  function term() {
    let left = primary();

    while (peek() === "*" || peek() === "/") {
      const operator = peek();
      position++;

      const right = primary();
      const temp = newTemp();

      code.push(`${temp} = ${left} ${operator} ${right}`);
      left = temp;
    }

    return left;
  }

  // Handles addition and subtraction
  function expression() {
    let left = term();

    while (peek() === "+" || peek() === "-") {
      const operator = peek();
      position++;

      const right = term();
      const temp = newTemp();

      code.push(`${temp} = ${left} ${operator} ${right}`);
      left = temp;
    }

    return left;
  }

  // Support an optional assignment such as a = b + c
  let target = null;

  if (
    /^[A-Za-z_]\w*$/.test(tokens[0] || "") &&
    tokens[1] === "="
  ) {
    target = tokens[0];
    position = 2;
  }

  const result = expression();

  if (position !== tokens.length) {
    throw new Error("Unexpected token: " + peek());
  }

  if (target !== null) {
    code.push(`${target} = ${result}`);
  }

  return code;
}

// Display the generated code
function displayCode(code) {
  output.innerHTML = "";

  if (code.length === 0) {
    output.innerHTML =
      '<tr><td colspan="2">No instructions generated.</td></tr>';
    return;
  }

  code.forEach((instruction, index) => {
    const row = document.createElement("tr");
    const step = document.createElement("td");
    const statement = document.createElement("td");

    step.textContent = index + 1;
    statement.textContent = instruction;

    row.append(step, statement);
    output.appendChild(row);
  });
}

// Generate button
document.getElementById("generateBtn").addEventListener("click", () => {
  try {
    errorBox.textContent = "";
    generatedCode = generateTAC(expressionInput.value.trim());
    displayCode(generatedCode);
  } catch (error) {
    generatedCode = [];
    displayCode([]);
    errorBox.textContent = error.message;
  }
});

// Try Example button
document.getElementById("exampleBtn").addEventListener("click", () => {
  expressionInput.value = "a = b + c * d";
  document.getElementById("generateBtn").click();
});

// Clear button
document.getElementById("clearBtn").addEventListener("click", () => {
  expressionInput.value = "";
  generatedCode = [];
  errorBox.textContent = "";
  output.innerHTML =
    '<tr><td colspan="2" class="empty">' +
    "Your generated code will appear here." +
    "</td></tr>";
});

// Copy button
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (generatedCode.length === 0) {
    errorBox.textContent = "Generate code before copying.";
    return;
  }

  try {
    await navigator.clipboard.writeText(generatedCode.join("\n"));
    errorBox.textContent = "Code copied successfully!";
    errorBox.style.color = "#15803d";
  } catch {
    errorBox.style.color = "#dc2626";
    errorBox.textContent =
      "Clipboard access failed. Select and copy the output manually.";
  }
});

// Allow Enter to generate the code
expressionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("generateBtn").click();
  }
});
