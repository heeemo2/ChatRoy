// ═══════════════════════════════════════
//  ROOMS.JS
// ═══════════════════════════════════════

const RoomsModule = (() => {
let _currentUser = null;
let _userData    = null;
let _roomsRef    = null;
const PUBLIC_ROOM_ID = ‘**public**’;

function init(user, userData) {
_currentUser = user;
_userData    = userData;
_ensurePublicRoom();
_bindCreateRoom();
listenRooms();
}

async function _ensurePublicRoom() {
try {
const snap = await db.ref(‘rooms/’ + PUBLIC_ROOM_ID).once(‘value’);
if (!snap.exists()) {
await db.ref(‘rooms/’ + PUBLIC_ROOM_ID).set({
name: ‘الغرفة العامة’, avatar: ‘🌍’,
ownerId: ‘system’, admins: {}, bannedUsers: {},
usersOnline: 0, isPublic: true, createdAt: Date.now(),
});
}
} catch(e) {}
}

function listenRooms() {
const list = document.getElementById(‘rooms-list’);
if (!list) return;
list.innerHTML = ‘<div class="spinner"></div>’;

```
if (_roomsRef) db.ref('rooms').off('value', _roomsRef);

_roomsRef = db.ref('rooms').on('value', snap => {
  list.innerHTML = '';
  const rooms = [];
  snap.forEach(child => rooms.push({ id: child.key, ...child.val() }));

  const pub  = rooms.find(r => r.id === PUBLIC_ROOM_ID);
  const priv = rooms.filter(r => r.id !== PUBLIC_ROOM_ID);

  if (pub) list.appendChild(_buildCard(pub));
  priv.forEach(r => list.appendChild(_buildCard(r)));

  if (!rooms.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏠</div><p>لا توجد غرف بعد</p></div>';
  }
});
```

}

function _buildCard(room) {
const card = document.createElement(‘div’);
card.className = ‘room-card’;

```
const onlineCnt = typeof room.usersOnline === 'object'
  ? Object.keys(room.usersOnline || {}).length
  : (room.usersOnline || 0);

const membersCnt = typeof room.members === 'object'
  ? Object.keys(room.members || {}).length
  : 0;

// Avatar: image or emoji
let aviHTML = '';
if (room.imageUrl) {
  aviHTML = `<div class="room-avatar"><img src="${room.imageUrl}" alt="room" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm)"/></div>`;
} else {
  aviHTML = `<div class="room-avatar">${sanitize(room.avatar || '🏠')}</div>`;
}

card.innerHTML =
  (room.isPublic ? '<span class="public-room-badge">عام</span>' : '') +
  aviHTML +
  '<div class="room-info">' +
    '<div class="room-name">' + sanitize(room.name) + '</div>' +
    '<div class="room-online">' + onlineCnt + ' متواجد</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + membersCnt + ' عضو منضم</div>' +
  '</div>' +
  '<div class="room-card-actions">' +
    '<button class="btn-room-info" title="تفاصيل الغرفة">ℹ️</button>' +
  '</div>';

// Info button → show room info/join preview
const infoBtn = card.querySelector('.btn-room-info');
if (infoBtn) {
  infoBtn.onclick = (e) => {
    e.stopPropagation();
    _showRoomPreview(room.id, room);
  };
}

// Card click → also show preview (which has the Join/Enter button)
card.addEventListener('click', (e) => {
  // Only if not clicking the info button
  if (e.target.closest('.btn-room-info')) return;
  _showRoomPreview(room.id, room);
});

return card;
```

}

/* ── Room Preview Modal (before entering) ── */
async function _showRoomPreview(roomId, roomData) {
// Fetch fresh data
let room = roomData;
try {
const snap = await db.ref(‘rooms/’ + roomId).once(‘value’);
if (snap.exists()) room = { id: roomId, …snap.val() };
} catch(e) {}

```
const onlineCnt = typeof room.usersOnline === 'object'
  ? Object.keys(room.usersOnline || {}).length
  : (room.usersOnline || 0);
const membersCnt = typeof room.members === 'object'
  ? Object.keys(room.members || {}).length
  : 0;

const modal = document.getElementById('modal-room-preview');
if (!modal) return;

const imgEl = document.getElementById('room-preview-img');
if (imgEl) {
  if (room.imageUrl) {
    imgEl.innerHTML = `<img src="${room.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  } else {
    imgEl.innerHTML = '';
    imgEl.textContent = room.avatar || '🏠';
  }
}

const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
setEl('room-preview-name',    room.name || '');
setEl('room-preview-online',  onlineCnt + ' متواجد الآن');
setEl('room-preview-members', membersCnt + ' عضو منضم');
setEl('room-preview-type',    room.isPublic ? '🌍 غرفة عامة' : '🔒 غرفة خاصة');

// Join / Enter button
const joinBtn = document.getElementById('btn-join-room');
if (joinBtn) {
  // Check if already member
  const isMember = room.members && room.members[_currentUser.uid];
  joinBtn.textContent = isMember ? '▶ دخول الغرفة' : '➕ انضمام ودخول';
  joinBtn.onclick = async () => {
    // Add to members list (works for all rooms including public)
    try {
      await db.ref('rooms/' + roomId + '/members/' + _currentUser.uid).set(true);
    } catch(e) {}
    closeModal('modal-room-preview');
    ChatModule.openRoom(roomId, room);
  };
}

openModal('modal-room-preview');
```

}

function _bindCreateRoom() {
const btn = document.getElementById(‘btn-create-room’);
if (btn) btn.onclick = () => openModal(‘modal-create-room’);

```
const saveBtn = document.getElementById('btn-save-room');
if (saveBtn) saveBtn.onclick = _createRoom;
```

}

async function _createRoom() {
const name   = (document.getElementById(‘room-name-input’).value || ‘’).trim();
const avatar = (document.getElementById(‘room-avatar-input’).value || ‘’).trim() || ‘🏠’;
if (!name) return showToast(‘أدخل اسم الغرفة’);
const btn = document.getElementById(‘btn-save-room’);
if (btn) btn.disabled = true;
try {
const ref = db.ref(‘rooms’).push();
await ref.set({
name, avatar, ownerId: _currentUser.uid,
admins: {}, bannedUsers: {}, usersOnline: 0,
members: { [_currentUser.uid]: true },
isPublic: false, createdAt: Date.now(),
});
showToast(‘تم إنشاء الغرفة ✓’);
closeModal(‘modal-create-room’);
document.getElementById(‘room-name-input’).value   = ‘’;
document.getElementById(‘room-avatar-input’).value = ‘’;
} catch(e) { showToast(‘خطأ في الإنشاء’); }
if (btn) btn.disabled = false;
}

async function banUser(roomId, targetUid) {
await db.ref(‘rooms/’ + roomId + ‘/bannedUsers/’ + targetUid).set(true);
await db.ref(‘rooms/’ + roomId + ‘/usersOnline/’ + targetUid).remove();
showToast(‘تم حظر المستخدم’);
}

async function kickUser(roomId, targetUid) {
await db.ref(‘rooms/’ + roomId + ‘/usersOnline/’ + targetUid).remove();
showToast(‘تم طرد المستخدم’);
}

async function assignAdmin(roomId, targetUid) {
await db.ref(‘rooms/’ + roomId + ‘/admins/’ + targetUid).set(true);
showToast(‘تم تعيين أدمن ✓’);
}

async function canEnterRoom(roomId, uid) {
const snap = await db.ref(‘rooms/’ + roomId + ‘/bannedUsers/’ + uid).once(‘value’);
return !snap.exists();
}

function destroy() {
if (_roomsRef) { db.ref(‘rooms’).off(‘value’, _roomsRef); _roomsRef = null; }
}

return { init, listenRooms, banUser, kickUser, assignAdmin, canEnterRoom, destroy, PUBLIC_ROOM_ID };
})();
