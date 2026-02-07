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

/* ===============================
   FIREBASE CONFIG
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyCCJdRcwZD9l83A02h1ysPI_VWTc1IGRSM",
  authDomain: "love-hub-d4f77.firebaseapp.com",
  projectId: "love-hub-d4f77",
  storageBucket: "love-hub-d4f77.firebasestorage.app",
  messagingSenderId: "189429669803",
  appId: "1:189429669803:web:e2e6cb2488d234e1fafcee"
};

/* ===============================
   YOUR WORKER URL (R2 MEDIA)
   =============================== */
const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev"; // <-- set to yours

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
   TIMEZONE (EST/EDT)
   =============================== */
const TZ = "America/New_York";

/* ===============================
   UI REFS
   =============================== */
const authView = document.getElementById("authView");
const pendingView = document.getElementById("pendingView");
const appView = document.getElementById("appView");

const btnSignOut = document.getElementById("btnSignOut");
const btnSignOut2 = document.getElementById("btnSignOut2");

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const authMsg = document.getElementById("authMsg");

// Tabs
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`)?.classList.remove("hidden");
  });
});

// Admin
const adminTabBtn = document.querySelector(".adminOnly");
const btnRefreshUsers = document.getElementById("btnRefreshUsers");
const btnClearChat = document.getElementById("btnClearChat");
const pendingList = document.getElementById("pendingList");
const accountsList = document.getElementById("accountsList");
const adminMsg = document.getElementById("adminMsg");

// Chat
const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const imgPick = document.getElementById("imgPick");
const sendImgBtn = document.getElementById("sendImgBtn");

// Fullscreen image viewer
const imgModal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const saveChatBtn = document.getElementById("saveChatBtn");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const fsTitle = document.getElementById("fsTitle");

// Saved tab
const savedGrid = document.getElementById("savedGrid");
const savedSelectBtn = document.getElementById("savedSelectBtn");
const savedSelectAllBtn = document.getElementById("savedSelectAllBtn");
const savedUnsaveBtn = document.getElementById("savedUnsaveBtn");

// Draw tab
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

// Love tab
const LOVE_START = new Date("2024-06-18T00:00:00-04:00");
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

// Calendar tab
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");
const calMonthLabel = document.getElementById("calMonthLabel");
const calGrid = document.getElementById("calGrid");
const calMsg = document.getElementById("calMsg");
const calSelectedLabel = document.getElementById("calSelectedLabel");
const calDayList = document.getElementById("calDayList");

const evTitle = document.getElementById("evTitle");
const evStart = document.getElementById("evStart");
const evEnd = document.getElementById("evEnd");
const evAllDay = document.getElementById("evAllDay");
const evNotes = document.getElementById("evNotes");
const evAddBtn = document.getElementById("evAddBtn");

/* ===============================
   HELPERS
   =============================== */
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

/* ===============================
   AUTH
   =============================== */
btnSignUp && (btnSignUp.onclick = async () => {
  setMsg(authMsg, "");
  try {
    const email = emailEl.value.trim();
    const password = passEl.value;
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
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

btnSignIn && (btnSignIn.onclick = async () => {
  setMsg(authMsg, "");
  try {
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

btnSignOut?.addEventListener("click", () => signOut(auth));
btnSignOut2?.addEventListener("click", () => signOut(auth));

/* ===============================
   NICKNAME MAP
   =============================== */
let uidToName = {};
let usersUnsub = null;

function startUsersRealtime() {
  if (usersUnsub) usersUnsub();
  usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
    const map = {};
    snap.forEach((d) => {
      const u = d.data();
      map[d.id] = u.nickname?.trim() || u.email || d.id;
    });
    uidToName = map;
  });
}
function displayNameFor(uid, fallbackEmail = "") {
  return uidToName[uid] || fallbackEmail || uid || "Someone";
}

/* ===============================
   R2 UPLOAD / FETCH
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
   FULLSCREEN IMAGE VIEWER
   =============================== */
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
  await addDoc(collection(db, "saved"), {
    key: openKey,
    filename: openFilename,
    contentType: openContentType,
    savedBy: auth.currentUser.uid,
    savedAt: serverTimestamp()
  });
  if (saveChatBtn) saveChatBtn.textContent = "✅ Saved";
  setTimeout(() => { if (saveChatBtn) saveChatBtn.textContent = "💾 Save"; }, 1200);
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
   SAVED TAB — SELECT / UNSAVE
   =============================== */
let savedSelectMode = false;
let selectedSavedIds = new Set();
let lastSavedDocs = [];

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

  const qSaved = query(collection(db, "saved"), orderBy("savedAt"), limit(200));
  onSnapshot(qSaved, (snap) => {
    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
    lastSavedDocs = docs;
    renderSavedGrid(docs);
  });

  updateSavedToolbar();
}

/* ===============================
   CHAT REALTIME (tap anywhere opens pic)
   =============================== */
function startChatRealtime() {
  if (!chatBox) return;

  sendBtn?.addEventListener("click", async () => {
    const text = chatText.value.trim();
    if (!text) return;

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

      const meta = document.createElement("div");
      meta.className = "msgMeta";
      meta.textContent = mine ? "You" : displayNameFor(m.uid, m.email);
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
        });

        // Tap anywhere on bubble opens it
        div.addEventListener("click", async () => {
          const vs = await getDoc(viewDocRef);
          if (vs.exists()) return;

          try {
            const blob = await fetchImageBlob(m.key);
            openFullscreenWithBlob(blob, { key: m.key, filename: m.filename, contentType: m.contentType });

            await setDoc(viewDocRef, { openedAt: serverTimestamp() });

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
  });
}

/* ===============================
   ADMIN — PENDING
   =============================== */
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
      left.innerHTML = `<div><b>${esc(u.email || "(no email)")}</b></div><small>${esc(d.id)}</small>`;

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
    setMsg(adminMsg, e.message);
  }
}
btnRefreshUsers?.addEventListener("click", loadPendingUsers);

/* ===============================
   ADMIN — ALL ACCOUNTS
   =============================== */
let accountsUnsub = null;

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
      const name = (u.nickname?.trim() || "");
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
        try { await updateDoc(doc(db, "users", uid), { denied: true, approved: false }); } catch { }
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
  });
}

/* ===============================
   ADMIN — CLEAR CHAT
   =============================== */
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

/* ===============================
   LOVE TAB (My Love app vibe)
   =============================== */
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
    `Bray & Ali 💗\nTogether since ${fmtDatePretty(LOVE_START)}\n` +
    `(${loveYmdEl?.textContent || ""})`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Our Love", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied 💗");
    }
  } catch { }
});

loadLoveBg();
updateLovePanel();
setInterval(updateLovePanel, 10_000);

/* ===============================
   DRAW (advanced) + Gallery
   =============================== */
function startDrawingBoard() {
  if (!drawCanvas || !canvasWrap) return;

  const ctx = drawCanvas.getContext("2d", { willReadFrequently: true });

  // white background
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

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

  undoBtn?.addEventListener("click", () => {
    if (!undoStack.length) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    redoStack.push(current);
    const prev = undoStack.pop();
    ctx.putImageData(prev, 0, 0);
    updateUndoRedoButtons();
  });

  redoBtn?.addEventListener("click", () => {
    if (!redoStack.length) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    undoStack.push(current);
    const next = redoStack.pop();
    ctx.putImageData(next, 0, 0);
    updateUndoRedoButtons();
  });

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

  // Bucket fill
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

    if (symmetry) {
      const mx = (w / 2) + ((w / 2) - sx);
      const my = sy;

      const img2 = ctx.getImageData(0, 0, w, h);
      const data2 = img2.data;
      const msx = Math.max(0, Math.min(w - 1, Math.floor(mx)));
      const msy = Math.max(0, Math.min(h - 1, Math.floor(my)));
      const mStartIdx = (msy * w + msx) * 4;
      const mStartCol = colorAt(data2, mStartIdx);

      const visited2 = new Uint8Array(w * h);
      const stack2 = [[msx, msy]];

      while (stack2.length) {
        const [cx, cy] = stack2.pop();
        const pos = cy * w + cx;
        if (visited2[pos]) continue;
        visited2[pos] = 1;

        const idx = pos * 4;
        const cur = colorAt(data2, idx);
        if (distColor(cur, mStartCol) > tol) continue;

        setColor(data2, idx, target);

        if (cx > 0) stack2.push([cx - 1, cy]);
        if (cx < w - 1) stack2.push([cx + 1, cy]);
        if (cy > 0) stack2.push([cx, cy - 1]);
        if (cy < h - 1) stack2.push([cx, cy + 1]);
      }

      ctx.putImageData(img2, 0, 0);
    }
  }

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

    if (symmetry) {
      const cx = drawCanvas.width / 2;
      const mx = cx + (cx - x);
      ctx.fillText(txt, mx, y);
    }
    ctx.restore();
  }

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

function startDrawGallery() {
  if (!drawGallery) return;

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt"), limit(200));
  onSnapshot(qDraw, (snap) => {
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
      meta.textContent = it.email || "drawing";

      card.appendChild(img);
      card.appendChild(meta);
      drawGallery.appendChild(card);
    });
  });
}

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
      createdAt: serverTimestamp()
    });

    alert("Saved 💗");
  } catch (e) {
    alert(e.message);
  }
});

/* ===============================
   CALENDAR (WORKING)
   - Month view
   - Day list
   - Add / Delete (owner or admin)
   =============================== */

function fmtMonthLabel(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", year: "numeric" }).format(d);
}

function fmtDateLabel(d) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
}

function fmtTimeLabel(dateObj) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(dateObj);
}

function ymdInTZ(dateObj) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(dateObj);
  const get = (t) => parts.find(p => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function startOfMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const dow = first.getDay(); // local, but close enough because both users same TZ; grid just needs weekday
  const start = new Date(year, monthIndex, 1 - dow);
  start.setHours(0,0,0,0);
  return start;
}

function parseLocalDatetimeInput(value) {
  // value like "2026-02-07T18:30"
  // This is interpreted as local browser time. You said EST. In practice your devices are EST.
  // Store as ISO string.
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelectedYMD = ymdInTZ(new Date());
let calEvents = []; // loaded events currently in visible range
let calUnsub = null;

function setSelectedDay(ymd) {
  calSelectedYMD = ymd;
  calSelectedLabel && (calSelectedLabel.textContent = ymd);
  renderDayList();
  // highlight selected cell
  document.querySelectorAll(".dayCell").forEach((c) => {
    c.classList.toggle("active", c.dataset.ymd === ymd);
  });
}

function eventsForYMD(ymd) {
  return calEvents
    .filter(e => e.ymd === ymd)
    .sort((a,b) => (a.startMs || 0) - (b.startMs || 0));
}

function renderDayList() {
  if (!calDayList) return;
  calDayList.innerHTML = "";

  const list = eventsForYMD(calSelectedYMD);

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No events for this day 💗";
    calDayList.appendChild(empty);
    return;
  }

  list.forEach((ev) => {
    const box = document.createElement("div");
    box.className = "evItem";

    const title = document.createElement("div");
    title.className = "evTitle";
    title.textContent = ev.title;

    const time = document.createElement("div");
    time.className = "evTime";

    if (ev.allDay) {
      time.textContent = "All day";
    } else {
      const s = new Date(ev.startISO);
      const e = ev.endISO ? new Date(ev.endISO) : null;
      time.textContent = e ? `${fmtTimeLabel(s)} – ${fmtTimeLabel(e)}` : `${fmtTimeLabel(s)}`;
    }

    const notes = document.createElement("div");
    notes.className = "evNotes";
    notes.textContent = ev.notes || "";

    const acts = document.createElement("div");
    acts.className = "evActions";

    const del = document.createElement("button");
    del.className = "btn small";
    del.textContent = "Delete";
    del.onclick = async () => {
      const ok = confirm("Delete this event?");
      if (!ok) return;
      try {
        await deleteDoc(doc(db, "events", ev.id));
      } catch (e) {
        alert(e.message);
      }
    };

    // only show delete if admin OR owner
    if (window.__isAdmin || ev.createdBy === auth.currentUser?.uid) {
      acts.appendChild(del);
    }

    box.appendChild(title);
    box.appendChild(time);
    if (ev.notes) box.appendChild(notes);
    if (acts.childNodes.length) box.appendChild(acts);

    calDayList.appendChild(box);
  });
}

function renderCalendarGrid() {
  if (!calGrid) return;

  calMonthLabel && (calMonthLabel.textContent = fmtMonthLabel(calYear, calMonth));

  const start = startOfMonthGrid(calYear, calMonth);
  const cells = [];
  const monthStart = new Date(calYear, calMonth, 1);
  const monthEnd = new Date(calYear, calMonth + 1, 0);

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ymd = ymdInTZ(d);

    const inMonth = d.getMonth() === calMonth;
    const evCount = eventsForYMD(ymd).length;

    const cell = document.createElement("div");
    cell.className = "dayCell" + (inMonth ? "" : " dim");
    cell.dataset.ymd = ymd;

    const num = document.createElement("div");
    num.className = "dayNum";
    num.textContent = String(d.getDate());

    const dots = document.createElement("div");
    dots.className = "dotRow";
    for (let k = 0; k < Math.min(evCount, 6); k++) {
      const dot = document.createElement("div");
      dot.className = "dot";
      dots.appendChild(dot);
    }

    cell.appendChild(num);
    if (evCount > 0) cell.appendChild(dots);

    cell.addEventListener("click", () => setSelectedDay(ymd));

    cells.push(cell);
  }

  calGrid.innerHTML = "";
  cells.forEach(c => calGrid.appendChild(c));

  // select default day in current month if not visible
  setSelectedDay(calSelectedYMD);
}

function subscribeCalendarMonth() {
  if (calUnsub) calUnsub();

  // We'll subscribe to events for a wide range:
  // from start grid day to end grid day so dots load correctly.
  const start = startOfMonthGrid(calYear, calMonth);
  const end = new Date(start);
  end.setDate(start.getDate() + 42);
  end.setHours(0,0,0,0);

  // Store ISO (UTC) but query by startMs range using numeric ms fields
  // We'll write startMs when creating events.
  const qEv = query(
    collection(db, "events"),
    orderBy("startMs"),
    where("startMs", ">=", start.getTime()),
    where("startMs", "<", end.getTime())
  );

  calUnsub = onSnapshot(qEv, (snap) => {
    const arr = [];
    snap.forEach((d) => {
      const ev = d.data();
      const startISO = ev.startISO || new Date(ev.startMs).toISOString();
      const endISO = ev.endISO || null;
      const ymd = ymdInTZ(new Date(ev.startMs));
      arr.push({
        id: d.id,
        title: ev.title || "(no title)",
        notes: ev.notes || "",
        allDay: !!ev.allDay,
        startISO,
        endISO,
        startMs: ev.startMs,
        createdBy: ev.createdBy || "",
        ymd
      });
    });
    calEvents = arr;
    renderCalendarGrid();
    renderDayList();
  });
}

calPrev?.addEventListener("click", () => {
  calMonth -= 1;
  if (calMonth < 0) { calMonth = 11; calYear -= 1; }
  subscribeCalendarMonth();
});

calNext?.addEventListener("click", () => {
  calMonth += 1;
  if (calMonth > 11) { calMonth = 0; calYear += 1; }
  subscribeCalendarMonth();
});

evAllDay?.addEventListener("change", () => {
  const ad = !!evAllDay.checked;
  // if all day, end optional
  if (ad) {
    evEnd.value = "";
  }
});

evAddBtn?.addEventListener("click", async () => {
  setMsg(calMsg, "");

  const title = (evTitle.value || "").trim();
  if (!title) return setMsg(calMsg, "Title required.", false);

  const allDay = !!evAllDay.checked;

  const s = parseLocalDatetimeInput(evStart.value);
  if (!s) return setMsg(calMsg, "Start date/time required.", false);

  let e = null;
  if (!allDay && evEnd.value) {
    e = parseLocalDatetimeInput(evEnd.value);
    if (e && e.getTime() < s.getTime()) return setMsg(calMsg, "End must be after start.", false);
  }

  const notes = (evNotes.value || "").trim();

  try {
    await addDoc(collection(db, "events"), {
      title,
      notes,
      allDay,
      startMs: s.getTime(),
      startISO: s.toISOString(),
      endMs: e ? e.getTime() : null,
      endISO: e ? e.toISOString() : null,
      createdBy: auth.currentUser.uid,
      createdEmail: auth.currentUser.email || "",
      createdAt: serverTimestamp()
    });

    evTitle.value = "";
    evNotes.value = "";
    setMsg(calMsg, "Event added 💗", true);

    // auto jump selection to that day
    setSelectedDay(ymdInTZ(s));
  } catch (err) {
    setMsg(calMsg, err.message);
  }
});

/* ===============================
   AUTH GATE
   =============================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    show(authView);
    return;
  }

  btnSignOut?.classList.remove("hidden");

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email || "",
      approved: false,
      isAdmin: false,
      denied: false,
      nickname: "",
      createdAt: serverTimestamp()
    });
    show(pendingView);
    return;
  }

  const data = snap.data();

  if (data.denied || !data.approved) {
    show(pendingView);
    return;
  }

  show(appView);

  const isAdmin = !!data.isAdmin;
  window.__isAdmin = isAdmin;

  startUsersRealtime();

  if (isAdmin) adminTabBtn?.classList.remove("hidden");
  else adminTabBtn?.classList.add("hidden");

  startChatRealtime();
  startSavedRealtime();
  startDrawingBoard();
  startDrawGallery();

  // Calendar starts here
  calSelectedLabel && (calSelectedLabel.textContent = calSelectedYMD);
  subscribeCalendarMonth();

  if (isAdmin) {
    loadPendingUsers();
    startAccountsRealtime(true);
  }
});
