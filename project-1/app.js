const EXAMPLES = {
  expression: {
    grammar: "E  -> T E'\nE' -> + T E' | ε\nT  -> F T'\nT' -> * F T' | ε\nF  -> ( E ) | id",
    input: 'id + id * id'
  },
  assignment: {
    grammar: "S -> id = E\nE -> T E'\nE' -> + T E' | ε\nT -> id | num | ( E )",
    input: 'id = id + num'
  },
  list: {
    grammar: "S -> [ L ]\nL -> E L'\nL' -> , E L' | ε\nE -> id | num",
    input: '[ id , num , id ]'
  }
};

const grammarInput = document.querySelector('#grammarInput');
const inputString = document.querySelector('#inputString');
const analysisContent = document.querySelector('#analysisContent');
const traceBody = document.querySelector('#traceBody');
const statusStrip = document.querySelector('#statusStrip');
const statusText = document.querySelector('#statusText');
const statusMeta = document.querySelector('#statusMeta');
const statusIcon = document.querySelector('#statusIcon');
const traceResult = document.querySelector('#traceResult');
let activeView = 'sets';
let analysis = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function tokenize(source) {
  return source.match(/'[^']*'|"[^"]*"|[A-Za-z_][A-Za-z_0-9']*|[^\s]/g) || [];
}

function parseGrammar(source) {
  const productions = new Map();
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('//')) continue;
    const match = line.match(/^([^\s:]+)\s*(?:->|→|::=)\s*(.*)$/);
    if (!match) throw new Error(`Line ${index + 1}: expected a production such as A -> α.`);
    const lhs = match[1];
    if (productions.has(lhs)) throw new Error(`Line ${index + 1}: ${lhs} is defined more than once. Keep its alternatives on one line.`);
    const alternatives = match[2].split('|').map(part => {
      const trimmed = part.trim();
      if (!trimmed || /^(ε|epsilon|#)$/i.test(trimmed)) return [];
      const symbols = tokenize(trimmed);
      if (symbols.some(symbol => /^(ε|epsilon|#)$/i.test(symbol))) {
        if (symbols.length !== 1) throw new Error(`Line ${index + 1}: epsilon must be the only symbol in an alternative.`);
        return [];
      }
      return symbols;
    });
    productions.set(lhs, alternatives);
  }
  if (!productions.size) throw new Error('Enter at least one production to analyze.');

  const nonterminals = new Set(productions.keys());
  const first = new Map([...nonterminals].map(symbol => [symbol, new Set()]));
  const follow = new Map([...nonterminals].map(symbol => [symbol, new Set()]));
  follow.get(productions.keys().next().value).add('$');
  let changed = true;
  while (changed) {
    changed = false;
    for (const [lhs, alternatives] of productions) {
      for (const rhs of alternatives) {
        const sequenceFirst = firstOfSequence(rhs, first, nonterminals);
        for (const terminal of sequenceFirst) if (terminal !== 'ε') changed = addTo(first.get(lhs), terminal) || changed;
        if (sequenceFirst.has('ε')) changed = addTo(first.get(lhs), 'ε') || changed;
      }
    }
  }

  changed = true;
  while (changed) {
    changed = false;
    for (const [lhs, alternatives] of productions) {
      for (const rhs of alternatives) {
        for (let index = 0; index < rhs.length; index += 1) {
          const symbol = rhs[index];
          if (!nonterminals.has(symbol)) continue;
          const trailerFirst = firstOfSequence(rhs.slice(index + 1), first, nonterminals);
          for (const terminal of trailerFirst) if (terminal !== 'ε') changed = addTo(follow.get(symbol), terminal) || changed;
          if (!rhs.slice(index + 1).length || trailerFirst.has('ε')) {
            for (const terminal of follow.get(lhs)) changed = addTo(follow.get(symbol), terminal) || changed;
          }
        }
      }
    }
  }

  const terminals = new Set();
  for (const alternatives of productions.values()) {
    for (const rhs of alternatives) for (const symbol of rhs) if (!nonterminals.has(symbol)) terminals.add(symbol);
  }
  const orderedTerminals = [...terminals].sort((a, b) => a.localeCompare(b));
  const table = new Map([...nonterminals].map(symbol => [symbol, new Map()]));
  const conflicts = [];
  for (const [lhs, alternatives] of productions) {
    for (const rhs of alternatives) {
      const rhsFirst = firstOfSequence(rhs, first, nonterminals);
      const lookaheads = new Set([...rhsFirst].filter(value => value !== 'ε'));
      if (rhsFirst.has('ε')) for (const value of follow.get(lhs)) lookaheads.add(value);
      const production = `${lhs} → ${rhs.length ? rhs.join(' ') : 'ε'}`;
      for (const lookahead of lookaheads) {
        const cell = table.get(lhs).get(lookahead) || [];
        if (cell.length) conflicts.push({ nonterminal: lhs, terminal: lookahead, productions: [...cell, production] });
        cell.push(production);
        table.get(lhs).set(lookahead, cell);
      }
    }
  }
  const unknownSymbols = [...terminals].filter(symbol => /^(ε|epsilon|#)$/i.test(symbol));
  if (unknownSymbols.length) throw new Error('Epsilon must be written as a complete alternative.');
  return { productions, nonterminals, terminals: orderedTerminals, first, follow, table, conflicts, start: productions.keys().next().value };
}

function addTo(set, value) {
  const size = set.size;
  set.add(value);
  return set.size !== size;
}

function firstOfSequence(sequence, first, nonterminals) {
  const result = new Set();
  if (!sequence.length) return new Set(['ε']);
  let nullable = true;
  for (const symbol of sequence) {
    if (!nonterminals.has(symbol)) {
      result.add(symbol);
      nullable = false;
      break;
    }
    const symbolFirst = first.get(symbol) || new Set();
    for (const terminal of symbolFirst) if (terminal !== 'ε') result.add(terminal);
    if (!symbolFirst.has('ε')) {
      nullable = false;
      break;
    }
  }
  if (nullable) result.add('ε');
  return result;
}

function sorted(set) {
  return [...set].sort((a, b) => a === '$' ? 1 : b === '$' ? -1 : a.localeCompare(b));
}

function renderSet(set) {
  if (!set.size) return '<span class="set-values">∅</span>';
  return `<span class="set-values">${sorted(set).map(value => `<span class="token ${value === 'ε' ? 'epsilon' : ''}">${escapeHtml(value)}</span>`).join('')}</span>`;
}

function renderAnalysis() {
  if (!analysis) return;
  document.querySelectorAll('.tab').forEach(tab => {
    const selected = tab.dataset.view === activeView;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  document.querySelector('#analysisContent').setAttribute('aria-labelledby', activeView === 'sets' ? 'firstFollowTab' : 'tableTab');
  if (activeView === 'sets') {
    const symbols = [...analysis.nonterminals];
    analysisContent.innerHTML = `<div class="set-grid"><section class="set-column"><h3>FIRST SET</h3>${symbols.map(symbol => `<div class="set-row"><span class="symbol-name">${escapeHtml(symbol)}</span>${renderSet(analysis.first.get(symbol))}</div>`).join('')}</section><section class="set-column"><h3>FOLLOW SET</h3>${symbols.map(symbol => `<div class="set-row"><span class="symbol-name">${escapeHtml(symbol)}</span>${renderSet(analysis.follow.get(symbol))}</div>`).join('')}</section></div>`;
  } else {
    const columns = [...analysis.terminals, '$'];
    analysisContent.innerHTML = `<div class="matrix-wrap"><table class="matrix"><thead><tr><th>NONTERMINAL</th>${columns.map(terminal => `<th>${escapeHtml(terminal)}</th>`).join('')}</tr></thead><tbody>${[...analysis.nonterminals].map(nonterminal => `<tr><td>${escapeHtml(nonterminal)}</td>${columns.map(terminal => {
      const entries = analysis.table.get(nonterminal).get(terminal) || [];
      return `<td class="${entries.length > 1 ? 'conflict-cell' : ''}">${entries.map(escapeHtml).join('<br>') || '<span class="set-values">—</span>'}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
}

function updateGrammar() {
  document.querySelector('#lineCount').textContent = `${grammarInput.value.split(/\r?\n/).filter(line => line.trim()).length} lines`;
  try {
    analysis = parseGrammar(grammarInput.value);
    const hasConflicts = analysis.conflicts.length > 0;
    statusStrip.classList.toggle('error', hasConflicts);
    statusIcon.textContent = hasConflicts ? '!' : '✓';
    statusText.textContent = hasConflicts ? `${analysis.conflicts.length} parsing conflict${analysis.conflicts.length === 1 ? '' : 's'} detected` : 'Grammar is LL(1)';
    statusMeta.textContent = `${analysis.nonterminals.size} NONTERMINALS`;
    renderAnalysis();
    return true;
  } catch (error) {
    analysis = null;
    statusStrip.classList.add('error');
    statusIcon.textContent = '!';
    statusText.textContent = error.message;
    statusMeta.textContent = 'CHECK GRAMMAR';
    analysisContent.innerHTML = '<div class="empty-row" style="padding:54px 10px;text-align:center;color:#9ba29c">Fix the grammar to see its analysis.</div>';
    traceBody.innerHTML = '<tr class="empty-row"><td colspan="4">Parse trace is unavailable until the grammar is valid.</td></tr>';
    traceResult.textContent = 'WAITING';
    traceResult.className = 'trace-result';
    return false;
  }
}

function tokenizeInput(source) {
  const trimmed = source.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/).flatMap(token => tokenize(token));
}

function parseInput() {
  if (!updateGrammar()) return;
  const tokens = tokenizeInput(inputString.value);
  tokens.push('$');
  const stack = ['$' , analysis.start];
  const rows = [];
  let cursor = 0;
  let accepted = false;
  let message = '';
  for (let step = 1; step <= 500; step += 1) {
    const lookahead = tokens[cursor] ?? '$';
    const top = stack[stack.length - 1];
    if (top === '$' && lookahead === '$') {
      rows.push({ step, stack: [...stack].reverse().join(' '), input: tokens.slice(cursor).join(' '), action: 'Accept', kind: 'accept-action' });
      accepted = true;
      break;
    }
    if (!analysis.nonterminals.has(top)) {
      if (top === lookahead) {
        stack.pop();
        cursor += 1;
        rows.push({ step, stack: [...stack].reverse().join(' ') || '—', input: tokens.slice(cursor).join(' ') || '$', action: `Match ${top}` });
        continue;
      }
      message = `Expected ${top}, found ${lookahead}`;
      rows.push({ step, stack: [...stack].reverse().join(' '), input: tokens.slice(cursor).join(' '), action: message, kind: 'error-action' });
      break;
    }
    const entries = analysis.table.get(top).get(lookahead) || [];
    if (entries.length !== 1) {
      message = entries.length ? `Ambiguous table entry for ${top} with ${lookahead}` : `No table entry for ${top} with ${lookahead}`;
      rows.push({ step, stack: [...stack].reverse().join(' '), input: tokens.slice(cursor).join(' '), action: message, kind: 'error-action' });
      break;
    }
    const production = entries[0];
    const rhs = production.slice(production.indexOf('→') + 1).trim();
    stack.pop();
    if (rhs !== 'ε') stack.push(...rhs.split(' ').reverse());
    rows.push({ step, stack: [...stack].reverse().join(' ') || '—', input: tokens.slice(cursor).join(' ') || '$', action: production });
    if (step === 500) message = 'Stopped after 500 steps (possible non-terminating grammar).';
  }
  if (!accepted && !message) message = 'Parsing did not terminate.';
  traceBody.innerHTML = rows.length ? rows.map(row => `<tr><td>${row.step}</td><td>${escapeHtml(row.stack)}</td><td>${escapeHtml(row.input)}</td><td class="${row.kind || ''}">${escapeHtml(row.action)}</td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">No parse steps.</td></tr>';
  traceResult.textContent = accepted ? 'ACCEPTED' : 'REJECTED';
  traceResult.className = `trace-result ${accepted ? 'accepted' : 'rejected'}`;
  if (!accepted) {
    statusStrip.classList.add('error');
    statusIcon.textContent = '!';
    statusText.textContent = message;
    statusMeta.textContent = 'PARSE ERROR';
  } else if (analysis.conflicts.length) {
    statusStrip.classList.add('error');
    statusIcon.textContent = '!';
    statusText.textContent = 'Input accepted; grammar has table conflicts';
    statusMeta.textContent = 'NOT LL(1)';
  } else {
    statusStrip.classList.remove('error');
    statusIcon.textContent = '✓';
    statusText.textContent = 'Input accepted';
    statusMeta.textContent = `${rows.length} STEPS`;
  }
}

function loadExample(name) {
  const example = EXAMPLES[name] || EXAMPLES.expression;
  grammarInput.value = example.grammar;
  inputString.value = example.input;
  traceBody.innerHTML = '<tr class="empty-row"><td colspan="4">Run a parse to see each stack transition.</td></tr>';
  traceResult.textContent = 'WAITING';
  traceResult.className = 'trace-result';
  updateGrammar();
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  activeView = tab.dataset.view;
  renderAnalysis();
}));
document.querySelector('#exampleSelect').addEventListener('change', event => loadExample(event.target.value));
document.querySelector('#parseButton').addEventListener('click', parseInput);
document.querySelector('#resetButton').addEventListener('click', () => {
  document.querySelector('#exampleSelect').value = 'expression';
  activeView = 'sets';
  loadExample('expression');
});
grammarInput.addEventListener('input', updateGrammar);
inputString.addEventListener('keydown', event => { if (event.key === 'Enter') parseInput(); });
grammarInput.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = grammarInput.selectionStart;
    const end = grammarInput.selectionEnd;
    grammarInput.setRangeText('  ', start, end, 'end');
    updateGrammar();
  }
});

loadExample('expression');