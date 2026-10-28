function parseGrammar(grammarText) {
  const productions = [];

  for (const rawLine of grammarText.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const arrowIndex = line.indexOf("->");
    if (arrowIndex === -1) {
      throw new Error("Use grammar format like E -> E + T");
    }

    const lhs = line.slice(0, arrowIndex).trim();
    if (!lhs) throw new Error("Production needs a left-hand symbol.");

    const alternatives = line.slice(arrowIndex + 2).split("|");
    for (const alternative of alternatives) {
      const rhsText = alternative.trim();
      if (!rhsText) throw new Error("Empty productions are not supported.");
      productions.push({ lhs, rhs: rhsText.split(/\s+/) });
    }
  }

  if (!productions.length) {
    throw new Error("Enter at least one grammar production.");
  }
  return productions;
}

function shiftReduceParse(grammarText, inputText, startSymbolText) {
  const productions = parseGrammar(grammarText);
  const startSymbol = startSymbolText.trim();
  const tokens = inputText.trim() ? inputText.trim().split(/\s+/) : [];

  if (!startSymbol) throw new Error("Enter a start symbol.");
  if (!tokens.length) throw new Error("Enter an input string.");

  const stack = [];
  const steps = [];
  let position = 0;
  const orderedProductions = productions
    .map((production, index) => ({ ...production, index }))
    .sort((left, right) => right.rhs.length - left.rhs.length || left.index - right.index);

  function record(action) {
    steps.push({
      step: steps.length,
      stack: stack.length ? stack.join(" ") : "Empty",
      input: position < tokens.length ? tokens.slice(position).join(" ") : "Empty",
      action
    });
  }

  record("Initial");
  while (steps.length < 500) {
    if (position === tokens.length && stack.length === 1 && stack[0] === startSymbol) {
      record("Accept");
      return { accepted: true, steps };
    }

    let reduced = false;
    for (const production of orderedProductions) {
      const { lhs, rhs } = production;
      const stackSuffix = stack.slice(-rhs.length);
      if (stackSuffix.length === rhs.length && stackSuffix.every((symbol, index) => symbol === rhs[index])) {
        stack.splice(stack.length - rhs.length, rhs.length, lhs);
        record(`Reduce by ${lhs} -> ${rhs.join(" ")}`);
        reduced = true;
        break;
      }
    }
    if (reduced) continue;

    if (position < tokens.length) {
      const token = tokens[position];
      stack.push(token);
      position += 1;
      record(`Shift ${token}`);
      continue;
    }

    record("Error: No valid shift or reduction");
    return { accepted: false, steps };
  }

  record("Error: Maximum step limit reached");
  return { accepted: false, steps };
}

function runParser() {
  const grammar = document.getElementById("grammar").value;
  const inputString = document.getElementById("inputString").value;
  const startSymbol = document.getElementById("startSymbol").value;
  const body = document.getElementById("resultBody");
  const message = document.getElementById("message");
  const finalResult = document.getElementById("finalResult");
  const button = document.getElementById("runButton");

  body.replaceChildren();
  message.textContent = "";
  finalResult.textContent = "";
  button.disabled = true;
  button.textContent = "Simulating...";

  try {
    const data = shiftReduceParse(grammar, inputString, startSymbol);

    data.steps.forEach(step => {
      const row = document.createElement("tr");
      [step.step, step.stack, step.input, step.action].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    finalResult.textContent = data.accepted
      ? "ACCEPTED: Input string is valid."
      : "REJECTED: Input string is invalid.";
    finalResult.style.color = data.accepted ? "#166534" : "#b91c1c";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Simulate Parser";
  }
}
