const API_BASE = "/api";

var currentCategory="";
var currentSubject="";
var currentUnit="";
var currentFile="";

function el(id){return document.getElementById(id);}

// ================= CATEGORY =================
function openCategory(name){
currentCategory=name;
showSection("subjects");
el("categoryTitle").innerText=name;
loadSubjects();
}

function goHome(){showSection("home");}
function goSubjects(){showSection("subjects");}
function goUnits(){showSection("units");}

// ================= SUBJECT (LOCAL FOR NOW) =================
function addSubject(){
var input=el("subjectInput").value.trim();
if(!input) return;

var arr=JSON.parse(localStorage.getItem(currentCategory))||[];
arr.push(input);
localStorage.setItem(currentCategory,JSON.stringify(arr));
el("subjectInput").value="";
loadSubjects();
}

function loadSubjects(){
el("subjectList").innerHTML="";
var arr=JSON.parse(localStorage.getItem(currentCategory))||[];
arr.forEach((sub)=>{
var div=document.createElement("div");
div.className="card";
div.innerText=sub;
div.onclick=()=>openUnits(sub);
el("subjectList").appendChild(div);
});
}

// ================= UNITS =================
function openUnits(sub){
currentSubject=sub;
showSection("units");
el("subjectTitle").innerText=sub;
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

fetch(API_BASE + "/get?category=" + currentCategory +
"&subject=" + currentSubject +
"&unit=" + currentUnit)
.then(res=>res.json())
.then(files=>{

files.forEach((f)=>{

var icon="📝";
if(f.type==="image") icon="🖼️";
if(f.type==="file") icon="📄";

var div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>${icon} ${f.name}</strong>
<div class="file-meta">${f.size||""} | ${f.date||""}</div>
<div>
<span onclick="previewFile('${f.name}',event)">👁</span>
<span onclick="renameFile('${f.name}',event)">✏️</span>
<span style="color:red" onclick="deleteFile('${f.name}',event)">🗑</span>
</div>
`;

el("fileList").appendChild(div);

});

});
}

// ================= SAVE NOTE =================
function saveFile(){
var content=el("editorBox").innerHTML;

fetch(API_BASE + "/save",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
category:currentCategory,
subject:currentSubject,
unit:currentUnit,
name:currentFile,
type:"note",
content:content,
size:"Text",
date:new Date().toLocaleDateString()
})
})
.then(()=>{showSection("notesPage");loadFiles();});
}

function createNote(){
var name=prompt("Enter Note Name");
if(!name) return;
currentFile=name;
el("editorTitle").innerText=name;
el("editorBox").innerHTML="";
showSection("editorPage");
}

// ================= UPLOAD =================
function addImage(){
el("imageInput").click();
el("imageInput").onchange=function(){
var file=this.files[0];
var reader=new FileReader();
reader.onload=e=>saveUploadedFile(file.name,e.target.result,"image");
reader.readAsDataURL(file);
};
}

function addFile(){
el("fileInput").click();
el("fileInput").onchange=function(){
var file=this.files[0];
var reader=new FileReader();
reader.onload=e=>saveUploadedFile(file.name,e.target.result,"file");
reader.readAsDataURL(file);
};
}

function saveUploadedFile(name,content,type){

var sizeKB=Math.round((content.length*3/4)/1024);

fetch(API_BASE + "/save",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
category:currentCategory,
subject:currentSubject,
unit:currentUnit,
name:name,
type:type,
content:content,
size:sizeKB+" KB",
date:new Date().toLocaleDateString()
})
})
.then(()=>loadFiles());

}

// ================= DELETE =================
function deleteFile(name,e){
e.stopPropagation();

fetch(API_BASE + "/delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name:name})
})
.then(()=>loadFiles());
}

// ================= RENAME =================
function renameFile(name,e){
e.stopPropagation();

var newName=prompt("Rename file:",name);
if(!newName) return;

fetch(API_BASE + "/rename",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({old:name,new:newName})
})
.then(()=>loadFiles());
}

// ================= PREVIEW =================
function previewFile(name,e){
e.stopPropagation();

fetch(API_BASE + "/get?category=" + currentCategory +
"&subject=" + currentSubject +
"&unit=" + currentUnit)
.then(res=>res.json())
.then(files=>{

var file=files.find(f=>f.name===name);
if(!file) return;

if(file.type==="note"){
currentFile=file.name;
el("editorTitle").innerText=file.name;
el("editorBox").innerHTML=file.content;
showSection("editorPage");
return;
}

if(file.type==="image" || file.type==="file"){
window.open(file.content,"_blank");
}

});
}

// ================= RECYCLE =================
function openRecycle(){
showSection("recycle");

fetch(API_BASE + "/recycle")
.then(res=>res.json())
.then(files=>{

el("recycleList").innerHTML="";

if(files.length===0){
el("recycleList").innerHTML="<p>Recycle Bin is empty.</p>";
return;
}

files.forEach(f=>{
var div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>${f.name}</strong>
<div>
<span onclick="restoreFile('${f.name}')">🔄 Restore</span>
</div>
`;
el("recycleList").appendChild(div);
});

});
}

function restoreFile(name){
fetch(API_BASE + "/restore",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name:name})
})
.then(()=>openRecycle());
}

// ================= SEARCH =================
function globalSearch(){
var keyword=prompt("Enter search keyword:");
if(!keyword) return;

fetch(API_BASE + "/search?q=" + keyword)
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
var div=document.createElement("div");
div.className="card";
div.innerHTML=`
<strong>🔎 ${f.name}</strong>
<div style="font-size:12px;color:gray;">
${f.category} / ${f.subject} / ${f.unit}
</div>
`;

div.onclick=function(){
currentCategory=f.category;
currentSubject=f.subject;
currentUnit=f.unit;
previewFile(f.name,new Event("click"));
};

el("fileList").appendChild(div);
});

});
}

// ================= DARK MODE =================
(function(){
var btn=document.createElement("button");
btn.innerText="🌙";
btn.style.position="fixed";
btn.style.bottom="80px";
btn.style.right="20px";
btn.style.padding="12px 15px";
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
var current=localStorage.getItem("theme")||"light";
applyTheme(current==="light"?"dark":"light");
};

applyTheme(localStorage.getItem("theme")||"light");
})();

// ================= SEARCH BUTTON =================
(function(){
var btn=document.createElement("button");
btn.innerText="🔎";
btn.style.position="fixed";
btn.style.bottom="20px";
btn.style.right="20px";
btn.style.padding="12px 15px";
btn.style.borderRadius="50%";
btn.style.zIndex="9999";
btn.onclick=globalSearch;
document.body.appendChild(btn);
})();

function formatText(cmd){document.execCommand(cmd,false,null);}
function setColor(c){document.execCommand("foreColor",false,c);}