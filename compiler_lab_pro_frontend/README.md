# Compiler Lab Pro — Frontend-only Edition

A browser-only recreation of Compiler Lab Pro. It keeps the same workbench interface and educational compiler pipeline, but the compiler engine is JavaScript and runs entirely in the user's browser.

## Features
- C-like source input and three-address code (TAC) input
- TAC generation for the supported C-like subset
- Basic-block construction using the leader algorithm
- Control-flow graph visualization
- Illustrative pseudo-assembly generation
- Optional constant-expression folding
- Symbol table and undeclared-variable warnings
- Line/column diagnostics and hints
- Copy output, export report, responsive interface, dark theme
- No Flask, Python, server, API, or build step required

## Run locally
Open `index.html` in a modern browser. For Mermaid graph rendering, an internet connection is required; the rest of the compiler engine works locally in the browser.

## Host on GitHub Pages
1. Create a GitHub repository.
2. Upload `index.html`, the `static` folder, and this README.
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
5. Wait for the published Pages URL and open it.

## Supported educational language subset
Declarations (`int`, `float`, `double`, `char`, `long`, `short`, `bool`), assignments, arithmetic/logical/comparison expressions, `if/else`, `while`, braces, and `return`. TAC supports labels, conditional jumps, `goto`, assignments, and `return`.

## Limitations
This is an educational subset, not a standards-compliant C compiler. Functions, arrays, pointers, `for` loops, structs, and executable machine-code generation are not supported. Assembly output is illustrative pseudo-assembly. Mermaid is loaded from a CDN for graph rendering.
