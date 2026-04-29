// ═══════════════════════════════════════
//  ROOMS.JS
// ═══════════════════════════════════════

var RoomsModule = (function() {
var _currentUser = null;
var _userData    = null;
var _roomsRef    = null;
var _joinedRooms = {}; // track which rooms user joined
var PUBLIC_ROOM_ID = ‘**public**’;

function init(user, userData) {
_currentUser = user;
_userData    = userData;
_loadJoinedRooms();
_ensurePublicRoom();
_bindCreateRoom();
listenRooms();
}

/* ── Load joined rooms from DB ── */
function _loadJoinedRooms() {
db.ref(‘users/’ + _currentUser.uid + ‘/joinedRooms’).once(‘value’).then(function(snap) {
_joinedRooms = snap.val() || {};
});
}

async function _ensurePublicRoom() {
try {
var snap = await db.ref(‘rooms/’ + PUBLIC_ROOM_ID).once(‘value’);
if (!snap.exists()) {
await db.ref(‘rooms/’ + PUBLIC_ROOM_ID).set({
name: ‘الغرفة العامة’, avatar: ‘🌍’,
ownerId: ‘system’, admins: {}, bannedUsers: {},
usersOnline: {}, isPublic: true, createdAt: Date.now(),
roomPhoto: ‘’,
});
}
} catch(e) {}
}

function listenRooms() {
var list = document.getElementById(‘rooms-list’);
if (!list) return;
list.innerHTML = ‘<div class="spinner"></div>’;
if (_roomsRef) db.ref(‘rooms’).off(‘value’, _roomsRef);

```
_roomsRef = db.ref('rooms').on('value', function(snap) {
  list.innerHTML = '';
  var rooms = [];
  snap.forEach(function(child) {
    rooms.push(Object.assign({ id: child.key }, child.val()));
  });
  var pub  = rooms.find(function(r) { return r.id === PUBLIC_ROOM_ID; });
  var priv = rooms.filter(function(r) { return r.id !== PUBLIC_ROOM_ID; });
  if (pub) list.appendChild(_buildCard(pub));
  priv.forEach(function(r) { list.appendChild(_buildCard(r)); });
  if (!rooms.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏠</div><p>لا توجد غرف بعد</p></div>';
  }
});
```

}

function _buildCard(room) {
var card = document.createElement(‘div’);
card.className = ‘room-card’;

```
// Online count
var onlineCount = typeof room.usersOnline === 'object'
  ? Object.keys(room.usersOnline || {}).length
  : (room.usersOnline || 0);

// Member count
var memberCount = typeof room.members === 'object'
  ? Object.keys(room.members || {}).length
  : (room.members || 0);

var isJoined = !!(_joinedRooms[room.id]);

// Background image if room has a photo
var bgHtml = '';
if (room.roomPhoto) {
  bgHtml = '<div class="room-card-bg" style="background-image:url(\'' + room.roomPhoto + '\')"></div>';
}

// Avatar: photo or emoji
var avatarInner = '';
if (room.roomPhoto) {
  avatarInner = '<img src="' + room.roomPhoto + '" alt=""/>';
} else {
  avatarInner = sanitize(room.avatar || '🏠');
}

card.innerHTML =
  bgHtml +
  (room.isPublic ? '<span class="public-room-badge">عام</span>' : '') +
  '<div class="room-avatar">' + avatarInner + '</div>' +
  '<div class="room-info">' +
    '<div class="room-name">' + sanitize(room.name) + '</div>' +
    '<div class="room-online">' + onlineCount + ' متواجد</div>' +
    (memberCount ? '<div class="room-meta">' + memberCount + ' منضم</div>' : '') +
  '</div>' +
  '<button class="room-join-btn ' + (isJoined ? 'joined' : '') + '" data-roomid="' + room.id + '">' +
    (isJoined ? '✓ منضم' : '+ انضمام') +
  '</button>';

// Join button
var joinBtn = card.querySelector('.room-join-btn');
joinBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  _handleJoin(room.id, joinBtn);
});

// Click on avatar or name → room info modal
var aviEl  = card.querySelector('.room-avatar');
var infoEl = card.querySelector('.room-info');
aviEl.addEventListener('click',  function(e) { e.stopPropagation(); _showRoomInfo(room); });
infoEl.addEventListener('click', function(e) { e.stopPropagation(); _showRoomInfo(room); });

// Click card body → enter room (only if joined or public)
card.addEventListener('click', function() {
  if (isJoined || room.isPublic) {
    ChatModule.openRoom(room.id, room);
  } else {
    showToast('انضم للغرفة أولاً');
  }
});

return card;
```

}

/* ── Handle Join ── */
async function _handleJoin(roomId, btn) {
var isJoined = !!(_joinedRooms[roomId]);
if (isJoined) {
// Already joined — enter room
var snap = await db.ref(‘rooms/’ + roomId).once(‘value’);
if (snap.exists()) ChatModule.openRoom(roomId, snap.val());
return;
}
try {
var updates = {};
updates[‘users/’ + _currentUser.uid + ‘/joinedRooms/’ + roomId] = true;
updates[‘rooms/’ + roomId + ‘/members/’ + _currentUser.uid] = true;
await db.ref().update(updates);
_joinedRooms[roomId] = true;
btn.textContent = ‘✓ منضم’;
btn.classList.add(‘joined’);
showToast(‘تم الانضمام ✓’);
} catch(e) { showToast(‘خطأ في الانضمام’); }
}

/* ── Room Info Modal ── */
async function _showRoomInfo(room) {
var aviEl = document.getElementById(‘room-info-avi’);
if (aviEl) {
if (room.roomPhoto) {
aviEl.innerHTML = ‘<img src="' + room.roomPhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"/>’;
} else {
aviEl.textContent = room.avatar || ‘🏠’;
aviEl.innerHTML = sanitize(room.avatar || ‘🏠’);
}
}

```
var nameEl = document.getElementById('room-info-name');
if (nameEl) nameEl.textContent = room.name || 'الغرفة';

// Counts
var membersEl = document.getElementById('room-info-members');
var onlineEl  = document.getElementById('room-info-online');
try {
  var membCount = typeof room.members === 'object' ? Object.keys(room.members || {}).length : 0;
  var onlCount  = typeof room.usersOnline === 'object' ? Object.keys(room.usersOnline || {}).length : 0;
  if (membersEl) membersEl.textContent = membCount;
  if (onlineEl)  onlineEl.textContent  = onlCount;
} catch(e) {}

// Join section
var joinSection = document.getElementById('room-info-join-section');
if (joinSection) {
  var isJoined = !!(_joinedRooms[room.id]) || room.isPublic;
  if (isJoined) {
    joinSection.innerHTML = '<button class="btn-primary" id="modal-enter-room-btn">دخول الغرفة ▶</button>';
    document.getElementById('modal-enter-room-btn').onclick = function() {
      closeModal('modal-room-info');
      ChatModule.openRoom(room.id, room);
    };
  } else {
    joinSection.innerHTML = '<button class="btn-primary" id="modal-join-room-btn">+ انضمام للغرفة</button>';
    document.getElementById('modal-join-room-btn').onclick = async function() {
      try {
        var updates = {};
        updates['users/' + _currentUser.uid + '/joinedRooms/' + room.id] = true;
        updates['rooms/' + room.id + '/members/' + _currentUser.uid] = true;
        await db.ref().update(updates);
        _joinedRooms[room.id] = true;
        showToast('تم الانضمام ✓');
        closeModal('modal-room-info');
      } catch(e) { showToast('خطأ في الانضمام'); }
    };
  }
}

// Admin section (change room photo)
var adminSection = document.getElementById('room-info-admin-section');
if (adminSection) {
  var canEditPhoto = isAdmin(_currentUser.uid) ||
    room.ownerId === _currentUser.uid ||
    (room.admins && room.admins[_currentUser.uid]);
  adminSection.style.display = canEditPhoto ? 'block' : 'none';

  if (canEditPhoto) {
    var changePhotoBtn = document.getElementById('btn-change-room-photo');
    var photoInput     = document.getElementById('room-photo-change-input');
    if (changePhotoBtn && photoInput) {
      changePhotoBtn.onclick = function() { photoInput.click(); };
      photoInput.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) return;
        try {
          showToast('جارٍ رفع صورة الغرفة...');
          var dataURL = await fileToDataURL(file);
          var resized = await resizeImage(dataURL, 600, 400);
          await db.ref('rooms/' + room.id + '/roomPhoto').set(resized);
          showToast('تم تحديث صورة الغرفة ✓');
          closeModal('modal-room-info');
        } catch(err) {
          showToast('فشل رفع الصورة');
          console.error('Room photo:', err);
        }
        photoInput.value = '';
      };
    }
  }
}

openModal('modal-room-info');
```

}

/* ── Create Room ── */
function _bindCreateRoom() {
var btn = document.getElementById(‘btn-create-room’);
if (btn) btn.onclick = function() {
// Show room photo field only for admins
var photoGroup = document.getElementById(‘room-photo-group’);
if (photoGroup) photoGroup.style.display = isAdmin(_currentUser.uid) ? ‘block’ : ‘none’;

```
  // Bind room photo preview
  var photoInput   = document.getElementById('room-photo-input');
  var photoPreview = document.getElementById('room-photo-preview');
  if (photoInput && photoPreview) {
    photoPreview.onclick = function() { photoInput.click(); };
    photoInput.onchange = async function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var dataURL = await fileToDataURL(file);
      var resized = await resizeImage(dataURL, 600, 400);
      photoPreview.innerHTML = '<img src="' + resized + '"/>';
      photoPreview._photoData = resized;
    };
  }

  openModal('modal-create-room');
};

var saveBtn = document.getElementById('btn-save-room');
if (saveBtn) saveBtn.onclick = _createRoom;
```

}

async function _createRoom() {
var name   = (document.getElementById(‘room-name-input’).value || ‘’).trim();
var avatar = (document.getElementById(‘room-avatar-input’).value || ‘’).trim() || ‘🏠’;
if (!name) return showToast(‘أدخل اسم الغرفة’);
var btn = document.getElementById(‘btn-save-room’);
if (btn) btn.disabled = true;
try {
var photoPreview = document.getElementById(‘room-photo-preview’);
var roomPhoto = (photoPreview && photoPreview._photoData) ? photoPreview._photoData : ‘’;

```
  var ref = db.ref('rooms').push();
  var roomData = {
    name: name, avatar: avatar, ownerId: _currentUser.uid,
    admins: {}, bannedUsers: {}, usersOnline: {}, members: {},
    isPublic: false, createdAt: Date.now(), roomPhoto: roomPhoto,
  };
  // creator auto-joins
  roomData.members[_currentUser.uid] = true;
  await ref.set(roomData);
  _joinedRooms[ref.key] = true;
  await db.ref('users/' + _currentUser.uid + '/joinedRooms/' + ref.key).set(true);

  showToast('تم إنشاء الغرفة ✓');
  closeModal('modal-create-room');
  document.getElementById('room-name-input').value   = '';
  document.getElementById('room-avatar-input').value = '';
  var pp = document.getElementById('room-photo-preview');
  if (pp) { pp.innerHTML = '<span>اضغط لاختيار صورة</span>'; pp._photoData = null; }
} catch(e) { showToast('خطأ في الإنشاء'); }
if (btn) btn.disabled = false;
```

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
var snap = await db.ref(‘rooms/’ + roomId + ‘/bannedUsers/’ + uid).once(‘value’);
return !snap.exists();
}

function destroy() {
if (_roomsRef) { db.ref(‘rooms’).off(‘value’, _roomsRef); _roomsRef = null; }
}

return {
init: init,
listenRooms: listenRooms,
banUser: banUser,
kickUser: kickUser,
assignAdmin: assignAdmin,
canEnterRoom: canEnterRoom,
destroy: destroy,
PUBLIC_ROOM_ID: PUBLIC_ROOM_ID,
};
})();
