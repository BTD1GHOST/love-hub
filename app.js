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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev";

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

// Fullscreen viewer UI
const imgModal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const saveChatBtn = document.getElementById("saveChatBtn");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const fsTitle = document.getElementById("fsTitle");

// Saved tab UI
const savedGrid = document.getElementById("savedGrid");

// helpers
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

// Cloudflare upload
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

// Fetch image blob
async function fetchImageBlob(key) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${WORKER_URL}/media/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.blob();
}

async function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename || "image.jpg";
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
  // Prevent background scroll
  document.body.style.overflow = "hidden";

  // clean up url when closed
  imgModal.dataset.blobUrl = url;
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

// Fullscreen buttons
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
  const blob = await fetchImageBlob(openKey);
  await downloadBlob(blob, openFilename);
});

// Saved tab realtime
function startSavedRealtime(){
  if(!savedGrid) return;

  const qSaved = query(collection(db, "saved"), orderBy("savedAt"), limit(200));

  onSnapshot(qSaved, async (snap) => {
    savedGrid.innerHTML = "";

    snap.forEach(async (d)=>{
      const s = d.data();

      const card = document.createElement("div");
      card.className = "savedCard";

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "saved";

      // Load thumb
      try{
        const blob = await fetchImageBlob(s.key);
        const url = URL.createObjectURL(blob);
        img.src = url;

        img.addEventListener("click", ()=>{
          openFullscreenWithBlob(blob, { key: s.key, filename: s.filename, contentType: s.contentType });
        });
      }catch{
        img.src = "";
      }

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

  // send text
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

  // send image
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

        // opened check
        getDoc(viewDocRef).then((vs) => {
          if (vs.exists()) {
            div.classList.remove("snap");
            div.classList.add("opened");
            div.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
          }
        });

        // Tap-to-view once
        div.addEventListener("click", async () => {
          const vs = await getDoc(viewDocRef);
          if (vs.exists()) return;

          try {
            const blob = await fetchImageBlob(m.key);
            openFullscreenWithBlob(blob, { key: m.key, filename: m.filename, contentType: m.contentType });

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

  if(data.isAdmin){
    adminTabBtn?.classList.remove("hidden");
  } else {
    adminTabBtn?.classList.add("hidden");
  }

  startChatRealtime();
  startSavedRealtime();
});
