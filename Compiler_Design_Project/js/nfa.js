export function buildNfa(tree) {
  const states = [];
  const transitions = [];
  let nextId = 0;

  function state() {
    const id = nextId++;
    states.push(id);
    return id;
  }
  function edge(from, to, symbol = null) {
    transitions.push({ from, to, symbol });
  }

  function build(node) {
    if (node.type === "symbol") {
      const start = state();
      const accept = state();
      edge(start, accept, node.value);
      return { start, accept };
    }
    if (node.type === "concat") {
      const left = build(node.left);
      const right = build(node.right);
      edge(left.accept, right.start);
      return { start: left.start, accept: right.accept };
    }
    if (node.type === "union") {
      const start = state();
      const accept = state();
      const left = build(node.left);
      const right = build(node.right);
      edge(start, left.start);
      edge(start, right.start);
      edge(left.accept, accept);
      edge(right.accept, accept);
      return { start, accept };
    }

    const start = state();
    const accept = state();
    const child = build(node.child);
    if (node.type === "star") {
      edge(start, accept);
      edge(start, child.start);
      edge(child.accept, child.start);
      edge(child.accept, accept);
    } else if (node.type === "plus") {
      edge(start, child.start);
      edge(child.accept, child.start);
      edge(child.accept, accept);
    } else {
      edge(start, accept);
      edge(start, child.start);
      edge(child.accept, accept);
    }
    return { start, accept };
  }

  const fragment = build(tree);
  return { states, transitions, start: fragment.start, accept: fragment.accept };
}
