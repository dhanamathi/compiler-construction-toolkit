
/* ==========================================
   SYNTAX GROVE
   Production Rule -> Syntax-Directed Translation
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ------------------------------------------
    // CREATE SDT GENERATOR UI
    // ------------------------------------------

    if (document.querySelector("#sdt-generator")) return;

    const panel = document.createElement("section");
    panel.id = "sdt-generator";

    panel.innerHTML = `
        <h2>Production Rule → SDT Generator</h2>

        <p>
            Enter any production rule to generate
            its syntax-directed translation.
        </p>

        <form id="sdt-generator-form">
            <label for="production-rule">
                Production Rule
            </label>

            <input
                type="text"
                id="production-rule"
                placeholder="E -> E + T"
                autocomplete="off"
                required
            >

            <label for="semantic-action">
                Generated Semantic Action
            </label>

            <input
                type="text"
                id="semantic-action"
                placeholder="Semantic action appears here"
                autocomplete="off"
                readonly
            >

            <button type="submit">
                Generate SDT
            </button>
        </form>

        <div
            id="sdt-output"
            aria-live="polite"
        >
            <p>Your SDT will appear here.</p>
        </div>
    `;

    const host =
        document.querySelector("#translation") ||
        document.querySelector("main") ||
        document.querySelector(".container") ||
        document.body;

    host.appendChild(panel);

    const form = panel.querySelector("#sdt-generator-form");
    const ruleInput = panel.querySelector("#production-rule");
    const actionInput = panel.querySelector("#semantic-action");
    const output = panel.querySelector("#sdt-output");

    // ------------------------------------------
    // PARSE PRODUCTION RULE
    // Supports: ->, →, ⟶, ⟹, and ::
    // ------------------------------------------

    function parseProductionRule(rule) {
        const normalized = rule
            .trim()
            .replace(/→|⟶|⟹/g, "->")
            .replace(/::=/g, "->")
            .replace(/:=/g, "->");

        const parts = normalized.split("->");

        if (parts.length !== 2) {
            throw new Error(
                "Invalid rule. Example: E -> E + T"
            );
        }

        const lhs = parts[0].trim();
        const rhs = parts[1].trim();

        if (!lhs || !rhs) {
            throw new Error(
                "Both head and body are required."
            );
        }

        if (!/^[A-Za-z_][A-Za-z0-9_']*$/.test(lhs)) {
            throw new Error(
                "Head must be one variable, such as E, T, or Expr."
            );
        }

        return {
            lhs: lhs,
            rhs: rhs
        };
    }

    // ------------------------------------------
    // GENERATE SEMANTIC ACTION
    //
    // Head: LHS.val
    // Body id: id.lexval
    // Other body variables: variable.val
    // ------------------------------------------

    function generateSemanticAction(lhs, rhs) {
        const body = rhs.trim();

        // Case 1: body contains only id
        if (body === "id") {
            return `${lhs}.val = id.lexval`;
        }

        // Case 2: body contains only num
        if (body === "num") {
            return `${lhs}.val = num.lexval`;
        }

        // Match identifiers in the body.
        const tokenPattern =
            /[A-Za-z_][A-Za-z0-9_']*/g;

        const matches = [...body.matchAll(tokenPattern)];

        if (matches.length === 0) {
            return `${lhs}.val = ${body}`;
        }

        // Count repeated occurrences of each symbol.
        const counts = Object.create(null);

        let expression = "";
        let lastIndex = 0;

        for (const match of matches) {
            const symbol = match[0];
            const start = match.index;

            // Preserve operators, spaces and parentheses.
            expression += body.slice(lastIndex, start);

            if (symbol === "id") {
                expression += "id.lexval";
            } else if (symbol === "num") {
                expression += "num.lexval";
            } else {
                counts[symbol] = (counts[symbol] || 0) + 1;

                expression +=
                    `${symbol}${counts[symbol]}.val`;
            }

            lastIndex = start + symbol.length;
        }

        expression += body.slice(lastIndex);

        return `${lhs}.val = ${expression}`;
    }

    // ------------------------------------------
    // DISPLAY SDT OUTPUT
    // ------------------------------------------

    function renderSDT(lhs, rhs, action) {
        output.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Generated SDT";

        const production = document.createElement("pre");
        production.textContent = `${lhs} → ${rhs}`;

        const semanticAction = document.createElement("pre");
        semanticAction.textContent = `{ ${action} }`;

        const note = document.createElement("p");
        note.textContent =
            "Head uses .val; body id uses .lexval; other body symbols use .val.";

        output.append(
            heading,
            production,
            semanticAction,
            note
        );
    }

    // ------------------------------------------
    // HANDLE USER INPUT
    // ------------------------------------------

    function updateSemanticAction() {
        try {
            const { lhs, rhs } =
                parseProductionRule(ruleInput.value);

            actionInput.value =
                generateSemanticAction(lhs, rhs);

            output.replaceChildren();
            const message = document.createElement("p");
            message.textContent =
                "Rule recognized. Click Generate SDT to display the result.";
            output.appendChild(message);
        } catch {
            actionInput.value = "";
        }
    }

    ruleInput.addEventListener(
        "input",
        updateSemanticAction
    );

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        try {
            const { lhs, rhs } =
                parseProductionRule(ruleInput.value);

            const action =
                generateSemanticAction(lhs, rhs);

            actionInput.value = action;

            renderSDT(lhs, rhs, action);
        } catch (error) {
            output.replaceChildren();

            const errorMessage =
                document.createElement("p");

            errorMessage.textContent = error.message;
            errorMessage.className = "sdt-error";

            output.appendChild(errorMessage);
        }
    });

    // ------------------------------------------
    // LOAD EXAMPLE
    // ------------------------------------------

    const exampleButton = document.createElement("button");
    exampleButton.type = "button";
    exampleButton.textContent = "Try Example: E → E + T";

    exampleButton.addEventListener("click", () => {
        ruleInput.value = "E -> E + T";
        updateSemanticAction();
        form.requestSubmit();
    });

    form.appendChild(exampleButton);
});
