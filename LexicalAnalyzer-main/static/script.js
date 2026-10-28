/**
 * Lexical Analyzer Using Lex or a Program
 * Frontend Application Logic (Vanilla JavaScript)
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const sourceCodeInput = document.getElementById("sourceCodeInput");
    const charLineCounter = document.getElementById("charLineCounter");
    const sampleSelect = document.getElementById("sampleSelect");
    const btnLoadSample = document.getElementById("btnLoadSample");
    const btnAnalyze = document.getElementById("btnAnalyze");
    const analyzeBtnText = document.getElementById("analyzeBtnText");
    const btnClear = document.getElementById("btnClear");
    const alertBanner = document.getElementById("alertBanner");
    const alertMessage = document.getElementById("alertMessage");
    const alertIcon = document.getElementById("alertIcon");
    const alertCloseBtn = document.getElementById("alertCloseBtn");

    // Token count display elements
    const countTotal = document.getElementById("countTotal");
    const countKeywords = document.getElementById("countKeywords");
    const countIdentifiers = document.getElementById("countIdentifiers");
    const countOperators = document.getElementById("countOperators");
    const countConstants = document.getElementById("countConstants");
    const countStrings = document.getElementById("countStrings");
    const countSymbols = document.getElementById("countSymbols");
    const countComments = document.getElementById("countComments");
    const countInvalid = document.getElementById("countInvalid");

    // Table elements
    const tokenTableBody = document.getElementById("tokenTableBody");
    const tokenSearchInput = document.getElementById("tokenSearchInput");
    const typeFilterSelect = document.getElementById("typeFilterSelect");
    const resultsMetaText = document.getElementById("resultsMetaText");
    const btnExportCsv = document.getElementById("btnExportCsv");
    const statCards = document.querySelectorAll(".stat-card");

    // Theory Modal elements
    const btnTheoryModal = document.getElementById("btnTheoryModal");
    const theoryModal = document.getElementById("theoryModal");
    const btnModalClose = document.getElementById("btnModalClose");
    const btnModalCloseFooter = document.getElementById("btnModalCloseFooter");

    // Application state
    let analyzedTokens = [];
    let currentSamplePresets = {
        c_program: `// C Program Demonstration
#include <stdio.h>

int main() {
    int count = 10;
    float average = 85.5;
    char grade = 'A';
    
    /* Calculate final result */
    if (count > 0 && average >= 50.0) {
        count = count + 1;
        return 1;
    } else {
        return 0;
    }
}`,
        arithmetic: `// Arithmetic & Logical Expressions
int x = 25;
float y = 14.75;
float result = (x + y) * 2.0 / (y - 5.0);
int is_valid = (result >= 10.0) && (x != 0);`,
        conditionals: `// Conditional Statements
int score = 78;
if (score >= 90) {
    return 1;
} else if (score >= 75) {
    return 2;
} else {
    return 0;
}`,
        loops: `// Loop Structures
int sum = 0;
int i = 1;

while (i <= 10) {
    sum += i;
    i++;
}

for (int j = 0; j < 5; j++) {
    sum = sum * 2;
}`,
        strings_comments: `// Lexical Test: Comments & Strings
/* Multi-line comment
   explaining the module
   compiler design test */
char* greeting = "Hello, Lexical Analyzer!";
char* message = "Compiler Design Mini Project 2026";
int len = 25;`,
        invalid_tokens: `// Error Handling Test: Invalid Tokens
int valid_var = 100;
int @bad_token = 50;
float $price = 99.9;
int total# = valid_var ^ @bad_token;
\`stray_backtick\``
    };

    // --- Helper Functions ---

    /**
     * Shows an alert message with styling (error, warning, success)
     */
    function showAlert(message, type = "error") {
        alertBanner.className = `alert-banner alert-${type}`;
        alertMessage.textContent = message;
        if (type === "error") {
            alertIcon.textContent = "❌";
        } else if (type === "warning") {
            alertIcon.textContent = "⚠️";
        } else {
            alertIcon.textContent = "✅";
        }
        alertBanner.classList.remove("hidden");
    }

    /**
     * Hides the alert banner
     */
    function hideAlert() {
        alertBanner.classList.add("hidden");
    }

    /**
     * Updates character and line count badge for the code editor
     */
    function updateEditorStats() {
        const text = sourceCodeInput.value;
        const lineCount = text ? text.split("\n").length : 0;
        const charCount = text.length;
        charLineCounter.textContent = `Lines: ${lineCount} | Characters: ${charCount}`;
    }

    /**
     * Returns CSS badge class for a given token type
     */
    function getBadgeClass(type) {
        switch (type) {
            case "Keyword":
                return "badge-keyword";
            case "Identifier":
                return "badge-identifier";
            case "Operator":
                return "badge-operator";
            case "Constant":
                return "badge-constant";
            case "String Literal":
                return "badge-string-literal";
            case "Special Symbol":
                return "badge-special-symbol";
            case "Comment":
                return "badge-comment";
            case "Invalid Token":
                return "badge-invalid-token";
            default:
                return "badge-symbol";
        }
    }

    /**
     * Escapes HTML characters for safe rendering in table
     */
    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Updates summary count display values
     */
    function updateSummaryDisplay(summary = {}) {
        countTotal.textContent = summary.total ?? 0;
        countKeywords.textContent = summary.keywords ?? 0;
        countIdentifiers.textContent = summary.identifiers ?? 0;
        countOperators.textContent = summary.operators ?? 0;
        countConstants.textContent = summary.constants ?? 0;
        countStrings.textContent = summary.strings ?? 0;
        countSymbols.textContent = summary.special_symbols ?? 0;
        countComments.textContent = summary.comments ?? 0;
        countInvalid.textContent = summary.invalid ?? 0;
    }

    /**
     * Renders token table based on current search and type filters
     */
    function renderTable() {
        const searchTerm = tokenSearchInput.value.trim().toLowerCase();
        const selectedType = typeFilterSelect.value;

        const filtered = analyzedTokens.filter(item => {
            const matchesSearch = !searchTerm || item.token.toLowerCase().includes(searchTerm);
            const matchesType = (selectedType === "all") || (item.type === selectedType);
            return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
            tokenTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4">
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <p class="empty-state-title">No Matching Tokens</p>
                            <p class="empty-state-desc">Try clearing your search query or changing the type filter.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const rowsHtml = filtered.map((item) => {
            const badgeClass = getBadgeClass(item.type);
            const escapedToken = escapeHtml(item.token);
            return `
                <tr>
                    <td class="col-index">${item.index}</td>
                    <td class="col-token"><code class="token-code">${escapedToken}</code></td>
                    <td class="col-type"><span class="badge ${badgeClass}">${item.type}</span></td>
                    <td class="col-line">${item.line}</td>
                </tr>
            `;
        }).join("");

        tokenTableBody.innerHTML = rowsHtml;
    }

    // --- Frontend-only lexical analysis (no server required) ---
    function analyzeLocally(source) {
        const keywords = new Set(["int","float","if","else","while","return","void","char","double","for","do","break","continue","switch","case","default","sizeof","struct","const","static","long","short","unsigned","signed"]);
        const summary = {total:0, keywords:0, identifiers:0, operators:0, constants:0, strings:0, special_symbols:0, comments:0, invalid:0};
        const tokens = [];
        const pattern = /\/\*[\s\S]*?\*\/|\/\*[\s\S]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|"(?:\\.|[^"\\])*|\'(?:\\.|[^'\\])*\'|\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|->|<<|>>|[+\-*\/%=<>!&|^~]|[a-zA-Z_][a-zA-Z0-9_]*|[()\[\]{},;:?]|\n|[^\S\n]+|./g;
        let line=1, lineStart=0, m;
        while ((m=pattern.exec(source)) !== null) {
            const value=m[0], col=m.index-lineStart+1;
            if (/^\s+$/.test(value)) { if(value.includes('\n')) { line += (value.match(/\n/g)||[]).length; lineStart=m.index+value.lastIndexOf('\n')+1; } continue; }
            let type;
            if (/^\/\//.test(value) || /^\/\*[\s\S]*\*\/$/.test(value)) type='Comment';
            else if (/^\/\*/.test(value) || (value.startsWith('"') && !value.endsWith('"'))) type='Invalid Token';
            else if (/^"/.test(value) || /^\'/.test(value)) type='String Literal';
            else if (keywords.has(value)) type='Keyword';
            else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) type='Identifier';
            else if (/^(?:0[xX][0-9a-fA-F]+|\d)/.test(value)) type='Constant';
            else if (/^(?:==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|->|<<|>>|[+\-*\/%=<>!&|^~])$/.test(value)) type='Operator';
            else if (/^[()\[\]{},;:?]$/.test(value)) type='Special Symbol';
            else type='Invalid Token';
            const key = {'Keyword':'keywords','Identifier':'identifiers','Operator':'operators','Constant':'constants','String Literal':'strings','Special Symbol':'special_symbols','Comment':'comments','Invalid Token':'invalid'}[type];
            summary[key]++; summary.total++;
            tokens.push({index:tokens.length+1, token:value, type, line, column:col});
            if(value.includes('\n')) { line += (value.match(/\n/g)||[]).length; lineStart=m.index+value.lastIndexOf('\n')+1; }
        }
        return {tokens,summary,line_count:source.split('\n').length,has_invalid:summary.invalid>0};
    }
    async function performAnalysis() {
        hideAlert();
        const code = sourceCodeInput.value;
        if (!code || !code.trim()) { showAlert("Please enter source code or choose a sample preset before analyzing.", "warning"); sourceCodeInput.focus(); return; }
        btnAnalyze.disabled = true; analyzeBtnText.innerHTML = `<span class="spinner"></span> Analyzing...`;
        try {
            await new Promise(resolve => setTimeout(resolve, 120));
            const data = analyzeLocally(code);
            analyzedTokens = data.tokens || [];
            updateSummaryDisplay(data.summary || {});
            resultsMetaText.textContent = `Found ${analyzedTokens.length} tokens across ${data.line_count} lines.`;
            if (data.has_invalid) showAlert(`Analysis complete with lexical errors: ${data.summary.invalid} invalid token(s) detected.`, "warning");
            renderTable();
            if (window.innerWidth < 768) document.getElementById("resultsSection").scrollIntoView({behavior:"smooth"});
        } catch (err) { console.error("Lexical Analysis Error:", err); showAlert(`Analysis failed: ${err.message}`, "error"); }
        finally { btnAnalyze.disabled = false; analyzeBtnText.textContent = "Analyze Code"; }
    }

    // --- Reset / Clear Function ---
    function clearAll() {
        sourceCodeInput.value = "";
        updateEditorStats();
        hideAlert();
        analyzedTokens = [];
        updateSummaryDisplay();
        resultsMetaText.textContent = "Run the analyzer to inspect the lexical stream.";
        tokenSearchInput.value = "";
        typeFilterSelect.value = "all";

        // Remove active card highlight
        statCards.forEach(card => card.classList.remove("active-filter"));

        tokenTableBody.innerHTML = `
            <tr class="empty-placeholder-row">
                <td colspan="4" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <p class="empty-state-title">No Tokens Analyzed Yet</p>
                        <p class="empty-state-desc">Enter code in the editor above or select a sample preset, then click <strong>Analyze Code</strong>.</p>
                    </div>
                </td>
            </tr>
        `;
        sourceCodeInput.focus();
    }

    // --- CSV Export Function ---
    function exportToCsv() {
        if (!analyzedTokens || analyzedTokens.length === 0) {
            showAlert("No tokens available to export. Analyze some source code first.", "warning");
            return;
        }

        const headers = ["Index", "Token", "TokenType", "LineNumber", "ColumnNumber"];
        const rows = analyzedTokens.map(t => [
            t.index,
            `"${t.token.replace(/"/g, '""')}"`,
            `"${t.type}"`,
            t.line,
            t.column || 1
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "lexical_tokens.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Event Listeners ---

    // Source code typing listener
    sourceCodeInput.addEventListener("input", updateEditorStats);

    // Tab key support in textarea
    sourceCodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const start = sourceCodeInput.selectionStart;
            const end = sourceCodeInput.selectionEnd;
            sourceCodeInput.value = sourceCodeInput.value.substring(0, start) + "    " + sourceCodeInput.value.substring(end);
            sourceCodeInput.selectionStart = sourceCodeInput.selectionEnd = start + 4;
            updateEditorStats();
        }
    });

    // Sample loading
    btnLoadSample.addEventListener("click", () => {
        const key = sampleSelect.value;
        if (!key || !currentSamplePresets[key]) {
            showAlert("Please select a sample preset from the dropdown first.", "warning");
            return;
        }
        sourceCodeInput.value = currentSamplePresets[key];
        updateEditorStats();
        hideAlert();
        // Automatically trigger analysis for seamless demo experience
        performAnalysis();
    });

    // Analyze Code button click
    btnAnalyze.addEventListener("click", performAnalysis);

    // Clear button click
    btnClear.addEventListener("click", clearAll);

    // Alert close button
    alertCloseBtn.addEventListener("click", hideAlert);

    // Search and filter listeners
    tokenSearchInput.addEventListener("input", renderTable);
    typeFilterSelect.addEventListener("change", () => {
        // Synchronize active stat card highlight
        const val = typeFilterSelect.value;
        statCards.forEach(c => {
            if (c.dataset.filter === val) {
                c.classList.add("active-filter");
            } else {
                c.classList.remove("active-filter");
            }
        });
        renderTable();
    });

    // Stat cards quick filter click
    statCards.forEach(card => {
        card.addEventListener("click", () => {
            const filter = card.dataset.filter;
            typeFilterSelect.value = filter;
            statCards.forEach(c => c.classList.remove("active-filter"));
            card.classList.add("active-filter");
            renderTable();
        });
    });

    // Export CSV
    btnExportCsv.addEventListener("click", exportToCsv);

    // Theory & Lex/Flex Modal toggle
    btnTheoryModal.addEventListener("click", () => {
        theoryModal.classList.remove("hidden");
    });

    const closeModal = () => theoryModal.classList.add("hidden");
    btnModalClose.addEventListener("click", closeModal);
    btnModalCloseFooter.addEventListener("click", closeModal);
    theoryModal.addEventListener("click", (e) => {
        if (e.target === theoryModal) closeModal();
    });

    // Initialize stats
    updateEditorStats();
});
