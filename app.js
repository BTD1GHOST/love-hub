// ===============================
// OUR LITTLE HUB — app.js (FULL REWRITE FINAL)
// ✅ Username + Password (no real email)
// ✅ No early snapshot popups / no console spam
// ✅ Start ALL Firestore listeners ONLY after:
//    - signed in
//    - user doc exists
//    - approved && not denied
// ✅ Chat (tap anywhere on pic message opens fullscreen)
// ✅ Fullscreen image viewer + Save to Saved tab + Download
// ✅ Saved tab: Select / Select All / Unsave (bulk)
// ✅ Draw: advanced brushes + bucket + text + symmetry + undo/redo + fullscreen + save + gallery
// ✅ Admin: pending approvals + all accounts + set display name + block/unblock + delete access doc + clear chat
// ✅ Calendar: shared events list + add/delete
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

/* ===============================
   CONFIG
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyCCJdRcwZD9l83A02h1ysPI_VWTc1IGRSM",
  authDomain: "love-hub-d4f77.firebaseapp.com",
  projectId: "love-hub-d4f77",
  storageBucket: "love-hub-d4f77.firebasestorage.app",
  messagingSenderId: "189429669803",
  appId: "1:189429669803:web:e2e6cb2488d234e1fafcee"
};

// your Cloudflare Worker base URL
const WORKER_URL = "https://lovehub-api.brayplaster7.workers.dev";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
   UI REFS
   =============================== */
const authView = document.getElementById("authView");
const pendingView = document.getElementById("pendingView");
const appView = document.getElementById("appView");
const btnSignOut = document.getElementById("btnSignOut");

const usernameEl = document.getElementById("username");
const passEl = document.getElementById("password");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignUp = document.getElementById("btnSignUp");
const authMsg = document.getElementById("authMsg");

// Tabs
const adminTabBtn = document.querySelector(".adminOnly");

// Admin UI
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

// Calendar tab root
const calendarRoot = document.getElementById("tab-calendar");

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

function normalizeUsername(raw) {
  const u = (raw || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,20}$/.test(u)) {
    throw new Error("Username must be 3–20 characters (letters/numbers/._-).");
  }
  return u;
}

function usernameToEmail(username) {
  // Fake email for Firebase Auth (still email/password under the hood)
  return `${username}@lovehub.local`;
}

// Safe snapshot wrapper: no popups, no spam
function safeOnSnapshot(q, onOk, label = "snapshot") {
  return onSnapshot(
    q,
    (snap) => onOk(snap),
    (err) => {
      console.warn(`${label} snapshot error (safe to ignore)`, err?.code || err?.message || err);
    }
  );
}

/* ===============================
   TABS
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
   AUTH ACTIONS
   =============================== */
btnSignOut?.addEventListener("click", () => signOut(auth));

btnSignUp?.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    const username = normalizeUsername(usernameEl?.value || "");
    const password = passEl?.value || "";
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const fakeEmail = usernameToEmail(username);
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      username,
      usernameLower: username,
      approved: false,
      denied: false,
      isAdmin: false,
      nickname: "",
      createdAt: serverTimestamp()
    });

    setMsg(authMsg, "Account created! Waiting for approval 💗", true);
  } catch (e) {
    setMsg(authMsg, e?.message || String(e));
  }
});

btnSignIn?.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    const username = normalizeUsername(usernameEl?.value || "");
    const password = passEl?.value || "";
    const fakeEmail = usernameToEmail(username);

    await signInWithEmailAndPassword(auth, fakeEmail, password);
  } catch (e) {
    setMsg(authMsg, e?.message || String(e));
  }
});

/* ===============================
   USER DISPLAY NAME MAP
   =============================== */
let uidToName = {};
let unsubUsers = null;

function startUsersRealtime() {
  unsubUsers?.();
  unsubUsers = safeOnSnapshot(
    query(collection(db, "users"), limit(500)),
    (snap) => {
      const map = {};
      snap.forEach((d) => {
        const u = d.data() || {};
        map[d.id] = (u.nickname?.trim() || u.username || d.id);
      });
      uidToName = map;
    },
    "users"
  );
}
function displayNameFor(uid) {
  return uidToName[uid] || uid || "Someone";
}

/* ===============================
   ADMIN: pending approvals
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
      const u = d.data() || {};

      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `<div><b>${esc(u.username || "(no username)")}</b></div><small>${esc(d.id)}</small>`;

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
    setMsg(adminMsg, e?.message || String(e));
  }
}
btnRefreshUsers?.addEventListener("click", loadPendingUsers);

/* ===============================
   ADMIN: All accounts realtime
   =============================== */
let unsubAccounts = null;

function startAccountsRealtime(isAdmin) {
  if (!accountsList) return;
  unsubAccounts?.();
  if (!isAdmin) return;

  const qAll = query(collection(db, "users"), orderBy("createdAt"), limit(500));

  unsubAccounts = safeOnSnapshot(
    qAll,
    (snap) => {
      accountsList.innerHTML = "";

      snap.forEach((d) => {
        const u = d.data() || {};
        const uid = d.id;

        const status = u.denied ? "Denied" : (u.approved ? "Approved" : "Pending");
        const name = (u.nickname?.trim() || u.username || "");
        const isMe = auth.currentUser?.uid === uid;

        const row = document.createElement("div");
        row.className = "item";

        const left = document.createElement("div");
        left.innerHTML = `
          <div><b>${esc(name || uid)}</b> <small>(${esc(status)})</small></div>
          <small>${esc(uid)}</small>
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
          if (isMe) return;
          if (!confirm("This will delete their user profile doc (and block them). Continue?")) return;

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
    },
    "accounts"
  );
}

/* ===============================
   ADMIN: Clear chat
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
    setMsg(adminMsg, e?.message || String(e));
  } finally {
    btnClearChat && (btnClearChat.disabled = false);
  }
}
btnClearChat?.addEventListener("click", async () => {
  await clearChat(!!window.__isAdmin);
});

/* ===============================
   R2 (via Worker) upload/fetch
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
    console.warn("save failed", e?.code || e?.message || e);
  }
});

saveDeviceBtn?.addEventListener("click", async () => {
  if (!openKey) return;
  try {
    const blob = await fetchImageBlob(openKey);
    await downloadBlob(blob, openFilename || "photo.jpg");
  } catch (e) {
    console.warn("download failed", e?.code || e?.message || e);
  }
});

/* ===============================
   SAVED TAB (select + unsave)
   =============================== */
let savedSelectMode = false;
let selectedSavedIds = new Set();
let lastSavedDocs = [];
let unsubSaved = null;
let savedHandlersBound = false;

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

function bindSavedHandlersOnce() {
  if (savedHandlersBound) return;
  savedHandlersBound = true;

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
    if (!savedSelectMode || selectedSavedIds.size === 0) return;
    if (!confirm(`Unsave ${selectedSavedIds.size} image(s)?`)) return;

    if (savedUnsaveBtn) savedUnsaveBtn.disabled = true;
    try {
      for (const id of selectedSavedIds) {
        await deleteDoc(doc(db, "saved", id));
      }
      selectedSavedIds.clear();
      updateSavedToolbar();
    } catch (e) {
      console.warn("unsave failed", e?.code || e?.message || e);
    } finally {
      if (savedUnsaveBtn) savedUnsaveBtn.disabled = false;
    }
  });
}

function renderSavedGrid(docs) {
  if (!savedGrid) return;
  savedGrid.innerHTML = "";

  docs.forEach(({ id, data }) => {
    const s = data || {};

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

function startSavedRealtime() {
  unsubSaved?.();
  bindSavedHandlersOnce();
  if (!savedGrid) return;

  const qSaved = query(collection(db, "saved"), orderBy("savedAt", "desc"), limit(200));
  unsubSaved = safeOnSnapshot(
    qSaved,
    (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));
      lastSavedDocs = docs;
      renderSavedGrid(docs);
    },
    "saved"
  );

  updateSavedToolbar();
}

/* ===============================
   CHAT realtime
   =============================== */
let unsubChat = null;
let chatHandlersBound = false;

function bindChatHandlersOnce() {
  if (chatHandlersBound) return;
  chatHandlersBound = true;

  sendBtn?.addEventListener("click", async () => {
    const text = (chatText?.value || "").trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "messages"), {
        kind: "text",
        text,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      chatText.value = "";
    } catch (e) {
      console.warn("send text failed", e?.code || e?.message || e);
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
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      imgPick.value = "";
    } catch (e) {
      console.warn("send image failed", e?.code || e?.message || e);
    } finally {
      sendImgBtn.disabled = false;
    }
  });
}

function startChatRealtime() {
  unsubChat?.();
  bindChatHandlersOnce();
  if (!chatBox) return;

  const qMsg = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(200));

  unsubChat = safeOnSnapshot(
    qMsg,
    (snap) => {
      chatBox.innerHTML = "";

      snap.forEach((d) => {
        const m = d.data() || {};
        const mine = m.uid === auth.currentUser.uid;

        const div = document.createElement("div");
        div.className = "msgBubble " + (mine ? "msgMe" : "msgOther");

        const meta = document.createElement("div");
        meta.className = "msgMeta";
        meta.textContent = mine ? "You" : displayNameFor(m.uid);
        div.appendChild(meta);

        const body = document.createElement("div");

        if (m.kind === "image") {
          body.textContent = mine ? "📸 You sent a pic" : "📸 Tap to view pic";
          div.classList.add("snap");
          div.style.cursor = "pointer";

          div.addEventListener("click", async () => {
            try {
              const blob = await fetchImageBlob(m.key);
              openFullscreenWithBlob(blob, { key: m.key, filename: m.filename, contentType: m.contentType });
            } catch (e) {
              console.warn("open image failed", e?.code || e?.message || e);
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
    "messages"
  );
}

/* ===============================
   DRAW — Advanced + Bucket + Text
   =============================== */
let unsubDrawGallery = null;
let drawInitDone = false;

function startDrawingBoard() {
  if (drawInitDone) return; // init once
  drawInitDone = true;

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
    } catch (e) { console.warn("fullscreen failed", e); }
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
    if (!txt) return;

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

function startDrawGallery() {
  unsubDrawGallery?.();
  if (!drawGallery) return;

  const qDraw = query(collection(db, "drawings"), orderBy("createdAt", "desc"), limit(200));

  unsubDrawGallery = safeOnSnapshot(
    qDraw,
    (snap) => {
      drawGallery.innerHTML = "";

      snap.forEach((d) => {
        const it = d.data() || {};

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
        meta.textContent = it.username || "drawing";

        card.appendChild(img);
        card.appendChild(meta);
        drawGallery.appendChild(card);
      });
    },
    "drawings"
  );
}

// Save drawing to R2 + Firestore
saveDrawBtn?.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  try {
    const blob = await new Promise((resolve) => drawCanvas.toBlob(resolve, "image/png", 0.95));
    if (!blob) return;

    const file = new File([blob], `drawing-${Date.now()}.png`, { type: "image/png" });
    const { key } = await uploadImageToR2(file);

    const uDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const username = uDoc.exists() ? (uDoc.data()?.username || "") : "";

    await addDoc(collection(db, "drawings"), {
      key,
      filename: file.name,
      contentType: "image/png",
      uid: auth.currentUser.uid,
      username,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("save drawing failed", e?.code || e?.message || e);
  }
});

/* ===============================
   CALENDAR (shared events)
   =============================== */
let unsubEvents = null;
let calendarHandlersBound = false;

function buildCalendarUI() {
  if (!calendarRoot) return;
  // Always rebuild (clean)
  calendarRoot.innerHTML = `
    <h3>Calendar 📅</h3>
    <p class="muted">Shared events you both can see.</p>

    <div class="row">
      <input id="calTitle" class="input" placeholder="Event title (ex: Date night 💗)" />
      <input id="calWhen" class="input" type="datetime-local" />
    </div>

    <div class="row">
      <input id="calWhere" class="input" placeholder="Location (optional)" />
      <button id="calAddBtn" class="btn primary">Add Event</button>
    </div>

    <div id="calMsg" class="msg"></div>
    <div id="calList" class="list"></div>
  `;
}

function bindCalendarHandlersOnce() {
  if (calendarHandlersBound) return;
  calendarHandlersBound = true;

  calendarRoot?.addEventListener("click", async (e) => {
    const t = e.target;

    if (t && t.id === "calAddBtn") {
      const calTitle = document.getElementById("calTitle");
      const calWhen = document.getElementById("calWhen");
      const calWhere = document.getElementById("calWhere");
      const calMsg = document.getElementById("calMsg");

      try {
        const title = (calTitle?.value || "").trim();
        const whenVal = calWhen?.value || "";
        const where = (calWhere?.value || "").trim();

        if (!title) throw new Error("Title required.");
        if (!whenVal) throw new Error("Pick a date/time.");

        const whenIso = new Date(whenVal).toISOString();

        const uDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const username = uDoc.exists() ? (uDoc.data()?.username || "") : "";

        await addDoc(collection(db, "events"), {
          title,
          whenIso,
          where,
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid,
          username
        });

        if (calTitle) calTitle.value = "";
        if (calWhere) calWhere.value = "";
        setMsg(calMsg, "Added ✅", true);
        setTimeout(() => setMsg(calMsg, ""), 900);
      } catch (err) {
        setMsg(calMsg, err?.message || String(err));
      }
    }

    if (t && t.dataset && t.dataset.delEventId) {
      const eventId = t.dataset.delEventId;
      const ownerUid = t.dataset.ownerUid || "";
      const isAdmin = !!window.__isAdmin;
      const canDelete = isAdmin || ownerUid === auth.currentUser.uid;
      if (!canDelete) return;
      if (!confirm("Delete this event?")) return;
      await deleteDoc(doc(db, "events", eventId));
    }
  });
}

function startEventsRealtime() {
  unsubEvents?.();
  buildCalendarUI();
  bindCalendarHandlersOnce();

  const calList = document.getElementById("calList");
  if (!calList) return;

  const qEvents = query(collection(db, "events"), orderBy("whenIso", "asc"), limit(300));

  unsubEvents = safeOnSnapshot(
    qEvents,
    (snap) => {
      calList.innerHTML = "";

      if (snap.empty) {
        calList.innerHTML = `<div class="muted tiny">No events yet 💗</div>`;
        return;
      }

      snap.forEach((d) => {
        const ev = d.data() || {};
        const row = document.createElement("div");
        row.className = "item";

        const left = document.createElement("div");
        const when = ev.whenIso ? new Date(ev.whenIso) : null;
        const whenPretty = when ? when.toLocaleString() : "—";

        left.innerHTML = `
          <div><b>${esc(ev.title || "Event")}</b></div>
          <small>${esc(whenPretty)}${ev.where ? ` · ${esc(ev.where)}` : ""}</small>
        `;

        const actions = document.createElement("div");
        actions.className = "actions";

        const del = document.createElement("button");
        del.className = "btn";
        del.textContent = "Delete";
        del.dataset.delEventId = d.id;
        del.dataset.ownerUid = ev.uid || "";

        const canDelete = (!!window.__isAdmin) || (ev.uid === auth.currentUser.uid);
        if (!canDelete) {
          del.disabled = true;
          del.title = "Only admin or the creator can delete.";
        }

        actions.appendChild(del);
        row.appendChild(left);
        row.appendChild(actions);
        calList.appendChild(row);
      });
    },
    "events"
  );
}

/* ===============================
   LISTENERS START/STOP
   =============================== */
let listenersStarted = false;

function stopAllListeners() {
  unsubUsers?.(); unsubUsers = null;
  unsubAccounts?.(); unsubAccounts = null;
  unsubChat?.(); unsubChat = null;
  unsubSaved?.(); unsubSaved = null;
  unsubDrawGallery?.(); unsubDrawGallery = null;
  unsubEvents?.(); unsubEvents = null;
  listenersStarted = false;
}

function startAllAfterApproved(isAdmin) {
  if (listenersStarted) return;
  listenersStarted = true;

  console.log("Auth ready, starting Firestore listeners");

  startUsersRealtime();
  startChatRealtime();
  startSavedRealtime();
  startDrawingBoard();
  startDrawGallery();
  startEventsRealtime();

  if (isAdmin) {
    loadPendingUsers();
    startAccountsRealtime(true);
  }
}

/* ===============================
   AUTH GATE (IMPORTANT FIX)
   =============================== */
onAuthStateChanged(auth, async (user) => {
  stopAllListeners();

  if (!user) {
    show(authView);
    return;
  }

  btnSignOut?.classList.remove("hidden");

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // If profile missing, create a basic one (still pending)
    if (!snap.exists()) {
      const inferred = (user.email || "").split("@")[0] || "";
      await setDoc(userRef, {
        username: inferred,
        usernameLower: inferred.toLowerCase(),
        approved: false,
        denied: false,
        isAdmin: false,
        nickname: "",
        createdAt: serverTimestamp()
      });
      show(pendingView);
      return;
    }

    const data = snap.data() || {};

    if (data.denied || !data.approved) {
      show(pendingView);
      return;
    }

    show(appView);

    const isAdmin = !!data.isAdmin;
    window.__isAdmin = isAdmin;

    if (isAdmin) adminTabBtn?.classList.remove("hidden");
    else adminTabBtn?.classList.add("hidden");

    startAllAfterApproved(isAdmin);
  } catch (e) {
    console.warn("Auth gate failed", e?.code || e?.message || e);
    show(authView);
  }
});
