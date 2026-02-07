// ===============================
// LOVE HUB — app.js (FULL REPLACE)
// GitHub Pages + Firebase Auth/Firestore + Cloudflare Worker/R2 media
// Includes: Auth gate (pending approval), Chat (snap images + fullscreen viewer),
// Saved (select + unsave), Admin (approve/deny, accounts, nickname, block/unblock, clear chat),
// Draw (advanced tools), Love tab counter, and a WORKING Calendar tab (Firestore events).
// ===============================

// ---------- Firebase imports ----------
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
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------- CONFIG (use exactly) ----------
const firebaseConfig = {
  apiKey: "AIzaSyCCJdRcwZD9l83A02h1ysPI_VWTc1IGRSM",
  authDomain: "love-hub-d4f77.firebaseapp.com",
  projectId: "love-hub-d4f77",
  storageBucket: "love-hub-d4f77.firebasestorage.app",
  messagingSenderId: "189429669803",
  appId: "1:189429669803:web:e2e6cb2488d234e1fafcee"
};

// ---------- Cloudflare Worker base URL ----------
const WORKER_URL = "PUT_YOUR_CLOUDFLARE_WORKER_URL_HERE"; // no trailing slash

// ---------- init ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================
// UI refs (defensive: missing IDs won't crash)
// ===============================

// Views
const authView = document.getElementById("authView");
const pendingView = document.getElementById("pendingView");
const appView = document.getElementById("appView");

// Auth UI
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const btnSignOut = document.getElementById("btnSignOut");
const authMsg = document.getElementById("authMsg");

// Tabs
const adminTabBtn = document.querySelector('.tab[data-tab="admin"]');

// Chat UI
const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const imgPick = document.getElementById("imgPick");
const sendImgBtn = document.getElementById("sendImgBtn");

// Fullscreen viewer
const imgModal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const saveChatBtn = document.getElementById("saveChatBtn");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const fsTitle = document.getElementById("fsTitle");

// Saved UI
const savedGrid = document.getElementById("savedGrid");
const btnSavedSelect = document.getElementById("btnSavedSelect"); // optional
const btnSavedUnsave = document.getElementById("btnSavedUnsave"); // optional
const savedSelectHint = document.getElementById("savedSelectHint"); // optional

// Admin UI
const btnRefreshUsers = document.getElementById("btnRefreshUsers");
const adminMsg = document.getElementById("adminMsg");
const pendingList = document.getElementById("pendingList");

// Accounts admin (optional)
const accountsList = document.getElementById("accountsList"); // optional
const btnClearChat = document.getElementById("btnClearChat"); // optional
const btnRefreshAccounts = document.getElementById("btnRefreshAccounts"); // optional

// Love UI (optional IDs for “My Love app vibe”)
const loveHero = document.getElementById("loveHero"); // optional container
const loveYears = document.getElementById("loveYears");
const loveMonths = document.getElementById("loveMonths");
const loveDaysPart = document.getElementById("loveDaysPart");
const loveTotalDays = document.getElementById("loveTotalDays");
const loveTotalHours = document.getElementById("loveTotalHours");
const loveTotalMinutes = document.getElementById("loveTotalMinutes");
const loveShareBtn = document.getElementById("loveShareBtn");
const loveBgInput = document.getElementById("loveBgInput");
const loveBgApply = document.getElementById("loveBgApply");
const loveBgClear = document.getElementById("loveBgClear");

// Draw UI (advanced)
const drawCanvas = document.getElementById("drawCanvas");

// Draw tool controls (optional)
const brushType = document.getElementById("brushType"); // select: round, marker, spray
const penColor = document.getElementById("penColor");
const penSize = document.getElementById("penSize");
const penOpacity = document.getElementById("penOpacity");
const penSmooth = document.getElementById("penSmooth");
const penBtn = document.getElementById("penBtn");
const eraserBtn = document.getElementById("eraserBtn");
const symmetryBtn = document.getElementById("symmetryBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const fillBtn = document.getElementById("fillBtn");
const textToolBtn = document.getElementById("textToolBtn");
const drawFullscreenBtn = document.getElementById("drawFullscreenBtn");
const saveDrawBtn = document.getElementById("saveDrawBtn");
const drawGallery = document.getElementById("drawGallery");

// Calendar UI (WORKING)
// (These IDs should exist in index.html for full Calendar UI)
const calTzLabel = document.getElementById("calTzLabel"); // optional
const calTitle = document.getElementById("calTitle"); // input
const calDate = document.getElementById("calDate"); // input type="date"
const calTime = document.getElementById("calTime"); // input type="time"
const calNotes = document.getElementById("calNotes"); // textarea
const calAddBtn = document.getElementById("calAddBtn"); // button
const calList = document.getElementById("calList"); // div/list container
const calMsg = document.getElementById("calMsg"); // optional

// ===============================
// helpers
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

function safeText(s) {
  return (s ?? "").toString();
}

function fmtNum(n) {
  try {
    return Number(n).toLocaleString();
  } catch {
    return String(n);
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatLocalDateTime(ms) {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// ===============================
// Tabs
// ===============================
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    const panel = document.getElementById(`tab-${tab}`);
    panel?.classList.remove("hidden");
  });
});

// ===============================
// Cloudflare upload / fetch helpers
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

// ===============================
// Nicknames map
// ===============================
let usersUnsub = null;
const nickByUid = new Map(); // uid -> nickname/email

function startUsersRealtime() {
  usersUnsub?.();
  nickByUid.clear();

  const qUsers = query(collection(db, "users"), limit(500));
  usersUnsub = onSnapshot(qUsers, (snap) => {
    nickByUid.clear();
    snap.forEach((d) => {
      const u = d.data() || {};
      const nick = safeText(u.nickname).trim();
      const email = safeText(u.email).trim();
      nickByUid.set(d.id, nick || email || "user");
    });
  });
}

function displayNameFor(uid, fallbackEmail) {
  return nickByUid.get(uid) || safeText(fallbackEmail) || "user";
}

// ===============================
// Auth actions
// ===============================
btnSignUp?.addEventListener("click", async () => {
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
      blocked: false,
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
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (e) {
    setMsg(authMsg, e.message);
  }
});

btnSignOut?.addEventListener("click", () => signOut(auth));

// ===============================
// Fullscreen viewer
// ===============================
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
    savedByName: displayNameFor(auth.currentUser.uid, auth.currentUser.email),
    savedAt: serverTimestamp()
  });
  saveChatBtn.textContent = "✅ Saved";
  setTimeout(() => (saveChatBtn.textContent = "💾 Save"), 1200);
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
// Saved tab (realtime + select mode + unsave)
// ===============================
let savedUnsub = null;
let savedSelectMode = false;
const selectedSavedIds = new Set(); // Firestore doc IDs

function setSavedSelectUI() {
  if (btnSavedSelect) btnSavedSelect.textContent = savedSelectMode ? "Done" : "Select";
  if (btnSavedUnsave) btnSavedUnsave.disabled = !savedSelectMode || selectedSavedIds.size === 0;
  if (savedSelectHint) savedSelectHint.textContent = savedSelectMode ? `Selected: ${selectedSavedIds.size}` : "";
}

btnSavedSelect?.addEventListener("click", () => {
  savedSelectMode = !savedSelectMode;
  if (!savedSelectMode) selectedSavedIds.clear();
  setSavedSelectUI();
  startSavedRealtime(true);
});

btnSavedUnsave?.addEventListener("click", async () => {
  if (!savedSelectMode || selectedSavedIds.size === 0) return;

  const ids = Array.from(selectedSavedIds);
  selectedSavedIds.clear();
  setSavedSelectUI();

  for (let i = 0; i < ids.length; i += 450) {
    const chunk = ids.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((id) => batch.delete(doc(db, "saved", id)));
    await batch.commit();
  }
});

function startSavedRealtime(forceRestart = false) {
  if (!savedGrid) return;

  if (savedUnsub && forceRestart) {
    savedUnsub();
    savedUnsub = null;
  }
  if (savedUnsub) return;

  const qSaved = query(collection(db, "saved"), orderBy("savedAt", "desc"), limit(250));
  savedUnsub = onSnapshot(qSaved, (snap) => {
    savedGrid.innerHTML = "";
    setSavedSelectUI();

    snap.forEach((d) => {
      const s = d.data() || {};
      const card = document.createElement("div");
      card.className = "savedCard";
      card.dataset.id = d.id;

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "saved";

      const meta = document.createElement("div");
      meta.className = "muted tiny";
      const by = safeText(s.savedByName || s.email || "");
      meta.textContent = `${safeText(s.filename || "image")}${by ? ` • ${by}` : ""}`;

      const selected = selectedSavedIds.has(d.id);
      card.style.outline = selected ? "3px solid rgba(255,92,169,.9)" : "";

      (async () => {
        try {
          const blob = await fetchImageBlob(s.key);
          img.src = URL.createObjectURL(blob);

          img.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (savedSelectMode) {
              if (selectedSavedIds.has(d.id)) selectedSavedIds.delete(d.id);
              else selectedSavedIds.add(d.id);
              setSavedSelectUI();
              card.style.outline = selectedSavedIds.has(d.id) ? "3px solid rgba(255,92,169,.9)" : "";
              return;
            }

            openFullscreenWithBlob(blob, { key: s.key, filename: s.filename, contentType: s.contentType });
          });
        } catch {
          img.src = "";
        }
      })();

      card.appendChild(img);
      card.appendChild(meta);
      savedGrid.appendChild(card);
    });
  });
}

// ===============================
// Chat (text + snap images view-once per user)
// ===============================
let chatUnsub = null;

function startChatRealtime() {
  if (!chatBox) return;
  if (chatUnsub) return;

  sendBtn?.addEventListener("click", async () => {
    const text = chatText?.value?.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
      kind: "text",
      text,
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      name: displayNameFor(auth.currentUser.uid, auth.currentUser.email),
      createdAt: serverTimestamp()
    });

    if (chatText) chatText.value = "";
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
        name: displayNameFor(auth.currentUser.uid, auth.currentUser.email),
        createdAt: serverTimestamp()
      });

      imgPick.value = "";
    } catch (e) {
      alert(e.message);
    } finally {
      sendImgBtn.disabled = false;
    }
  });

  const qMsg = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(250));
  chatUnsub = onSnapshot(qMsg, (snap) => {
    chatBox.innerHTML = "";

    snap.forEach((d) => {
      const m = d.data() || {};
      const mine = m.uid === auth.currentUser.uid;

      const bubble = document.createElement("div");
      bubble.className = "msgBubble " + (mine ? "msgMe" : "msgOther");

      if (m.kind === "image") {
        bubble.classList.add("snap");
        bubble.textContent = mine ? "📸 You sent a pic" : "📸 Tap to view pic";

        const viewDocRef = doc(db, "messages", d.id, "views", auth.currentUser.uid);

        getDoc(viewDocRef).then((vs) => {
          if (vs.exists()) {
            bubble.classList.remove("snap");
            bubble.classList.add("opened");
            bubble.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
          }
        });

        // Tap ANYWHERE on bubble -> open fullscreen (first time only)
        bubble.addEventListener("click", async () => {
          const vs = await getDoc(viewDocRef);
          if (vs.exists()) return;

          try {
            const blob = await fetchImageBlob(m.key);
            openFullscreenWithBlob(blob, { key: m.key, filename: m.filename, contentType: m.contentType });

            await setDoc(viewDocRef, { openedAt: serverTimestamp() });

            bubble.classList.remove("snap");
            bubble.classList.add("opened");
            bubble.textContent = mine ? "📸 Pic (opened)" : "📸 Opened";
          } catch (e) {
            alert(e.message);
          }
        });
      } else {
        bubble.textContent = safeText(m.text);
      }

      chatBox.appendChild(bubble);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// ===============================
// Admin: pending approvals + accounts list + clear chat
// ===============================
async function loadPendingUsers() {
  if (!pendingList) return;
  pendingList.innerHTML = "";
  setMsg(adminMsg, "Loading pending users…", true);

  try {
    const qy = query(
      collection(db, "users"),
      where("approved", "==", false),
      where("denied", "==", false)
    );

    const snap = await getDocs(qy);

    if (snap.empty) {
      setMsg(adminMsg, "No pending users right now 💗", true);
      return;
    }

    setMsg(adminMsg, `Pending: ${snap.size}`, true);

    snap.forEach((d) => {
      const u = d.data() || {};

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `<div><b>${safeText(u.email || "(no email)")}</b></div><small>${d.id}</small>`;

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
          blocked: false,
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
          blocked: false,
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

let accountsUnsub = null;
function startAccountsRealtime(isAdmin) {
  if (!isAdmin) return;
  if (!accountsList) return;
  if (accountsUnsub) return;

  const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(500));
  accountsUnsub = onSnapshot(qUsers, (snap) => {
    accountsList.innerHTML = "";

    snap.forEach((d) => {
      const u = d.data() || {};
      const uid = d.id;

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      const nick = safeText(u.nickname).trim();
      const email = safeText(u.email).trim();
      const status = u.denied ? "DENIED" : (u.approved ? "APPROVED" : "PENDING");
      const blocked = !!u.blocked;

      left.innerHTML = `
        <div><b>${nick || email || "(no email)"}</b> ${blocked ? "🚫" : ""}</div>
        <small>${uid} • ${status}</small>
      `;

      const actions = document.createElement("div");
      actions.className = "actions";

      const nickInput = document.createElement("input");
      nickInput.className = "input";
      nickInput.style.minWidth = "180px";
      nickInput.value = nick || "";
      nickInput.placeholder = "Nickname";

      const saveNickBtn = document.createElement("button");
      saveNickBtn.className = "btn primary";
      saveNickBtn.textContent = "Save";
      saveNickBtn.onclick = async () => {
        saveNickBtn.disabled = true;
        try {
          await updateDoc(doc(db, "users", uid), { nickname: nickInput.value.trim() });
        } finally {
          saveNickBtn.disabled = false;
        }
      };

      const blockBtn = document.createElement("button");
      blockBtn.className = "btn";
      blockBtn.textContent = blocked ? "Unblock" : "Block";
      blockBtn.onclick = async () => {
        blockBtn.disabled = true;
        try {
          await updateDoc(doc(db, "users", uid), { blocked: !blocked });
        } finally {
          blockBtn.disabled = false;
        }
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        if (!confirm(`Delete user doc for ${email || uid}? (This does NOT delete Firebase Auth user)`)) return;
        deleteBtn.disabled = true;
        try {
          await deleteDoc(doc(db, "users", uid));
        } finally {
          deleteBtn.disabled = false;
        }
      };

      actions.appendChild(nickInput);
      actions.appendChild(saveNickBtn);
      actions.appendChild(blockBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(left);
      row.appendChild(actions);
      accountsList.appendChild(row);
    });
  });
}

// Clear chat (batched delete)
async function clearChatAll() {
  if (!confirm("Clear ALL chat messages?")) return;

  const col = collection(db, "messages");
  let deleted = 0;

  while (true) {
    const snap = await getDocs(query(col, orderBy("createdAt", "asc"), limit(200)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    deleted += snap.size;
    setMsg(adminMsg, `Cleared ${deleted} messages…`, true);

    if (snap.size < 200) break;
  }

  setMsg(adminMsg, "Chat cleared ✅", true);
}

btnClearChat?.addEventListener("click", clearChatAll);
btnRefreshAccounts?.addEventListener("click", () => setMsg(adminMsg, "Accounts are live-updating ✅", true));

// ===============================
// LOVE tab — “My Love app vibe”
// ===============================
const LOVE_START = new Date("2024-06-18T00:00:00-04:00");
const LOVE_BG_KEY = "loveHubHeroBg";

function diffYMD(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthDays;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  return { years, months, days };
}

function applyLoveHeroBg(url) {
  if (!loveHero) return;
  const u = safeText(url).trim();
  if (!u) {
    loveHero.style.backgroundImage = "";
    loveHero.style.backgroundSize = "";
    loveHero.style.backgroundPosition = "";
    return;
  }
  loveHero.style.backgroundImage = `url("${u}")`;
  loveHero.style.backgroundSize = "cover";
  loveHero.style.backgroundPosition = "center";
}

function updateLoveCounter() {
  const now = new Date();
  const { years, months, days } = diffYMD(LOVE_START, now);
  const diffMs = now.getTime() - LOVE_START.getTime();

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  if (loveYears) loveYears.textContent = fmtNum(years);
  if (loveMonths) loveMonths.textContent = fmtNum(months);
  if (loveDaysPart) loveDaysPart.textContent = fmtNum(days);
  if (loveTotalDays) loveTotalDays.textContent = fmtNum(totalDays);
  if (loveTotalHours) loveTotalHours.textContent = fmtNum(totalHours);
  if (loveTotalMinutes) loveTotalMinutes.textContent = fmtNum(totalMinutes);

  const oldLoveDays = document.getElementById("loveDays");
  if (oldLoveDays) oldLoveDays.textContent = fmtNum(totalDays);
}

loveShareBtn?.addEventListener("click", async () => {
  const now = new Date();
  const { years, months, days } = diffYMD(LOVE_START, now);
  const msg = `💞 Together since June 18, 2024\n${years}y ${months}m ${days}d 💗`;

  try {
    if (navigator.share) await navigator.share({ text: msg });
    else {
      await navigator.clipboard.writeText(msg);
      alert("Copied 💗");
    }
  } catch {}
});

loveBgApply?.addEventListener("click", () => {
  const url = loveBgInput?.value?.trim();
  if (!url) return;
  localStorage.setItem(LOVE_BG_KEY, url);
  applyLoveHeroBg(url);
});

loveBgClear?.addEventListener("click", () => {
  localStorage.removeItem(LOVE_BG_KEY);
  if (loveBgInput) loveBgInput.value = "";
  applyLoveHeroBg("");
});

setInterval(updateLoveCounter, 10_000);
updateLoveCounter();
applyLoveHeroBg(localStorage.getItem(LOVE_BG_KEY) || "");

// ===============================
// DRAW tab — advanced drawing board
// ===============================
let drawStarted = false;

function startDrawingBoardAdvanced() {
  if (!drawCanvas || drawStarted) return;
  drawStarted = true;

  const ctx = drawCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

  let tool = "pen"; // pen | eraser | fill | text
  let symmetry = false;

  const undoStack = [];
  const redoStack = [];

  function snapshot() {
    try {
      undoStack.push(ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
      if (undoStack.length > 40) undoStack.shift();
      redoStack.length = 0;
      updateUndoRedoButtons();
    } catch {}
  }

  function restore(imgData) {
    if (!imgData) return;
    ctx.putImageData(imgData, 0, 0);
  }

  function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function getSettings() {
    const color = penColor?.value || "#ff4fa5";
    const size = Number(penSize?.value || 10);
    const opacity = Math.min(1, Math.max(0.05, Number(penOpacity?.value || 1)));
    const smooth = Math.min(0.95, Math.max(0, Number(penSmooth?.value || 0)));
    const b = (brushType?.value || "round").toLowerCase();
    return { color, size, opacity, smooth, brush: b };
  }

  function canvasPoint(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
    const x = (clientX - rect.left) * (drawCanvas.width / rect.width);
    const y = (clientY - rect.top) * (drawCanvas.height / rect.height);
    return { x, y };
  }

  function smoothPoint(prev, next, amt) {
    if (!prev) return next;
    return {
      x: prev.x + (next.x - prev.x) * (1 - amt),
      y: prev.y + (next.y - prev.y) * (1 - amt)
    };
  }

  function setBrushComposite(s) {
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = s.size;
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = s.opacity;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;
  }

  function drawStrokeSegment(a, b, s, pressure = 1) {
    setBrushComposite(s);
    const brush = s.brush;

    if (brush === "spray") {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(dist / 2));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const dots = Math.max(10, Math.floor(s.size * 1.2));
        for (let k = 0; k < dots; k++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * (s.size * 0.8);
          ctx.beginPath();
          ctx.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, 0.7 * pressure, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    if (brush === "marker") {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(dist / (s.size * 0.35)));
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, s.size * 0.55, s.size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function drawWithSymmetry(a, b, s, pressure) {
    drawStrokeSegment(a, b, s, pressure);
    if (!symmetry) return;
    const cx = drawCanvas.width / 2;
    const ma = { x: cx + (cx - a.x), y: a.y };
    const mb = { x: cx + (cx - b.x), y: b.y };
    drawStrokeSegment(ma, mb, s, pressure);
  }

  // Bucket fill
  function hexToRgba(hex) {
    const h = hex.replace("#", "").trim();
    const bigint = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
  }
  function colorsMatch(data, idx, target, tol = 0) {
    return (
      Math.abs(data[idx] - target[0]) <= tol &&
      Math.abs(data[idx + 1] - target[1]) <= tol &&
      Math.abs(data[idx + 2] - target[2]) <= tol &&
      Math.abs(data[idx + 3] - target[3]) <= tol
    );
  }
  function setColor(data, idx, col) {
    data[idx] = col[0];
    data[idx + 1] = col[1];
    data[idx + 2] = col[2];
    data[idx + 3] = col[3];
  }

  function bucketFill(x, y, fillColor, tol = 16) {
    const img = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const data = img.data;
    const w = img.width;
    const h = img.height;

    const startX = Math.max(0, Math.min(w - 1, Math.floor(x)));
    const startY = Math.max(0, Math.min(h - 1, Math.floor(y)));
    const startIdx = (startY * w + startX) * 4;

    const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
    if (colorsMatch(data, startIdx, fillColor, 0)) return;

    const stack = [[startX, startY]];
    const visited = new Uint8Array(w * h);

    while (stack.length) {
      const [cx, cy] = stack.pop();
      const vi = cy * w + cx;
      if (visited[vi]) continue;
      visited[vi] = 1;

      const idx = (cy * w + cx) * 4;
      if (!colorsMatch(data, idx, target, tol)) continue;

      setColor(data, idx, fillColor);

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < w - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < h - 1) stack.push([cx, cy + 1]);
    }

    ctx.putImageData(img, 0, 0);
  }

  // Text tool
  function drawTextAt(x, y) {
    const text = prompt("Enter text:");
    if (!text) return;

    const s = getSettings();
    const size = Math.max(10, s.size * 2.2);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = Math.max(0.2, s.opacity);
    ctx.fillStyle = s.color;
    ctx.font = `700 ${Math.floor(size)}px system-ui, Arial`;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.restore();

    if (symmetry) {
      const cx = drawCanvas.width / 2;
      const mx = cx + (cx - x);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.max(0.2, s.opacity);
      ctx.fillStyle = s.color;
      ctx.font = `700 ${Math.floor(size)}px system-ui, Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(text, mx, y);
      ctx.restore();
    }
  }

  // pointer drawing
  let drawing = false;
  let smoothLast = null;

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const pt = canvasPoint(e);

    if (tool === "fill") {
      snapshot();
      const s = getSettings();
      bucketFill(pt.x, pt.y, hexToRgba(s.color), 20);
      if (symmetry) {
        const cx = drawCanvas.width / 2;
        const mx = cx + (cx - pt.x);
        bucketFill(mx, pt.y, hexToRgba(s.color), 20);
      }
      updateUndoRedoButtons();
      return;
    }

    if (tool === "text") {
      snapshot();
      drawTextAt(pt.x, pt.y);
      updateUndoRedoButtons();
      return;
    }

    drawing = true;
    snapshot();
    smoothLast = pt;
    drawCanvas.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!drawing) return;
    const s = getSettings();
    const raw = canvasPoint(e);
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 1;

    const sp = smoothPoint(smoothLast, raw, s.smooth);
    drawWithSymmetry(smoothLast, sp, s, pressure);
    smoothLast = sp;
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

  // toolbar buttons
  penBtn?.addEventListener("click", () => (tool = "pen"));
  eraserBtn?.addEventListener("click", () => (tool = "eraser"));
  fillBtn?.addEventListener("click", () => (tool = "fill"));
  textToolBtn?.addEventListener("click", () => (tool = "text"));

  symmetryBtn?.addEventListener("click", () => {
    symmetry = !symmetry;
    symmetryBtn.classList.toggle("primary", symmetry);
    symmetryBtn.textContent = symmetry ? "Symmetry ✅" : "Symmetry";
  });

  undoBtn?.addEventListener("click", () => {
    if (undoStack.length === 0) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    redoStack.push(current);
    const prev = undoStack.pop();
    restore(prev);
    updateUndoRedoButtons();
  });

  redoBtn?.addEventListener("click", () => {
    if (redoStack.length === 0) return;
    const current = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    undoStack.push(current);
    const nxt = redoStack.pop();
    restore(nxt);
    updateUndoRedoButtons();
  });

  clearBtn?.addEventListener("click", () => {
    snapshot();
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.restore();
    updateUndoRedoButtons();
  });

  drawFullscreenBtn?.addEventListener("click", async () => {
    const wrap = drawCanvas.closest(".canvasWrap") || drawCanvas.parentElement;
    try {
      if (!document.fullscreenElement) {
        await (wrap?.requestFullscreen?.() || drawCanvas.requestFullscreen?.());
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  });

  // save drawing -> R2 + Firestore drawings collection
  saveDrawBtn?.addEventListener("click", async () => {
    try {
      saveDrawBtn.disabled = true;

      const blob = await new Promise((resolve) => drawCanvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("Could not save drawing.");

      const file = new File([blob], `drawing_${Date.now()}.png`, { type: "image/png" });
      const { key } = await uploadImageToR2(file);

      await addDoc(collection(db, "drawings"), {
        key,
        filename: file.name,
        contentType: "image/png",
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: displayNameFor(auth.currentUser.uid, auth.currentUser.email),
        createdAt: serverTimestamp()
      });

      alert("Saved 💗");
    } catch (e) {
      alert(e.message);
    } finally {
      saveDrawBtn.disabled = false;
    }
  });

  updateUndoRedoButtons();
}

// Draw gallery
let drawGalleryUnsub = null;
function startDrawGallery() {
  if (!drawGallery) return;
  if (drawGalleryUnsub) return;

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt", "desc"), limit(250));
  drawGalleryUnsub = onSnapshot(qDraw, (snap) => {
    drawGallery.innerHTML = "";

    snap.forEach((d) => {
      const it = d.data() || {};

      const card = document.createElement("div");
      card.className = "savedCard";

      const img = document.createElement("img");
      img.className = "savedThumb";
      img.alt = "drawing";

      const meta = document.createElement("div");
      meta.className = "muted tiny";
      meta.textContent = it.name || it.email || "drawing";

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

      card.appendChild(img);
      card.appendChild(meta);
      drawGallery.appendChild(card);
    });
  });
}

// ===============================
// ✅ CALENDAR (WORKING) — Firestore events
// Collection: events
// Fields: title, notes, startAtMs (number), startAtText, uid, email, name, createdAt
// Permissions enforced in app logic:
// - user can delete own events
// - admin can delete any events
// ===============================
let eventsUnsub = null;

function getLocalDateTimeMs(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD (from <input type="date">)
  // timeStr: HH:MM (from <input type="time">)
  // Interpreted as LOCAL time (you are EST, so this matches your intent)
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "12:00").split(":").map(Number);
  const dt = new Date(y, (m - 1), d, hh, mm, 0, 0);
  return dt.getTime();
}

function startCalendarRealtime(isAdmin) {
  if (!calList) return;
  if (eventsUnsub) return;

  if (calTzLabel) calTzLabel.textContent = `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"}`;

  // upcoming only (but we keep a buffer and filter client-side)
  const qEv = query(collection(db, "events"), orderBy("startAtMs", "asc"), limit(300));

  eventsUnsub = onSnapshot(qEv, (snap) => {
    const now = Date.now();
    calList.innerHTML = "";

    let countShown = 0;

    snap.forEach((d) => {
      const ev = d.data() || {};
      const startAtMs = Number(ev.startAtMs || 0);

      // Show past events too if you want — currently we show upcoming + very recent (last 7 days)
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (startAtMs < (now - sevenDays)) return;

      countShown++;

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      const title = safeText(ev.title || "Event");
      const when = startAtMs ? formatLocalDateTime(startAtMs) : safeText(ev.startAtText || "");
      const who = safeText(ev.name || ev.email || "");

      left.innerHTML = `
        <div><b>${title}</b></div>
        <small>${when}${who ? ` • ${who}` : ""}</small>
        ${ev.notes ? `<div class="muted tiny" style="margin-top:6px;white-space:pre-wrap;">${safeText(ev.notes)}</div>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "actions";

      const canDelete = isAdmin || ev.uid === auth.currentUser.uid;

      if (canDelete) {
        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.onclick = async () => {
          if (!confirm("Delete this event?")) return;
          await deleteDoc(doc(db, "events", d.id));
        };
        actions.appendChild(del);
      }

      row.appendChild(left);
      row.appendChild(actions);
      calList.appendChild(row);
    });

    if (countShown === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No upcoming events yet 💗";
      calList.appendChild(empty);
    }

    setMsg(calMsg, `Loaded ${countShown} event(s)`, true);
  });

  // Add event
  calAddBtn?.addEventListener("click", async () => {
    const title = calTitle?.value?.trim();
    const dateStr = calDate?.value;
    const timeStr = calTime?.value || "12:00";
    const notes = calNotes?.value?.trim() || "";

    if (!title) return setMsg(calMsg, "Add a title.", false);
    if (!dateStr) return setMsg(calMsg, "Pick a date.", false);

    const startAtMs = getLocalDateTimeMs(dateStr, timeStr);
    if (!Number.isFinite(startAtMs)) return setMsg(calMsg, "Bad date/time.", false);

    calAddBtn.disabled = true;
    setMsg(calMsg, "Saving…", true);

    try {
      await addDoc(collection(db, "events"), {
        title,
        notes,
        startAtMs,
        startAtText: `${dateStr} ${timeStr}`,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: displayNameFor(auth.currentUser.uid, auth.currentUser.email),
        createdAt: serverTimestamp()
      });

      if (calTitle) calTitle.value = "";
      if (calNotes) calNotes.value = "";
      setMsg(calMsg, "Event added ✅", true);
    } catch (e) {
      setMsg(calMsg, e.message, false);
    } finally {
      calAddBtn.disabled = false;
    }
  });
}

// ===============================
// Calendar placeholder? removed — Calendar is now real
// ===============================

// ===============================
// Auth gate + boot
// ===============================
onAuthStateChanged(auth, async (user) => {
  try {
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
        blocked: false,
        nickname: "",
        createdAt: serverTimestamp()
      });
      show(pendingView);
      return;
    }

    const data = snap.data() || {};

    if (data.blocked || data.denied || !data.approved) {
      show(pendingView);
      return;
    }

    // approved user
    show(appView);

    // nicknames
    startUsersRealtime();

    const isAdmin = !!data.isAdmin;
    window.__isAdmin = isAdmin;

    if (adminTabBtn) {
      if (isAdmin) adminTabBtn.classList.remove("hidden");
      else adminTabBtn.classList.add("hidden");
    }

    // Start app features
    startChatRealtime();
    startSavedRealtime();
    startDrawingBoardAdvanced();
    startDrawGallery();

    // ✅ Calendar now working
    startCalendarRealtime(isAdmin);

    // Admin features
    if (isAdmin) {
      loadPendingUsers();
      startAccountsRealtime(true);
    }
  } catch (e) {
    console.error(e);
    show(authView);
    setMsg(authMsg, e.message || "Something went wrong.");
  }
});
