const OPERATORS = new Set(["|", "*", "+", "?", "(", ")"]);

export function parseRegex(expression) {
  if (typeof expression !== "string" || expression.trim() === "") {
    throw new Error("Enter a regular expression before generating automata.");
  }

  const tokens = Array.from(expression).filter((char) => !/\s/u.test(char));
  if (tokens.length === 0) {
    throw new Error("The expression is empty after whitespace is ignored.");
  }

  let position = 0;
  const peek = () => tokens[position];

  function parseUnion() {
    let node = parseConcatenation();
    while (peek() === "|") {
      position += 1;
      if (peek() === undefined || peek() === ")" || peek() === "|") {
        throw new Error("Union '|' must have an expression on both sides.");
      }
      node = { type: "union", left: node, right: parseConcatenation() };
    }
    return node;
  }

  function parseConcatenation() {
    const parts = [];
    while (peek() !== undefined && peek() !== ")" && peek() !== "|") {
      parts.push(parseRepetition());
    }
    if (parts.length === 0) {
      throw new Error("Expected an expression; empty alternatives and parentheses are not supported.");
    }
    return parts.reduce((left, right) => ({ type: "concat", left, right }));
  }

  function parseRepetition() {
    let node = parseAtom();
    while (peek() === "*" || peek() === "+" || peek() === "?") {
      const operator = peek();
      position += 1;
      node = { type: operator === "*" ? "star" : operator === "+" ? "plus" : "optional", child: node };
    }
    return node;
  }

  function parseAtom() {
    const token = peek();
    if (token === undefined) {
      throw new Error("The expression ends where an operand is required.");
    }
    if (token === "(") {
      position += 1;
      const node = parseUnion();
      if (peek() !== ")") {
        throw new Error("Unmatched '(' — add a closing ')'.");
      }
      position += 1;
      return node;
    }
    if (token === ")") {
      throw new Error("Unmatched ')' — there is no corresponding opening '('.");
    }
    if (token === "|" || token === "*" || token === "+" || token === "?") {
      throw new Error(`Unexpected operator '${token}' — an operand is required here.`);
    }
    if (!OPERATORS.has(token)) {
      position += 1;
      return { type: "symbol", value: token };
    }
    throw new Error(`Unsupported token '${token}'.`);
  }

  const tree = parseUnion();
  if (position < tokens.length) {
    if (peek() === ")") {
      throw new Error("Unmatched ')' — there is no corresponding opening '('.");
    }
    throw new Error(`Unexpected token '${peek()}'.`);
  }
  return tree;
}

export function getAlphabet(tree) {
  const symbols = new Set();
  function visit(node) {
    if (node.type === "symbol") symbols.add(node.value);
    else if (node.type === "concat" || node.type === "union") {
      visit(node.left);
      visit(node.right);
    } else visit(node.child);
  }
  visit(tree);
  return [...symbols].sort((a, b) => a.localeCompare(b));
}
