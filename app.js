let peer;
let sharedKey;

const chat = document.getElementById("chat");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");
sendBtn.disabled = true;

// 🔐 Derive 32-byte shared key from password
const password = prompt("Enter shared password:");
sharedKey = nacl.hash(nacl.util.decodeUTF8(password)).slice(0, 32);

// WebRTC setup
const isInitiator = confirm("Are you the one who starts the chat?");
peer = new SimplePeer({ initiator: isInitiator, trickle: false });

peer.on("signal", data => {
  const encoded = btoa(JSON.stringify(data));
  if (isInitiator) {
    prompt("Send this signal to your friend:", encoded);
  } else {
    console.log("Send this back to your friend:", encoded);
  }
});

if (!isInitiator) {
  const otherSignal = prompt("Paste the signal from your friend:");
  peer.signal(JSON.parse(atob(otherSignal)));
}

peer.on("connect", () => {
  append("📶 Connected!");
  sendBtn.disabled = false;
});

peer.on("data", data => {
  const buffer = new Uint8Array(data);
  const nonce = buffer.slice(0, 24);
  const ciphertext = buffer.slice(24);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedKey);
  if (decrypted) {
    append("👤 " + new TextDecoder().decode(decrypted));
  } else {
    append("❌ Decryption failed.");
  }
});

sendBtn.onclick = () => {
  if (!peer || !peer.connected) return append("❌ Not connected.");

  const msg = messageInput.value.trim();
  if (!msg) return;

  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.secretbox(new TextEncoder().encode(msg), nonce, sharedKey);
  const full = new Uint8Array(nonce.length + encrypted.length);
  full.set(nonce);
  full.set(encrypted, nonce.length);

  peer.send(full);
  append("🧑‍💻 " + msg);
  messageInput.value = "";
};

function append(msg) {
  chat.value += msg + "\n";
}