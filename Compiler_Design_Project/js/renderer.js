const SVG_NS = "http://www.w3.org/2000/svg";
const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&apos;");

export function renderDiagram(container, automaton, { kind, start, accepting }) {
  const states = automaton.states;
  const centerY = 185;
  const spacing = 175;
  const width = Math.max(600, states.length * spacing + 90);
  const positions = new Map();
  states.forEach((state, index) => {
    positions.set(state.id ?? state, { x: 105 + index * spacing, y: centerY, index });
  });

  const groups = new Map();
  for (const transition of automaton.transitions) {
    const key = `${transition.from}:${transition.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transition);
  }
  const edges = [...groups.values()].map((transitions) => {
    const labels = [...new Set(transitions.map((transition) => transition.symbol === null ? "ε" : transition.symbol))];
    return { from: transitions[0].from, to: transitions[0].to, labels };
  });

  const occupiedLanes = { top: [], bottom: [] };
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const fromIndex = positions.get(edge.from).index;
    const toIndex = positions.get(edge.to).index;
    edge.direction = fromIndex < toIndex ? "top" : "bottom";
    edge.left = Math.min(fromIndex, toIndex);
    edge.right = Math.max(fromIndex, toIndex);
    const lanes = occupiedLanes[edge.direction];
    edge.lane = 0;
    while (lanes[edge.lane]?.some(([left, right]) => edge.left < right && left < edge.right)) {
      edge.lane += 1;
    }
    if (!lanes[edge.lane]) lanes[edge.lane] = [];
    lanes[edge.lane].push([edge.left, edge.right]);
  }

  const tallestLane = Math.max(0, ...occupiedLanes.top.map((_, lane) => lane), ...occupiedLanes.bottom.map((_, lane) => lane));
  const height = Math.max(350, 330 + tallestLane * 38);
  const markerId = `${kind}-arrowhead`;
  const edgeMarkup = edges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    let path;
    let labelX;
    let labelY;
    if (edge.from === edge.to) {
      const loopTop = 35;
      path = `M ${from.x - 17} ${centerY - 18} C ${from.x - 67} ${loopTop}, ${from.x + 67} ${loopTop}, ${from.x + 17} ${centerY - 18}`;
      labelX = from.x;
      labelY = 80;
    } else {
      const direction = edge.direction === "top" ? 1 : -1;
      const startX = from.x + direction * 27;
      const endX = to.x - direction * 29;
      const controlX = (from.x + to.x) / 2;
      const adjacentForward = edge.direction === "top" && edge.right - edge.left === 1;
      const controlY = edge.direction === "top"
        ? 101 - edge.lane * 38
        : centerY * 2 - 101 + edge.lane * 38;
      path = adjacentForward
        ? `M ${startX} ${centerY} L ${endX} ${centerY}`
        : `M ${startX} ${centerY} Q ${controlX} ${controlY} ${endX} ${centerY}`;
      labelX = controlX;
      labelY = adjacentForward
        ? centerY - 13
        : (centerY + controlY) / 2 - (edge.direction === "top" ? 9 : -17);
    }
    const label = edge.labels.join(", ");
    return `<path class="edge" d="${path}" marker-end="url(#${markerId})"><title>${escapeXml(label)}</title></path>
      <text class="edge-label" x="${labelX}" y="${labelY}">${escapeXml(label)}</text>`;
  }).join("");

  const stateMarkup = states.map((state) => {
    const id = state.id ?? state;
    const point = positions.get(id);
    const isAccepting = accepting.has(id);
    const extraTitle = state.subset ? `NFA subset: {${state.subset.join(", ")}}` : `State q${id}`;
    return `<g><title>${escapeXml(extraTitle)}</title>
      <circle class="state-circle${isAccepting ? " state-final" : ""}" cx="${point.x}" cy="${point.y}" r="25"/>
      ${isAccepting ? `<circle class="state-circle state-final" cx="${point.x}" cy="${point.y}" r="20"/>` : ""}
      <text class="state-label" x="${point.x}" y="${point.y}">q${id}</text></g>`;
  }).join("");
  const initial = positions.get(start);

  container.innerHTML = `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${kind.toUpperCase()} state diagram">
    <defs><marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8498c6"/></marker></defs>
    ${edgeMarkup}
    <path class="edge" d="M ${initial.x - 65} ${initial.y} L ${initial.x - 30} ${initial.y}" marker-end="url(#${markerId})"/>
    <text class="start-label" x="${initial.x - 72}" y="${initial.y}">start</text>
    ${stateMarkup}
  </svg>`;
  const svg = container.querySelector("svg");
  svg.style.width = `${width}px`;
  svg.style.maxWidth = "none";
}

function createTable(headers, rows) {
  const table = document.createElement("table");
  table.className = "table table-sm automata-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = header;
    headRow.append(cell);
  }
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const item of row) {
      const td = document.createElement("td");
      td.textContent = item;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

export function renderNfaTable(container, nfa, alphabet) {
  const columns = [...alphabet, "ε"];
  const bySourceAndSymbol = new Map();
  for (const transition of nfa.transitions) {
    const symbol = transition.symbol === null ? "ε" : transition.symbol;
    const key = `${transition.from}:${symbol}`;
    if (!bySourceAndSymbol.has(key)) bySourceAndSymbol.set(key, []);
    bySourceAndSymbol.get(key).push(`q${transition.to}`);
  }
  const rows = nfa.states.map((state) => [
    `${state === nfa.start ? "→ " : ""}${state === nfa.accept ? "★ " : ""}q${state}`,
    ...columns.map((symbol) => (bySourceAndSymbol.get(`${state}:${symbol}`) || []).join(", ") || "—")
  ]);
  container.replaceChildren(createTable(["State", ...columns], rows));
}

export function renderDfaTable(container, dfa) {
  const transitionByKey = new Map(dfa.transitions.map((transition) => [`${transition.from}:${transition.symbol}`, transition.to]));
  const headers = ["State", "NFA subset", ...dfa.alphabet];
  const rows = dfa.states.map((state) => [
    `${state.id === dfa.start ? "→ " : ""}${state.accepting ? "★ " : ""}q${state.id}`,
    state.subset.length ? `{${state.subset.map((id) => `q${id}`).join(", ")}}` : "∅",
    ...dfa.alphabet.map((symbol) => `q${transitionByKey.get(`${state.id}:${symbol}`)}`)
  ]);
  container.replaceChildren(createTable(headers, rows));
}

export function createSolution({ expression, alphabet, nfa, dfa, questionText = "" }) {
  const nfaTransitions = nfa.transitions.map((edge) =>
    `  q${edge.from} --${edge.symbol === null ? "ε" : edge.symbol}--> q${edge.to}`).join("\n");
  const dfaTransitions = dfa.transitions.map((edge) =>
    `  q${edge.from} --${edge.symbol}--> q${edge.to}`).join("\n");
  const subsetLines = dfa.states.map((state) =>
    `  q${state.id} = ${state.subset.length ? `{${state.subset.map((id) => `q${id}`).join(", ")}}` : "∅"}${state.id === dfa.start ? " (start)" : ""}${state.accepting ? " (accepting)" : ""}`).join("\n");
  const closureLines = dfa.states.map((state) =>
    `  ε-closure(${state.subset.length ? `{${state.subset.map((id) => `q${id}`).join(", ")}}` : "∅"}) = ${state.subset.length ? `{${state.subset.map((id) => `q${id}`).join(", ")}}` : "∅"}`).join("\n");
  const formatSet = (states) => states.length ? `{${states.map((id) => `q${id}`).join(", ")}}` : "∅";
  const subsetCalculations = dfa.transitions.map((edge) =>
    `  δ(q${edge.from}, ${edge.symbol}): move(${formatSet(dfa.states[edge.from].subset)}, ${edge.symbol}) = ${formatSet(edge.moved)}; ε-closure(${formatSet(edge.moved)}) = ${formatSet(edge.closure)} = q${edge.to}`).join("\n");
  const finalStates = dfa.states.filter((state) => state.accepting).map((state) => `q${state.id}`).join(", ") || "none";
  const nfaFinals = `q${nfa.accept}`;

  return [
    "REGULAR EXPRESSION TO NFA AND DFA",
    "=================================",
    `1. Detected regular expression: ${expression}`,
    `2. Alphabet: {${alphabet.join(", ")}}`,
    ...(questionText ? [`Image question text (OCR; verify against the original):\n${questionText}`] : []),
    "",
    "3. NFA construction — Thompson's construction",
    "A symbol creates a two-state fragment. Concatenation links fragments with ε; union branches from a new start and rejoins at a new accept state. Kleene star adds an empty-string path and a loop; positive closure adds the loop without the empty-string path; optional adds an empty-string path. The result has one start and one accepting state.",
    `Start state: q${nfa.start}`,
    `Accepting state: ${nfaFinals}`,
    "",
    "4. NFA states and transitions",
    `States: ${nfa.states.map((state) => `q${state}`).join(", ")}`,
    nfaTransitions,
    "",
    "5. NFA diagram",
    "See the generated NFA diagram in the NFA diagram tab. A single circle is a state; a double circle is accepting; arrows are symbol or ε transitions.",
    "",
    "6. DFA conversion — epsilon-closure and subset construction",
    `Start subset: ε-closure({q${nfa.start}}) = {${dfa.states[dfa.start].subset.map((id) => `q${id}`).join(", ")}}`,
    "For every reachable subset S and alphabet symbol a, compute ε-closure(move(S, a)). Each distinct resulting subset becomes exactly one DFA state. The empty subset, when reached, is retained and loops to itself for every alphabet symbol.",
    "",
    "Epsilon-closures of the reachable DFA subsets:",
    closureLines,
    "",
    "7. DFA state subsets",
    subsetLines,
    "",
    "8. DFA transition table",
    "For every state and alphabet symbol, the subset transition is move followed by epsilon-closure:",
    subsetCalculations,
    "",
    "Transition destinations:",
    dfaTransitions,
    "",
    "9. DFA diagram",
    "See the generated DFA diagram in the DFA diagram tab. The DFA state labels correspond to the NFA subsets listed above.",
    "",
    "10. Final states and result",
    `DFA accepting states: ${finalStates}`,
    "A DFA state is accepting exactly when its NFA subset contains the NFA accepting state.",
    `The constructed DFA recognizes the language of ${expression}.`
  ].join("\n");
}
