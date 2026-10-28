
/* ==========================================
   SYNTAX GROVE - COMPLETE APP.JS
   Correct AST Structure + SVG Connectors
========================================== */

"use strict";

const $ = (selector, root = document) => root.querySelector(selector);

/* ==========================================
   ERROR HANDLING
========================================== */

function showError(message) {
    const toast = $("#toast");
    const toastMessage = $("#toast-message");

    if (!toast) {
        console.error(message);
        return;
    }

    if (toastMessage) toastMessage.textContent = message;

    toast.classList.remove("hide");
    toast.classList.add("show");
}

function hideError() {
    const toast = $("#toast");
    if (toast) {
        toast.classList.remove("show");
        toast.classList.add("hide");
    }
}

/* ==========================================
   TOKENIZER
========================================== */

function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        const remaining = input.slice(i);
        const char = input[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        const number = remaining.match(
            /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
        );

        if (number) {
            tokens.push({
                type: "number",
                value: Number(number[0])
            });
            i += number[0].length;
            continue;
        }

        const identifier = remaining.match(
            /^[a-zA-Z_][a-zA-Z0-9_]*/
        );

        if (identifier) {
            tokens.push({
                type: "identifier",
                value: identifier[0]
            });
            i += identifier[0].length;
            continue;
        }

        const operator = remaining.match(
            /^(?:\*\*|[+\-*/%()])/
        );

        if (operator) {
            tokens.push({
                type: "operator",
                value: operator[0]
            });
            i += operator[0].length;
            continue;
        }

        throw new Error(
            `Invalid character "${char}" at position ${i + 1}.`
        );
    }

    tokens.push({ type: "EOF", value: "" });
    return tokens;
}

/* ==========================================
   PARSER
   Precedence:
   Parentheses > ** > unary > * / % > + -
========================================== */

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }

    current() {
        return this.tokens[this.position];
    }

    consume() {
        return this.tokens[this.position++];
    }

    match(value) {
        if (this.current().value === value) {
            this.consume();
            return true;
        }

        return false;
    }

    parse() {
        if (this.current().type === "EOF") {
            throw new Error("Enter an expression first.");
        }

        const ast = this.parseAdditive();

        if (this.current().type !== "EOF") {
            throw new Error(
                `Unexpected token "${this.current().value}".`
            );
        }

        return ast;
    }

    parseAdditive() {
        let node = this.parseMultiplicative();

        while (["+", "-"].includes(this.current().value)) {
            const operator = this.consume().value;
            const right = this.parseMultiplicative();

            node = {
                type: "BinaryExpression",
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseMultiplicative() {
        let node = this.parseUnary();

        while (["*", "/", "%"].includes(this.current().value)) {
            const operator = this.consume().value;
            const right = this.parseUnary();

            node = {
                type: "BinaryExpression",
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseUnary() {
        if (["+", "-"].includes(this.current().value)) {
            const operator = this.consume().value;

            return {
                type: "UnaryExpression",
                operator,
                argument: this.parseUnary()
            };
        }

        return this.parsePower();
    }

    parsePower() {
        const left = this.parsePrimary();

        if (this.match("**")) {
            return {
                type: "BinaryExpression",
                operator: "**",
                left,
                right: this.parseUnary()
            };
        }

        return left;
    }

    parsePrimary() {
        const token = this.current();

        if (token.type === "number") {
            this.consume();

            return {
                type: "NumberLiteral",
                value: token.value
            };
        }

        if (token.type === "identifier") {
            this.consume();

            return {
                type: "Identifier",
                name: token.value
            };
        }

        if (this.match("(")) {
            const node = this.parseAdditive();

            if (!this.match(")")) {
                throw new Error("Missing closing parenthesis.");
            }

            return node;
        }

        throw new Error(
            `Unexpected token "${token.value || "end of expression"}".`
        );
    }
}

function buildAST(expression) {
    return new Parser(tokenize(expression)).parse();
}

/* ==========================================
   TREE CSS
========================================== */

function installTreeStyles() {
    let style = $("#syntax-tree-inline-styles");

    if (!style) {
        style = document.createElement("style");
        style.id = "syntax-tree-inline-styles";
        document.head.appendChild(style);
    }

    style.textContent = `
        #tree-output {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
            min-height: 220px;
            padding: 35px 24px;
            box-sizing: border-box;
            overflow: auto;
        }

        .tree-svg-stage {
            position: relative;
            display: block;
            width: max-content;
            min-width: 100%;
            box-sizing: border-box;
        }

        .tree-visual-node {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 0 0 auto;
            width: max-content;
        }

        .tree-node-label {
            position: relative;
            z-index: 2;
            display: flex;
            justify-content: center;
            align-items: center;
            min-width: 42px;
            min-height: 39px;
            padding: 5px 12px;
            box-sizing: border-box;
            border: 1px solid #a5e6ae;
            border-radius: 10px;
            background: #102d20;
            color: #b8efc4;
            font-weight: 700;
            box-shadow: 0 4px 12px #0003;
        }

        .tree-node-label.operator-node {
            background: #254d35;
            color: #e2ffcf;
        }

        .tree-node-label.identifier-node {
            background: #183c30;
            color: #b2f0d0;
        }

        .tree-node-label.number-node {
            background: #102d20;
            color: #a5e6ae;
        }

        .tree-children {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            gap: 0;
            padding-top: 42px;
        }

        .tree-children > .tree-visual-node {
            margin: 0 14px;
        }

        .tree-connector-svg {
            position: absolute;
            top: 0;
            left: 0;
            display: block;
            overflow: visible;
            pointer-events: none;
            z-index: 1;
        }

        @media (max-width: 600px) {
            #tree-output {
                justify-content: flex-start;
                padding: 28px 14px;
            }

            .tree-children > .tree-visual-node {
                margin: 0 8px;
            }

            .tree-node-label {
                min-width: 34px;
                min-height: 34px;
                padding: 4px 8px;
            }
        }
    `;
}

/* ==========================================
   BUILD TREE DOM
========================================== */

function createTreeNode(node) {
    const wrapper = document.createElement("div");
    wrapper.className = "tree-visual-node";

    const label = document.createElement("div");
    label.className = "tree-node-label";

    if (node.type === "NumberLiteral") {
        label.textContent = String(node.value);
        label.classList.add("number-node");
    } else if (node.type === "Identifier") {
        label.textContent = node.name;
        label.classList.add("identifier-node");
    } else {
        label.textContent = node.operator;
        label.classList.add("operator-node");
    }

    wrapper.appendChild(label);

    let children = [];

    if (node.type === "BinaryExpression") {
        children = [node.left, node.right];
    } else if (node.type === "UnaryExpression") {
        children = [node.argument];
    }

    if (children.length > 0) {
        const childContainer = document.createElement("div");
        childContainer.className = "tree-children";

        children.forEach(child => {
            childContainer.appendChild(createTreeNode(child));
        });

        wrapper.appendChild(childContainer);
    }

    return wrapper;
}

/* ==========================================
   SVG CONNECTORS
   Coordinates use the output container.
========================================== */

function drawTreeConnectors(stage, tree) {
    const output = $("#tree-output");
    if (!output || !stage || !tree) return;

    const previous = stage.querySelector(".tree-connector-svg");
    if (previous) previous.remove();

    const stageRect = stage.getBoundingClientRect();

    const width = Math.max(stage.scrollWidth, stage.clientWidth);
    const height = Math.max(stage.scrollHeight, stage.clientHeight);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    svg.classList.add("tree-connector-svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");

    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;

    function addPath(d) {
        const path = document.createElementNS(svgNS, "path");

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#729c7d");
        path.setAttribute("stroke-width", "1.4");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");

        svg.appendChild(path);
    }

    const parents = [
        tree,
        ...tree.querySelectorAll(".tree-visual-node")
    ];

    parents.forEach(parent => {
        const parentLabel = Array.from(parent.children).find(
            el => el.classList.contains("tree-node-label")
        );

        const childContainer = Array.from(parent.children).find(
            el => el.classList.contains("tree-children")
        );

        if (!parentLabel || !childContainer) return;

        const parentRect = parentLabel.getBoundingClientRect();

        const parentX =
            parentRect.left + parentRect.width / 2 - stageRect.left;

        const parentY =
            parentRect.bottom - stageRect.top;

        const children = Array.from(childContainer.children).filter(
            el => el.classList.contains("tree-visual-node")
        );

        const childPoints = children.map(child => {
            const childLabel = Array.from(child.children).find(
                el => el.classList.contains("tree-node-label")
            );

            if (!childLabel) return null;

            const rect = childLabel.getBoundingClientRect();

            return {
                x: rect.left + rect.width / 2 - stageRect.left,
                y: rect.top - stageRect.top
            };
        }).filter(Boolean);

        if (childPoints.length === 0) return;

        const firstChildY = Math.min(...childPoints.map(p => p.y));
        const branchY = parentY + (firstChildY - parentY) / 2;

        // Vertical segment from the parent's exact center.
        addPath(`M ${parentX} ${parentY} V ${branchY}`);

        if (childPoints.length === 1) {
            addPath(
                `M ${parentX} ${branchY} V ${childPoints[0].y}`
            );
        } else {
            const leftX = Math.min(...childPoints.map(p => p.x));
            const rightX = Math.max(...childPoints.map(p => p.x));

            // Horizontal branch connects exact child centers.
            addPath(`M ${leftX} ${branchY} H ${rightX}`);

            // Vertical branch to each child's exact center.
            childPoints.forEach(point => {
                addPath(
                    `M ${point.x} ${branchY} V ${point.y}`
                );
            });
        }
    });

    stage.insertBefore(svg, stage.firstChild);
}

/* ==========================================
   RENDER SYNTAX TREE
========================================== */

let treeResizeObserver = null;
let treeResizeHandler = null;

function renderTree(ast) {
    installTreeStyles();

    const output = $("#tree-output");

    if (!output) {
        throw new Error("Cannot find #tree-output in your HTML.");
    }

    output.replaceChildren();
    output.classList.remove("empty-state");

    const stage = document.createElement("div");
    stage.className = "tree-svg-stage";

    const tree = createTreeNode(ast);

    stage.appendChild(tree);
    output.appendChild(stage);

    const redraw = () => {
        requestAnimationFrame(() => {
            drawTreeConnectors(stage, tree);
        });
    };

    // Wait for layout before measuring node positions.
    redraw();
    requestAnimationFrame(redraw);
    requestAnimationFrame(() => requestAnimationFrame(redraw));

    if (treeResizeObserver) {
        treeResizeObserver.disconnect();
    }

    if (treeResizeHandler) {
        window.removeEventListener("resize", treeResizeHandler);
    }

    if ("ResizeObserver" in window) {
        treeResizeObserver = new ResizeObserver(redraw);
        treeResizeObserver.observe(stage);
        treeResizeObserver.observe(output);
    }

    treeResizeHandler = redraw;
    window.addEventListener("resize", treeResizeHandler, {
        passive: true
    });
}

/* ==========================================
   THREE-ADDRESS CODE
========================================== */

function generateTAC(ast) {
    const instructions = [];
    let tempCount = 0;

    function generate(node) {
        if (node.type === "NumberLiteral") {
            return String(node.value);
        }

        if (node.type === "Identifier") {
            return node.name;
        }

        if (node.type === "UnaryExpression") {
            const argument = generate(node.argument);
            const temp = `t${++tempCount}`;

            instructions.push(
                `${temp} = ${node.operator}${argument}`
            );

            return temp;
        }

        if (node.type === "BinaryExpression") {
            const left = generate(node.left);
            const right = generate(node.right);
            const temp = `t${++tempCount}`;

            instructions.push(
                `${temp} = ${left} ${node.operator} ${right}`
            );

            return temp;
        }

        throw new Error("Unsupported syntax-tree node.");
    }

    const result = generate(ast);
    instructions.push(`result = ${result}`);

    return instructions;
}

function countNodes(ast) {
    if (ast.type === "BinaryExpression") {
        return 1 + countNodes(ast.left) + countNodes(ast.right);
    }

    if (ast.type === "UnaryExpression") {
        return 1 + countNodes(ast.argument);
    }

    return 1;
}

/* ==========================================
   TRANSLATION DISPLAY
========================================== */

let currentExpression = "";

function renderTranslation(ast) {
    const codeOutput = $("#code-output");
    const details = $("#translation-details");

    const instructions = generateTAC(ast);

    if (codeOutput) {
        codeOutput.textContent = instructions.join("\n");
    }

    if (details) {
        details.replaceChildren();

        const items = [
            `Expression: ${currentExpression}`,
            `Syntax tree nodes: ${countNodes(ast)}`,
            `Generated instructions: ${instructions.length}`
        ];

        items.forEach(item => {
            const paragraph = document.createElement("p");
            paragraph.textContent = item;
            details.appendChild(paragraph);
        });
    }
}

/* ==========================================
   FORM HANDLERS
========================================== */

function handleTreeSubmit(event) {
    event.preventDefault();

    const input = $("#tree-expression");
    const status = $("#tree-status");

    try {
        if (!input || !input.value.trim()) {
            throw new Error("Please enter an expression.");
        }

        const ast = buildAST(input.value.trim());

        renderTree(ast);

        if (status) {
            status.textContent = "Tree generated successfully";
        }

        hideError();
    } catch (error) {
        if (status) status.textContent = "Invalid expression";
        showError(error.message);
    }
}

function handleTranslationSubmit(event) {
    event.preventDefault();

    const input = $("#translation-expression");

    try {
        if (!input || !input.value.trim()) {
            throw new Error("Please enter an expression.");
        }

        currentExpression = input.value.trim();

        const ast = buildAST(currentExpression);

        renderTranslation(ast);
        hideError();
    } catch (error) {
        showError(error.message);
    }
}

/* ==========================================
   EXAMPLE BUTTONS
========================================== */

function loadExample(button) {
    const expression = button.dataset.expression;
    if (!expression) return;

    if (button.closest("#explorer")) {
        const input = $("#tree-expression");

        if (input) {
            input.value = expression;
            $("#tree-form")?.requestSubmit();
        }
    } else if (button.closest("#translation")) {
        const input = $("#translation-expression");

        if (input) {
            input.value = expression;
            $("#translation-form")?.requestSubmit();
        }
    }
}

/* ==========================================
   INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    installTreeStyles();

    $("#tree-form")?.addEventListener(
        "submit",
        handleTreeSubmit
    );

    $("#translation-form")?.addEventListener(
        "submit",
        handleTranslationSubmit
    );

    document.querySelectorAll(".example-button").forEach(button => {
        button.addEventListener("click", () => {
            loadExample(button);
        });
    });

    $("#toast-close")?.addEventListener("click", hideError);
});
