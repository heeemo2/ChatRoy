// ═══════════════════════════════════════
//  CHAT.JS — Room + Private Chat
// ═══════════════════════════════════════

const ChatModule = (() => {
let _currentUser     = null;
let _userData        = null;
let _roomId          = null;
let _roomData        = null;
let _chatId          = null;
let _peerUid         = null;
let _peerData        = null;
let _msgListener     = null;
let _memberListener  = null;
let _typingListener  = null;
let _onlineRef       = null;

function init(user, userData) {
_currentUser = user;
_userData    = userData;
}

function _scrollToBottom(el) {
if (!el) return;
requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

/* ══════════════════════════════
ROOM CHAT
══════════════════════════════ */
async function openRoom(roomId, roomData) {
const ok = await RoomsModule.canEnterRoom(roomId, _currentUser.uid);
if (!ok) return showToast(‘🚫 أنت محظور من هذه الغرفة’);

```
// Always refresh userData before entering room
try {
  const uSnap = await db.ref('users/' + _currentUser.uid).once('value');
  if (uSnap.val()) _userData = uSnap.val();
} catch(e) {}

_cleanupRoom();
_roomId   = roomId;
_roomData = roomData;

showScreen('screen-room');

// Header
const hAvi  = document.getElementById('room-header-avi');
const hName = document.getElementById('room-header-name');

// Show image or emoji
if (roomData.imageUrl) {
  if (hAvi) hAvi.innerHTML = `<img src="${roomData.imageUrl}" alt="room"/>`;
} else {
  if (hAvi) hAvi.textContent = roomData.avatar || '🏠';
}
if (hName) hName.textContent = roomData.name || 'غرفة';

// Online counter
_onlineRef = db.ref('rooms/' + roomId + '/usersOnline/' + _currentUser.uid);
_onlineRef.set(true);
_onlineRef.onDisconnect().remove();
db.ref('rooms/' + roomId + '/usersOnline').on('value', snap => {
  const cnt = Object.keys(snap.val() || {}).length;
  const el = document.getElementById('room-online-count');
  if (el) el.textContent = cnt + ' متواجد';
});

// Join message
const adminUser = isAdmin(_currentUser.uid);
const role = _getRole(roomId, roomData);
_sendSysMsg(roomId,
  (adminUser || role === 'admin' || role === 'owner')
    ? { text: '🔥 دخول أسطوري: ' + (_userData.username || ''), legendary: true }
    : { text: '🚪 دخل: ' + (_userData.username || ''), legendary: false }
);

_listenRoomMsgs(roomId);
_listenMembers(roomId, roomData);
_buildRoomInput(roomId);

// Back
document.getElementById('btn-room-back').onclick = () => {
  _cleanupRoom();
  showScreen('screen-app');
};

// Members panel toggle
document.getElementById('btn-room-members').onclick = () => {
  document.getElementById('members-panel').classList.toggle('open');
};

// Room header click → show room info modal
const headerInfo = document.getElementById('room-header-info-btn');
if (headerInfo) {
  headerInfo.onclick = () => _showRoomInfoModal(roomId, roomData);
}
```

}

/* ── Room Info Modal ── */
async function _showRoomInfoModal(roomId, roomData) {
// Fetch fresh room data
let room = roomData;
try {
const snap = await db.ref(‘rooms/’ + roomId).once(‘value’);
if (snap.exists()) room = { id: roomId, …snap.val() };
} catch(e) {}

```
const membersSnap = await db.ref('rooms/' + roomId + '/usersOnline').once('value');
const onlineCnt = Object.keys(membersSnap.val() || {}).length;

const joinSnap = await db.ref('rooms/' + roomId + '/members').once('value');
const joinCnt = Object.keys(joinSnap.val() || {}).length;

const modal = document.getElementById('modal-room-info');
if (!modal) return;

const imgEl = document.getElementById('room-info-img');
if (imgEl) {
  if (room.imageUrl) {
    imgEl.innerHTML = `<img src="${room.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  } else {
    imgEl.textContent = room.avatar || '🏠';
  }
}
const el = id => document.getElementById(id);
if (el('room-info-name'))    el('room-info-name').textContent    = room.name || '';
if (el('room-info-online'))  el('room-info-online').textContent  = onlineCnt + ' متواجد الآن';
if (el('room-info-members')) el('room-info-members').textContent = joinCnt + ' عضو منضم';
if (el('room-info-type'))    el('room-info-type').textContent    = room.isPublic ? '🌍 غرفة عامة' : '🔒 غرفة خاصة';

// Admin controls: change room image
const imgCtrl = document.getElementById('room-info-img-ctrl');
if (imgCtrl) {
  if (isAdmin(_currentUser.uid) || room.ownerId === _currentUser.uid) {
    imgCtrl.classList.remove('hidden');
    imgCtrl.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('جارٍ الرفع...');
        try {
          const storageRef = storage.ref('rooms/' + roomId + '/cover');
          await storageRef.put(file);
          const url = await storageRef.getDownloadURL();
          await db.ref('rooms/' + roomId + '/imageUrl').set(url);
          showToast('تم تحديث صورة الغرفة ✓');
          // Update header
          const hAvi = document.getElementById('room-header-avi');
          if (hAvi) hAvi.innerHTML = `<img src="${url}" alt="room"/>`;
          if (imgEl) imgEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
          closeModal('modal-room-info');
        } catch(err) {
          showToast('خطأ في الرفع');
        }
      };
      inp.click();
    };
  } else {
    imgCtrl.classList.add('hidden');
  }
}

openModal('modal-room-info');
```

}

function _sendSysMsg(roomId, { text, legendary }) {
db.ref(‘messages/’ + roomId).push({
type: ‘system’, text, legendary: !!legendary,
timestamp: firebase.database.ServerValue.TIMESTAMP,
});
}

function _listenRoomMsgs(roomId) {
const msgsEl = document.getElementById(‘chat-messages’);
if (!msgsEl) return;
msgsEl.innerHTML = ‘’;
const ref = db.ref(‘messages/’ + roomId).orderByChild(‘timestamp’).limitToLast(100);
_msgListener = ref.on(‘child_added’, snap => {
const msg = snap.val(); if (!msg) return;
msgsEl.appendChild(_buildBubble(snap.key, msg, roomId));
_scrollToBottom(msgsEl);
});
}

/* ── Build Chat Bubble ── */
function _buildBubble(msgId, msg, roomId) {
if (msg.type === ‘system’) {
const d = document.createElement(‘div’);
d.className = ‘sys-msg’ + (msg.legendary ? ’ legendary’ : ‘’);
d.textContent = msg.text; return d;
}
const isOwn   = msg.senderId === _currentUser.uid;
const isAdm   = isAdmin(msg.senderId);
const row     = document.createElement(‘div’);
row.className = ‘msg-row’ + (isOwn ? ’ own’ : ‘’) + (isAdm ? ’ is-admin’ : ‘’);
row.dataset.msgId = msgId;

```
// Avatar: image or emoji
const avi = document.createElement('div');
avi.className = 'msg-avatar';
if (msg.senderPhotoURL) {
  avi.innerHTML = `<img src="${msg.senderPhotoURL}" alt="avi"/>`;
} else {
  avi.textContent = msg.senderAvatar || '👤';
}
avi.onclick = () => _showProfileSlideUp(msg.senderId);

const content = document.createElement('div');
content.className = 'msg-content';

// Badges HTML (top 3)
const badgesHTML = buildMsgBadgesHTML(msg.senderBadges || []);

content.innerHTML =
  '<div class="msg-sender-row">' +
    '<span class="msg-sender ' + (isAdm ? 'admin-name' : '') + '">' + sanitize(msg.senderName || '') + '</span>' +
    badgesHTML +
  '</div>' +
  '<div class="msg-bubble">' + sanitize(msg.text) + '</div>' +
  '<div class="msg-time">' + formatTime(msg.timestamp) + '</div>';

// Long press context menu
const bubble = content.querySelector('.msg-bubble');
let longPressTimer;
bubble.addEventListener('touchstart',  () => { longPressTimer = setTimeout(() => _ctxMenu(msgId, msg, roomId), 600); });
bubble.addEventListener('touchend',    () => clearTimeout(longPressTimer));
bubble.addEventListener('touchmove',   () => clearTimeout(longPressTimer));
bubble.addEventListener('contextmenu', e  => { e.preventDefault(); _ctxMenu(msgId, msg, roomId); });

row.appendChild(isOwn ? content : avi);
row.appendChild(isOwn ? avi : content);
return row;
```

}

/* ── Slide-up profile (bottom sheet) ── */
async function _showProfileSlideUp(uid) {
try {
const snap = await db.ref(‘users/’ + uid).once(‘value’);
const u = snap.val();
if (!u) return;
await ProfileModule.viewUserProfile(uid, _currentUser.uid);
} catch(e) { console.error(‘profileSlideUp:’, e); }
}

/* ── Context Menu ── */
function _ctxMenu(msgId, msg, roomId) {
document.getElementById(‘ctx-menu’)?.remove();
const role   = _getRole(roomId, _roomData);
const canDel = msg.senderId === _currentUser.uid || role !== ‘member’ || isAdmin(_currentUser.uid);
const canMod = (role === ‘owner’ || role === ‘admin’ || isAdmin(_currentUser.uid)) && msg.senderId !== _currentUser.uid;

```
const menu = document.createElement('div');
menu.id = 'ctx-menu'; menu.className = 'ctx-menu';
menu.style.cssText = 'position:fixed;bottom:80px;right:12px;left:12px;z-index:300';

if (canDel) {
  const d = document.createElement('div');
  d.className = 'ctx-item danger';
  d.innerHTML = '🗑 حذف الرسالة';
  d.onclick = async () => { await db.ref('messages/' + roomId + '/' + msgId).remove(); menu.remove(); };
  menu.appendChild(d);
}
if (canMod && msg.senderId) {
  const k = document.createElement('div'); k.className = 'ctx-item';
  k.innerHTML = '🚪 طرد';
  k.onclick = async () => { await RoomsModule.kickUser(roomId, msg.senderId); menu.remove(); };

  const b = document.createElement('div'); b.className = 'ctx-item danger';
  b.innerHTML = '🚫 حظر';
  b.onclick = async () => { await RoomsModule.banUser(roomId, msg.senderId); menu.remove(); };

  menu.appendChild(k); menu.appendChild(b);

  if (role === 'owner' || isAdmin(_currentUser.uid)) {
    const a = document.createElement('div'); a.className = 'ctx-item';
    a.innerHTML = '🛡 تعيين أدمن';
    a.onclick = async () => { await RoomsModule.assignAdmin(roomId, msg.senderId); menu.remove(); };
    menu.appendChild(a);
  }
}
if (!menu.children.length) return;
document.body.appendChild(menu);
setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
```

}

/* ── Members Panel ── */
function _listenMembers(roomId, roomData) {
const panel = document.getElementById(‘members-panel’);
if (!panel) return;
panel.innerHTML = ‘<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>’;
_memberListener = db.ref(‘rooms/’ + roomId + ‘/usersOnline’).on(‘value’, async snap => {
panel.innerHTML = ‘<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>’;
for (const uid of Object.keys(snap.val() || {})) {
try {
const uSnap = await db.ref(‘users/’ + uid).once(‘value’);
const u = uSnap.val(); if (!u) continue;
const role = uid === roomData.ownerId ? ‘owner’
: (roomData.admins && roomData.admins[uid]) ? ‘admin’ : ‘member’;
const row = document.createElement(‘div’);
row.className = ‘member-row’;
const aviHTML = u.photoURL
? `<img src="${u.photoURL}" style="width:34px;height:34px;border-radius:50%;object-fit:cover"/>`
: sanitize(u.avatar || ‘👤’);
row.innerHTML =
‘<div class="member-avi">’ + aviHTML + ‘</div>’ +
‘<div class="member-name">’ + sanitize(u.username || ‘’) + ‘</div>’ +
‘<div class="member-role ' + role + '">’ +
(role === ‘owner’ ? ‘👑’ : role === ‘admin’ ? ‘🛡’ : ‘’) +
‘</div>’;
row.onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);
panel.appendChild(row);
} catch(e) {}
}
});
}

/* ── Room Input ── */
function _buildRoomInput(roomId) {
const input   = document.getElementById(‘room-chat-input’);
const sendBtn = document.getElementById(‘btn-send-room’);
const emjBtn  = document.getElementById(‘btn-emoji-room’);
const picker  = document.getElementById(‘emoji-picker-room’);
if (!input || !sendBtn) return;

```
sendBtn.onclick = () => _sendRoomMsg(roomId, input);
input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendRoomMsg(roomId, input); } };

picker.innerHTML = '';
EMOJI_LIST.forEach(em => {
  const s = document.createElement('span');
  s.textContent = em;
  s.onclick = () => { input.value += em; input.focus(); };
  picker.appendChild(s);
});
emjBtn.onclick = e => { e.stopPropagation(); picker.classList.toggle('hidden'); };
document.addEventListener('click', () => picker.classList.add('hidden'));
```

}

async function _sendRoomMsg(roomId, input) {
const text = (input.value || ‘’).trim();
if (!text) return;
input.value = ‘’;
try {
// Get fresh user data for badges
const uSnap = await db.ref(‘users/’ + _currentUser.uid).once(‘value’);
const uData = uSnap.val() || _userData;
const badges = isAdmin(_currentUser.uid) ? getAdminBadges() : (uData.badges || []);

```
  await db.ref('messages/' + roomId).push({
    senderId: _currentUser.uid,
    senderName: uData.username || _userData.username,
    senderAvatar: uData.avatar || _userData.avatar || '👤',
    senderPhotoURL: uData.photoURL || null,
    senderBadges: badges.slice(0, 3),
    text, type: 'text',
    isAdmin: isAdmin(_currentUser.uid),
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // XP +1 per message (cap 200/day)
  const u = uData;
  const today = new Date().toDateString();
  const cnt = u.msgXPToday === today ? (u.msgXPCount || 0) : 0;
  const updates = { totalMessages: (u.totalMessages || 0) + 1 };
  if (cnt < 200) {
    const nx = Math.min((u.xp||0)+1, 100*XP_PER_LEVEL);
    updates.xp = nx; updates.level = getLevelFromXP(nx);
    updates.msgXPToday = today; updates.msgXPCount = cnt + 1;
  }
  await db.ref('users/' + _currentUser.uid).update(updates);
} catch(e) { console.error('sendRoomMsg:', e); }
```

}

/* ══════════════════════════════
PRIVATE CHAT
══════════════════════════════ */
async function openPrivateChat(peerUid, peerData) {
if (!peerUid || !_currentUser) return;
_cleanupPrivate();
_peerUid  = peerUid;
_chatId   = getChatId(_currentUser.uid, peerUid);

```
// Refresh own userData
try {
  const mySnap = await db.ref('users/' + _currentUser.uid).once('value');
  if (mySnap.val()) _userData = mySnap.val();
} catch(e) {}

try {
  const snap = await db.ref('users/' + peerUid).once('value');
  _peerData = snap.val() || peerData || {};
} catch(e) { _peerData = peerData || {}; }

showScreen('screen-private');

const hAvi  = document.getElementById('private-header-avi');
const hName = document.getElementById('private-header-name');
const hStat = document.getElementById('private-header-status');

// Show photo or emoji
if (_peerData.photoURL) {
  if (hAvi) hAvi.innerHTML = `<img src="${_peerData.photoURL}" alt="avi" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
} else {
  if (hAvi) hAvi.textContent = _peerData.avatar || '👤';
}
if (hName) hName.textContent = _peerData.username || '...';
if (hStat) {
  hStat.textContent = _peerData.online ? '🟢 متصل الآن' : '⚫ ' + formatLastSeen(_peerData.lastSeen);
  hStat.style.color = _peerData.online ? 'var(--online)' : 'var(--text-secondary)';
}

// Click on header name/avi → show profile
if (hAvi) hAvi.style.cursor = 'pointer';
if (hName) hName.style.cursor = 'pointer';
const headerClick = () => ProfileModule.viewUserProfile(peerUid, _currentUser.uid);
if (hAvi)  hAvi.onclick  = headerClick;
if (hName) hName.onclick = headerClick;

_listenPrivateMsgs();
_buildPrivateInput();

document.getElementById('btn-private-back').onclick = () => {
  _cleanupPrivate();
  showScreen('screen-app');
};
```

}

function _listenPrivateMsgs() {
const msgsEl = document.getElementById(‘private-messages’);
if (!msgsEl) return;
msgsEl.innerHTML = ‘’;
const ref = db.ref(‘privateChats/’ + _chatId).orderByChild(‘timestamp’).limitToLast(100);
_msgListener = ref.on(‘child_added’, snap => {
const msg = snap.val(); if (!msg) return;
const isOwn = msg.senderId === _currentUser.uid;
const sender = isOwn ? _userData : _peerData;
const row = document.createElement(‘div’);
row.className = ‘msg-row’ + (isOwn ? ’ own’ : ‘’);

```
  const aviHTML = sender.photoURL
    ? `<img src="${sender.photoURL}" alt="avi"/>`
    : sanitize(sender.avatar || '👤');

  // Badges for private chat (top 3)
  const senderBadges = isOwn
    ? (isAdmin(_currentUser.uid) ? getAdminBadges() : (_userData.badges || []))
    : (_peerData.badges || []);
  const badgesHTML = buildMsgBadgesHTML(senderBadges);

  row.innerHTML =
    '<div class="msg-avatar" style="cursor:pointer">' + aviHTML + '</div>' +
    '<div class="msg-content">' +
      '<div class="msg-sender-row">' +
        '<span class="msg-sender">' + sanitize(sender.username || '') + '</span>' +
        badgesHTML +
      '</div>' +
      '<div class="msg-bubble">' + sanitize(msg.text) + '</div>' +
      '<div class="msg-time">' + formatTime(msg.timestamp) + (isOwn && msg.seen ? ' ✔✔' : '') + '</div>' +
    '</div>';

  // Click avatar → slide-up profile
  const msgAvi = row.querySelector('.msg-avatar');
  if (msgAvi) {
    const clickUid = isOwn ? _currentUser.uid : _peerUid;
    msgAvi.onclick = () => ProfileModule.viewUserProfile(clickUid, _currentUser.uid);
  }

  msgsEl.appendChild(row);
  _scrollToBottom(msgsEl);
  if (!isOwn && !msg.seen) db.ref('privateChats/' + _chatId + '/' + snap.key + '/seen').set(true);
});

// Typing
_typingListener = db.ref('typing/' + _chatId + '/' + _peerUid).on('value', snap => {
  const el = document.getElementById('typing-indicator');
  if (el) el.classList.toggle('hidden', !snap.val());
});
```

}

function _buildPrivateInput() {
const input   = document.getElementById(‘private-chat-input’);
const sendBtn = document.getElementById(‘btn-send-private’);
const emjBtn  = document.getElementById(‘btn-emoji-private’);
const picker  = document.getElementById(‘emoji-picker-private’);
if (!input || !sendBtn) return;

```
let typingTimer;
input.oninput = () => {
  db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(false);
  }, 2000);
};

sendBtn.onclick = () => _sendPrivateMsg(input);
input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendPrivateMsg(input); } };

if (picker) {
  picker.innerHTML = '';
  EMOJI_LIST.forEach(em => {
    const s = document.createElement('span'); s.textContent = em;
    s.onclick = () => { input.value += em; input.focus(); };
    picker.appendChild(s);
  });
}
if (emjBtn && picker) {
  emjBtn.onclick = e => { e.stopPropagation(); picker.classList.toggle('hidden'); };
  document.addEventListener('click', () => picker.classList.add('hidden'));
}
```

}

async function _sendPrivateMsg(input) {
const text = (input.value || ‘’).trim();
if (!text) return;
input.value = ‘’;
try {
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
await db.ref(‘privateChats/’ + _chatId).push({
senderId: _currentUser.uid,
senderName: _userData.username,
text, seen: false,
timestamp: firebase.database.ServerValue.TIMESTAMP,
});
} catch(e) { console.error(‘sendPrivateMsg:’, e); }
}

/* ── Helpers ── */
function _getRole(roomId, roomData) {
if (!roomData) return ‘member’;
if (roomData.ownerId === _currentUser.uid) return ‘owner’;
if (roomData.admins && roomData.admins[_currentUser.uid]) return ‘admin’;
return ‘member’;
}

function _cleanupRoom() {
if (_msgListener && _roomId) { db.ref(‘messages/’ + _roomId).off(‘child_added’, _msgListener); _msgListener = null; }
if (_memberListener && _roomId) { db.ref(‘rooms/’ + _roomId + ‘/usersOnline’).off(‘value’, _memberListener); _memberListener = null; }
if (_onlineRef) { _onlineRef.remove(); _onlineRef = null; }
document.getElementById(‘members-panel’)?.classList.remove(‘open’);
document.getElementById(‘ctx-menu’)?.remove();
}

function _cleanupPrivate() {
if (_msgListener && _chatId) { db.ref(‘privateChats/’ + _chatId).off(‘child_added’, _msgListener); _msgListener = null; }
if (_typingListener && _chatId && _peerUid) {
db.ref(‘typing/’ + _chatId + ‘/’ + _peerUid).off(‘value’, _typingListener); _typingListener = null;
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
}
}

return { init, openRoom, openPrivateChat };
})();
