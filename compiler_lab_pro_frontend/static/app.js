mermaid.initialize({startOnLoad:false,securityLevel:"strict",theme:"base",themeVariables:{primaryColor:"#eef0ff",primaryTextColor:"#27324c",primaryBorderColor:"#aab5f5",lineColor:"#7886c9",fontFamily:"Manrope, sans-serif"}});
const $ = id => document.getElementById(id);
let latest = null;
const cExample = `int a;
int b;
a = 10;
b = 20;

if (a < b) {
    a = a + 5;
} else {
    a = a - 5;
}
return a;`;
const irExample = `t1 = a + b
t2 = t1 * c
if t2 > 100 goto L1
goto L2
L1:
x = t2 - 10
goto L3
L2:
x = t2 + 10
L3:
return x`;
const paneMeta = {
  tacPane:["Three-address code","Intermediate representation"],
  blocksPane:["Basic blocks","Leader algorithm output"],
  graphPane:["Control-flow graph","Nodes represent basic blocks"],
  asmPane:["Code generation","Illustrative pseudo-assembly"]
};
function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function refreshEditor(){
  const src=$("source").value;
  $("lineNumbers").textContent=Array.from({length:Math.max(1,src.split("\n").length)},(_,i)=>i+1).join("\n");
  $("charCount").textContent=src.length+" characters";
  $("fileLabel").textContent=$("mode").value==="c"?"main.c":"input.tac";
}
function updateCursor(){
  const ta=$("source"), before=ta.value.slice(0,ta.selectionStart), line=before.split("\n").length, col=before.length-(before.lastIndexOf("\n")+1)+1;
  $("cursorInfo").textContent=`Ln ${line}, Col ${col}`;
}
$("source").addEventListener("input",refreshEditor);
$("source").addEventListener("keyup",updateCursor);
$("source").addEventListener("click",updateCursor);
$("source").addEventListener("scroll",()=>{$("lineNumbers").scrollTop=$("source").scrollTop});
$("mode").addEventListener("change",()=>{refreshEditor();$("source").value=$("mode").value==="c"?cExample:irExample;refreshEditor()});
$("exampleBtn").addEventListener("click",()=>{$("source").value=$("mode").value==="c"?cExample:irExample;refreshEditor()});
$("clearBtn").addEventListener("click",()=>{$("source").value="";refreshEditor();$("errorBox").hidden=true;$("warningBox").hidden=true});
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>activatePane(btn.dataset.tab)));
function activatePane(id){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));
  document.querySelectorAll(".pane").forEach(x=>x.classList.toggle("active",x.id===id));
  $("outputTitle").textContent=paneMeta[id][0];$("outputSub").textContent=paneMeta[id][1];
  $("copyBtn").disabled=!latest;
}
function renderCode(id,lines){
  $(id).innerHTML=`<div class="code-output">${lines.map((line,i)=>`<div class="code-line"><span class="ln">${i+1}</span><span>${esc(line)}</span></div>`).join("")}</div>`;
}
function renderBlocks(blocks){
  $("blocksPane").innerHTML=blocks.length?`<div class="blocks-grid">${blocks.map(b=>`<div class="block-card"><div class="block-head"><span>${esc(b.id)}</span><small>${b.instructions.length} instruction${b.instructions.length===1?"":"s"}</small></div><div class="block-body">${b.instructions.map(esc).join("\n")}</div></div>`).join("")}</div>`:'<div class="empty-state"><b>No basic blocks found</b></div>';
}
async function renderGraph(blocks,edges){
  if(!blocks.length){$("graphPane").innerHTML='<div class="empty-state"><b>No graph available</b></div>';return}
  const graph=["flowchart TD"];
  blocks.forEach(b=>{let label=(b.id+": "+b.instructions.join("\\n")).replaceAll('"',"'").replaceAll("|","/");graph.push(`${b.id}["${label}"]`)});
  edges.forEach(e=>graph.push(`${e.from} -->${e.label?`|${e.label}|`:""} ${e.to}`));
  const edgeHtml=edges.length?`<div class="edge-list"><b>Control-flow edges</b><br>${edges.map(e=>`<span class="edge-chip">${esc(e.from)} → ${esc(e.to)}${e.label?` · ${esc(e.label)}`:""}</span>`).join("")}</div>`:'<div class="edge-list">No control-flow edges.</div>';
  try{const rendered=await mermaid.render("cfg"+Date.now(),graph.join("\n"));$("graphPane").innerHTML=`<div class="graph-wrap">${rendered.svg}</div>${edgeHtml}`}
  catch{$("graphPane").innerHTML=`<div class="code-output">${blocks.map(b=>esc(b.id+": "+b.instructions.join("; "))).join("<br>")}<br><br>${edges.map(e=>esc(e.from+" → "+e.to+" "+e.label)).join("<br>")}</div>${edgeHtml}`}
}
function renderSymbols(symbols){
  $("symbolCount").textContent=symbols.length+" symbol"+(symbols.length===1?"":"s");
  $("symbolTable").innerHTML=symbols.length?`<table class="symbol-table"><thead><tr><th>Identifier</th><th>Type</th><th>Scope</th></tr></thead><tbody>${symbols.map(s=>`<tr><td><code>${esc(s.name)}</code></td><td><span class="type-pill">${esc(s.type)}</span></td><td>global</td></tr>`).join("")}</tbody></table>`:'<div class="symbol-empty">No symbols were detected.</div>';
}
function showError(error,diagnostic){
  const d=diagnostic||{};
  $("errorBox").innerHTML=`<b>⚠ ${esc(d.code||"COMPILER_ERROR")} · ${esc(d.message||error)}</b>${d.line?`Line ${d.line}, column ${d.column}. `:""}${esc(d.hint||"Check the input syntax and try again.")}`;
  $("errorBox").hidden=false;
}
$("compileBtn").addEventListener("click",async()=>{
  const btn=$("compileBtn");$("errorBox").hidden=true;$("warningBox").hidden=true;btn.disabled=true;btn.innerHTML="◌ Compiling…";
  try{
    // All compilation runs locally in this browser; no backend request is made.
    const data=window.CompilerLabEngine.compileProgram($("source").value,$("mode").value,$("optimize").checked);
    latest=data;
    renderCode("tacPane",data.ir);renderBlocks(data.blocks);await renderGraph(data.blocks,data.edges);renderCode("asmPane",data.assembly);renderSymbols(data.symbols);
    $("instructionCount").textContent=data.stats.instructions;$("blockCount").textContent=data.stats.blocks;$("edgeCount").textContent=data.stats.edges;$("tempCount").textContent=data.stats.temporaries;
    $("buildTitle").textContent="Compilation successful";$("buildMessage").textContent=data.optimizations?`${data.optimizations} constant expression(s) optimized.`:"All analysis stages generated successfully.";
    if(data.warnings.length){$("warningBox").innerHTML=`<b>⚠ ${data.warnings.length} warning(s)</b>${data.warnings.map(w=>`${esc(w.message)} ${esc(w.hint)}`).join("\n")}`;$("warningBox").hidden=false}
    $("exportBtn").disabled=false;$("copyBtn").disabled=false;
  }catch(e){
    const d=typeof e.toDiagnostic==="function"?e.toDiagnostic():{code:"E_COMPILER",message:e.message,hint:"Check the input syntax and try again."};
    showError(e.message,d);$("buildTitle").textContent="Compilation failed";$("buildMessage").textContent="Fix the reported issue and compile again.";latest=null;$("exportBtn").disabled=true;$("copyBtn").disabled=true;
  }finally{btn.disabled=false;btn.innerHTML="<span>▶</span> Compile program"}
});
function currentOutput(){
  if(!latest)return "";
  const id=document.querySelector(".tab.active")?.dataset.tab;
  if(id==="tacPane")return latest.ir.join("\n");
  if(id==="blocksPane")return latest.blocks.map(b=>b.id+":\n"+b.instructions.join("\n")).join("\n\n");
  if(id==="graphPane")return latest.edges.map(e=>e.from+" -> "+e.to+(e.label?" ("+e.label+")":"")).join("\n");
  return latest.assembly.join("\n");
}
$("copyBtn").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(currentOutput());$("copyBtn").textContent="✓ Copied";setTimeout(()=>$("copyBtn").textContent="▢ Copy output",1200)}
  catch{$("copyBtn").textContent="Clipboard unavailable"}
});
$("exportBtn").addEventListener("click",()=>{
  if(!latest)return;
  const content=["COMPILER LAB PRO — COMPILATION REPORT","","STATISTICS",JSON.stringify(latest.stats,null,2),"","THREE-ADDRESS CODE",...latest.ir,"","BASIC BLOCKS",...latest.blocks.flatMap(b=>[b.id+":",...b.instructions,""]),"CONTROL-FLOW EDGES",...latest.edges.map(e=>`${e.from} -> ${e.to}${e.label?" ("+e.label+")":""}`),"","SYMBOL TABLE",...latest.symbols.map(s=>`${s.name}: ${s.type}`),"","PSEUDO-ASSEMBLY",...latest.assembly].join("\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="compiler-lab-report.txt";a.click();URL.revokeObjectURL(url);
});
$("themeBtn").addEventListener("click",()=>document.body.classList.toggle("dark"));
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();$("compileBtn").click()}});
refreshEditor();updateCursor();
