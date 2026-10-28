import assert from "node:assert/strict";
import test from "node:test";
import { buildDfa } from "../js/dfa.js";
import { buildNfa } from "../js/nfa.js";
import { getAlphabet, parseRegex } from "../js/regex-parser.js";

function compile(expression) {
  const tree = parseRegex(expression);
  const alphabet = getAlphabet(tree);
  const nfa = buildNfa(tree);
  const dfa = buildDfa(nfa, alphabet);
  return { alphabet, nfa, dfa };
}

function accepts(dfa, input) {
  const transitions = new Map(dfa.transitions.map((edge) => [`${edge.from}:${edge.symbol}`, edge.to]));
  let state = dfa.start;
  for (const symbol of Array.from(input)) {
    const next = transitions.get(`${state}:${symbol}`);
    if (next === undefined) return false;
    state = next;
  }
  return dfa.states[state].accepting;
}

test("a+b accepts one or more a symbols followed by exactly one b", () => {
  const { dfa } = compile("a+b");
  for (const input of ["ab", "aab", "aaab", "aaaaaaaaab"]) {
    assert.equal(accepts(dfa, input), true, `expected ${input} to be accepted`);
  }
  for (const input of ["", "a", "b", "aabb", "abaa", "abb", "ba"]) {
    assert.equal(accepts(dfa, input), false, `expected ${input} to be rejected`);
  }
});

test("a+b? accepts one or more a symbols, optionally followed by b", () => {
  const { dfa } = compile("a+b?");
  for (const input of ["a", "aa", "ab", "aab", "aaab"]) {
    assert.equal(accepts(dfa, input), true, `expected ${input} to be accepted`);
  }
  for (const input of ["", "b", "ba", "abb", "aaba"]) {
    assert.equal(accepts(dfa, input), false, `expected ${input} to be rejected`);
  }
});

test("supports the required regex examples", () => {
  const examples = [
    ["a(b|c)*", ["a", "ab", "acb"], ["", "b", "ad"]],
    ["(a|b)*abb", ["abb", "aabb", "babb"], ["", "ab", "aba"]],
    ["(0|1)*", ["", "0", "10110"], ["2", "01x"]]
  ];
  for (const [expression, accepted, rejected] of examples) {
    const { dfa } = compile(expression);
    for (const input of accepted) assert.equal(accepts(dfa, input), true, `${expression} should accept ${input}`);
    for (const input of rejected) assert.equal(accepts(dfa, input), false, `${expression} should reject ${input}`);
  }
});

test("rejects empty and malformed expressions", () => {
  for (const expression of ["", " ", "a|", "|a", "()", "(a", "a)", "*a", "a||b"]) {
    assert.throws(() => parseRegex(expression), undefined, `expected ${JSON.stringify(expression)} to be invalid`);
  }
});

test("ignores irrelevant whitespace and preserves alphabet symbols", () => {
  const { alphabet, dfa } = compile(" a b ");
  assert.deepEqual(alphabet, ["a", "b"]);
  assert.equal(accepts(dfa, "ab"), true);
  assert.equal(accepts(dfa, "a b"), false);
});

test("DFA contains one transition for each state and alphabet symbol", () => {
  const { dfa } = compile("a");
  assert.equal(dfa.transitions.length, dfa.states.length * dfa.alphabet.length);
  const deadState = dfa.states.find((state) => state.subset.length === 0);
  assert.ok(deadState, "the reachable empty subset should be retained");
  for (const symbol of dfa.alphabet) {
    const transition = dfa.transitions.find((edge) => edge.from === deadState.id && edge.symbol === symbol);
    assert.equal(transition?.to, deadState.id, "the empty subset must loop to itself");
  }
});
