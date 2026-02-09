// ===============================
// OUR LITTLE HUB — app.js (FULL)
// ✅ KEEP EVERYTHING THE SAME
// ✅ ONLY CHANGE: image “snap” opens TRUE fullscreen (Snapchat-style)
// - no tiny centered modal inside the card
// - still tap bubble -> opens immediately
// ===============================

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

// ====== Firebase config (yours) ======
const firebaseConfig = {
  apiKey: "AIzaSyCCJdRcwZD9l83A02h1ysPI_VWTc1IGRSM",
  authDomain: "love-hub-d4f77.firebaseapp.com",
  projectId: "love-hub-d4f77",
  storageBucket: "love-hub-d4f77.firebasestorage.app",
  messagingSenderId: "189429669803",
  appId: "1:189429669803:web:e2e6cb2488d234e1fafcee"
};

// Your Cloudflare Worker base URL (R2 proxy)
const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== UI refs =====
const authView = document.getElementById("authView");
const pendingView = document.getElementById("pendingView");
const appView = document.getElementById("appView");
const btnSignOut = document.getElementById("btnSignOut");

const usernameEl = document.getElementById("username");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const authMsg = document.getElementById("authMsg");

// Admin refs
const adminTabBtn = document.querySelector(".adminOnly");
const btnRefreshUsers = document.getElementById("btnRefreshUsers");
const btnClearChat = document.getElementById("btnClearChat");
const pendingList = document.getElementById("pendingList");
const accountsList = document.getElementById("accountsList");
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
const savedSelectBtn = document.getElementById("savedSelectBtn");
const savedSelectAllBtn = document.getElementById("savedSelectAllBtn");
const savedUnsaveBtn = document.getElementById("savedUnsaveBtn");

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

// Calendar refs
const evtTitle = document.getElementById("evtTitle");
const evtDate = document.getElementById("evtDate");
const evtTime = document.getElementById("evtTime");
const evtNotes = document.getElementById("evtNotes");
const evtAddBtn = document.getElementById("evtAddBtn");
const eventsList = document.getElementById("eventsList");
const calMsg = document.getElementById("calMsg");

// Love refs
const LOVE_START = new Date("2024-06-18T00:00:00-05:00");
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

// ===============================
// Helpers
// ===============================
function show(view) {
  authView?.classList.add("hidden");
  pendingView?.classList.add("hidden");
  appView?.classList.add("hidden");
  btnSignOut?.classList.add("hidden");
  view?.classList.remove("hidden");
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

function normalizeUsername(raw) {
  const u = String(raw || "").trim().toLowerCase();
  const clean = u.replace(/[^a-z0-9._-]/g, "");
  if (clean.length < 3) return "";
  if (clean.length > 24) return clean.slice(0, 24);
  return clean;
}

// We use Firebase email/password under the hood, but user only sees username/password.
function usernameToEmail(username) {
  return `${username}@lovehub.local`;
}

function isPermissionDenied(e) {
  return e && (e.code === "permission-denied" || String(e.message || "").toLowerCase().includes("permission"));
}

function safeOnSnapshot(q, onOk, label = "snapshot") {
  return onSnapshot(
    q,
    (snap) => onOk(snap),
    (e) => {
      if (isPermissionDenied(e)) {
        console.warn(`${label} blocked early read (safe to ignore)`, e.code || e.message);
        return;
      }
      console.error(`${label} error`, e);
    }
  );
}

// ===============================
// Tabs
// ===============================
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
  });
});

// ===============================
// Auth actions (username+password UI)
// ===============================
btnSignUp?.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    const uname = normalizeUsername(usernameEl?.value);
    const password = passEl?.value || "";

    if (!uname) return setMsg(authMsg, "Username must be 3-24 chars (letters/numbers/._-).");
    if (password.length < 6) return setMsg(authMsg, "Password must be at least 6 characters.");

    const email = usernameToEmail(uname);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      username: uname,
      email,
      approved: false,
      isAdmin: false,
      denied: false,
      nickname: "",
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
    const uname = normalizeUsername(usernameEl?.value);
    const password = passEl?.value || "";
    if (!uname) return setMsg(authMsg, "Enter your username.");

    const email = usernameToEmail(uname);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

btnSignOut?.addEventListener("click", async () => {
  await signOut(auth);
});

// ===============================
// R2 Upload / Fetch
// ===============================
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

// =====================================================
// ✅ SNAP FULLSCREEN (Snapchat-style) — ONLY FIX
// =====================================================
let __snapModalPrepared = false;

function prepareSnapModal() {
  if (__snapModalPrepared) return;
  __snapModalPrepared = true;

  // Ensure modal is a direct child of <body> so it can truly cover the viewport
  if (imgModal && imgModal.parentElement !== document.body) {
    document.body.appendChild(imgModal);
  }

  // Inject fullscreen styles (no CSS file changes needed)
  const style = document.createElement("style");
  style.id = "snapModalStyles";
  style.textContent = `
    #imgModal{
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(0,0,0,.95) !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #imgModal.hidden{ display:none !important; }

    #imgModal #modalImg{
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      object-fit: contain !important; /* change to cover if you want snap crop */
      border-radius: 0 !important;
      box-shadow: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      background: transparent !important;
    }

    #imgModal *{ z-index: 1; }

    #imgModal .modalContent,
    #imgModal .modal-inner,
    #imgModal .content{
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      background: transparent !important;
    }

    #imgModal #closeModal,
    #imgModal #saveChatBtn,
    #imgModal #saveDeviceBtn{
      position: fixed !important;
      z-index: 1000000 !important;
    }

    #imgModal #closeModal{
      top: 14px !important;
      left: 14px !important;
    }

    #imgModal #saveChatBtn{
      top: 14px !important;
      right: 14px !important;
    }
    #imgModal #saveDeviceBtn{
      top: 56px !important;
      right: 14px !important;
    }

    #imgModal #fsTitle{
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 1000000 !important;
      color: white !important;
      text-shadow: 0 2px 10px rgba(0,0,0,.5) !important;
      max-width: 70vw !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
  `;

  if (!document.getElementById(style.id)) {
    document.head.appendChild(style);
  }
}

// =====================================================
// ✅ ORIGINAL FULLSCREEN IMAGE VIEWER (tap to open)
// (Now truly fullscreen Snapchat-style because of prepareSnapModal())
// =====================================================
let openKey = null;
let openFilename = null;
let openContentType = null;

function openFullscreenWithBlob(blob, meta) {
  prepareSnapModal(); // ✅ ONLY behavior fix

  openKey = meta.key;
  openFilename = meta.filename || "image.jpg";
  openContentType = meta.contentType || "image/*";

  if (fsTitle) fsTitle.textContent = meta.filename || "Photo";

  const url = URL.createObjectURL(blob);
  if (modalImg) modalImg.src = url;

  imgModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (imgModal) imgModal.dataset.blobUrl = url;

  // show buttons
  if (saveChatBtn) saveChatBtn.style.display = "";
  if (saveDeviceBtn) saveDeviceBtn.style.display = "";
  if (saveChatBtn) saveChatBtn.textContent = "💾 Save";
}

function closeFullscreen() {
  imgModal?.classList.add("hidden");
  document.body.style.overflow = "";

  const url = imgModal?.dataset?.blobUrl;
  if (url) {
    try { URL.revokeObjectURL(url); } catch {}
  }
  if (imgModal) imgModal.dataset.blobUrl = "";
  if (modalImg) modalImg.src = "";

  openKey = null;
  openFilename = null;
  openContentType = null;

  if (saveChatBtn) saveChatBtn.textContent = "💾 Save";
}

closeModal?.addEventListener("click", closeFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && imgModal && !imgModal.classList.contains("hidden")) {
    closeFullscreen();
  }
});

saveChatBtn?.addEventListener("click", async () => {
  if (!openKey) return;

  await addDoc(collection(db, "saved"), {
    key: openKey,
    filename: openFilename,
    contentType: openContentType,
    savedBy: auth.currentUser.uid,
    savedAt: serverTimestamp()
  });

  if (saveChatBtn) saveChatBtn.textContent = "✅ Saved";
  setTimeout(() => {
    if (saveChatBtn) saveChatBtn.textContent = "💾 Save";
  }, 1200);
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

// ===============================
// Display names map
// ===============================
let uidToName = {};
let usersUnsub = null;

function startUsersRealtime() {
  if (usersUnsub) usersUnsub();
  usersUnsub = safeOnSnapshot(collection(db, "users"), (snap) => {
    const map = {};
    snap.forEach((d) => {
      const u = d.data();
      map[d.id] = (u.nickname?.trim() || u.username || u.email || d.id);
    });
    uidToName = map;
  }, "users snapshot");
}

function displayNameFor(uid) {
  return uidToName[uid] || "Someone";
}

// ===============================
// Saved tab: select + unsave
// ===============================
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
  if (selectedSavedIds.size === lastSavedDocs.length) {
    selectedSavedIds.clear();
  } else {
    selectedSavedIds = new Set(lastSavedDocs.map((d) => d.id));
  }
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
    alert(e.message);
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

function startSavedRealtime() {
  if (!savedGrid) return;
  if (savedUnsub) savedUnsub();

  const qSaved = query(collection(db, "saved"), orderBy("savedAt", "desc"), limit(200));
  savedUnsub = safeOnSnapshot(qSaved, (snap) => {
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    lastSavedDocs = docs;
    renderSavedGrid(docs);
  }, "saved snapshot");

  updateSavedToolbar();
}

// ===============================
// Chat realtime (tap bubble opens pic)
// ===============================
let chatUnsub = null;
let chatWired = false;

function wireChatSend() {
  if (chatWired) return;
  chatWired = true;

  sendBtn?.addEventListener("click", async () => {
    const text = (chatText?.value || "").trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
      kind: "text",
      text,
      uid: auth.currentUser.uid,
      username: displayNameFor(auth.currentUser.uid),
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
        username: displayNameFor(auth.currentUser.uid),
        createdAt: serverTimestamp()
      });

      imgPick.value = "";
    } catch (e) {
      alert(e.message);
    } finally {
      sendImgBtn.disabled = false;
    }
  });
}

function startChatRealtime() {
  if (!chatBox) return;
  if (chatUnsub) chatUnsub();

  wireChatSend();

  const qMsg = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(200));

  chatUnsub = safeOnSnapshot(qMsg, (snap) => {
    chatBox.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data();
      const mine = m.uid === auth.currentUser.uid;

      const div = document.createElement("div");
      div.className = "msgBubble " + (mine ? "msgMe" : "msgOther");

      const meta = document.createElement("div");
      meta.className = "msgMeta";
      meta.textContent = mine ? "You" : (m.username || displayNameFor(m.uid));
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

        // ✅ ORIGINAL BEHAVIOR: tap bubble -> open fullscreen immediately
        div.addEventListener("click", async () => {
          const vs = await getDoc(viewDocRef).catch(() => null);
          if (vs && vs.exists && vs.exists()) return;

          try {
            const blob = await fetchImageBlob(m.key);

            openFullscreenWithBlob(blob, {
              key: m.key,
              filename: m.filename,
              contentType: m.contentType
            });

            await setDoc(viewDocRef, { openedAt: serverTimestamp() }).catch(() => {});

            div.classList.remove("snap");
            div.classList.add("opened");
            body.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
            div.style.cursor = "default";
          } catch (e) {
            alert(e.message);
          }
        });

      } else {
        body.textContent = m.text || "";
      }

      div.appendChild(body);
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }, "messages snapshot");
}

// ===============================
// Love tab (My Love vibe)
// ===============================
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
  loveHero.style.backgroundImage =
    `radial-gradient(circle at 30% 20%, rgba(255,255,255,.35), rgba(255,255,255,0) 55%),
     linear-gradient(135deg, rgba(255,122,190,.55), rgba(255,220,240,.35)),
     url("${dataUrl}")`;
  localStorage.setItem("loveHeroBg", dataUrl);
}

function loadLoveBg() {
  const saved = localStorage.getItem("loveHeroBg");
  if (saved) setLoveBgFromDataUrl(saved);
}

function updateLovePanel() {
  const now = new Date();

  if (loveStartPrettyEl) loveStartPrettyEl.textContent = fmtDatePretty(LOVE_START);

  const { y, m, d } = diffYMD(LOVE_START, now);

  if (loveYmdEl) {
    const parts = [];
    if (y) parts.push(`${y} year${y === 1 ? "" : "s"}`);
    if (m) parts.push(`${m} month${m === 1 ? "" : "s"}`);
    parts.push(`${d} day${d === 1 ? "" : "s"}`);
    loveYmdEl.textContent = parts.join(", ");
  }

  const ms = now - LOVE_START;
  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(ms / (1000 * 60 * 60));

  const totalMonths = (y * 12) + m;

  loveMonthsEl && (loveMonthsEl.textContent = totalMonths.toLocaleString());
  loveWeeksEl && (loveWeeksEl.textContent = totalWeeks.toLocaleString());
  loveDays2El && (loveDays2El.textContent = totalDays.toLocaleString());
  loveHoursEl && (loveHoursEl.textContent = totalHours.toLocaleString());

  const { days } = nextAnniversaryFrom(LOVE_START, now);
  loveNextAnnivEl && (loveNextAnnivEl.textContent = `${days.toLocaleString()} days`);
}

loveSettingsBtn?.addEventListener("click", () => loveBgPick?.click());
loveBgPick?.addEventListener("change", async () => {
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

// init love (safe even if hidden by pending)
loadLoveBg();
updateLovePanel();
setInterval(updateLovePanel, 10_000);

// ===============================
// Calendar (working events)
// ===============================
let eventsUnsub = null;
let calWired = false;

function wireCalendarCreate() {
  if (calWired) return;
  calWired = true;

  evtAddBtn?.addEventListener("click", async () => {
    setMsg(calMsg, "");
    const title = (evtTitle?.value || "").trim();
    const date = evtDate?.value;
    const time = evtTime?.value || "";
    const notes = (evtNotes?.value || "").trim();

    if (!title) return setMsg(calMsg, "Add a title 🙂");
    if (!date) return setMsg(calMsg, "Pick a date 🙂");

    try {
      await addDoc(collection(db, "events"), {
        title,
        date,
        time,
        notes,
        createdBy: auth.currentUser.uid,
        createdByName: displayNameFor(auth.currentUser.uid),
        createdAt: serverTimestamp()
      });

      if (evtTitle) evtTitle.value = "";
      if (evtDate) evtDate.value = "";
      if (evtTime) evtTime.value = "";
      if (evtNotes) evtNotes.value = "";

      setMsg(calMsg, "Event added 💗", true);
      setTimeout(() => setMsg(calMsg, ""), 1200);
    } catch (e) {
      setMsg(calMsg, e.message);
    }
  });
}

function startEventsRealtime(isAdmin) {
  if (!eventsList) return;
  if (eventsUnsub) eventsUnsub();

  wireCalendarCreate();

  const qEv = query(collection(db, "events"), orderBy("date", "asc"), limit(300));

  eventsUnsub = safeOnSnapshot(qEv, (snap) => {
    eventsList.innerHTML = "";

    if (snap.empty) {
      eventsList.innerHTML = `<div class="muted tiny">No events yet 💗</div>`;
      return;
    }

    snap.forEach((d) => {
      const e = d.data();
      const mine = e.createdBy === auth.currentUser.uid;

      const row = document.createElement("div");
      row.className = "eventRow";

      const left = document.createElement("div");
      left.innerHTML = `
        <div><b>${esc(e.title || "Event")}</b></div>
        <small>${esc(e.date || "")}${e.time ? " · " + esc(e.time) : ""}${e.notes ? " · " + esc(e.notes) : ""}</small>
        <small>By: ${esc(e.createdByName || displayNameFor(e.createdBy) || "")}</small>
      `;

      const actions = document.createElement("div");
      actions.className = "eventActions";

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Delete";
      del.disabled = !(mine || isAdmin);
      del.onclick = async () => {
        if (!confirm("Delete this event?")) return;
        await deleteDoc(doc(db, "events", d.id)).catch((err) => alert(err.message));
      };

      actions.appendChild(del);
      row.appendChild(left);
      row.appendChild(actions);
      eventsList.appendChild(row);
    });
  }, "events snapshot");
}

// ===============================
// Admin: pending approvals
// ===============================
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
      left.innerHTML = `<div><b>${esc(u.username || u.email || "(unknown)")}</b></div><small>${esc(d.id)}</small>`;

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
          deniedAt: serverTimestamp(),
          deniedBy: auth.currentUser?.uid || ""
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
    setMsg(adminMsg, e.message);
  }
}
btnRefreshUsers?.addEventListener("click", loadPendingUsers);

// ===============================
// Admin: all accounts list
// ===============================
let accountsUnsub = null;

function startAccountsRealtime(isAdmin) {
  if (!accountsList) return;
  if (accountsUnsub) accountsUnsub();
  if (!isAdmin) return;

  const qAll = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(500));

  accountsUnsub = safeOnSnapshot(qAll, (snap) => {
    accountsList.innerHTML = "";

    snap.forEach((d) => {
      const u = d.data();
      const uid = d.id;

      const status = u.denied ? "Denied" : (u.approved ? "Approved" : "Pending");
      const name = (u.nickname?.trim() || "");
      const uname = (u.username || "");
      const isMe = auth.currentUser?.uid === uid;

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `
        <div><b>${esc(name || uname || uid)}</b> <small>(${esc(status)})</small></div>
        <small>${esc(uname)} · ${esc(uid)}</small>
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
        if (!confirm("This removes their profile doc and blocks them. Continue?")) return;
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
  }, "accounts snapshot");
}

// ===============================
// Admin: Clear chat
// ===============================
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
    setMsg(adminMsg, e.message);
  } finally {
    btnClearChat && (btnClearChat.disabled = false);
  }
}
btnClearChat?.addEventListener("click", async () => {
  await clearChat(!!window.__isAdmin);
});

// ===============================
// DRAW — Advanced + Bucket + Text
// ===============================
let drawStarted = false;

function startDrawingBoard() {
  if (drawStarted) return;
  drawStarted = true;
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
    } catch {}
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
    const weight = boldOn ? "800" : "600";

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

// Draw gallery realtime
let drawUnsub = null;

function startDrawGallery() {
  if (!drawGallery) return;
  if (drawUnsub) drawUnsub();

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt", "desc"), limit(200));

  drawUnsub = safeOnSnapshot(qDraw, (snap) => {
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
  }, "drawings snapshot");
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
      createdByName: displayNameFor(auth.currentUser.uid),
      createdAt: serverTimestamp()
    });

    alert("Saved 💗");
  } catch (e) {
    alert(e.message);
  }
});

// ===============================
// Auth gate: PENDING SHOWS ONLY pendingView (no app) until approved
// Listeners start ONLY after approval
// ===============================
let listenersStarted = false;

function stopAllRealtime() {
  if (usersUnsub) { usersUnsub(); usersUnsub = null; }
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (savedUnsub) { savedUnsub(); savedUnsub = null; }
  if (drawUnsub) { drawUnsub(); drawUnsub = null; }
  if (eventsUnsub) { eventsUnsub(); eventsUnsub = null; }
  if (accountsUnsub) { accountsUnsub(); accountsUnsub = null; }
  listenersStarted = false;
}

onAuthStateChanged(auth, async (user) => {
  // Signed out
  if (!user) {
    stopAllRealtime();
    show(authView);
    return;
  }

  // Signed in but we still hide everything until approved
  btnSignOut?.classList.add("hidden");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // If profile doc missing, create it as pending
  if (!snap.exists()) {
    await setDoc(userRef, {
      username: (user.email || "").split("@")[0] || "",
      email: user.email || "",
      approved: false,
      isAdmin: false,
      denied: false,
      nickname: "",
      createdAt: serverTimestamp()
    });
    stopAllRealtime();
    show(pendingView);
    return;
  }

  const data = snap.data() || {};

  // Denied or not approved -> pending ONLY
  if (data.denied || !data.approved) {
    stopAllRealtime();
    show(pendingView);
    return;
  }

  // Approved -> show app
  show(appView);
  btnSignOut?.classList.remove("hidden");

  const isAdmin = !!data.isAdmin;
  window.__isAdmin = isAdmin;

  if (isAdmin) adminTabBtn?.classList.remove("hidden");
  else adminTabBtn?.classList.add("hidden");

  // Start listeners ONE time only after approval
  if (!listenersStarted) {
    listenersStarted = true;

    startUsersRealtime();
    startChatRealtime();
    startSavedRealtime();
    startDrawingBoard();
    startDrawGallery();
    startEventsRealtime(isAdmin);

    if (isAdmin) {
      loadPendingUsers();
      startAccountsRealtime(true);
    }
  }
});

// ===============================
// (End of file) — small safety + UX niceties
// KEEP EVERYTHING THE SAME
// ===============================

// Close fullscreen if you tap the dark backdrop (but NOT if you tap the image/buttons)
imgModal?.addEventListener("click", (e) => {
  if (e.target === imgModal) closeFullscreen();
});

// Optional: press Enter to send chat (Shift+Enter = newline)
chatText?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn?.click();
  }
});

// Optional: auto-open file picker when you tap the image button area (if you have one)
// (Safe no-op if you don't)
document.getElementById("imgPickBtn")?.addEventListener("click", () => imgPick?.click());

// When a user picks an image, enable the send image button (if your UI disables it)
imgPick?.addEventListener("change", () => {
  if (!sendImgBtn) return;
  sendImgBtn.disabled = !(imgPick.files && imgPick.files.length);
});

// If your page loads while already signed in + approved, make sure first tab shows
// (Safe: only runs once DOM is ready)
window.addEventListener("load", () => {
  // Default: activate first tab if none active
  const active = document.querySelector(".tab.active");
  if (!active) {
    const first = document.querySelector(".tab");
    if (first) first.click();
  }
});
