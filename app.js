let peer;
let sharedKey;

const chat = document.getElementById("chat");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");

// تولید کلید
const keyPair = nacl.box.keyPair();
const myPublicKey = nacl.util.encodeBase64(keyPair.publicKey);
const mySecretKey = keyPair.secretKey;

// برای تست اولیه از signaling دستی استفاده می‌کنیم
const isInitiator = confirm("Are you the one who starts the chat?");

if (isInitiator) {
  peer = new SimplePeer({ initiator: true, trickle: false });

  peer.on('signal', data => {
    const signalData = btoa(JSON.stringify(data));
    prompt("Send this signal to your friend:", signalData);
  });
} else {
  const otherSignal = prompt("Paste the signal from your friend:");
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.signal(JSON.parse(atob(otherSignal)));
}

peer.on('signal', data => {
  const signalData = btoa(JSON.stringify(data));
  console.log("Send this back to your friend:", signalData);
});

peer.on('connect', () => {
  append("📶 Connected!");

  // تولید یک کلید مشترک برای رمزنگاری
  sharedKey = nacl.box.before(peer._channel.peerPublicKey || keyPair.publicKey, mySecretKey);
});

peer.on('data', data => {
  const decrypted = nacl.box.open.after(new Uint8Array(data), sharedKey);
  append("👤 " + new TextDecoder().decode(decrypted));
});

sendBtn.onclick = () => {
  const text = messageInput.value;
  const encoded = new TextEncoder().encode(text);
  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.box.after(encoded, nonce, sharedKey);

  // ارسال: nonce + message
  const full = new Uint8Array(nonce.length + encrypted.length);
  full.set(nonce);
  full.set(encrypted, nonce.length);

  peer.send(full);
  append("🧑‍💻 " + text);
  messageInput.value = "";
};

function append(msg) {
  chat.value += msg + "\n";
}
