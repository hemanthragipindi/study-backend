const API_BASE = "/api";

var currentCategory="";
var currentSubject="";
var currentUnit="";
var currentFile="";

function el(id){return document.getElementById(id);}

// ================= SECTION CONTROL =================
function showSection(id){
  document.querySelectorAll(".section").forEach(sec=>{
    sec.classList.add("hidden");
  });
  var target = document.getElementById(id);
  if(target) target.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", function(){
  showSection("home");
});

// ================= CATEGORY =================
function openCategory(name){
  currentCategory=name;
  showSection("subjects");
  el("categoryTitle").innerText=name;
  loadSubjects();
}

function goHome(){showSection("home");}

// ================= SUBJECT =================
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

    div.innerHTML = `
      <strong>${sub}</strong>
      <span style="float:right;color:red;cursor:pointer;"
      onclick="deleteSubject('${sub}',event)">🗑</span>
    `;

    div.onclick=()=>openUnits(sub);
    el("subjectList").appendChild(div);
  });
}

function deleteSubject(name,e){
  e.stopPropagation();
  var arr=JSON.parse(localStorage.getItem(currentCategory))||[];
  arr=arr.filter(s=>s!==name);
  localStorage.setItem(currentCategory,JSON.stringify(arr));
  loadSubjects();
}

// ================= UNITS =================
function openUnits(sub){
  currentSubject=sub;
  showSection("units");
  el("subjectTitle").innerText=sub;

  // Dynamically generate units
  var unitContainer = el("unitList");
  if(unitContainer){
    unitContainer.innerHTML="";

    const units = ["Syllabus","Unit1","Unit2","Unit3","Unit4","Unit5","Unit6"];

    units.forEach(u=>{
      var div=document.createElement("div");
      div.className="card";
      div.innerText=u;
      div.onclick=()=>openNotes(u);
      unitContainer.appendChild(div);
    });
  }
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
          <span onclick="downloadFile('${f.name}',event)">⬇</span>
          <span onclick="renameFile('${f.name}',event)">✏️</span>
          <span style="color:red" onclick="deleteFile('${f.name}',event)">🗑</span>
        </div>
      `;

      el("fileList").appendChild(div);
    });
  });
}

// ================= NOTE =================
function createNote(){
  var name=prompt("Enter Note Name");
  if(!name) return;
  currentFile=name;
  el("editorTitle").innerText=name;
  el("editorBox").innerHTML="";
  showSection("editorPage");
}

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
  }).then(()=>{showSection("notesPage");loadFiles();});
}

// ================= UPLOAD =================
function addFile(){
  el("fileInput").click();
  el("fileInput").onchange=function(){
    var file=this.files[0];
    if(!file) return;

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
  }).then(()=>loadFiles());
}

// ================= DELETE =================
function deleteFile(name,e){
  e.stopPropagation();
  fetch(API_BASE + "/delete",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:name})
  }).then(()=>loadFiles());
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
  }).then(()=>loadFiles());
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
    }else{
      window.open(file.content,"_blank");
    }
  });
}

// ================= DOWNLOAD =================
function downloadFile(name,e){
  e.stopPropagation();

  fetch(API_BASE + "/get?category=" + currentCategory +
  "&subject=" + currentSubject +
  "&unit=" + currentUnit)
  .then(res=>res.json())
  .then(files=>{
    var file=files.find(f=>f.name===name);
    if(!file) return;

    var a=document.createElement("a");
    a.href=file.content;
    a.download=name;
    a.click();
  });
}