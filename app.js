// ===============================
// Our Little Hub — app.js (fixed)
// - Fixes permission-denied snapshot spam (handles errors)
// - Prevents listeners from starting before approval check
// - Adds global unhandled rejection handler
// - Nickname map is OPTIONAL (falls back safely)
// - Calendar tab works (events add/list/delete)
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
   Global hardening
   =============================== */
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
  // Prevents the browser from treating it like a fatal error loop
  e.preventDefault?.();
});

/* ===============================
   UI refs
   =============================== */
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

// Calendar UI (works even if you haven't added extra inputs yet)
const calList = document.getElementById("calList");
const calTitle = document.getElementById("calTitle");
const calDate = document.getElementById("calDate");
const calTime = document.getElementById("calTime");
const calNotes = document.getElementById("calNotes");
const calAddBtn = document.getElementById("calAddBtn");
const calMsg = document.getElementById("calMsg");

/* ===============================
   Helpers
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

function isPermDenied(err) {
  const msg = (err?.message || "").toLowerCase();
  return err?.code === "permission-denied" || msg.includes("missing or insufficient permissions");
}

/* ===============================
   Tabs
   =============================== */
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
   LOVE TAB (My Love vibe)
   =============================== */
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
loveBgPick?.addEventListener("change", () => {
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
    if (navigator.share) await navigator.share({ title: "Our Love", text });
    else {
      await navigator.clipboard.writeText(text);
      alert("Copied 💗");
    }
  } catch { }
});

loadLoveBg();
updateLovePanel();
setInterval(updateLovePanel, 10_000);

/* ===============================
   AUTH
   =============================== */
btnSignUp && (btnSignUp.onclick = async () => {
  setMsg(authMsg, "");
  try {
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) return setMsg(authMsg, "Enter email + password.");

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
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) return setMsg(authMsg, "Enter email + password.");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

btnSignOut?.addEventListener("click", () => signOut(auth));

/* ===============================
   Listener management (prevents duplicates)
   =============================== */
let unsubUsers = null;
let unsubChat = null;
let unsubSaved = null;
let unsubDraw = null;
let unsubAccounts = null;
let unsubEvents = null;

function stopAllRealtime() {
  try { unsubUsers?.(); } catch { }
  try { unsubChat?.(); } catch { }
  try { unsubSaved?.(); } catch { }
  try { unsubDraw?.(); } catch { }
  try { unsubAccounts?.(); } catch { }
  try { unsubEvents?.(); } catch { }
  unsubUsers = unsubChat = unsubSaved = unsubDraw = unsubAccounts = unsubEvents = null;
}

/* ===============================
   Nickname map (optional)
   =============================== */
let uidToName = {};

function displayNameFor(uid, fallbackEmail = "") {
  return uidToName[uid] || fallbackEmail || uid || "Someone";
}

function startUsersRealtimeSafe() {
  // OPTIONAL: if rules deny this, chat still works
  try { unsubUsers?.(); } catch { }
  uidToName = {};

  unsubUsers = onSnapshot(
    collection(db, "users"),
    (snap) => {
      const map = {};
      snap.forEach((d) => {
        const u = d.data();
        map[d.id] = u.nickname?.trim() || u.email || d.id;
      });
      uidToName = map;
    },
    (err) => {
      console.warn("users snapshot blocked:", err);
      // fallback: only current user name
      if (auth.currentUser?.uid) {
        uidToName[auth.currentUser.uid] = auth.currentUser.email || "You";
      }
    }
  );
}

/* ===============================
   Admin: pending approvals
   =============================== */
async function loadPendingUsersSafe() {
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
      setMsg(adminMsg, "No pending users 💗", true);
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
        loadPendingUsersSafe();
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
        loadPendingUsersSafe();
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
btnRefreshUsers?.addEventListener("click", loadPendingUsersSafe);

/* ===============================
   Admin: all accounts realtime
   =============================== */
function startAccountsRealtimeSafe(isAdmin) {
  if (!accountsList) return;
  try { unsubAccounts?.(); } catch { }
  if (!isAdmin) return;

  const qAll = query(collection(db, "users"), orderBy("createdAt"), limit(500));

  unsubAccounts = onSnapshot(
    qAll,
    (snap) => {
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
          if (!confirm("This will remove their profile doc. Continue?")) return;
          if (isMe) return alert("You can't delete your own user doc.");
          await deleteDoc(doc(db, "users", uid));
        };

        actions.appendChild(nickBtn);
        actions.appendChild(blockBtn);
        actions.appendChild(deleteBtn);

        row.appendChild(left);
        row.appendChild(actions);
        accountsList.appendChild(row);
      });
    },
    (err) => {
      setMsg(adminMsg, err.message);
    }
  );
}

/* ===============================
   Admin: Clear chat
   =============================== */
async function clearChatSafe(isAdmin) {
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
  await clearChatSafe(!!window.__isAdmin);
});

/* ===============================
   Media via Worker (R2)
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
    alert(e.message);
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
   Saved tab (select + unsave)
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
    for (const id of selectedSavedIds) await deleteDoc(doc(db, "saved", id));
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

  if (savedSelectMode && savedUnsaveBtn) {
    savedUnsaveBtn.disabled = selectedSavedIds.size === 0;
  }
}

function startSavedRealtimeSafe() {
  if (!savedGrid) return;
  try { unsubSaved?.(); } catch { }

  const qSaved = query(collection(db, "saved"), orderBy("savedAt"), limit(200));

  unsubSaved = onSnapshot(
    qSaved,
    (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
      lastSavedDocs = docs;
      renderSavedGrid(docs);
    },
    (err) => {
      console.warn("saved snapshot error:", err);
      if (isPermDenied(err)) setMsg(authMsg, "Saved is blocked by rules (permission denied).");
    }
  );

  updateSavedToolbar();
}

/* ===============================
   Chat realtime (tap ANYWHERE opens pic)
   =============================== */
function startChatRealtimeSafe() {
  if (!chatBox) return;
  try { unsubChat?.(); } catch { }

  // Avoid duplicate click bindings
  sendBtn?.replaceWith(sendBtn.cloneNode(true));
  sendImgBtn?.replaceWith(sendImgBtn.cloneNode(true));

  // Re-grab buttons after clone
  const sendBtn2 = document.getElementById("sendBtn");
  const sendImgBtn2 = document.getElementById("sendImgBtn");

  sendBtn2?.addEventListener("click", async () => {
    try {
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
    } catch (e) {
      alert(e.message);
    }
  });

  sendImgBtn2?.addEventListener("click", async () => {
    if (!imgPick?.files?.length) return;
    const file = imgPick.files[0];

    if (file.size > 6 * 1024 * 1024) {
      alert("Max 6MB per image.");
      return;
    }

    sendImgBtn2.disabled = true;

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
      sendImgBtn2.disabled = false;
    }
  });

  const qMsg = query(collection(db, "messages"), orderBy("createdAt"), limit(200));

  unsubChat = onSnapshot(
    qMsg,
    (snap) => {
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

          // mark opened if already viewed
          getDoc(viewDocRef).then((vs) => {
            if (vs.exists()) {
              div.classList.remove("snap");
              div.classList.add("opened");
              body.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
              div.style.cursor = "default";
            }
          }).catch(() => {});

          // CLICK ANYWHERE on bubble opens
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
    },
    (err) => {
      console.error("messages snapshot error:", err);
      if (isPermDenied(err)) {
        setMsg(authMsg, "Chat is blocked by rules (permission denied).");
      }
    }
  );
}

/* ===============================
   DRAW (your existing advanced drawing stays)
   (To keep this reply sane, I’m not re-pasting the entire drawing engine again.)
   We will keep your current drawing functions as-is.
   =============================== */

// If you already pasted the big drawing engine earlier, keep it.
// If draw features stop working, tell me and I’ll paste the full draw block again.

/* ===============================
   DRAW GALLERY realtime (safe)
   =============================== */
function startDrawGallerySafe() {
  if (!drawGallery) return;
  try { unsubDraw?.(); } catch { }

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt"), limit(200));

  unsubDraw = onSnapshot(
    qDraw,
    (snap) => {
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
    },
    (err) => {
      console.warn("drawings snapshot error:", err);
    }
  );
}

/* ===============================
   Calendar (working, minimal UI)
   - You can add these inputs later:
     #calTitle, #calDate, #calTime, #calNotes, #calAddBtn, #calList, #calMsg
   =============================== */
function startCalendarSafe(isApproved) {
  try { unsubEvents?.(); } catch { }
  if (!isApproved) return;

  // If your HTML doesn't have the form yet, this still runs safely.
  if (calAddBtn) {
    calAddBtn.addEventListener("click", async () => {
      try {
        const title = calTitle?.value?.trim() || "Event";
        const date = calDate?.value || "";
        const time = calTime?.value || "00:00";
        const notes = calNotes?.value?.trim() || "";

        if (!date) return setMsg(calMsg, "Pick a date first.");

        // store as ISO-like string in EST display (simple)
        const when = `${date}T${time}:00`;

        await addDoc(collection(db, "events"), {
          title,
          when,
          notes,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });

        calTitle && (calTitle.value = "");
        calNotes && (calNotes.value = "");
        setMsg(calMsg, "Saved ✅", true);
        setTimeout(() => setMsg(calMsg, ""), 1200);
      } catch (e) {
        setMsg(calMsg, e.message);
      }
    });
  }

  const qEv = query(collection(db, "events"), orderBy("when"), limit(200));

  unsubEvents = onSnapshot(
    qEv,
    (snap) => {
      if (!calList) return;
      calList.innerHTML = "";

      snap.forEach((d) => {
        const ev = d.data();

        const row = document.createElement("div");
        row.className = "item";

        const left = document.createElement("div");
        left.innerHTML = `<div><b>${esc(ev.title || "Event")}</b></div>
                          <small>${esc(ev.when || "")}${ev.notes ? " · " + esc(ev.notes) : ""}</small>`;

        const actions = document.createElement("div");
        actions.className = "actions";

        const del = document.createElement("button");
        del.className = "btn primary";
        del.textContent = "Delete";
        del.onclick = async () => {
          if (!confirm("Delete this event?")) return;
          await deleteDoc(doc(db, "events", d.id));
        };

        actions.appendChild(del);
        row.appendChild(left);
        row.appendChild(actions);
        calList.appendChild(row);
      });
    },
    (err) => {
      console.warn("events snapshot error:", err);
      setMsg(calMsg, err.message);
    }
  );
}

/* ===============================
   AUTH GATE (the most important fix)
   - DO NOT start listeners until approved
   - Stops all listeners when signed out
   =============================== */
onAuthStateChanged(auth, async (user) => {
  stopAllRealtime();

  if (!user) {
    show(authView);
    return;
  }

  btnSignOut?.classList.remove("hidden");

  try {
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

    // APPROVED: show app and start listeners
    show(appView);

    const isAdmin = !!data.isAdmin;
    window.__isAdmin = isAdmin;

    if (isAdmin) adminTabBtn?.classList.remove("hidden");
    else adminTabBtn?.classList.add("hidden");

    // Start realtime safely
    startUsersRealtimeSafe();      // optional, won't crash if denied
    startChatRealtimeSafe();       // never unhandled
    startSavedRealtimeSafe();
    startDrawGallerySafe();
    startCalendarSafe(true);

    if (isAdmin) {
      loadPendingUsersSafe();
      startAccountsRealtimeSafe(true);
    }
  } catch (e) {
    console.error("Auth gate error:", e);
    show(authView);
    setMsg(authMsg, e.message);
  }
});
