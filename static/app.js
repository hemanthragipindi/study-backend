const API_BASE = "/api";

let currentCategory="";
let currentSubject="";
let currentUnit="";
let currentFile="";
let cachedFiles=[];

// ================= HELPER =================
function el(id){ return document.getElementById(id); }

// ================= SESSION + INIT =================
document.addEventListener("DOMContentLoaded",function(){

fetch("/check-session")
.then(res=>{
if(res.status===401){
window.location="/";
}
});

showSection("home");
loadStats();
});

// ================= DASHBOARD STATS =================
function loadStats(){

fetch(API_BASE+"/stats")
.then(res=>res.json())
.then(data=>{

let statsContainer = document.getElementById("statsContainer");
if(!statsContainer) return;

statsContainer.innerHTML="";

statsContainer.innerHTML = `
<div class="card-grid">
<div class="card">📁 Total Files<br><strong>${data.total_files}</strong></div>
<div class="card">🗑 Deleted Files<br><strong>${data.deleted_files}</strong></div>
<div class="card">📚 Subjects<br><strong>${data.subjects}</strong></div>
</div>
`;

});
}

// ================= CATEGORY =================
function openCategory(name){
currentCategory=name;
showSection("subjects");
el("categoryTitle").innerText=name;
loadSubjects();
}

// ================= SUBJECT =================
function addSubject(){
let input=el("subjectInput").value.trim();
if(!input) return;

fetch(API_BASE+"/add-subject",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
name:input,
category:currentCategory
})
})
.then(()=>{
el("subjectInput").value="";
loadSubjects();
});
}

function loadSubjects(){
el("subjectList").innerHTML="";

fetch(`${API_BASE}/get-subjects?category=${currentCategory}`)
.then(res=>res.json())
.then(subjects=>{
subjects.forEach(sub=>{
let div=document.createElement("div");
div.className="card";
div.innerText=sub.name;
div.onclick=()=>openUnits(sub.name);
el("subjectList").appendChild(div);
});
});
}

// ================= UNITS =================
function openUnits(sub){
currentSubject=sub;
showSection("units");
el("subjectTitle").innerText=sub;

let unitList=el("unitList");
unitList.innerHTML="";

let units=["Syllabus","Unit1","Unit2","Unit3","Unit4","Unit5","Unit6"];

units.forEach(u=>{
let div=document.createElement("div");
div.className="card";
div.innerText=u;
div.onclick=()=>openNotes(u);
unitList.appendChild(div);
});
}

// ================= NOTES =================
function openNotes(unit){
currentUnit=unit;
showSection("notesPage");
el("noteTitle").innerText=unit;
loadFiles();
}

function loadFiles(){
el("fileList").innerHTML="";

fetch(`${API_BASE}/get?category=${currentCategory}&subject=${currentSubject}&unit=${currentUnit}`)
.then(res=>res.json())
.then(files=>{

cachedFiles = files;

if(files.length===0){
el("fileList").innerHTML="<p>No files yet.</p>";
return;
}

files.forEach(f=>{

let icon="📝";
if(f.type==="image") icon="🖼️";
if(f.type==="file") icon="📄";

let div=document.createElement("div");
div.className="card";

div.innerHTML=`
<strong>${icon} ${f.name}</strong>
<div class="file-meta">${f.size||""} | ${f.date||""}</div>
<div style="margin-top:8px;">
<span onclick="previewFile('${f._id}',event)">👁</span>
<span onclick="downloadFile('${f._id}',event)">⬇️</span>
<span onclick="renameFile('${f._id}',event)">✏️</span>
<span style="color:red" onclick="deleteFile('${f._id}',event)">🗑</span>
</div>
`;

el("fileList").appendChild(div);
});
});
}

// ================= DOWNLOAD =================
function downloadFile(id,e){
e.stopPropagation();
let file=cachedFiles.find(f=>f._id===id);
if(!file) return;

let a=document.createElement("a");
a.href=file.content;
a.download=file.name;
a.click();
}

// ================= DELETE =================
function deleteFile(id,e){
e.stopPropagation();
if(!confirm("Delete this file?")) return;

fetch(API_BASE+"/delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
})
.then(()=>loadFiles());
}

// ================= PERMANENT DELETE =================
function permanentDelete(id){
if(!confirm("Permanent delete?")) return;

fetch(API_BASE+"/permanent-delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
})
.then(()=>openRecycle());
}

// ================= RESTORE =================
function restoreFile(id){
fetch(API_BASE+"/restore",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
})
.then(()=>openRecycle());
}

// ================= RECYCLE =================
function openRecycle(){
showSection("recycle");

fetch(API_BASE+"/recycle")
.then(res=>res.json())
.then(files=>{
el("recycleList").innerHTML="";

if(files.length===0){
el("recycleList").innerHTML="<p>Recycle Bin is empty.</p>";
return;
}

files.forEach(f=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>${f.name}</strong>
<div style="margin-top:8px;">
<span onclick="restoreFile('${f._id}')">🔄 Restore</span>
<span style="color:red" onclick="permanentDelete('${f._id}')">❌ Delete Forever</span>
</div>
`;
el("recycleList").appendChild(div);
});
});
}

// ================= PREVIEW =================
function previewFile(id,e){
e.stopPropagation();
let file=cachedFiles.find(f=>f._id===id);
if(!file) return;

if(file.type==="note"){
currentFile=file.name;
el("editorTitle").innerText=file.name;
el("editorBox").innerHTML=file.content;
showSection("editorPage");
return;
}

window.open(file.content,"_blank");
}

// ================= CHANGE PASSWORD =================
function changePassword(){

let oldPass = el("oldPass").value;
let newPass = el("newPass").value;

if(!oldPass || !newPass){
el("passMsg").innerText="Fill all fields";
return;
}

fetch(API_BASE+"/change-password",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
old:oldPass,
new:newPass
})
})
.then(res=>res.json())
.then(data=>{
if(data.error){
el("passMsg").style.color="red";
el("passMsg").innerText=data.error;
}else{
el("passMsg").style.color="lightgreen";
el("passMsg").innerText="Password updated successfully";
el("oldPass").value="";
el("newPass").value="";
}
});
}

// ================= SECTION CONTROL =================
function showSection(id){
document.querySelectorAll(".section").forEach(sec=>{
sec.classList.add("hidden");
});
let target=document.getElementById(id);
if(target) target.classList.remove("hidden");
}