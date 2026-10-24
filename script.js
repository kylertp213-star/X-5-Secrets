import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("comment-form");
const input = document.getElementById("secret");
const feed = document.getElementById("comments");
const count = document.getElementById("comment-count");
const status = document.getElementById("status");
const sortButton = document.getElementById("sort-button");
let newestFirst = true;
let comments = [];

const configured = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_HERE"));
let db = null;

if (configured) {
  db = getFirestore(initializeApp(firebaseConfig));
  // Live updates: new secrets from anyone appear instantly.
  onSnapshot(
    query(collection(db, "secrets"), orderBy("createdAt", "asc")),
    snapshot => {
      comments = snapshot.docs
        .map(d => d.data())
        .filter(c => c && typeof c.text === "string" && typeof c.createdAt === "number");
      render();
    },
    () => { status.textContent = "Could not load secrets. Please refresh."; }
  );
} else {
  status.textContent = "Setup needed: add your Firebase config in firebase-config.js (see README).";
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short"
  }).format(new Date(timestamp));
}

function render() {
  count.textContent = `${comments.length} ${comments.length === 1 ? "secret" : "secrets"}`;
  feed.replaceChildren();

  if (!comments.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    const mark = document.createElement("div");
    mark.className = "empty-mark";
    mark.textContent = "❧";
    const message = document.createElement("p");
    message.textContent = "It’s peaceful here for now. Be the first to leave a secret.";
    empty.append(mark, message);
    feed.append(empty);
    return;
  }

  const sorted = [...comments].sort((a, b) =>
    newestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
  );
  for (const item of sorted) {
    const article = document.createElement("article");
    article.className = "comment";
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const anonymous = document.createElement("div");
    anonymous.className = "anonymous";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.textContent = "✧";
    const label = document.createElement("span");
    label.textContent = "Anonymous";
    anonymous.append(dot, label);
    const time = document.createElement("time");
    time.dateTime = new Date(item.createdAt).toISOString();
    time.textContent = formatDate(item.createdAt);
    const text = document.createElement("div");
    text.className = "comment-text";
    // textContent keeps comments as plain text instead of executable HTML.
    text.textContent = item.text;
    meta.append(anonymous, time);
    article.append(meta, text);
    feed.append(article);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    status.textContent = "Write something before sharing.";
    return;
  }
  if (!db) {
    status.textContent = "Setup needed: add your Firebase config in firebase-config.js.";
    return;
  }
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    await addDoc(collection(db, "secrets"), { text, createdAt: Date.now() });
    input.value = "";
    status.textContent = "Your secret has been shared.";
  } catch {
    status.textContent = "Could not share your secret. Please try again.";
  } finally {
    button.disabled = false;
  }
});

sortButton.addEventListener("click", () => {
  newestFirst = !newestFirst;
  sortButton.textContent = newestFirst ? "Newest first ↓" : "Oldest first ↑";
  render();
});

render();
