const API_BASE = "/api";

let currentCategory="";
let currentSubject="";
let currentUnit="";
let currentFile="";
let cachedFiles=[];

// ================= SESSION CHECK =================
fetch("/check-session").then(res=>{
if(res.status===401){ window.location="/"; }
});

// ================= HELPER =================
function el(id){ return document.getElementById(id); }

// ================= DARK MODE =================
(function(){
let btn=document.createElement("button");
btn.innerText="🌙";
btn.style.position="fixed";
btn.style.bottom="20px";
btn.style.right="20px";
btn.style.padding="10px 15px";
btn.style.borderRadius="50%";
btn.style.zIndex="9999";
document.body.appendChild(btn);

function applyTheme(mode){
if(mode==="dark"){
document.body.style.background="#111";
document.body.style.color="#eee";
localStorage.setItem("theme","dark");
btn.innerText="☀️";
}else{
document.body.style.background="";
document.body.style.color="";
localStorage.setItem("theme","light");
btn.innerText="🌙";
}
}

btn.onclick=function(){
let current=localStorage.getItem("theme")||"light";
applyTheme(current==="light"?"dark":"light");
};

applyTheme(localStorage.getItem("theme")||"light");
})();

// ================= STATS =================
function loadStats(){
fetch(API_BASE+"/stats")
.then(res=>res.json())
.then(data=>{
if(!data.total_files) return;

let statsHTML=`
<div class="card-grid">
<div class="card">📁 Total Files<br><strong>${data.total_files}</strong></div>
<div class="card">🗑 Deleted<br><strong>${data.deleted_files}</strong></div>
<div class="card">📚 Subjects<br><strong>${data.subjects}</strong></div>
</div>`;
el("home").insertAdjacentHTML("beforeend",statsHTML);
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
body:JSON.stringify({name:input,category:currentCategory})
})
.then(()=>{ el("subjectInput").value=""; loadSubjects(); });
}

function loadSubjects(){
el("subjectList").innerHTML="";
fetch(`${API_BASE}/get-subjects?category=${currentCategory}`)
.then(res=>res.json())
.then(subjects=>{
subjects.forEach(sub=>{
let div=document.createElement("div");
div.className="card";

div.innerHTML=`
<strong>${sub.name}</strong>
<div style="margin-top:8px;">
<span onclick="event.stopPropagation(); deleteSubject('${sub._id}','${sub.name}')" style="color:red;">🗑</span>
</div>
`;

div.onclick=()=>openUnits(sub.name);
el("subjectList").appendChild(div);
});
});
}

// ================= DELETE SUBJECT =================
function deleteSubject(id,name){
if(!confirm("Move subject to recycle bin?")) return;

fetch(API_BASE+"/delete-subject",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id,name:name})
})
.then(()=>loadSubjects());
}

// ================= UNITS =================
function openUnits(sub){
currentSubject=sub;
showSection("units");
el("subjectTitle").innerText=sub;

let units=["Syllabus","Unit1","Unit2","Unit3","Unit4","Unit5","Unit6"];
let unitList=el("unitList");
unitList.innerHTML="";
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
cachedFiles=files;
if(files.length===0){
el("fileList").innerHTML="<p>No files yet.</p>";
return;
}

files.forEach(f=>{
let icon="📝";
if(f.type==="file") icon="📄";
if(f.type==="image") icon="🖼️";

let div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>${icon} ${f.name}</strong>
<div style="margin-top:8px;">
<span onclick="previewFile('${f._id}',event)">👁</span>
<span onclick="renameFile('${f._id}',event)">✏️</span>
<span onclick="deleteFile('${f._id}',event)" style="color:red;">🗑</span>
</div>
`;
el("fileList").appendChild(div);
});
});
}

// ================= DELETE FILE =================
function deleteFile(id,e){
e.stopPropagation();
if(!confirm("Move to recycle bin?")) return;

fetch(API_BASE+"/delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
})
.then(()=>loadFiles());
}

// ================= RECYCLE =================
function openRecycle(){
showSection("recycle");

Promise.all([
fetch(API_BASE+"/recycle").then(res=>res.json()),
fetch(API_BASE+"/recycle-subjects").then(res=>res.json())
])
.then(([files,subjects])=>{

el("recycleList").innerHTML="";

if(files.length===0 && subjects.length===0){
el("recycleList").innerHTML="<p>Recycle bin empty.</p>";
return;
}

// Deleted Subjects
subjects.forEach(s=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>📚 ${s.name}</strong>
<div style="margin-top:8px;">
<span onclick="restoreSubject('${s._id}','${s.name}')">🔄 Restore</span>
<span onclick="permanentDeleteSubject('${s._id}','${s.name}')" style="color:red;">❌ Delete Forever</span>
</div>`;
el("recycleList").appendChild(div);
});

// Deleted Files
files.forEach(f=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>${f.name}</strong>
<div style="margin-top:8px;">
<span onclick="restoreFile('${f._id}')">🔄 Restore</span>
<span onclick="permanentDelete('${f._id}')" style="color:red;">❌ Delete Forever</span>
</div>`;
el("recycleList").appendChild(div);
});

});
}

function restoreSubject(id,name){
fetch(API_BASE+"/restore-subject",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id,name:name})
}).then(()=>openRecycle());
}

function permanentDeleteSubject(id,name){
if(!confirm("Permanently delete subject?")) return;
fetch(API_BASE+"/permanent-delete-subject",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id,name:name})
}).then(()=>openRecycle());
}

function restoreFile(id){
fetch(API_BASE+"/restore",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
}).then(()=>openRecycle());
}

function permanentDelete(id){
if(!confirm("Permanently delete?")) return;
fetch(API_BASE+"/permanent-delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:id})
}).then(()=>openRecycle());
}

// ================= SEARCH =================
function globalSearch(){
let keyword=prompt("Enter search keyword:");
if(!keyword) return;

fetch(API_BASE+"/search?q="+keyword)
.then(res=>res.json())
.then(results=>{
showSection("notesPage");
el("noteTitle").innerText="Search Results";
el("fileList").innerHTML="";

if(results.length===0){
el("fileList").innerHTML="<p>No results found.</p>";
return;
}

results.forEach(f=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`<strong>🔎 ${f.name}</strong>`;
div.onclick=function(){
currentCategory=f.category;
currentSubject=f.subject;
currentUnit=f.unit;
previewFile(f._id,new Event("click"));
};
el("fileList").appendChild(div);
});
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

document.addEventListener("DOMContentLoaded",function(){
showSection("home");
loadStats();
});