import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  addDoc,
  onSnapshot,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc
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

// sign up
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

// sign in
btnSignIn.onclick = async () => {
  setMsg(authMsg, "");
  try{
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  }catch(e){
    setMsg(authMsg, e.message);
  }
};

btnSignOut.onclick = () => signOut(auth);

// tabs
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`).classList.remove("hidden");
  });
});

// love counter
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

// admin: load pending users
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

// auth gate
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

  if(data.denied){
    show(pendingView);
    return;
  }

  if(!data.approved){
    show(pendingView);
    return;
  }

  // approved user
  show(appView);

  // show admin tab if admin
  if(data.isAdmin){
    adminTabBtn?.classList.remove("hidden");
  } else {
    adminTabBtn?.classList.add("hidden");
  }
});

// ----- CHAT -----
const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");

if(sendBtn){
  sendBtn.onclick = async () => {
    const text = chatText.value.trim();
    if(!text) return;

    await addDoc(collection(db, "messages"), {
      text,
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      createdAt: serverTimestamp()
    });

    chatText.value = "";
  };

  const q = query(
    collection(db, "messages"),
    orderBy("createdAt"),
    limit(100)
  );

  onSnapshot(q, snap => {
    chatBox.innerHTML = "";
    snap.forEach(d => {
      const m = d.data();
      const div = document.createElement("div");
      div.className = "msgBubble " + (m.uid === auth.currentUser.uid ? "msgMe" : "msgOther");
      div.textContent = m.text;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}
