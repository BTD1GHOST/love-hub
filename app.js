// ===============================
// OUR LITTLE HUB — app.js (FULL)
// Username+Password (no email input) via username@lovehub.local
// All features: Chat + view-once pics + fullscreen + Saved select/unsave
// Draw advanced (bucket + text + brushes + undo/redo + symmetry + fullscreen)
// Love MyLove vibe + Calendar month view + Admin approvals + accounts + clear chat
// Listeners start AFTER auth is ready (no early permission spam)
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
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

// Cloudflare Worker base URL
const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
   UI refs
   =============================== */
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");

const usernameEl = document.getElementById("username");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const authMsg = document.getElementById("authMsg");

const pendingBanner = document.getElementById("pendingBanner");
const statusChip = document.getElementById("statusChip");

// tabs
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
  });
});

/* ===============================
   Helpers
   =============================== */
function showAuth() {
  authView?.classList.remove("hidden");
  appView?.classList.add("hidden");
}
function showApp() {
  authView?.classList.add("hidden");
  appView?.classList.remove("hidden");
}
function setMsg(el, text, ok = false) {
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#1f7a44" : "#8a1b3d";
}
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function normalizeUsername(u) {
  return String(u || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function usernameToEmail(u) {
  // Fake email to use Firebase Email/Password auth without exposing an email field
  return `${normalizeUsername(u)}@lovehub.local`;
}

function isPermissionDenied(err) {
  return err?.code === "permission-denied" || String(err?.message || "").includes("permission");
}

function warnPermission(err, where) {
  if (isPermissionDenied(err)) {
    console.warn(`Action blocked (safe to ignore) @ ${where}`, err.code || err.message);
    return true;
  }
  return false;
}

/* ===============================
   Auth: username + password
   =============================== */
btnSignUp?.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    const u = normalizeUsername(usernameEl.value);
    const p = passEl.value;

    if (!u || u.length < 3) return setMsg(authMsg, "Username must be at least 3 characters.");
    if (!p || p.length < 6) return setMsg(authMsg, "Password must be at least 6 characters.");

    const email = usernameToEmail(u);

    const cred = await createUserWithEmailAndPassword(auth, email, p);

    // Create user profile doc
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      username: u,
      approved: false,
      isAdmin: false,
      denied: false,
      nickname: u, // default display name
      createdAt: serverTimestamp()
    });

    setMsg(authMsg, "Account created! Waiting for approval 💗", true);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

btnSignIn?.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    const u = normalizeUsername(usernameEl.value);
    const p = passEl.value;
    if (!u) return setMsg(authMsg, "Enter your username.");
    if (!p) return setMsg(authMsg, "Enter your password.");

    const email = usernameToEmail(u);
    await signInWithEmailAndPassword(auth, email, p);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

/* ===============================
   Nickname map (for chat labels)
   =============================== */
let uidToName = {};
let usersUnsub = null;

function startUsersRealtime() {
  if (usersUnsub) usersUnsub();
  usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
    const map = {};
    snap.forEach((d) => {
      const u = d.data();
      map[d.id] = u.nickname?.trim() || u.username || u.email || d.id;
    });
    uidToName = map;
  }, (err) => {
    warnPermission(err, "users snapshot");
  });
}
function displayNameFor(uid, fallback = "") {
  return uidToName[uid] || fallback || uid || "Someone";
}

/* ===============================
   R2 Worker helpers
   =============================== */
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
  a.download = filename || "photo.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

/* ===============================
   Fullscreen image viewer
   =============================== */
const imgModal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const saveChatBtn = document.getElementById("saveChatBtn");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const fsTitle = document.getElementById("fsTitle");

let openKey = null;
let openFilename = null;
let openContentType = null;

function openFullscreenWithBlob(blob, meta) {
  openKey = meta.key;
  openFilename = meta.filename || "image.jpg";
  openContentType = meta.contentType || "image/*";

  if (fsTitle) fsTitle.textContent = meta.filename || "Photo";

  const url = URL.createObjectURL(blob);
  if (modalImg) modalImg.src = url;

  imgModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (imgModal) imgModal.dataset.blobUrl = url;

  if (saveChatBtn) saveChatBtn.textContent = "💾 Save";
}

function closeFullscreen() {
  imgModal?.classList.add("hidden");
  document.body.style.overflow = "";
  const url = imgModal?.dataset?.blobUrl;
  if (url) URL.revokeObjectURL(url);
  if (imgModal) imgModal.dataset.blobUrl = "";
  if (modalImg) modalImg.src = "";
  openKey = null;
  openFilename = null;
  openContentType = null;
}

closeModal?.addEventListener("click", closeFullscreen);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && imgModal && !imgModal.classList.contains("hidden")) closeFullscreen();
});

saveChatBtn?.addEventListener("click", async () => {
  if (!openKey) return;
  try {
    await addDoc(collection(db, "saved"), {
      key: openKey,
      filename: openFilename,
      contentType: openContentType,
      savedBy: auth.currentUser.uid,
      savedAt: serverTimestamp()
    });
    if (saveChatBtn) saveChatBtn.textContent = "✅ Saved";
    setTimeout(() => { if (saveChatBtn) saveChatBtn.textContent = "💾 Save"; }, 1200);
  } catch (e) {
    if (!warnPermission(e, "save to saved")) alert(e.message);
  }
});

saveDeviceBtn?.addEventListener("click", async () => {
  if (!openKey) return;
  try {
    const blob = await fetchImageBlob(openKey);
    await downloadBlob(blob, openFilename || "photo.jpg");
  } catch (e) {
    alert(e.message);
  }
});

/* ===============================
   Saved tab: select + unsave
   =============================== */
const savedGrid = document.getElementById("savedGrid");
const savedSelectBtn = document.getElementById("savedSelectBtn");
const savedSelectAllBtn = document.getElementById("savedSelectAllBtn");
const savedUnsaveBtn = document.getElementById("savedUnsaveBtn");

let savedSelectMode = false;
let selectedSavedIds = new Set();
let lastSavedDocs = [];
let savedUnsub = null;

function updateSavedToolbar() {
  if (!savedSelectBtn) return;

  if (!savedSelectMode) {
    savedSelectBtn.textContent = "Select";
    savedSelectAllBtn?.classList.add("hidden");
    savedUnsaveBtn?.classList.add("hidden");
    if (savedUnsaveBtn) savedUnsaveBtn.disabled = true;
    selectedSavedIds.clear();
  } else {
    savedSelectBtn.textContent = "Done";
    savedSelectAllBtn?.classList.remove("hidden");
    savedUnsaveBtn?.classList.remove("hidden");
    if (savedUnsaveBtn) savedUnsaveBtn.disabled = selectedSavedIds.size === 0;
  }
}

savedSelectBtn?.addEventListener("click", () => {
  savedSelectMode = !savedSelectMode;
  if (!savedSelectMode) selectedSavedIds.clear();
  updateSavedToolbar();
  renderSavedGrid(lastSavedDocs);
});

savedSelectAllBtn?.addEventListener("click", () => {
  if (!savedSelectMode) return;
  if (selectedSavedIds.size === lastSavedDocs.length) selectedSavedIds.clear();
  else selectedSavedIds = new Set(lastSavedDocs.map((d) => d.id));
  updateSavedToolbar();
  renderSavedGrid(lastSavedDocs);
});

savedUnsaveBtn?.addEventListener("click", async () => {
  if (!savedSelectMode) return;
  if (selectedSavedIds.size === 0) return;
  if (!confirm(`Unsave ${selectedSavedIds.size} image(s)?`)) return;

  if (savedUnsaveBtn) savedUnsaveBtn.disabled = true;

  try {
    for (const id of selectedSavedIds) {
      await deleteDoc(doc(db, "saved", id));
    }
    selectedSavedIds.clear();
    updateSavedToolbar();
  } catch (e) {
    if (!warnPermission(e, "unsave")) alert(e.message);
  } finally {
    if (savedUnsaveBtn) savedUnsaveBtn.disabled = false;
  }
});

function renderSavedGrid(docs) {
  if (!savedGrid) return;
  savedGrid.innerHTML = "";

  docs.forEach(({ id, data }) => {
    const s = data;

    const card = document.createElement("div");
    card.className = "savedCard";

    const img = document.createElement("img");
    img.className = "savedThumb";
    img.alt = "saved";

    if (savedSelectMode) {
      const selected = selectedSavedIds.has(id);
      if (selected) card.classList.add("selected");

      const badge = document.createElement("div");
      badge.className = "selBadge";
      badge.textContent = selected ? "✓" : "○";
      card.appendChild(badge);
    }

    (async () => {
      try {
        const blob = await fetchImageBlob(s.key);
        img.src = URL.createObjectURL(blob);

        img.addEventListener("click", () => {
          if (savedSelectMode) {
            if (selectedSavedIds.has(id)) selectedSavedIds.delete(id);
            else selectedSavedIds.add(id);
            updateSavedToolbar();
            renderSavedGrid(lastSavedDocs);
            return;
          }
          openFullscreenWithBlob(blob, { key: s.key, filename: s.filename, contentType: s.contentType });
        });
      } catch {
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

  if (savedSelectMode) {
    if (savedUnsaveBtn) savedUnsaveBtn.disabled = selectedSavedIds.size === 0;
  }
}

function startSavedListener() {
  if (!savedGrid) return;
  if (savedUnsub) savedUnsub();

  const qSaved = query(collection(db, "saved"), orderBy("savedAt"), limit(300));

  savedUnsub = onSnapshot(qSaved, (snap) => {
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    lastSavedDocs = docs;
    renderSavedGrid(docs);
  }, (err) => {
    warnPermission(err, "saved snapshot");
  });

  updateSavedToolbar();
}

/* ===============================
   Chat realtime
   =============================== */
const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const imgPick = document.getElementById("imgPick");
const sendImgBtn = document.getElementById("sendImgBtn");

let chatUnsub = null;

function startChatListener() {
  if (!chatBox) return;
  if (chatUnsub) chatUnsub();

  const qMsg = query(collection(db, "messages"), orderBy("createdAt"), limit(250));

  chatUnsub = onSnapshot(qMsg, (snap) => {
    chatBox.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const mine = m.uid === auth.currentUser.uid;

      const div = document.createElement("div");
      div.className = "msgBubble " + (mine ? "msgMe" : "msgOther");

      const meta = document.createElement("div");
      meta.className = "msgMeta";
      meta.textContent = mine ? "You" : displayNameFor(m.uid, m.username || m.email || "");
      div.appendChild(meta);

      const body = document.createElement("div");

      if (m.kind === "image") {
        body.textContent = mine ? "📸 You sent a pic" : "📸 Tap to view pic";
        div.classList.add("snap");
        div.style.cursor = "pointer";

        const viewDocRef = doc(db, "messages", d.id, "views", auth.currentUser.uid);

        getDoc(viewDocRef).then((vs) => {
          if (vs.exists()) {
            div.classList.remove("snap");
            div.classList.add("opened");
            body.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
            div.style.cursor = "default";
          }
        }).catch(() => {});

        // CLICK ANYWHERE on the message bubble
        div.addEventListener("click", async () => {
          try {
            const vs = await getDoc(viewDocRef);
            if (vs.exists()) return;

            const blob = await fetchImageBlob(m.key);
            openFullscreenWithBlob(blob, { key: m.key, filename: m.filename, contentType: m.contentType });

            await setDoc(viewDocRef, { openedAt: serverTimestamp() });

            div.classList.remove("snap");
            div.classList.add("opened");
            body.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
            div.style.cursor = "default";
          } catch (e) {
            if (!warnPermission(e, "open view-once")) alert(e.message);
          }
        });
      } else {
        body.textContent = m.text || "";
      }

      div.appendChild(body);
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }, (err) => {
    warnPermission(err, "messages snapshot");
  });
}

sendBtn?.addEventListener("click", async () => {
  const text = chatText.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      kind: "text",
      text,
      uid: auth.currentUser.uid,
      username: (uidToName[auth.currentUser.uid] || ""),
      createdAt: serverTimestamp()
    });
    chatText.value = "";
  } catch (e) {
    if (!warnPermission(e, "send text")) alert(e.message);
  }
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
      username: (uidToName[auth.currentUser.uid] || ""),
      createdAt: serverTimestamp()
    });

    imgPick.value = "";
  } catch (e) {
    alert(e.message);
  } finally {
    sendImgBtn.disabled = false;
  }
});

/* ===============================
   LOVE TAB
   =============================== */
const LOVE_START = new Date("2024-06-18T00:00:00-04:00");

const loveNamesEl = document.getElementById("loveNames");
const loveStartPrettyEl = document.getElementById("loveStartPretty");
const loveYmdEl = document.getElementById("loveYMD");
const loveMonthsEl = document.getElementById("loveMonths");
const loveWeeksEl = document.getElementById("loveWeeks");
const loveDays2El = document.getElementById("loveDays2");
const loveHoursEl = document.getElementById("loveHours");
const loveNextAnnivEl = document.getElementById("loveNextAnniv");

const loveHero = document.getElementById("loveHero");
const loveSettingsBtn = document.getElementById("loveSettingsBtn");
const loveShareBtn = document.getElementById("loveShareBtn");
const loveBgPick = document.getElementById("loveBgPick");

function fmtDatePretty(d) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function diffYMD(start, end) {
  let y = end.getFullYear() - start.getFullYear();
  let m = end.getMonth() - start.getMonth();
  let d = end.getDate() - start.getDate();
  if (d < 0) {
    m -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    d += prevMonth.getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}
function nextAnniversaryFrom(start, now) {
  const yr = now.getFullYear();
  let next = new Date(yr, start.getMonth(), start.getDate(), 0, 0, 0);
  if (next <= now) next = new Date(yr + 1, start.getMonth(), start.getDate(), 0, 0, 0);
  const ms = next - now;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { next, days };
}
function setLoveBgFromDataUrl(dataUrl) {
  if (!loveHero) return;
  loveHero.style.backgroundImage = `
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.35), rgba(255,255,255,0) 55%),
    linear-gradient(135deg, rgba(255,122,190,.55), rgba(255,220,240,.35)),
    url("${dataUrl}")
  `.trim();
  localStorage.setItem("loveHeroBg", dataUrl);
}
function loadLoveBg() {
  const saved = localStorage.getItem("loveHeroBg");
  if (saved) setLoveBgFromDataUrl(saved);
}
function updateLovePanel() {
  if (!loveStartPrettyEl || !loveYmdEl || !loveMonthsEl || !loveWeeksEl || !loveDays2El || !loveHoursEl || !loveNextAnnivEl) return;

  const now = new Date();
  loveStartPrettyEl.textContent = fmtDatePretty(LOVE_START);

  const { y, m, d } = diffYMD(LOVE_START, now);
  const parts = [];
  if (y) parts.push(`${y} year${y === 1 ? "" : "s"}`);
  if (m) parts.push(`${m} month${m === 1 ? "" : "s"}`);
  parts.push(`${d} day${d === 1 ? "" : "s"}`);
  loveYmdEl.textContent = parts.join(", ");

  const ms = now - LOVE_START;
  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const totalMonths = (y * 12) + m;

  loveMonthsEl.textContent = totalMonths.toLocaleString();
  loveWeeksEl.textContent = totalWeeks.toLocaleString();
  loveDays2El.textContent = totalDays.toLocaleString();
  loveHoursEl.textContent = totalHours.toLocaleString();

  const { days } = nextAnniversaryFrom(LOVE_START, now);
  loveNextAnnivEl.textContent = `${days.toLocaleString()} days`;
}

loveSettingsBtn?.addEventListener("click", () => loveBgPick?.click());
loveBgPick?.addEventListener("change", () => {
  const f = loveBgPick.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => setLoveBgFromDataUrl(reader.result);
  reader.readAsDataURL(f);
});

loveShareBtn?.addEventListener("click", async () => {
  const text =
    `Us 💗\nTogether since ${fmtDatePretty(LOVE_START)}\n` +
    `(${loveYmdEl?.textContent || ""})`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Our Love", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied 💗");
    }
  } catch {}
});

(function initLove(){
  loadLoveBg();
  updateLovePanel();
  setInterval(updateLovePanel, 10_000);
})();

/* ===============================
   DRAW — Advanced + Bucket + Text
   =============================== */
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

const textControls = document.getElementById("textControls");
const textValue = document.getElementById("textValue");
const textFont = document.getElementById("textFont");
const textSize = document.getElementById("textSize");
const textBold = document.getElementById("textBold");

let drawingsUnsub = null;

function startDrawingsListener() {
  if (!drawGallery) return;
  if (drawingsUnsub) drawingsUnsub();

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt"), limit(250));

  drawingsUnsub = onSnapshot(qDraw, (snap) => {
    drawGallery.innerHTML = "";
    snap.forEach((d) => {
      const it = d.data();

      const card = document.createElement("div");
      card.className = "savedCard";

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "drawing";

      (async () => {
        try {
          const blob = await fetchImageBlob(it.key);
          img.src = URL.createObjectURL(blob);
          img.addEventListener("click", () => {
            openFullscreenWithBlob(blob, { key: it.key, filename: it.filename, contentType: it.contentType });
          });
        } catch {
          img.src = "";
        }
      })();

      const meta = document.createElement("div");
      meta.className = "muted tiny";
      meta.textContent = it.createdByName || it.email || "drawing";

      card.appendChild(img);
      card.appendChild(meta);
      drawGallery.appendChild(card);
    });
  }, (err) => {
    warnPermission(err, "drawings snapshot");
  });
}

function startDrawingBoard() {
  if (!drawCanvas || !canvasWrap) return;

  const ctx = drawCanvas.getContext("2d", { willReadFrequently: true });

  // base white
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

  // text tool state
  let boldOn = false;
  textBold?.addEventListener("click", () => {
    boldOn = !boldOn;
    textBold.textContent = boldOn ? "B ✓" : "B";
  });

  function refreshToolUI() {
    const mode = toolMode?.value || "brush";
    if (textControls) textControls.style.display = (mode === "text") ? "flex" : "none";
  }
  toolMode?.addEventListener("change", refreshToolUI);
  refreshToolUI();

  // undo/redo
  const UNDO_LIMIT = 30;
  let undoStack = [];
  let redoStack = [];

  function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function snapshot() {
    try {
      const img = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
      undoStack.push(img);
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
      redoStack = [];
      updateUndoRedoButtons();
    } catch { }
  }

  function restore(img) { ctx.putImageData(img, 0, 0); }

  undoBtn?.addEventListener("click", () => {
    if (!undoStack.length) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    redoStack.push(current);
    const prev = undoStack.pop();
    restore(prev);
    updateUndoRedoButtons();
  });

  redoBtn?.addEventListener("click", () => {
    if (!redoStack.length) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    undoStack.push(current);
    const next = redoStack.pop();
    restore(next);
    updateUndoRedoButtons();
  });

  // symmetry
  let symmetry = false;
  symBtn?.addEventListener("click", () => {
    symmetry = !symmetry;
    symBtn.textContent = symmetry ? "🪞 Symmetry: On" : "🪞 Symmetry: Off";
  });

  clearBtn?.addEventListener("click", () => {
    snapshot();
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  });

  // fullscreen
  function isFullscreen() { return document.fullscreenElement === canvasWrap; }
  fsDrawBtn?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenEnabled) return alert("Fullscreen not supported here.");
      if (isFullscreen()) await document.exitFullscreen();
      else await canvasWrap.requestFullscreen();
    } catch (e) { alert(e.message); }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!fsDrawBtn) return;
    fsDrawBtn.textContent = isFullscreen() ? "Exit Fullscreen" : "⛶ Fullscreen";
  });

  // smoothing helper
  function smoothPoint(prev, next, smoothAmt) {
    return {
      x: prev.x + (next.x - prev.x) * (1 - smoothAmt),
      y: prev.y + (next.y - prev.y) * (1 - smoothAmt)
    };
  }

  function getBrushSettings() {
    const type = brushType?.value || "pen";
    const color = penColor?.value || "#ff4fa5";
    const size = Number(penSize?.value || 12);
    const opacity = Number(penOpacity?.value || 85) / 100;
    const smooth = Number(penSmooth?.value || 35) / 100;

    const presets = {
      pen: { mode: "stroke", alpha: opacity, sizeMult: 1.0, shadow: 0, comp: "source-over" },
      pencil: { mode: "stroke", alpha: opacity * 0.45, sizeMult: 0.8, jitter: 0.8, shadow: 0, comp: "source-over" },
      marker: { mode: "stroke", alpha: opacity * 0.75, sizeMult: 1.2, shadow: 0, comp: "source-over" },
      highlighter: { mode: "stroke", alpha: opacity * 0.25, sizeMult: 1.8, shadow: 0, comp: "multiply" },
      spray: { mode: "spray", alpha: opacity * 0.25, sizeMult: 1.6, density: 18, comp: "source-over" },
      calligraphy: { mode: "stamp", alpha: opacity * 0.8, sizeMult: 1.4, shadow: 0, comp: "source-over" },
      neon: { mode: "stroke", alpha: opacity * 0.65, sizeMult: 1.2, shadow: 18, comp: "source-over" },
      watercolor: { mode: "stroke", alpha: opacity * 0.18, sizeMult: 2.0, shadow: 6, comp: "source-over" },
      eraser: { mode: "stroke", alpha: 1.0, sizeMult: 1.3, shadow: 0, comp: "destination-out" }
    };

    const p = presets[type] || presets.pen;
    return { type, color, size, opacity, smooth, ...p };
  }

  function canvasPoint(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (drawCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (drawCanvas.height / rect.height);
    return { x, y };
  }

  function drawStrokeSegment(a, b, s, pressure = 1) {
    const size = (s.size * s.sizeMult) * (0.45 + pressure * 0.8);

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
        for (let i = 0; i < 2; i++) {
          const jx = (Math.random() - 0.5) * s.jitter * 2;
          const jy = (Math.random() - 0.5) * s.jitter * 2;
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
      const dist = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.ceil(dist / 6);
      const radius = size;

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = a.x + dx * t;
        const py = a.y + dy * t;

        for (let d = 0; d < (s.density || 16); d++) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          ctx.fillRect(px + Math.cos(ang) * r, py + Math.sin(ang) * r, 1.5, 1.5);
        }
      }
    }

    if (s.mode === "stamp") {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ang = Math.atan2(dy, dx);

      const dist = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.ceil(dist / 3);
      const w = size * 1.2;
      const h = size * 0.45;

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = a.x + dx * t;
        const py = a.y + dy * t;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawSymmetry(a, b, s, pressure) {
    drawStrokeSegment(a, b, s, pressure);
    if (!symmetry) return;

    const cx = drawCanvas.width / 2;
    const ma = { x: cx + (cx - a.x), y: a.y };
    const mb = { x: cx + (cx - b.x), y: b.y };
    drawStrokeSegment(ma, mb, s, pressure);
  }

  // BUCKET FILL
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
  }
  function colorAt(data, idx) {
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
  }
  function setColor(data, idx, c) {
    data[idx] = c.r; data[idx + 1] = c.g; data[idx + 2] = c.b; data[idx + 3] = 255;
  }
  function distColor(c1, c2) {
    const dr = c1.r - c2.r, dg = c1.g - c2.g, db = c1.b - c2.b, da = c1.a - c2.a;
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
  }

  function bucketFill(x, y) {
    const tol = Number(fillTol?.value || 24);
    const target = hexToRgb(penColor?.value || "#ff4fa5");

    const img = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const data = img.data;
    const w = img.width;
    const h = img.height;

    const sx = Math.max(0, Math.min(w - 1, Math.floor(x)));
    const sy = Math.max(0, Math.min(h - 1, Math.floor(y)));
    const startIdx = (sy * w + sx) * 4;
    const startCol = colorAt(data, startIdx);
    if (distColor(startCol, target) <= 1) return;

    const visited = new Uint8Array(w * h);
    const stack = [[sx, sy]];

    while (stack.length) {
      const [cx, cy] = stack.pop();
      const pos = cy * w + cx;
      if (visited[pos]) continue;
      visited[pos] = 1;

      const idx = pos * 4;
      const cur = colorAt(data, idx);
      if (distColor(cur, startCol) > tol) continue;

      setColor(data, idx, target);

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < w - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < h - 1) stack.push([cx, cy + 1]);
    }

    ctx.putImageData(img, 0, 0);
  }

  // TEXT TOOL
  function fontFamilyFromSelect(v) {
    if (v === "serif") return "Georgia, 'Times New Roman', serif";
    if (v === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    if (v === "cursive") return "'Comic Sans MS', 'Brush Script MT', cursive";
    return "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  }

  function placeText(x, y) {
    const txt = (textValue?.value || "").trim();
    if (!txt) return alert("Type something first 🙂");

    snapshot();

    const size = Number(textSize?.value || 44);
    const family = fontFamilyFromSelect(textFont?.value || "system");
    const weight = boldOn ? "900" : "800";

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = Number(penOpacity?.value || 85) / 100;
    ctx.fillStyle = penColor?.value || "#ff4fa5";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,.15)";
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  // pointer state
  let drawing = false;
  let smoothLast = null;

  function onDown(e) {
    const mode = toolMode?.value || "brush";

    if (mode === "bucket") {
      snapshot();
      const p = canvasPoint(e);
      bucketFill(p.x, p.y);
      updateUndoRedoButtons();
      return;
    }

    if (mode === "text") {
      const p = canvasPoint(e);
      placeText(p.x, p.y);
      updateUndoRedoButtons();
      return;
    }

    drawing = true;
    snapshot();
    const raw = canvasPoint(e);
    smoothLast = { ...raw };
    drawCanvas.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!drawing) return;

    const s = getBrushSettings();
    const raw = canvasPoint(e);
    const smoothAmt = Math.min(0.9, Math.max(0, s.smooth));
    smoothLast = smoothPoint(smoothLast, raw, smoothAmt);

    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 1;
    drawSymmetry(smoothLast, raw, s, pressure);
  }

  function onUp() {
    drawing = false;
    smoothLast = null;
    updateUndoRedoButtons();
  }

  drawCanvas.addEventListener("pointerdown", (e) => { e.preventDefault(); onDown(e); });
  drawCanvas.addEventListener("pointermove", (e) => { e.preventDefault(); onMove(e); });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  updateUndoRedoButtons();
}

// Save drawing to R2 + Firestore
saveDrawBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) return;
  try {
    const blob = await new Promise((resolve) => drawCanvas.toBlob(resolve, "image/png", 0.95));
    if (!blob) return alert("Could not export drawing.");

    const file = new File([blob], `drawing-${Date.now()}.png`, { type: "image/png" });
    const { key } = await uploadImageToR2(file);

    await addDoc(collection(db, "drawings"), {
      key,
      filename: file.name,
      contentType: "image/png",
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || "",
      createdByName: displayNameFor(auth.currentUser.uid, ""),
      createdAt: serverTimestamp()
    });

    alert("Saved 💗");
  } catch (e) {
    if (!warnPermission(e, "save drawing")) alert(e.message);
  }
});

/* ===============================
   CALENDAR — month view + add events
   =============================== */
const addEventBtn = document.getElementById("addEventBtn");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const calTitle = document.getElementById("calTitle");
const calGrid = document.getElementById("calGrid");
const calSelected = document.getElementById("calSelected");
const calEventsList = document.getElementById("calEventsList");

const eventModal = document.getElementById("eventModal");
const eventClose = document.getElementById("eventClose");
const eventTitle = document.getElementById("eventTitle");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const eventNotes = document.getElementById("eventNotes");
const eventSave = document.getElementById("eventSave");

let calUnsub = null;
let calMonth = new Date();
calMonth.setDate(1);
let eventsCache = []; // docs
let selectedYMD = null;

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function niceYMD(s) {
  const [Y, M, D] = s.split("-").map(Number);
  const d = new Date(Y, M - 1, D);
  return d.toLocaleDateString("en-US", { weekday:"short", year:"numeric", month:"long", day:"numeric" });
}

function openEventModal(prefillDate) {
  if (!eventModal) return;
  eventTitle.value = "";
  eventNotes.value = "";
  eventTime.value = "";
  eventDate.value = prefillDate || ymd(new Date());
  eventModal.classList.remove("hidden");
}
function closeEventModal() {
  eventModal?.classList.add("hidden");
}

addEventBtn?.addEventListener("click", () => openEventModal(selectedYMD || ymd(new Date())));
eventClose?.addEventListener("click", closeEventModal);
eventModal?.addEventListener("click", (e) => {
  if (e.target === eventModal) closeEventModal();
});

eventSave?.addEventListener("click", async () => {
  const title = eventTitle.value.trim();
  const date = eventDate.value;
  const time = eventTime.value || "";
  const notes = eventNotes.value.trim();

  if (!title) return alert("Title is required.");
  if (!date) return alert("Date is required.");

  try {
    await addDoc(collection(db, "events"), {
      title,
      date,   // YYYY-MM-DD
      time,   // "HH:MM" or ""
      notes,
      createdBy: auth.currentUser.uid,
      createdByName: displayNameFor(auth.currentUser.uid, ""),
      createdAt: serverTimestamp()
    });
    closeEventModal();
  } catch (e) {
    if (!warnPermission(e, "create event")) alert(e.message);
  }
});

function renderCalendar() {
  if (!calGrid || !calTitle) return;

  const monthName = calMonth.toLocaleDateString("en-US", { month:"long", year:"numeric" });
  calTitle.textContent = monthName;

  const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const startDay = first.getDay(); // 0..6

  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0).getDate();

  const prevMonthDays = new Date(calMonth.getFullYear(), calMonth.getMonth(), 0).getDate();

  const cells = [];
  // leading from prev month
  for (let i = 0; i < startDay; i++) {
    const day = prevMonthDays - (startDay - 1 - i);
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth()-1, day);
    cells.push({ date: d, muted: true });
  }
  // current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    cells.push({ date: d, muted: false });
  }
  // trailing to 42 cells
  while (cells.length < 42) {
    const day = cells.length - (startDay + daysInMonth) + 1;
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, day);
    cells.push({ date: d, muted: true });
  }

  // quick event dots
  const hasEvent = new Set(eventsCache.map(e => e.data.date));

  calGrid.innerHTML = "";
  cells.forEach((c) => {
    const cell = document.createElement("div");
    cell.className = "calCell" + (c.muted ? " mutedCell" : "");
    const dYMD = ymd(c.date);

    if (selectedYMD && dYMD === selectedYMD) cell.classList.add("active");

    const num = document.createElement("div");
    num.className = "dayNum";
    num.textContent = c.date.getDate();

    cell.appendChild(num);

    if (hasEvent.has(dYMD)) {
      const dot = document.createElement("div");
      dot.className = "dot";
      cell.appendChild(dot);
    }

    cell.addEventListener("click", () => {
      selectedYMD = dYMD;
      renderCalendar();
      renderEventsSide();
    });

    calGrid.appendChild(cell);
  });

  if (!selectedYMD) {
    selectedYMD = ymd(new Date());
    renderEventsSide();
  }
}

function renderEventsSide() {
  if (!calSelected || !calEventsList) return;
  calSelected.textContent = selectedYMD ? niceYMD(selectedYMD) : "—";

  const list = eventsCache
    .filter(e => e.data.date === selectedYMD)
    .sort((a,b) => (a.data.time || "").localeCompare(b.data.time || ""));

  calEventsList.innerHTML = "";
  if (list.length === 0) {
    calEventsList.innerHTML = `<div class="muted tiny">No events for this day 💗</div>`;
    return;
  }

  list.forEach(({ id, data }) => {
    const wrap = document.createElement("div");
    wrap.className = "calEvent";

    const top = document.createElement("div");
    top.className = "calEventTop";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="calEventTitle">${esc(data.title)}</div>
      <div class="calEventMeta">${esc(data.time || "All day")} · ${esc(data.createdByName || "")}</div>
    `;

    const right = document.createElement("div");

    top.appendChild(left);
    top.appendChild(right);

    const notes = document.createElement("div");
    notes.className = "calEventNotes";
    notes.textContent = data.notes || "";

    const actions = document.createElement("div");
    actions.className = "calEventActions";

    const canDelete = (window.__isAdmin || data.createdBy === auth.currentUser.uid);

    if (canDelete) {
      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!confirm("Delete this event?")) return;
        try {
          await deleteDoc(doc(db, "events", id));
        } catch (e) {
          if (!warnPermission(e, "delete event")) alert(e.message);
        }
      });
      actions.appendChild(del);
    }

    wrap.appendChild(top);
    if (data.notes) wrap.appendChild(notes);
    wrap.appendChild(actions);

    calEventsList.appendChild(wrap);
  });
}

function startEventsListener() {
  if (calUnsub) calUnsub();

  const qEv = query(collection(db, "events"), orderBy("date"), limit(1000));

  calUnsub = onSnapshot(qEv, (snap) => {
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    eventsCache = docs;
    renderCalendar();
    renderEventsSide();
  }, (err) => {
    warnPermission(err, "events snapshot");
  });

  renderCalendar();
}

calPrev?.addEventListener("click", () => {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
  renderCalendar();
});
calNext?.addEventListener("click", () => {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
  renderCalendar();
});

/* ===============================
   ADMIN
   =============================== */
const adminTabBtn = document.querySelector(".adminOnly");
const btnRefreshUsers = document.getElementById("btnRefreshUsers");
const btnClearChat = document.getElementById("btnClearChat");
const pendingList = document.getElementById("pendingList");
const accountsList = document.getElementById("accountsList");
const adminMsg = document.getElementById("adminMsg");

let accountsUnsub = null;

async function loadPendingUsers() {
  if (!pendingList) return;
  pendingList.innerHTML = "";
  setMsg(adminMsg, "Loading…", true);

  try {
    const qPend = query(
      collection(db, "users"),
      where("approved", "==", false),
      where("denied", "==", false)
    );

    const snap = await getDocs(qPend);

    if (snap.empty) {
      setMsg(adminMsg, "No pending users right now 💗", true);
      return;
    }

    setMsg(adminMsg, `Pending: ${snap.size}`, true);

    snap.forEach((d) => {
      const u = d.data();

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `<div><b>${esc(u.nickname || u.username || u.email || "(no)")}</b></div><small>${esc(d.id)}</small>`;

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
  } catch (e) {
    if (!warnPermission(e, "load pending users")) setMsg(adminMsg, e.message);
  }
}

btnRefreshUsers?.addEventListener("click", loadPendingUsers);

function startAccountsRealtime(isAdmin) {
  if (!accountsList) return;
  if (accountsUnsub) accountsUnsub();
  if (!isAdmin) return;

  const qAll = query(collection(db, "users"), orderBy("createdAt"), limit(500));

  accountsUnsub = onSnapshot(qAll, (snap) => {
    accountsList.innerHTML = "";

    snap.forEach((d) => {
      const u = d.data();
      const uid = d.id;

      const status = u.denied ? "Denied" : (u.approved ? "Approved" : "Pending");
      const name = (u.nickname?.trim() || u.username || "");
      const email = u.email || "";
      const isMe = auth.currentUser?.uid === uid;

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `
        <div><b>${esc(name || email || uid)}</b> <small>(${esc(status)})</small></div>
        <small>${esc(email)} · ${esc(uid)}</small>
      `;

      const actions = document.createElement("div");
      actions.className = "actions";

      const nickBtn = document.createElement("button");
      nickBtn.className = "btn";
      nickBtn.textContent = "Set Display Name";
      nickBtn.onclick = async () => {
        const current = u.nickname || "";
        const next = prompt("Display name for everyone to see:", current);
        if (next === null) return;
        await updateDoc(doc(db, "users", uid), { nickname: String(next).trim() });
      };

      const blockBtn = document.createElement("button");
      blockBtn.className = "btn";
      blockBtn.textContent = u.denied ? "Unblock" : "Block";
      blockBtn.onclick = async () => {
        if (!confirm(`${u.denied ? "Unblock" : "Block"} this user?`)) return;
        await updateDoc(doc(db, "users", uid), {
          denied: !u.denied,
          approved: u.denied ? true : false
        });
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn primary";
      deleteBtn.textContent = "Delete Access";
      deleteBtn.onclick = async () => {
        if (!confirm("This will block them and remove their profile doc. Continue?")) return;
        try { await updateDoc(doc(db, "users", uid), { denied: true, approved: false }); } catch {}
        await deleteDoc(doc(db, "users", uid));
      };

      if (isMe) {
        deleteBtn.disabled = true;
        deleteBtn.title = "Can't delete your own account doc.";
      }

      actions.appendChild(nickBtn);
      actions.appendChild(blockBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(left);
      row.appendChild(actions);
      accountsList.appendChild(row);
    });
  }, (err) => warnPermission(err, "accounts snapshot"));
}

async function clearChat(isAdmin) {
  if (!isAdmin) return;
  if (!confirm("Clear ALL chat messages for everyone?")) return;

  btnClearChat && (btnClearChat.disabled = true);
  setMsg(adminMsg, "Clearing chat…", true);

  try {
    const snap = await getDocs(collection(db, "messages"));
    let count = 0;

    for (const d of snap.docs) {
      await deleteDoc(doc(db, "messages", d.id));
      count++;
    }

    setMsg(adminMsg, `Chat cleared ✅ (${count} deleted)`, true);
  } catch (e) {
    if (!warnPermission(e, "clear chat")) setMsg(adminMsg, e.message);
  } finally {
    btnClearChat && (btnClearChat.disabled = false);
  }
}

btnClearChat?.addEventListener("click", async () => {
  await clearChat(!!window.__isAdmin);
});

/* ===============================
   Gate + Listeners (NO early startup spam)
   =============================== */
let listenersStarted = false;

function setApprovedUI(approved) {
  // pending banner + status chip
  if (pendingBanner) pendingBanner.classList.toggle("hidden", approved);
  if (statusChip) statusChip.textContent = approved ? "Approved ✅" : "Pending ⏳";

  // lock buttons if pending
  const lock = !approved;
  sendBtn && (sendBtn.disabled = lock);
  sendImgBtn && (sendImgBtn.disabled = lock);
  addEventBtn && (addEventBtn.disabled = lock);
  saveDrawBtn && (saveDrawBtn.disabled = lock);
  savedSelectBtn && (savedSelectBtn.disabled = lock);
}

function startAllListenersOnce() {
  if (listenersStarted) return;
  listenersStarted = true;

  console.log("Auth ready, starting Firestore listeners");

  startUsersRealtime();
  startChatListener();
  startSavedListener();
  startDrawingBoard();
  startDrawingsListener();
  startEventsListener();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    listenersStarted = false;
    window.__isAdmin = false;
    showAuth();
    return;
  }

  showApp();

  // ensure profile exists
  const userRef = doc(db, "users", user.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (e) {
    if (!warnPermission(e, "get user profile")) console.error(e);
    // still show app shell
    setApprovedUI(false);
    return;
  }

  if (!snap.exists()) {
    // create a profile doc if missing
    await setDoc(userRef, {
      email: user.email || "",
      username: (user.email || "").split("@")[0] || "",
      approved: false,
      isAdmin: false,
      denied: false,
      nickname: (user.email || "").split("@")[0] || "",
      createdAt: serverTimestamp()
    });
    setApprovedUI(false);
    startAllListenersOnce();
    return;
  }

  const data = snap.data();
  const approved = !!data.approved && !data.denied;

  // admin tab visibility
  const isAdmin = !!data.isAdmin;
  window.__isAdmin = isAdmin;
  if (isAdmin) adminTabBtn?.classList.remove("hidden");
  else adminTabBtn?.classList.add("hidden");

  // set love name
  if (loveNamesEl) loveNamesEl.textContent = "Us 💗";

  // start listeners AFTER auth
  startAllListenersOnce();

  // show pending banner if not approved (no full pending screen)
  setApprovedUI(approved);

  // if admin, start admin screens
  if (isAdmin) {
    loadPendingUsers();
    startAccountsRealtime(true);
  } else {
    // stop admin accounts watcher if not admin
    if (accountsUnsub) { accountsUnsub(); accountsUnsub = null; }
  }
});
