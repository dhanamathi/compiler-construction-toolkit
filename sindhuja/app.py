from flask import Flask, render_template, request, jsonify
from collections import defaultdict
import re

app = Flask(__name__)


# =========================================================
# GRAMMAR PARSER
# =========================================================

def parse_grammar(text):

    grammar = []

    for line in text.strip().splitlines():

        line = line.strip()

        if not line or "->" not in line:
            continue

        lhs, rhs = line.split("->", 1)
        lhs = lhs.strip()

        for alt in rhs.split("|"):

            alt = alt.strip()

            if alt == "" or alt.lower() in ("epsilon", "eps", "ε"):
                symbols = []

            else:

                # If spaces are present
                if " " in alt:
                    symbols = alt.split()

                else:
                    # Handle expressions like E+T, id+id
                    symbols = tokenize_string(alt)

            grammar.append((lhs, tuple(symbols)))

    return grammar


# =========================================================
# TOKENIZER
# =========================================================

def tokenize_string(text):

    tokens = []

    i = 0

    while i < len(text):

        # Ignore spaces
        if text[i].isspace():
            i += 1
            continue

        # id
        if text.startswith("id", i):
            tokens.append("id")
            i += 2
            continue

        # multi-character identifiers
        match = re.match(r"[A-Za-z_][A-Za-z0-9_]*", text[i:])

        if match:
            tokens.append(match.group())
            i += len(match.group())
            continue

        # Single character terminals
        tokens.append(text[i])
        i += 1

    return tokens


def tokenize_expression(expression, terminals):

    expression = expression.strip()

    if not expression:
        return []

    # First check exact whitespace tokens
    if " " in expression.strip():

        parts = expression.split()

        # If all tokens are valid terminals
        if all(token in terminals for token in parts):
            return parts

    # Longest terminal first
    sorted_terminals = sorted(
        [t for t in terminals if t != "$"],
        key=len,
        reverse=True
    )

    tokens = []

    i = 0

    while i < len(expression):

        if expression[i].isspace():
            i += 1
            continue

        found = False

        for terminal in sorted_terminals:

            if expression.startswith(terminal, i):

                tokens.append(terminal)

                i += len(terminal)

                found = True

                break

        if not found:

            # identifier such as id
            match = re.match(
                r"[A-Za-z_][A-Za-z0-9_]*",
                expression[i:]
            )

            if match:

                token = match.group()

                tokens.append(token)

                i += len(token)

            else:

                # Single character
                tokens.append(expression[i])
                i += 1

    return tokens


# =========================================================
# SYMBOLS
# =========================================================

def get_symbols(grammar):

    nonterminals = {
        lhs for lhs, _ in grammar
    }

    terminals = set()

    for _, rhs in grammar:

        for symbol in rhs:

            if symbol not in nonterminals:
                terminals.add(symbol)

    return nonterminals, terminals


# =========================================================
# FIRST
# =========================================================

def compute_first(grammar, nonterminals, terminals):

    first = {
        x: set()
        for x in nonterminals
    }

    for terminal in terminals:
        first[terminal] = {terminal}

    changed = True

    while changed:

        changed = False

        for lhs, rhs in grammar:

            # epsilon production
            if not rhs:

                if "ε" not in first[lhs]:

                    first[lhs].add("ε")
                    changed = True

                continue

            nullable = True

            for symbol in rhs:

                before = len(first[lhs])

                first[lhs].update(
                    first.get(symbol, {symbol}) - {"ε"}
                )

                if len(first[lhs]) > before:
                    changed = True

                if "ε" not in first.get(symbol, {symbol}):

                    nullable = False
                    break

            if nullable and "ε" not in first[lhs]:

                first[lhs].add("ε")
                changed = True

    return first


# =========================================================
# FOLLOW
# =========================================================

def compute_follow(
    grammar,
    nonterminals,
    terminals,
    start
):

    first = compute_first(
        grammar,
        nonterminals,
        terminals
    )

    follow = {
        x: set()
        for x in nonterminals
    }

    follow[start].add("$")

    changed = True

    while changed:

        changed = False

        for lhs, rhs in grammar:

            for i, symbol in enumerate(rhs):

                if symbol not in nonterminals:
                    continue

                beta = rhs[i + 1:]

                if beta:

                    nullable = True

                    for b in beta:

                        before = len(follow[symbol])

                        follow[symbol].update(
                            first.get(b, {b}) - {"ε"}
                        )

                        if len(follow[symbol]) > before:
                            changed = True

                        if "ε" not in first.get(b, {b}):

                            nullable = False
                            break

                    if nullable:

                        before = len(follow[symbol])

                        follow[symbol].update(
                            follow[lhs]
                        )

                        if len(follow[symbol]) > before:
                            changed = True

                else:

                    before = len(follow[symbol])

                    follow[symbol].update(
                        follow[lhs]
                    )

                    if len(follow[symbol]) > before:
                        changed = True

    return follow


# =========================================================
# LR(0) CLOSURE
# =========================================================

def closure(items, productions_by_lhs, productions):

    items = set(items)

    changed = True

    while changed:

        changed = False

        for prod_index, dot in list(items):

            lhs, rhs = productions[prod_index]

            if dot < len(rhs):

                symbol = rhs[dot]

                if symbol in productions_by_lhs:

                    for index in productions_by_lhs[symbol]:

                        item = (index, 0)

                        if item not in items:

                            items.add(item)
                            changed = True

    return frozenset(items)


# =========================================================
# GOTO
# =========================================================

def goto(
    items,
    symbol,
    productions,
    productions_by_lhs
):

    moved = set()

    for prod_index, dot in items:

        lhs, rhs = productions[prod_index]

        if dot < len(rhs):

            if rhs[dot] == symbol:

                moved.add(
                    (prod_index, dot + 1)
                )

    if not moved:
        return frozenset()

    return closure(
        moved,
        productions_by_lhs,
        productions
    )


# =========================================================
# BUILD LR(0) STATES
# =========================================================

def build_lr0_states(grammar, start):

    augmented = [
        ("S'", (start,))
    ] + grammar

    by_lhs = defaultdict(list)

    for index, (lhs, rhs) in enumerate(augmented):

        by_lhs[lhs].append(index)

    symbols = set()

    for _, rhs in augmented:
        symbols.update(rhs)

    start_items = closure(
        {(0, 0)},
        by_lhs,
        augmented
    )

    states = [start_items]

    state_map = {
        start_items: 0
    }

    transitions = {}

    changed = True

    while changed:

        changed = False

        for state_id, state in list(
            enumerate(states)
        ):

            for symbol in symbols:

                target = goto(
                    state,
                    symbol,
                    augmented,
                    by_lhs
                )

                if not target:
                    continue

                if target not in state_map:

                    new_id = len(states)

                    state_map[target] = new_id

                    states.append(target)

                    changed = True

                transitions[
                    (state_id, symbol)
                ] = state_map[target]

    return (
        augmented,
        states,
        transitions,
        by_lhs
    )


# =========================================================
# ITEM DISPLAY
# =========================================================

def item_to_string(item, productions):

    prod_index, dot = item

    lhs, rhs = productions[prod_index]

    parts = list(rhs)

    parts.insert(dot, "•")

    right = " ".join(parts)

    return f"{lhs} → {right}"


# =========================================================
# SLR TABLE
# =========================================================

def build_slr_table(grammar, start):

    (
        productions,
        states,
        transitions,
        by_lhs
    ) = build_lr0_states(
        grammar,
        start
    )

    nonterminals, terminals = get_symbols(
        grammar
    )

    terminals = set(terminals)

    terminals.add("$")

    follow = compute_follow(
        grammar,
        nonterminals,
        terminals,
        start
    )

    action = {}

    goto_table = {}

    conflicts = []

    # -----------------------------------------------------
    # ACTION
    # -----------------------------------------------------

    for state_id, state in enumerate(states):

        for prod_index, dot in state:

            lhs, rhs = productions[prod_index]

            # SHIFT
            if dot < len(rhs):

                symbol = rhs[dot]

                if symbol in terminals:

                    target = transitions.get(
                        (state_id, symbol)
                    )

                    if target is not None:

                        key = (
                            state_id,
                            symbol
                        )

                        value = f"s{target}"

                        if (
                            key in action
                            and action[key] != value
                        ):

                            conflicts.append(
                                f"Conflict at state "
                                f"{state_id}, symbol "
                                f"{symbol}"
                            )

                        else:

                            action[key] = value

            # REDUCE / ACCEPT
            else:

                if lhs == "S'":

                    action[
                        (state_id, "$")
                    ] = "acc"

                else:

                    rule_number = prod_index

                    for symbol in follow[lhs]:

                        key = (
                            state_id,
                            symbol
                        )

                        value = f"r{rule_number}"

                        if (
                            key in action
                            and action[key] != value
                        ):

                            conflicts.append(
                                f"Conflict at state "
                                f"{state_id}, symbol "
                                f"{symbol}"
                            )

                        else:

                            action[key] = value

        # -------------------------------------------------
        # GOTO
        # -------------------------------------------------

        for symbol in nonterminals:

            target = transitions.get(
                (state_id, symbol)
            )

            if target is not None:

                goto_table[
                    (state_id, symbol)
                ] = target

    return (
        productions,
        states,
        action,
        goto_table,
        follow,
        conflicts
    )


# =========================================================
# PARSE INPUT
# =========================================================

def parse_input(
    expression,
    productions,
    action,
    goto_table,
    terminals
):

    try:

        tokens = tokenize_expression(
            expression,
            terminals
        )

        tokens.append("$")

        stack = [0]

        index = 0

        steps = []

        max_steps = 1000

        for _ in range(max_steps):

            if index >= len(tokens):
                return steps, False

            state = stack[-1]

            token = tokens[index]

            act = action.get(
                (state, token)
            )

            steps.append({
                "stack": " ".join(
                    map(str, stack)
                ),
                "input": " ".join(
                    tokens[index:]
                ),
                "action": (
                    act
                    if act
                    else "ERROR"
                )
            })

            # ---------------------------------------------
            # ERROR
            # ---------------------------------------------

            if act is None:

                return steps, False

            # ---------------------------------------------
            # ACCEPT
            # ---------------------------------------------

            if act == "acc":

                return steps, True

            # ---------------------------------------------
            # SHIFT
            # ---------------------------------------------

            if act.startswith("s"):

                next_state = int(
                    act[1:]
                )

                stack.append(token)

                stack.append(next_state)

                index += 1

            # ---------------------------------------------
            # REDUCE
            # ---------------------------------------------

            elif act.startswith("r"):

                rule_number = int(
                    act[1:]
                )

                lhs, rhs = productions[
                    rule_number
                ]

                # Pop 2 * RHS symbols
                for _ in range(
                    2 * len(rhs)
                ):

                    if len(stack) <= 1:
                        return steps, False

                    stack.pop()

                state = stack[-1]

                next_state = goto_table.get(
                    (state, lhs)
                )

                if next_state is None:

                    return steps, False

                stack.append(lhs)

                stack.append(next_state)

            else:

                return steps, False

        return steps, False

    except Exception:

        return steps, False


# =========================================================
# ROUTE
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


@app.route(
    "/parse",
    methods=["POST"]
)
def parse():

    try:

        data = request.get_json()

        grammar_text = data.get(
            "grammar",
            ""
        )

        expression = data.get(
            "expression",
            ""
        )

        # ---------------------------------------------
        # Grammar
        # ---------------------------------------------

        grammar = parse_grammar(
            grammar_text
        )

        if not grammar:

            raise ValueError(
                "Invalid grammar."
            )

        start = grammar[0][0]

        # ---------------------------------------------
        # SLR
        # ---------------------------------------------

        (
            productions,
            states,
            action,
            goto_table,
            follow,
            conflicts
        ) = build_slr_table(
            grammar,
            start
        )

        # ---------------------------------------------
        # LR(0) ITEMS
        # ---------------------------------------------

        items_output = []

        for i, state in enumerate(states):

            state_items = []

            for item in sorted(state):

                state_items.append(
                    item_to_string(
                        item,
                        productions
                    )
                )

            items_output.append({
                "state": i,
                "items": state_items
            })

        # ---------------------------------------------
        # TABLE
        # ---------------------------------------------

        nonterminals, terminals = get_symbols(
            grammar
        )

        terminals = sorted(
            terminals
        )

        if "$" not in terminals:
            terminals.append("$")

        nonterminals = sorted(
            nonterminals
        )

        table = []

        for state in range(
            len(states)
        ):

            row = {
                "state": state,
                "action": {},
                "goto": {}
            }

            for terminal in terminals:

                row["action"][
                    terminal
                ] = action.get(
                    (state, terminal),
                    ""
                )

            for nt in nonterminals:

                row["goto"][
                    nt
                ] = goto_table.get(
                    (state, nt),
                    ""
                )

            table.append(row)

        # ---------------------------------------------
        # PARSE
        # ---------------------------------------------

        steps, accepted = parse_input(
            expression,
            productions,
            action,
            goto_table,
            set(terminals)
        )

        # ---------------------------------------------
        # FINAL RESULT
        # ---------------------------------------------

        result = (
            "ACCEPT"
            if accepted
            else "REJECT"
        )

        return jsonify({

            "success": True,

            "items": items_output,

            "table": table,

            "terminals": terminals,

            "nonterminals": nonterminals,

            "follow": {
                key: sorted(value)
                for key, value in follow.items()
            },

            "steps": steps,

            "accepted": accepted,

            "result": result,

            "conflicts": conflicts,

            "tokens": tokenize_expression(
                expression,
                set(terminals)
            )
        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e),

            "result": "REJECT"

        }), 400


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )
