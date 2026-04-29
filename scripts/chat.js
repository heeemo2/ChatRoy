// ═══════════════════════════════════════
//  CHAT.JS — Room + Private Chat (updated)
//  - Photos beside messages
//  - Name + badges in message header
//  - Room info modal with member list + join
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

// Cache user data to avoid repeated DB reads
const _userCache = {};

function init(user, userData) {
_currentUser = user;
_userData    = userData;
_userCache[user.uid] = userData;
}

async function _getUser(uid) {
if (_userCache[uid]) return _userCache[uid];
try {
const snap = await db.ref('users/' + uid).once('value');
const u = snap.val() || {};
_userCache[uid] = u;
return u;
} catch(e) { return {}; }
}

function _scrollToBottom(el) {
if (!el) return;
requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

/* ══════════════════════════════
AVATAR ELEMENT BUILDER
══════════════════════════════ */
function _buildAvatarEl(userData, size = 36) {
const div = document.createElement(‘div’);
div.className = ‘msg-avatar’;
div.style.width  = size + ‘px’;
div.style.height = size + ‘px’;
div.style.borderRadius = ‘50%’;
div.style.overflow = ‘hidden’;
div.style.flexShrink = ‘0’;
div.style.display = ‘flex’;
div.style.alignItems = ‘center’;
div.style.justifyContent = ‘center’;
div.style.background = ‘var(–bg-input)’;
div.style.cursor = ‘pointer’;

```
if (userData && userData.photoURL) {
  div.innerHTML = `<img src="${userData.photoURL}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%"/>`;
} else {
  div.style.fontSize = Math.round(size * 0.5) + 'px';
  div.textContent = (userData && userData.avatar) ? userData.avatar : '👤';
}
return div;
```

}

/* ══════════════════════════════
MINI BADGES (for message header)
══════════════════════════════ */
function _buildMiniBadges(badges) {
if (!badges || !badges.length) return ‘’;
// Show max 3 badges inline
return badges.slice(0, 3).map(key => {
const svg = buildBadgeSVG(key);
return `<span class="msg-badge-mini" title="${(BADGE_DEFS[key]||{}).name||''}">${svg}</span>`;
}).join(’’);
}

/* ══════════════════════════════
ROOM CHAT
══════════════════════════════ */
async function openRoom(roomId, roomData) {
const ok = await RoomsModule.canEnterRoom(roomId, _currentUser.uid);
if (!ok) return showToast(‘🚫 أنت محظور من هذه الغرفة’);

```
_cleanupRoom();
_roomId   = roomId;
_roomData = roomData;

showScreen('screen-room');

// Header — clickable room name/avatar opens room info
const hAvi  = document.getElementById('room-header-avi');
const hName = document.getElementById('room-header-name');
if (hAvi)  hAvi.textContent  = roomData.avatar || '🏠';
if (hName) hName.textContent = roomData.name   || 'غرفة';

// Make header room info clickable
const roomInfoSm = document.querySelector('#screen-room .room-info-sm');
if (roomInfoSm) {
  roomInfoSm.style.cursor = 'pointer';
  roomInfoSm.onclick = () => _showRoomInfoModal(roomId, roomData);
}
if (hAvi) {
  hAvi.style.cursor = 'pointer';
  hAvi.onclick = () => _showRoomInfoModal(roomId, roomData);
}

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
    ? { text: '🔥 دخول أسطوري: ' + _userData.username, legendary: true }
    : { text: '🚪 دخل: ' + _userData.username, legendary: false }
);

_listenRoomMsgs(roomId);
_listenMembers(roomId, roomData);
_buildRoomInput(roomId);

document.getElementById('btn-room-back').onclick = () => {
  _cleanupRoom();
  showScreen('screen-app');
};

document.getElementById('btn-room-members').onclick = () => {
  document.getElementById('members-panel').classList.toggle('open');
};
```

}

/* ── Room Info Modal (members list + join) ── */
async function _showRoomInfoModal(roomId, roomData) {
// Remove old modal if exists
document.getElementById(‘modal-room-info’)?.remove();

```
const modal = document.createElement('div');
modal.id = 'modal-room-info';
modal.className = 'modal-overlay';
modal.style.display = 'flex';

modal.innerHTML = `
  <div class="modal-box" style="max-height:80vh;overflow-y:auto">
    <div class="modal-handle"></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:16px">
      <div style="font-size:48px">${sanitize(roomData.avatar || '🏠')}</div>
      <div style="font-size:18px;font-weight:800">${sanitize(roomData.name || 'غرفة')}</div>
      <div style="font-size:12px;color:var(--text-secondary)" id="rinfo-count">جارٍ التحميل...</div>
    </div>
    <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:10px">المتواجدون في الغرفة</div>
    <div id="rinfo-members" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      <div class="spinner" style="width:30px;height:30px;margin:20px auto"></div>
    </div>
    <button class="btn-primary" id="btn-rinfo-join" style="display:none">🚪 انضم للغرفة</button>
    <button class="btn-outline" id="btn-rinfo-close" style="width:100%;justify-content:center;margin-top:8px">إغلاق</button>
  </div>`;

document.body.appendChild(modal);
requestAnimationFrame(() => modal.classList.add('open'));

// Close
document.getElementById('btn-rinfo-close').onclick = () => {
  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 300);
};
modal.addEventListener('click', e => {
  if (e.target === modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }
});

// Join button — for users NOT already in the room
const alreadyIn = _roomId === roomId;
if (!alreadyIn) {
  const joinBtn = document.getElementById('btn-rinfo-join');
  joinBtn.style.display = 'block';
  joinBtn.onclick = async () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
    await openRoom(roomId, roomData);
  };
}

// Load members
try {
  const snap = await db.ref('rooms/' + roomId + '/usersOnline').once('value');
  const onlineUids = Object.keys(snap.val() || {});
  const countEl = document.getElementById('rinfo-count');
  if (countEl) countEl.textContent = onlineUids.length + ' متواجد الآن';

  const membersEl = document.getElementById('rinfo-members');
  if (!membersEl) return;
  membersEl.innerHTML = '';

  if (!onlineUids.length) {
    membersEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px">لا أحد متواجد الآن</div>';
    return;
  }

  for (const uid of onlineUids) {
    const u = await _getUser(uid);
    const role = uid === roomData.ownerId ? 'owner'
               : (roomData.admins && roomData.admins[uid]) ? 'admin' : 'member';
    const admin = isAdmin(uid);
    const level = admin ? 100 : getLevelFromXP(u.xp || 0);
    const badges = admin ? getAdminBadges() : (u.badges || []);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-input);border-radius:10px;cursor:pointer';

    // Avatar
    const aviDiv = _buildAvatarEl(u, 42);
    aviDiv.onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);

    // Info
    const info = document.createElement('div');
    info.style.flex = '1';

    const nameLine = document.createElement('div');
    nameLine.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:3px';
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'font-size:14px;font-weight:700' + (admin ? ';color:var(--gold)' : '');
    nameSpan.textContent = u.username || '—';
    nameLine.appendChild(nameSpan);
    // Mini badges
    const badgeWrap = document.createElement('span');
    badgeWrap.style.cssText = 'display:flex;align-items:center;gap:2px';
    badgeWrap.innerHTML = _buildMiniBadges(badges);
    nameLine.appendChild(badgeWrap);
    info.appendChild(nameLine);

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:11px;color:var(--text-secondary)';
    meta.textContent = (role === 'owner' ? '👑 مالك' : role === 'admin' ? '🛡 أدمن' : '') +
      (u.country ? ' • ' + u.country : '') + ' • Lv.' + level;
    info.appendChild(meta);

    row.appendChild(aviDiv);
    row.appendChild(info);
    row.onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);
    membersEl.appendChild(row);
  }
} catch(e) { console.error('rinfo members:', e); }
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
_msgListener = ref.on(‘child_added’, async snap => {
const msg = snap.val(); if (!msg) return;
const bubble = await _buildBubble(snap.key, msg, roomId);
msgsEl.appendChild(bubble);
_scrollToBottom(msgsEl);
});
}

async function _buildBubble(msgId, msg, roomId) {
if (msg.type === ‘system’) {
const d = document.createElement(‘div’);
d.className = ‘sys-msg’ + (msg.legendary ? ’ legendary’ : ‘’);
d.textContent = msg.text; return d;
}

```
// Fetch sender data (with cache)
let senderData = {};
if (msg.senderId) {
  senderData = await _getUser(msg.senderId);
}
// Fallback to message-embedded data
if (!senderData.username) {
  senderData = {
    username:  msg.senderName  || '',
    avatar:    msg.senderAvatar || '👤',
    photoURL:  msg.senderPhoto  || null,
    badges:    msg.senderBadges || [],
    xp:        0,
  };
}

const isOwn  = msg.senderId === _currentUser.uid;
const isAdm  = isAdmin(msg.senderId);
const badges = isAdm ? getAdminBadges() : (senderData.badges || []);
const level  = isAdm ? 100 : getLevelFromXP(senderData.xp || 0);

const row = document.createElement('div');
row.className = 'msg-row' + (isOwn ? ' own' : '') + (isAdm ? ' is-admin' : '');
row.dataset.msgId = msgId;

// Avatar
const avi = _buildAvatarEl(senderData, 36);
avi.onclick = () => ProfileModule.viewUserProfile(msg.senderId, _currentUser.uid);

// Content
const content = document.createElement('div');
content.className = 'msg-content';

// Sender name + badges row
const senderLine = document.createElement('div');
senderLine.className = 'msg-sender' + (isAdm ? ' admin-name' : '');
senderLine.style.display = 'flex';
senderLine.style.alignItems = 'center';
senderLine.style.gap = '4px';
senderLine.style.flexWrap = 'wrap';

const nameSpan = document.createElement('span');
nameSpan.textContent = sanitize(senderData.username || msg.senderName || '');
senderLine.appendChild(nameSpan);

// Level badge (tiny)
const lvlSpan = document.createElement('span');
lvlSpan.innerHTML = levelBadgeSVG(level);
lvlSpan.style.cssText = 'display:inline-flex;width:18px;height:18px;flex-shrink:0';
senderLine.appendChild(lvlSpan);

// Mini badges
if (badges.length) {
  const bdgSpan = document.createElement('span');
  bdgSpan.style.cssText = 'display:inline-flex;align-items:center;gap:2px';
  bdgSpan.innerHTML = _buildMiniBadges(badges);
  senderLine.appendChild(bdgSpan);
}

const bubbleEl = document.createElement('div');
bubbleEl.className = 'msg-bubble';
bubbleEl.textContent = msg.text;

const timeEl = document.createElement('div');
timeEl.className = 'msg-time';
timeEl.textContent = formatTime(msg.timestamp);

content.appendChild(senderLine);
content.appendChild(bubbleEl);
content.appendChild(timeEl);

// Long press context menu
let longPressTimer;
bubbleEl.addEventListener('touchstart',  () => { longPressTimer = setTimeout(() => _ctxMenu(msgId, msg, roomId), 600); });
bubbleEl.addEventListener('touchend',    () => clearTimeout(longPressTimer));
bubbleEl.addEventListener('touchmove',   () => clearTimeout(longPressTimer));
bubbleEl.addEventListener('contextmenu', e  => { e.preventDefault(); _ctxMenu(msgId, msg, roomId); });

if (isOwn) {
  row.appendChild(content);
  row.appendChild(avi);
} else {
  row.appendChild(avi);
  row.appendChild(content);
}
return row;
```

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
const u = await _getUser(uid);
const role = uid === roomData.ownerId ? ‘owner’
: (roomData.admins && roomData.admins[uid]) ? ‘admin’ : ‘member’;
const row = document.createElement(‘div’);
row.className = ‘member-row’;

```
      const aviDiv = _buildAvatarEl(u, 34);
      aviDiv.className = 'member-avi';

      row.appendChild(aviDiv);
      const nameDiv = document.createElement('div');
      nameDiv.className = 'member-name';
      nameDiv.textContent = u.username || '';
      const roleDiv = document.createElement('div');
      roleDiv.className = 'member-role ' + role;
      roleDiv.textContent = role === 'owner' ? '👑' : role === 'admin' ? '🛡' : '';

      row.appendChild(nameDiv);
      row.appendChild(roleDiv);
      row.onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);
      panel.appendChild(row);
    } catch(e) {}
  }
});
```

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
const adm    = isAdmin(_currentUser.uid);
const badges = adm ? getAdminBadges() : (_userData.badges || []);
await db.ref(‘messages/’ + roomId).push({
senderId:      _currentUser.uid,
senderName:    _userData.username,
senderAvatar:  _userData.avatar  || ‘👤’,
senderPhoto:   _userData.photoURL || null,
senderBadges:  badges,
text, type: ‘text’,
isAdmin: adm,
timestamp: firebase.database.ServerValue.TIMESTAMP,
});
// XP +1/msg (cap 200/day)
const snap = await db.ref(‘users/’ + _currentUser.uid).once(‘value’);
const u = snap.val(); if (!u) return;
const today = new Date().toDateString();
const cnt = u.msgXPToday === today ? (u.msgXPCount || 0) : 0;
const updates = { totalMessages: (u.totalMessages || 0) + 1 };
if (cnt < 200) {
const nx = Math.min((u.xp||0)+1, 100*XP_PER_LEVEL);
updates.xp = nx; updates.level = getLevelFromXP(nx);
updates.msgXPToday = today; updates.msgXPCount = cnt + 1;
}
await db.ref(‘users/’ + _currentUser.uid).update(updates);
} catch(e) { console.error(‘sendRoomMsg:’, e); }
}

/* ══════════════════════════════
PRIVATE CHAT
══════════════════════════════ */
async function openPrivateChat(peerUid, peerData) {
if (!peerUid || !_currentUser) return;
_cleanupPrivate();
_peerUid = peerUid;
_chatId  = getChatId(_currentUser.uid, peerUid);

```
try {
  const snap = await db.ref('users/' + peerUid).once('value');
  _peerData = snap.val() || peerData || {};
  _userCache[peerUid] = _peerData;
} catch(e) { _peerData = peerData || {}; }

showScreen('screen-private');

const hAvi  = document.getElementById('private-header-avi');
const hName = document.getElementById('private-header-name');
const hStat = document.getElementById('private-header-status');

// Photo or emoji in header
if (hAvi) {
  if (_peerData.photoURL) {
    hAvi.innerHTML = `<img src="${_peerData.photoURL}" style="width:38px;height:38px;border-radius:50%;object-fit:cover"/>`;
  } else {
    hAvi.textContent = _peerData.avatar || '👤';
  }
}
if (hName) hName.textContent = _peerData.username || '...';
if (hStat) {
  hStat.textContent = _peerData.online ? '🟢 متصل الآن' : '⚫ ' + formatLastSeen(_peerData.lastSeen);
  hStat.style.color = _peerData.online ? 'var(--online)' : 'var(--text-secondary)';
}

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
_msgListener = ref.on(‘child_added’, async snap => {
const msg = snap.val(); if (!msg) return;
const isOwn = msg.senderId === _currentUser.uid;
const sender = isOwn ? _userData : _peerData;

```
  const row = document.createElement('div');
  row.className = 'msg-row' + (isOwn ? ' own' : '');

  // Avatar with photo support
  const avi = _buildAvatarEl(sender, 36);
  avi.onclick = () => ProfileModule.viewUserProfile(msg.senderId, _currentUser.uid);

  // Content
  const content = document.createElement('div');
  content.className = 'msg-content';

  // Name + badges line
  const senderLine = document.createElement('div');
  senderLine.className = 'msg-sender';
  senderLine.style.display = 'flex';
  senderLine.style.alignItems = 'center';
  senderLine.style.gap = '4px';

  const adm    = isAdmin(msg.senderId);
  const badges = adm ? getAdminBadges() : (sender.badges || []);
  const level  = adm ? 100 : getLevelFromXP(sender.xp || 0);

  const nameSpan = document.createElement('span');
  nameSpan.textContent = sender.username || '';
  if (adm) nameSpan.style.color = 'var(--gold)';
  senderLine.appendChild(nameSpan);

  const lvlSpan = document.createElement('span');
  lvlSpan.innerHTML = levelBadgeSVG(level);
  lvlSpan.style.cssText = 'display:inline-flex;width:18px;height:18px;flex-shrink:0';
  senderLine.appendChild(lvlSpan);

  if (badges.length) {
    const bdgSpan = document.createElement('span');
    bdgSpan.style.cssText = 'display:inline-flex;align-items:center;gap:2px';
    bdgSpan.innerHTML = _buildMiniBadges(badges);
    senderLine.appendChild(bdgSpan);
  }

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.textContent = msg.text;

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(msg.timestamp) + (isOwn && msg.seen ? ' ✔✔' : '');

  content.appendChild(senderLine);
  content.appendChild(bubbleEl);
  content.appendChild(timeEl);

  if (isOwn) { row.appendChild(content); row.appendChild(avi); }
  else        { row.appendChild(avi);     row.appendChild(content); }

  msgsEl.appendChild(row);
  _scrollToBottom(msgsEl);

  if (!isOwn && !msg.seen)
    db.ref('privateChats/' + _chatId + '/' + snap.key + '/seen').set(true);
});

// Typing indicator
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

picker.innerHTML = '';
EMOJI_LIST.forEach(em => {
  const s = document.createElement('span'); s.textContent = em;
  s.onclick = () => { input.value += em; input.focus(); };
  picker.appendChild(s);
});
emjBtn.onclick = e => { e.stopPropagation(); picker.classList.toggle('hidden'); };
document.addEventListener('click', () => picker.classList.add('hidden'));
```

}

async function _sendPrivateMsg(input) {
const text = (input.value || ‘’).trim();
if (!text) return;
input.value = ‘’;
try {
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
await db.ref(‘privateChats/’ + _chatId).push({
senderId:   _currentUser.uid,
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
if (_msgListener && _roomId)    { db.ref(‘messages/’ + _roomId).off(‘child_added’, _msgListener); _msgListener = null; }
if (_memberListener && _roomId) { db.ref(‘rooms/’ + _roomId + ‘/usersOnline’).off(‘value’, _memberListener); _memberListener = null; }
if (_onlineRef)                 { _onlineRef.remove(); _onlineRef = null; }
document.getElementById(‘members-panel’)?.classList.remove(‘open’);
document.getElementById(‘ctx-menu’)?.remove();
document.getElementById(‘modal-room-info’)?.remove();
}

function _cleanupPrivate() {
if (_msgListener && _chatId)   { db.ref(‘privateChats/’ + _chatId).off(‘child_added’, _msgListener); _msgListener = null; }
if (_typingListener && _chatId && _peerUid) {
db.ref(‘typing/’ + _chatId + ‘/’ + _peerUid).off(‘value’, _typingListener); _typingListener = null;
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
}
}

return { init, openRoom, openPrivateChat };
})();
