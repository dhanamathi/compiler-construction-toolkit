export function buildDfa(nfa, alphabet) {
  const epsilonEdges = new Map(nfa.states.map((state) => [state, []]));
  const symbolEdges = new Map(nfa.states.map((state) => [state, new Map()]));
  for (const transition of nfa.transitions) {
    if (transition.symbol === null) epsilonEdges.get(transition.from).push(transition.to);
    else {
      const outgoing = symbolEdges.get(transition.from);
      if (!outgoing.has(transition.symbol)) outgoing.set(transition.symbol, []);
      outgoing.get(transition.symbol).push(transition.to);
    }
  }

  function epsilonClosure(states) {
    const closure = new Set(states);
    const stack = [...states];
    while (stack.length) {
      const current = stack.pop();
      for (const target of epsilonEdges.get(current)) {
        if (!closure.has(target)) {
          closure.add(target);
          stack.push(target);
        }
      }
    }
    return [...closure].sort((a, b) => a - b);
  }

  const keyOf = (states) => states.join(",");
  const initial = epsilonClosure([nfa.start]);
  const states = [];
  const transitions = [];
  const stateByKey = new Map();
  const queue = [];

  function addState(subset) {
    const key = keyOf(subset);
    if (stateByKey.has(key)) return stateByKey.get(key);
    const id = states.length;
    const record = { id, subset, accepting: subset.includes(nfa.accept) };
    states.push(record);
    stateByKey.set(key, id);
    queue.push(record);
    return id;
  }

  const start = addState(initial);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const symbol of alphabet) {
      const moved = new Set();
      for (const nfaState of current.subset) {
        for (const target of symbolEdges.get(nfaState).get(symbol) || []) moved.add(target);
      }
      const movedStates = [...moved].sort((a, b) => a - b);
      const targetSubset = epsilonClosure(moved);
      const targetId = addState(targetSubset);
      transitions.push({ from: current.id, to: targetId, symbol, moved: movedStates, closure: targetSubset });
    }
  }

  return { states, transitions, start, alphabet };
}
