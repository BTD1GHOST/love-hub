import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCJdRcwZD9l83A02h1ysPI_VWTc1IGRSM",
  authDomain: "love-hub-d4f77.firebaseapp.com",
  projectId: "love-hub-d4f77",
  storageBucket: "love-hub-d4f77.firebasestorage.app",
  messagingSenderId: "189429669803",
  appId: "1:189429669803:web:e2e6cb2488d234e1fafcee"
};

const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const authView = document.getElementById("authView");
const pendingView = document.getElementById("pendingView");
const appView = document.getElementById("appView");
const btnSignOut = document.getElementById("btnSignOut");

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const authMsg = document.getElementById("authMsg");

const adminTabBtn = document.querySelector(".adminOnly");
const btnRefreshUsers = document.getElementById("btnRefreshUsers");
const pendingList = document.getElementById("pendingList");
const adminMsg = document.getElementById("adminMsg");

// Chat UI
const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const imgPick = document.getElementById("imgPick");
const sendImgBtn = document.getElementById("sendImgBtn");

// Fullscreen image viewer UI
const imgModal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const saveChatBtn = document.getElementById("saveChatBtn");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const fsTitle = document.getElementById("fsTitle");

// Saved tab UI
const savedGrid = document.getElementById("savedGrid");

// Draw UI
const drawCanvas = document.getElementById("drawCanvas");
const canvasWrap = document.getElementById("canvasWrap");
const toolMode = document.getElementById("toolMode");
const brushType = document.getElementById("brushType");
const penColor = document.getElementById("penColor");
const penSize = document.getElementById("penSize");
const penOpacity = document.getElementById("penOpacity");
const penSmooth = document.getElementById("penSmooth");
const fillTol = document.getElementById("fillTol");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const symBtn = document.getElementById("symBtn");
const clearBtn = document.getElementById("clearBtn");
const fsDrawBtn = document.getElementById("fsDrawBtn");
const saveDrawBtn = document.getElementById("saveDrawBtn");
const drawGallery = document.getElementById("drawGallery");

// Text controls
const textControls = document.getElementById("textControls");
const textValue = document.getElementById("textValue");
const textFont = document.getElementById("textFont");
const textSize = document.getElementById("textSize");
const textBold = document.getElementById("textBold");

function show(view){
  authView.classList.add("hidden");
  pendingView.classList.add("hidden");
  appView.classList.add("hidden");
  btnSignOut.classList.add("hidden");
  view.classList.remove("hidden");
}
function setMsg(el, text, ok=false){
  if(!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#1f7a44" : "#8a1b3d";
}

// Tabs
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`).classList.remove("hidden");
  });
});

// Love counter
function updateLoveDays(){
  const start = new Date("2024-06-18T00:00:00-04:00");
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000*60*60*24));
  const el = document.getElementById("loveDays");
  if (el) el.textContent = days.toLocaleString();
}
setInterval(updateLoveDays, 10_000);
updateLoveDays();

// Auth
btnSignUp.onclick = async () => {
  setMsg(authMsg, "");
  try{
    const email = emailEl.value.trim();
    const password = passEl.value;
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      approved: false,
      isAdmin: false,
      denied: false,
      createdAt: serverTimestamp()
    });

    setMsg(authMsg, "Account created! Waiting for approval 💗", true);
  }catch(e){
    setMsg(authMsg, e.message);
  }
};

btnSignIn.onclick = async () => {
  setMsg(authMsg, "");
  try{
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  }catch(e){
    setMsg(authMsg, e.message);
  }
};

btnSignOut.onclick = () => signOut(auth);

// Admin approvals
async function loadPendingUsers(){
  pendingList.innerHTML = "";
  setMsg(adminMsg, "Loading pending users…", true);

  try{
    const q = query(
      collection(db, "users"),
      where("approved", "==", false),
      where("denied", "==", false)
    );

    const snap = await getDocs(q);

    if(snap.empty){
      setMsg(adminMsg, "No pending users right now 💗", true);
      return;
    }

    setMsg(adminMsg, `Pending: ${snap.size}`, true);

    snap.forEach(d=>{
      const u = d.data();

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `<div><b>${u.email || "(no email)"}</b></div><small>${d.id}</small>`;

      const actions = document.createElement("div");
      actions.className = "actions";

      const approveBtn = document.createElement("button");
      approveBtn.className = "btn primary";
      approveBtn.textContent = "Approve ✅";
      approveBtn.onclick = async () => {
        approveBtn.disabled = true;
        await updateDoc(doc(db, "users", d.id), {
          approved: true,
          denied: false,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.uid || ""
        });
        loadPendingUsers();
      };

      const denyBtn = document.createElement("button");
      denyBtn.className = "btn";
      denyBtn.textContent = "Deny ⛔";
      denyBtn.onclick = async () => {
        denyBtn.disabled = true;
        await updateDoc(doc(db, "users", d.id), {
          denied: true,
          approved: false,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.uid || ""
        });
        loadPendingUsers();
      };

      actions.appendChild(approveBtn);
      actions.appendChild(denyBtn);

      row.appendChild(left);
      row.appendChild(actions);
      pendingList.appendChild(row);
    });

  }catch(e){
    setMsg(adminMsg, e.message);
  }
}
btnRefreshUsers?.addEventListener("click", loadPendingUsers);

// Upload to R2
async function uploadImageToR2(file) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${WORKER_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Filename": file.name,
      "X-Content-Type": file.type || "application/octet-stream"
    },
    body: await file.arrayBuffer()
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json(); // { key }
}

// Fetch blob
async function fetchImageBlob(key) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${WORKER_URL}/media/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.blob();
}

// Download
async function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename || "photo.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

// Fullscreen viewer state
let openKey = null;
let openFilename = null;
let openContentType = null;

function openFullscreenWithBlob(blob, meta){
  openKey = meta.key;
  openFilename = meta.filename || "image.jpg";
  openContentType = meta.contentType || "image/*";

  fsTitle.textContent = meta.filename || "Photo";
  const url = URL.createObjectURL(blob);
  modalImg.src = url;

  imgModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  imgModal.dataset.blobUrl = url;

  if (saveChatBtn) saveChatBtn.textContent = "💾 Save";
}

function closeFullscreen(){
  imgModal.classList.add("hidden");
  document.body.style.overflow = "";
  const url = imgModal.dataset.blobUrl;
  if(url) URL.revokeObjectURL(url);
  imgModal.dataset.blobUrl = "";
  modalImg.src = "";
  openKey = null;
  openFilename = null;
  openContentType = null;
}

closeModal?.addEventListener("click", closeFullscreen);
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && !imgModal.classList.contains("hidden")) closeFullscreen();
});

saveChatBtn?.addEventListener("click", async ()=>{
  if(!openKey) return;
  await addDoc(collection(db, "saved"), {
    key: openKey,
    filename: openFilename,
    contentType: openContentType,
    savedBy: auth.currentUser.uid,
    savedAt: serverTimestamp()
  });
  saveChatBtn.textContent = "✅ Saved";
  setTimeout(()=> saveChatBtn.textContent = "💾 Save", 1200);
});

saveDeviceBtn?.addEventListener("click", async ()=>{
  if(!openKey) return;
  try {
    const blob = await fetchImageBlob(openKey);
    await downloadBlob(blob, openFilename || "photo.jpg");
  } catch (e) {
    alert(e.message);
  }
});

// Saved tab realtime
function startSavedRealtime(){
  if(!savedGrid) return;

  const qSaved = query(collection(db, "saved"), orderBy("savedAt"), limit(200));

  onSnapshot(qSaved, (snap) => {
    savedGrid.innerHTML = "";

    snap.forEach((d)=>{
      const s = d.data();

      const card = document.createElement("div");
      card.className = "savedCard";

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "saved";

      (async ()=>{
        try{
          const blob = await fetchImageBlob(s.key);
          img.src = URL.createObjectURL(blob);
          img.addEventListener("click", ()=>{
            openFullscreenWithBlob(blob, { key:s.key, filename:s.filename, contentType:s.contentType });
          });
        }catch{
          img.src = "";
        }
      })();

      const meta = document.createElement("div");
      meta.className = "muted tiny";
      meta.textContent = s.filename || "image";

      card.appendChild(img);
      card.appendChild(meta);
      savedGrid.appendChild(card);
    });
  });
}

// Chat realtime
function startChatRealtime(){
  if(!chatBox) return;

  sendBtn?.addEventListener("click", async () => {
    const text = chatText.value.trim();
    if(!text) return;

    await addDoc(collection(db, "messages"), {
      kind: "text",
      text,
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      createdAt: serverTimestamp()
    });

    chatText.value = "";
  });

  sendImgBtn?.addEventListener("click", async () => {
    if (!imgPick?.files?.length) return;
    const file = imgPick.files[0];

    if (file.size > 6 * 1024 * 1024) {
      alert("Max 6MB per image.");
      return;
    }

    sendImgBtn.disabled = true;

    try {
      const { key } = await uploadImageToR2(file);

      await addDoc(collection(db, "messages"), {
        kind: "image",
        key,
        filename: file.name,
        contentType: file.type || "image/*",
        viewOnce: true,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        createdAt: serverTimestamp()
      });

      imgPick.value = "";
    } catch (e) {
      alert(e.message);
    } finally {
      sendImgBtn.disabled = false;
    }
  });

  const qMsg = query(collection(db, "messages"), orderBy("createdAt"), limit(200));

  onSnapshot(qMsg, (snap) => {
    chatBox.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const mine = m.uid === auth.currentUser.uid;

      const div = document.createElement("div");
      div.className = "msgBubble " + (mine ? "msgMe" : "msgOther");

      if (m.kind === "image") {
        div.textContent = mine ? "📸 You sent a pic" : "📸 Tap to view pic";
        div.classList.add("snap");

        const viewDocRef = doc(db, "messages", d.id, "views", auth.currentUser.uid);

        getDoc(viewDocRef).then((vs) => {
          if (vs.exists()) {
            div.classList.remove("snap");
            div.classList.add("opened");
            div.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
          }
        });

        div.addEventListener("click", async () => {
          const vs = await getDoc(viewDocRef);
          if (vs.exists()) return;

          try {
            const blob = await fetchImageBlob(m.key);
            openFullscreenWithBlob(blob, { key:m.key, filename:m.filename, contentType:m.contentType });

            await setDoc(viewDocRef, { openedAt: serverTimestamp() });

            div.classList.remove("snap");
            div.classList.add("opened");
            div.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
          } catch (e) {
            alert(e.message);
          }
        });

      } else {
        div.textContent = m.text || "";
      }

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

/* ===============================
   DRAW — Advanced + Bucket + Text
   =============================== */

function startDrawingBoard(){
  if(!drawCanvas || !canvasWrap) return;

  const ctx = drawCanvas.getContext("2d", { willReadFrequently: true });

  // base white
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,drawCanvas.width, drawCanvas.height);
  ctx.restore();

  // text tool state
  let boldOn = false;
  textBold?.addEventListener("click", ()=>{
    boldOn = !boldOn;
    textBold.classList.toggle("activeBold", boldOn);
    textBold.textContent = boldOn ? "B ✓" : "B";
  });

  // toggle text controls visibility based on tool mode
  function refreshToolUI(){
    const mode = toolMode?.value || "brush";
    if (textControls) textControls.style.display = (mode === "text") ? "flex" : "none";
  }
  toolMode?.addEventListener("change", refreshToolUI);
  refreshToolUI();

  // undo/redo stacks
  const UNDO_LIMIT = 30;
  let undoStack = [];
  let redoStack = [];

  function updateUndoRedoButtons(){
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function snapshot(){
    try{
      const img = ctx.getImageData(0,0,drawCanvas.width, drawCanvas.height);
      undoStack.push(img);
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
      redoStack = [];
      updateUndoRedoButtons();
    }catch{}
  }

  function restore(img){ ctx.putImageData(img,0,0); }

  undoBtn?.addEventListener("click", ()=>{
    if (!undoStack.length) return;
    const current = ctx.getImageData(0,0,drawCanvas.width, drawCanvas.height);
    redoStack.push(current);
    const prev = undoStack.pop();
    restore(prev);
    updateUndoRedoButtons();
  });

  redoBtn?.addEventListener("click", ()=>{
    if (!redoStack.length) return;
    const current = ctx.getImageData(0,0,drawCanvas.width, drawCanvas.height);
    undoStack.push(current);
    const next = redoStack.pop();
    restore(next);
    updateUndoRedoButtons();
  });

  // symmetry
  let symmetry = false;
  symBtn?.addEventListener("click", ()=>{
    symmetry = !symmetry;
    symBtn.textContent = symmetry ? "🪞 Symmetry: On" : "🪞 Symmetry: Off";
  });

  clearBtn?.addEventListener("click", ()=>{
    snapshot();
    ctx.clearRect(0,0,drawCanvas.width, drawCanvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,drawCanvas.width, drawCanvas.height);
  });

  // fullscreen
  function isFullscreen(){ return document.fullscreenElement === canvasWrap; }
  fsDrawBtn?.addEventListener("click", async ()=>{
    try{
      if(!document.fullscreenEnabled) return alert("Fullscreen not supported here.");
      if(isFullscreen()) await document.exitFullscreen();
      else await canvasWrap.requestFullscreen();
    }catch(e){ alert(e.message); }
  });
  document.addEventListener("fullscreenchange", ()=>{
    if (!fsDrawBtn) return;
    fsDrawBtn.textContent = isFullscreen() ? "Exit Fullscreen" : "⛶ Fullscreen";
  });

  // smoothing helper
  function smoothPoint(prev, next, smoothAmt){
    return {
      x: prev.x + (next.x - prev.x) * (1 - smoothAmt),
      y: prev.y + (next.y - prev.y) * (1 - smoothAmt)
    };
  }

  function getBrushSettings(){
    const type = brushType?.value || "pen";
    const color = penColor?.value || "#ff4fa5";
    const size = Number(penSize?.value || 12);
    const opacity = Number(penOpacity?.value || 85) / 100;
    const smooth = Number(penSmooth?.value || 35) / 100;

    const presets = {
      pen:        { mode:"stroke", alpha: opacity,      sizeMult: 1.0, shadow:0,  comp:"source-over" },
      pencil:     { mode:"stroke", alpha: opacity*0.45, sizeMult: 0.8, jitter:0.8,shadow:0,  comp:"source-over" },
      marker:     { mode:"stroke", alpha: opacity*0.75, sizeMult: 1.2, shadow:0,  comp:"source-over" },
      highlighter:{ mode:"stroke", alpha: opacity*0.25, sizeMult: 1.8, shadow:0,  comp:"multiply" },
      spray:      { mode:"spray",  alpha: opacity*0.25, sizeMult: 1.6, density:18, comp:"source-over" },
      calligraphy:{ mode:"stamp",  alpha: opacity*0.8,  sizeMult: 1.4, shadow:0,  comp:"source-over" },
      neon:       { mode:"stroke", alpha: opacity*0.65, sizeMult: 1.2, shadow:18, comp:"source-over" },
      watercolor: { mode:"stroke", alpha: opacity*0.18, sizeMult: 2.0, shadow:6,  comp:"source-over" },
      eraser:     { mode:"stroke", alpha: 1.0,          sizeMult: 1.3, shadow:0,  comp:"destination-out" }
    };

    const p = presets[type] || presets.pen;
    return { type, color, size, opacity, smooth, ...p };
  }

  function canvasPoint(e){
    const rect = drawCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (drawCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (drawCanvas.height / rect.height);
    return { x, y };
  }

  function drawStrokeSegment(a, b, s, pressure=1){
    const size = (s.size * s.sizeMult) * (0.45 + pressure*0.8);

    ctx.save();
    ctx.globalCompositeOperation = s.comp;
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;

    ctx.shadowBlur = s.shadow || 0;
    ctx.shadowColor = s.color;

    if (s.mode === "stroke") {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;

      if (s.jitter) {
        for (let i=0;i<2;i++){
          const jx = (Math.random()-0.5) * s.jitter * 2;
          const jy = (Math.random()-0.5) * s.jitter * 2;
          ctx.beginPath();
          ctx.moveTo(a.x + jx, a.y + jy);
          ctx.lineTo(b.x + jx, b.y + jy);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (s.mode === "spray") {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx,dy));
      const steps = Math.ceil(dist / 6);
      const radius = size;

      for (let i=0;i<steps;i++){
        const t = i/steps;
        const px = a.x + dx*t;
        const py = a.y + dy*t;

        for (let d=0; d<(s.density||16); d++){
          const ang = Math.random()*Math.PI*2;
          const r = Math.random()*radius;
          ctx.fillRect(px + Math.cos(ang)*r, py + Math.sin(ang)*r, 1.5, 1.5);
        }
      }
    }

    if (s.mode === "stamp") {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ang = Math.atan2(dy, dx);

      const dist = Math.max(1, Math.hypot(dx,dy));
      const steps = Math.ceil(dist / 3);
      const w = size * 1.2;
      const h = size * 0.45;

      for (let i=0;i<steps;i++){
        const t = i/steps;
        const px = a.x + dx*t;
        const py = a.y + dy*t;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawSymmetry(a,b,s,pressure){
    drawStrokeSegment(a,b,s,pressure);
    if (!symmetry) return;

    const cx = drawCanvas.width / 2;
    const ma = { x: cx + (cx - a.x), y: a.y };
    const mb = { x: cx + (cx - b.x), y: b.y };
    drawStrokeSegment(ma, mb, s, pressure);
  }

  // --------- BUCKET FILL ----------
  function hexToRgb(hex){
    const h = hex.replace("#","");
    const n = parseInt(h.length===3 ? h.split("").map(c=>c+c).join("") : h, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255, a:255 };
  }

  function colorAt(data, idx){
    return { r:data[idx], g:data[idx+1], b:data[idx+2], a:data[idx+3] };
  }

  function setColor(data, idx, c){
    data[idx]=c.r; data[idx+1]=c.g; data[idx+2]=c.b; data[idx+3]=255;
  }

  function distColor(c1,c2){
    const dr=c1.r-c2.r, dg=c1.g-c2.g, db=c1.b-c2.b, da=c1.a-c2.a;
    return Math.sqrt(dr*dr+dg*dg+db*db+da*da);
  }

  function bucketFill(x,y){
    const tol = Number(fillTol?.value || 24);
    const target = hexToRgb(penColor?.value || "#ff4fa5");

    const img = ctx.getImageData(0,0,drawCanvas.width, drawCanvas.height);
    const data = img.data;
    const w = img.width;
    const h = img.height;

    const sx = Math.max(0, Math.min(w-1, Math.floor(x)));
    const sy = Math.max(0, Math.min(h-1, Math.floor(y)));
    const startIdx = (sy*w + sx) * 4;
    const startCol = colorAt(data, startIdx);

    // if already basically same color, do nothing
    if (distColor(startCol, target) <= 1) return;

    const visited = new Uint8Array(w*h);
    const stack = [[sx, sy]];

    while(stack.length){
      const [cx, cy] = stack.pop();
      const pos = cy*w + cx;
      if (visited[pos]) continue;
      visited[pos]=1;

      const idx = pos*4;
      const cur = colorAt(data, idx);

      if (distColor(cur, startCol) > tol) continue;

      setColor(data, idx, target);

      if (cx>0) stack.push([cx-1, cy]);
      if (cx<w-1) stack.push([cx+1, cy]);
      if (cy>0) stack.push([cx, cy-1]);
      if (cy<h-1) stack.push([cx, cy+1]);
    }

    ctx.putImageData(img,0,0);

    // symmetry fill: mirror same point
    if (symmetry){
      const mx = (w/2) + ((w/2) - sx);
      const my = sy;
      // run a second fill using same start color at mirrored pixel
      // (best effort — will fill mirrored region)
      const img2 = ctx.getImageData(0,0,w,h);
      const data2 = img2.data;

      const msx = Math.max(0, Math.min(w-1, Math.floor(mx)));
      const msy = Math.max(0, Math.min(h-1, Math.floor(my)));
      const mStartIdx = (msy*w + msx) * 4;
      const mStartCol = colorAt(data2, mStartIdx);
      const visited2 = new Uint8Array(w*h);
      const stack2 = [[msx, msy]];

      while(stack2.length){
        const [cx, cy] = stack2.pop();
        const pos = cy*w + cx;
        if (visited2[pos]) continue;
        visited2[pos]=1;

        const idx = pos*4;
        const cur = colorAt(data2, idx);

        if (distColor(cur, mStartCol) > tol) continue;
        setColor(data2, idx, target);

        if (cx>0) stack2.push([cx-1, cy]);
        if (cx<w-1) stack2.push([cx+1, cy]);
        if (cy>0) stack2.push([cx, cy-1]);
        if (cy<h-1) stack2.push([cx, cy+1]);
      }
      ctx.putImageData(img2,0,0);
    }
  }

  // --------- TEXT TOOL ----------
  function fontFamilyFromSelect(v){
    if (v === "serif") return "Georgia, 'Times New Roman', serif";
    if (v === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    if (v === "cursive") return "'Comic Sans MS', 'Brush Script MT', cursive";
    return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  }

  function placeText(x,y){
    const txt = (textValue?.value || "").trim();
    if (!txt) return alert("Type something first 🙂");

    snapshot();

    const size = Number(textSize?.value || 44);
    const family = fontFamilyFromSelect(textFont?.value || "system");
    const weight = boldOn ? "800" : "600";

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = Number(penOpacity?.value || 85) / 100;
    ctx.fillStyle = penColor?.value || "#ff4fa5";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = `${weight} ${size}px ${family}`;

    // slight shadow for aesthetics (tiny)
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,.15)";

    ctx.fillText(txt, x, y);

    if (symmetry){
      const cx = drawCanvas.width / 2;
      const mx = cx + (cx - x);
      ctx.fillText(txt, mx, y);
    }

    ctx.restore();
  }

  // pointer drawing state (brush only)
  let drawing = false;
  let smoothLast = null;

  function onDown(e){
    const mode = toolMode?.value || "brush";

    // BUCKET
    if (mode === "bucket"){
      snapshot();
      const p = canvasPoint(e);
      bucketFill(p.x, p.y);
      updateUndoRedoButtons();
      return;
    }

    // TEXT
    if (mode === "text"){
      const p = canvasPoint(e);
      placeText(p.x, p.y);
      updateUndoRedoButtons();
      return;
    }

    // BRUSH
    drawing = true;
    snapshot();

    const raw = canvasPoint(e);
    smoothLast = { ...raw };
    drawCanvas.setPointerCapture?.(e.pointerId);
  }

  function onMove(e){
    if (!drawing) return;

    const s = getBrushSettings();
    const raw = canvasPoint(e);
    const smoothAmt = Math.min(0.9, Math.max(0, s.smooth));
    smoothLast = smoothPoint(smoothLast, raw, smoothAmt);

    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 1;
    drawSymmetry(smoothLast, raw, s, pressure);
  }

  function onUp(){
    drawing = false;
    smoothLast = null;
    updateUndoRedoButtons();
  }

  drawCanvas.addEventListener("pointerdown", (e)=>{ e.preventDefault(); onDown(e); });
  drawCanvas.addEventListener("pointermove", (e)=>{ e.preventDefault(); onMove(e); });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  // Save drawing
  saveDrawBtn?.addEventListener("click", async ()=>{
    try{
      saveDrawBtn.disabled = true;

      const blob = await new Promise((resolve)=> drawCanvas.toBlob(resolve, "image/png", 1));
      if(!blob) throw new Error("Could not save drawing.");

      const file = new File([blob], `drawing_${Date.now()}.png`, { type:"image/png" });
      const { key } = await uploadImageToR2(file);

      await addDoc(collection(db, "drawings"), {
        key,
        filename: file.name,
        contentType: "image/png",
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        createdAt: serverTimestamp()
      });

      alert("Saved 💗");
    }catch(e){
      alert(e.message);
    }finally{
      saveDrawBtn.disabled = false;
    }
  });

  updateUndoRedoButtons();
}

function startDrawGallery(){
  if(!drawGallery) return;

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt"), limit(200));

  onSnapshot(qDraw, (snap)=>{
    drawGallery.innerHTML = "";

    snap.forEach((d)=>{
      const it = d.data();

      const card = document.createElement("div");
      card.className = "savedCard";

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "drawing";

      (async ()=>{
        try{
          const blob = await fetchImageBlob(it.key);
          img.src = URL.createObjectURL(blob);
          img.addEventListener("click", ()=>{
            openFullscreenWithBlob(blob, { key:it.key, filename:it.filename, contentType:it.contentType });
          });
        }catch{
          img.src = "";
        }
      })();

      const meta = document.createElement("div");
      meta.className = "muted tiny";
      meta.textContent = it.email || "drawing";

      card.appendChild(img);
      card.appendChild(meta);
      drawGallery.appendChild(card);
    });
  });
}

// Auth gate
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    show(authView);
    return;
  }

  btnSignOut.classList.remove("hidden");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if(!snap.exists()){
    await setDoc(userRef, {
      email: user.email || "",
      approved: false,
      isAdmin: false,
      denied: false,
      createdAt: serverTimestamp()
    });
    show(pendingView);
    return;
  }

  const data = snap.data();

  if(data.denied || !data.approved){
    show(pendingView);
    return;
  }

  show(appView);

  if(data.isAdmin) adminTabBtn?.classList.remove("hidden");
  else adminTabBtn?.classList.add("hidden");

  startChatRealtime();
  startSavedRealtime();
  startDrawingBoard();
  startDrawGallery();
});
