import { parseRegex, getAlphabet } from "./regex-parser.js";
import { buildNfa } from "./nfa.js";
import { buildDfa } from "./dfa.js";
import { renderDiagram, renderNfaTable, renderDfaTable, createSolution } from "./renderer.js";

const $ = (id) => document.getElementById(id);
const regexInput = $("regexInput");
const imageInput = $("imageInput");
const ocrText = $("ocrText");
const dropZone = $("dropZone");
const workspace = $("workspace");
const tester = $("tester");
let currentImage = null;
let currentObjectUrl = null;
let currentSolutionText = "";
let currentAutomata = null;
let toastTimer;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function compactExpression(expression) {
  return Array.from(expression).filter((character) => !/\s/u.test(character)).join("");
}

function clearRegexError() {
  $("regexError").hidden = true;
  $("regexError").textContent = "";
  regexInput.removeAttribute("aria-invalid");
}

function processExpression(expression, { questionText = "" } = {}) {
  clearRegexError();
  try {
    const compact = compactExpression(expression);
    const syntaxTree = parseRegex(compact);
    const alphabet = getAlphabet(syntaxTree);
    const nfa = buildNfa(syntaxTree);
    const dfa = buildDfa(nfa, alphabet);
    currentAutomata = { expression: compact, alphabet, nfa, dfa };
    currentSolutionText = createSolution({ expression: compact, alphabet, nfa, dfa, questionText });

    $("summaryRegex").textContent = compact;
    $("summaryAlphabet").textContent = `{${alphabet.join(", ")}}`;
    $("summaryCounts").textContent = `${nfa.states.length} NFA · ${dfa.states.length} DFA`;
    $("solutionText").textContent = currentSolutionText;
    renderDiagram($("nfaDiagram"), nfa, { kind: "nfa", start: nfa.start, accepting: new Set([nfa.accept]) });
    renderDiagram($("dfaDiagram"), dfa, {
      kind: "dfa", start: dfa.start,
      accepting: new Set(dfa.states.filter((state) => state.accepting).map((state) => state.id))
    });
    renderNfaTable($("nfaTable"), nfa, alphabet);
    renderDfaTable($("dfaTable"), dfa);

    workspace.hidden = false;
    tester.hidden = false;
    $("testString").value = "";
    $("testResult").textContent = "";
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  } catch (error) {
    $("regexError").textContent = error instanceof Error ? error.message : "The regular expression could not be processed.";
    $("regexError").hidden = false;
    regexInput.setAttribute("aria-invalid", "true");
    regexInput.focus();
    return false;
  }
}

function findRegexInText(text) {
  const cleaned = text.replace(/\r/g, "\n");
  const explicit = cleaned.match(/(?:regular\s+expression|regex|expression)\s*(?:is|:|=)?\s*[`'"“‘]?([^\s,;:`'"”’]+)/iu);
  if (explicit?.[1]) {
    const candidate = stripOuterPunctuation(explicit[1]);
    if (isValidCandidate(candidate)) return candidate;
  }

  const quoted = [...cleaned.matchAll(/[`'"“‘]([^`'"“”‘’\n]+)[`'"“”’]/gu)];
  for (const match of quoted) {
    const candidate = stripOuterPunctuation(match[1].trim());
    if (isValidCandidate(candidate) && /[|*+?()]/u.test(candidate)) return candidate;
  }

  const tokens = cleaned.match(/[^\s,;:]+/gu) || [];
  const candidates = tokens
    .map(stripOuterPunctuation)
    .filter((token) => token && /[|*+?()]/u.test(token) && isValidCandidate(token))
    .sort((a, b) => b.length - a.length);
  if (candidates.length) return candidates[0];

  const imageExpression = compactExpression(cleaned.trim());
  if (!/\s/u.test(cleaned.trim()) && imageExpression.length <= 120 && !/^q\d+$/iu.test(imageExpression) && isValidCandidate(imageExpression)) {
    return imageExpression;
  }
  return null;
}

function stripOuterPunctuation(candidate) {
  return candidate.replace(/^[\[\]{}.,]+|[\[\]{}.,]+$/gu, "");
}

function isValidCandidate(candidate) {
  if (!candidate) return false;
  try {
    parseRegex(candidate);
    return true;
  } catch {
    return false;
  }
}

function looksLikeAutomatonDiagram(text) {
  return /\b(?:transition\s+table|state\s+diagram|automaton\s+diagram)\b|\b(?:deterministic|nondeterministic)\s+finite\s+automaton\b[\s\S]{0,100}\b(?:reachable|subset|state|accepting)\b/iu.test(text);
}

function unsupportedImageMessage(text) {
  if (looksLikeAutomatonDiagram(text)) {
    return "This image looks like an automaton diagram or transition table, not a regex image. Upload or crop an image containing only the regular expression.";
  }
  return "No clear regular expression was found. Upload a clear, cropped image containing only the expression, or correct the recognized text.";
}

function detectFromImageText() {
  const text = ocrText.value.trim();
  const message = $("ocrMessage");
  message.className = "ocr-message";
  if (!text) {
    message.textContent = "Add or extract question text first.";
    return null;
  }
  const candidate = findRegexInText(text);
  if (!candidate) {
    message.textContent = unsupportedImageMessage(text);
    return null;
  }
  regexInput.value = candidate;
  clearRegexError();
  message.textContent = `Expression copied to the regular-expression input: ${candidate}. Verify it against the image before generating.`;
  message.classList.add("success");
  return candidate;
}

function useSelectedImage(file) {
  const message = $("ocrMessage");
  message.className = "ocr-message";
  if (!file) return;
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/iu.test(file.name)) {
    message.textContent = "Unsupported image. Choose a JPG, PNG, or WEBP file.";
    message.classList.add("error");
    imageInput.value = "";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    message.textContent = "This image is larger than 10 MB. Choose a smaller image and try again.";
    message.classList.add("error");
    imageInput.value = "";
    return;
  }
  currentImage = file;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  $("imagePreview").src = currentObjectUrl;
  $("imagePreviewWrap").hidden = false;
  $("extractButton").disabled = false;
  ocrText.value = "";
  message.textContent = "Image ready. Upload an image containing only a clearly visible regular expression.";
}

async function extractImageText() {
  const message = $("ocrMessage");
  message.className = "ocr-message";
  if (!currentImage) {
    message.textContent = "Upload an image before starting OCR.";
    message.classList.add("error");
    return;
  }
  if (!window.Tesseract?.createWorker) {
    message.textContent = "OCR could not load. Check your internet connection and reload; automata generation works offline.";
    message.classList.add("error");
    return;
  }
  const progressWrap = $("ocrProgressWrap");
  const progress = $("ocrProgress");
  const status = $("ocrStatus");
  const percent = $("ocrPercent");
  const button = $("extractButton");
  progressWrap.hidden = false;
  progress.style.width = "0%";
  percent.textContent = "0%";
  status.textContent = "Preparing OCR…";
  button.disabled = true;
  button.classList.add("is-loading");
  message.textContent = "Processing stays in this browser; the OCR engine may download language data on first use.";
  let worker;
  try {
    worker = await window.Tesseract.createWorker("eng", 1, {
      logger: (event) => {
        if (event.status) status.textContent = event.status;
        if (typeof event.progress === "number") {
          const value = Math.max(0, Math.min(100, Math.round(event.progress * 100)));
          progress.style.width = `${value}%`;
          percent.textContent = `${value}%`;
        }
      }
    });
    const result = await worker.recognize(currentImage);
    ocrText.value = result.data.text.trim();
    progress.style.width = "100%";
    percent.textContent = "100%";
    status.textContent = "OCR complete";
    if (ocrText.value) {
      const candidate = findRegexInText(ocrText.value);
      if (candidate) {
        regexInput.value = candidate;
        clearRegexError();
        message.textContent = `Detected ${candidate} and copied it to the regular-expression input. Verify the OCR result against the image.`;
        message.classList.add("success");
      } else {
        message.textContent = unsupportedImageMessage(ocrText.value);
        message.classList.add("error");
      }
    } else {
      message.textContent = "OCR could not read an expression. Try a sharper, cropped image containing only the regex.";
      message.classList.add("error");
    }
  } catch (error) {
    status.textContent = "OCR failed";
    message.textContent = `Could not extract text: ${error instanceof Error ? error.message : "unexpected OCR error"}. Check your connection and try again.`;
    message.classList.add("error");
  } finally {
    if (worker) await worker.terminate();
    button.disabled = false;
    button.classList.remove("is-loading");
  }
}

function testString() {
  if (!currentAutomata) return;
  const input = $("testString").value;
  const { dfa } = currentAutomata;
  const transitions = new Map(dfa.transitions.map((edge) => [`${edge.from}:${edge.symbol}`, edge.to]));
  const visited = [dfa.start];
  let stateId = dfa.start;
  let missingSymbol = null;
  for (const symbol of Array.from(input)) {
    const target = transitions.get(`${stateId}:${symbol}`);
    if (target === undefined) {
      missingSymbol = symbol;
      break;
    }
    stateId = target;
    visited.push(stateId);
  }
  const finalState = dfa.states[stateId];
  const accepted = missingSymbol === null && finalState.accepting;
  const result = $("testResult");
  result.className = `test-result ${accepted ? "accept" : "reject"}`;
  const path = visited.map((id) => `q${id}`).join(" → ");
  result.textContent = missingSymbol === null
    ? `${accepted ? "ACCEPTED" : "REJECTED"} · Visited ${path}. Final state q${stateId} is ${finalState.accepting ? "accepting" : "not accepting"}.`
    : `REJECTED · Visited ${path}; no transition for '${missingSymbol}' from q${stateId}. The string contains a symbol outside the DFA alphabet.`;
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      if (!copied) throw new Error("Clipboard access is unavailable in this browser.");
    }
    showToast(`${label} copied to clipboard.`);
  } catch (error) {
    showToast(`Could not copy: ${error instanceof Error ? error.message : "clipboard unavailable"}`);
  }
}

function resetAll() {
  regexInput.value = "";
  clearRegexError();
  $("testString").value = "";
  $("testResult").textContent = "";
  workspace.hidden = true;
  tester.hidden = true;
  currentAutomata = null;
  currentSolutionText = "";
  $("solutionText").textContent = "";
  regexInput.focus();
}

document.querySelectorAll(".example-chip").forEach((button) => {
  button.addEventListener("click", () => {
    regexInput.value = button.dataset.expression;
    clearRegexError();
    regexInput.focus();
  });
});
$("generateButton").addEventListener("click", () => processExpression(regexInput.value));
regexInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") processExpression(regexInput.value);
});
regexInput.addEventListener("input", clearRegexError);
$("clearRegexButton").addEventListener("click", () => {
  regexInput.value = "";
  clearRegexError();
  regexInput.focus();
});
imageInput.addEventListener("change", () => useSelectedImage(imageInput.files?.[0]));
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = event.dataTransfer?.files?.[0];
  if (file) useSelectedImage(file);
});
$("extractButton").addEventListener("click", extractImageText);
$("findRegexButton").addEventListener("click", detectFromImageText);
$("generateFromImageButton").addEventListener("click", () => {
  const candidate = detectFromImageText();
  if (!candidate) return;
  processExpression(candidate);
});
$("clearImageButton").addEventListener("click", () => {
  currentImage = null;
  imageInput.value = "";
  $("imagePreview").removeAttribute("src");
  $("imagePreviewWrap").hidden = true;
  $("extractButton").disabled = true;
  $("ocrProgressWrap").hidden = true;
  $("ocrMessage").textContent = "";
  $("ocrMessage").className = "ocr-message";
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
});
$("testStringButton").addEventListener("click", testString);
$("testString").addEventListener("keydown", (event) => {
  if (event.key === "Enter") testString();
});
$("copyRegexButton").addEventListener("click", () => copyText(currentAutomata?.expression || "", "Regular expression"));
$("copySolutionButton").addEventListener("click", () => copyText(currentSolutionText, "Solution"));
$("copySolutionInlineButton").addEventListener("click", () => copyText(currentSolutionText, "Solution"));
$("downloadButton").addEventListener("click", () => {
  if (!currentSolutionText) return;
  const blob = new Blob([currentSolutionText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "regex-automata-solution.txt";
  link.click();
  URL.revokeObjectURL(url);
});
$("printButton").addEventListener("click", () => window.print());
$("resetButton").addEventListener("click", resetAll);
