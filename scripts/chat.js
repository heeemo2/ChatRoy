// ═══════════════════════════════════════
//  CHAT.JS — Room + Private Chat
// ═══════════════════════════════════════

var ChatModule = (function() {
var _currentUser    = null;
var _userData       = null;
var _roomId         = null;
var _roomData       = null;
var _chatId         = null;
var _peerUid        = null;
var _peerData       = null;
var _msgListener    = null;
var _memberListener = null;
var _typingListener = null;
var _onlineRef      = null;
var _onlineCountRef = null;

function init(user, userData) {
_currentUser = user;
_userData    = userData;
}

function _scrollToBottom(el) {
if (!el) return;
requestAnimationFrame(function() { el.scrollTop = el.scrollHeight; });
}

/* ══════════════════════════════
ROOM CHAT
══════════════════════════════ */
async function openRoom(roomId, roomData) {
var ok = await RoomsModule.canEnterRoom(roomId, _currentUser.uid);
if (!ok) return showToast(‘🚫 أنت محظور من هذه الغرفة’);

```
_cleanupRoom();
_roomId   = roomId;
_roomData = roomData;

showScreen('screen-room');

// Header avatar (supports photo)
var hAvi  = document.getElementById('room-header-avi');
var hName = document.getElementById('room-header-name');
if (hAvi) {
  if (roomData.roomPhoto) {
    hAvi.innerHTML = '<img src="' + roomData.roomPhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>';
  } else {
    hAvi.textContent = roomData.avatar || '🏠';
  }
}
if (hName) hName.textContent = roomData.name || 'غرفة';

// Click on header avatar or name → room info
var headerInfoBtn = document.getElementById('room-header-info-btn');
if (hAvi) {
  hAvi.onclick = function() { _showRoomInfoFromChat(roomId); };
}
if (headerInfoBtn) {
  headerInfoBtn.onclick = function() { _showRoomInfoFromChat(roomId); };
}

// Online counter
_onlineRef = db.ref('rooms/' + roomId + '/usersOnline/' + _currentUser.uid);
_onlineRef.set(true);
_onlineRef.onDisconnect().remove();
_onlineCountRef = db.ref('rooms/' + roomId + '/usersOnline').on('value', function(snap) {
  var cnt = Object.keys(snap.val() || {}).length;
  var el  = document.getElementById('room-online-count');
  if (el) el.textContent = cnt + ' متواجد';
});

// Join message
var adminUser = isAdmin(_currentUser.uid);
var role = _getRole(roomId, roomData);
_sendSysMsg(roomId,
  (adminUser || role === 'admin' || role === 'owner')
    ? { text: '🔥 دخول أسطوري: ' + _userData.username, legendary: true }
    : { text: '🚪 دخل: ' + _userData.username, legendary: false }
);

_listenRoomMsgs(roomId);
_listenMembers(roomId, roomData);
_buildRoomInput(roomId);

document.getElementById('btn-room-back').onclick = function() {
  _cleanupRoom();
  showScreen('screen-app');
};

document.getElementById('btn-room-members').onclick = function() {
  document.getElementById('members-panel').classList.toggle('open');
};
```

}

/* ── Show room info from inside chat ── */
async function _showRoomInfoFromChat(roomId) {
try {
var snap = await db.ref(‘rooms/’ + roomId).once(‘value’);
var room = snap.val();
if (!room) return;
room.id = roomId;

```
  var aviEl = document.getElementById('room-info-avi');
  if (aviEl) {
    if (room.roomPhoto) {
      aviEl.innerHTML = '<img src="' + room.roomPhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"/>';
    } else {
      aviEl.textContent = room.avatar || '🏠';
    }
  }
  var nameEl = document.getElementById('room-info-name');
  if (nameEl) nameEl.textContent = room.name || 'الغرفة';

  var membCount = typeof room.members === 'object' ? Object.keys(room.members || {}).length : 0;
  var onlCount  = typeof room.usersOnline === 'object' ? Object.keys(room.usersOnline || {}).length : 0;
  var membersEl = document.getElementById('room-info-members');
  var onlineEl  = document.getElementById('room-info-online');
  if (membersEl) membersEl.textContent = membCount;
  if (onlineEl)  onlineEl.textContent  = onlCount;

  // Already inside room — show "أنت داخل الغرفة"
  var joinSection = document.getElementById('room-info-join-section');
  if (joinSection) {
    joinSection.innerHTML = '<div style="text-align:center;color:var(--online);font-size:13px;padding:8px">🟢 أنت داخل الغرفة الآن</div>';
  }

  // Admin photo change
  var adminSection = document.getElementById('room-info-admin-section');
  if (adminSection) {
    var canEdit = isAdmin(_currentUser.uid) || room.ownerId === _currentUser.uid ||
      (room.admins && room.admins[_currentUser.uid]);
    adminSection.style.display = canEdit ? 'block' : 'none';
    if (canEdit) {
      var changeBtn = document.getElementById('btn-change-room-photo');
      var photoIn   = document.getElementById('room-photo-change-input');
      if (changeBtn && photoIn) {
        changeBtn.onclick = function() { photoIn.click(); };
        photoIn.onchange = async function(e) {
          var file = e.target.files[0]; if (!file) return;
          try {
            showToast('جارٍ رفع الصورة...');
            var dataURL = await fileToDataURL(file);
            var resized = await resizeImage(dataURL, 600, 400);
            await db.ref('rooms/' + roomId + '/roomPhoto').set(resized);
            showToast('تم تحديث صورة الغرفة ✓');
            closeModal('modal-room-info');
            // Update header avatar
            if (hAvi) hAvi.innerHTML = '<img src="' + resized + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>';
          } catch(err) { showToast('فشل رفع الصورة'); }
          photoIn.value = '';
        };
      }
    }
  }

  openModal('modal-room-info');
} catch(e) { console.error('_showRoomInfoFromChat:', e); }
```

}

function _sendSysMsg(roomId, opts) {
db.ref(‘messages/’ + roomId).push({
type: ‘system’, text: opts.text, legendary: !!opts.legendary,
timestamp: firebase.database.ServerValue.TIMESTAMP,
});
}

function _listenRoomMsgs(roomId) {
var msgsEl = document.getElementById(‘chat-messages’);
if (!msgsEl) return;
msgsEl.innerHTML = ‘’;
var ref = db.ref(‘messages/’ + roomId).orderByChild(‘timestamp’).limitToLast(100);
_msgListener = ref.on(‘child_added’, function(snap) {
var msg = snap.val(); if (!msg) return;
msgsEl.appendChild(_buildBubble(snap.key, msg, roomId));
_scrollToBottom(msgsEl);
});
}

function _buildBubble(msgId, msg, roomId) {
if (msg.type === ‘system’) {
var d = document.createElement(‘div’);
d.className = ‘sys-msg’ + (msg.legendary ? ’ legendary’ : ‘’);
d.textContent = msg.text;
return d;
}

```
var isOwn = msg.senderId === _currentUser.uid;
var isAdm = isAdmin(msg.senderId);
var row   = document.createElement('div');
row.className = 'msg-row' + (isOwn ? ' own' : '') + (isAdm ? ' is-admin' : '');
row.dataset.msgId = msgId;

// Avatar (supports photo URL)
var avi = document.createElement('div');
avi.className = 'msg-avatar';
var avatarVal = msg.senderAvatar || '👤';
if (avatarVal.startsWith('data:') || avatarVal.startsWith('http')) {
  avi.innerHTML = '<img src="' + avatarVal + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
} else {
  avi.textContent = avatarVal;
}
// Click avatar → open profile (slide-up from bottom)
avi.onclick = function() { ProfileModule.viewUserProfile(msg.senderId, _currentUser.uid); };

// Fetch sender badges for inline display (top 3)
var badgesHtml = '';
if (msg.senderBadges && msg.senderBadges.length) {
  var top3 = getTop3Badges(msg.senderBadges);
  badgesHtml = top3.map(function(k) {
    return buildBadgeSVGSmall(k);
  }).join('');
}

var content = document.createElement('div');
content.className = 'msg-content';

// Sender row: name + 3 badges
var senderRowHTML =
  '<div class="msg-sender-row">' +
    '<span class="msg-sender ' + (isAdm ? 'admin-name' : '') + '" style="cursor:pointer">' +
      sanitize(msg.senderName || '') +
    '</span>' +
    (badgesHtml ? '<span class="msg-badges">' + badgesHtml + '</span>' : '') +
  '</div>';

content.innerHTML =
  senderRowHTML +
  '<div class="msg-bubble">' + sanitize(msg.text) + '</div>' +
  '<div class="msg-time">' + formatTime(msg.timestamp) + '</div>';

// Click name → open profile
var senderSpan = content.querySelector('.msg-sender');
if (senderSpan) {
  senderSpan.onclick = function() { ProfileModule.viewUserProfile(msg.senderId, _currentUser.uid); };
}

// Long press context menu
var bubble = content.querySelector('.msg-bubble');
var longPressTimer;
bubble.addEventListener('touchstart',  function() { longPressTimer = setTimeout(function() { _ctxMenu(msgId, msg, roomId); }, 600); });
bubble.addEventListener('touchend',    function() { clearTimeout(longPressTimer); });
bubble.addEventListener('touchmove',   function() { clearTimeout(longPressTimer); });
bubble.addEventListener('contextmenu', function(e) { e.preventDefault(); _ctxMenu(msgId, msg, roomId); });

row.appendChild(isOwn ? content : avi);
row.appendChild(isOwn ? avi : content);
return row;
```

}

/* ── Context Menu ── */
function _ctxMenu(msgId, msg, roomId) {
var existing = document.getElementById(‘ctx-menu’);
if (existing) existing.remove();

```
var role   = _getRole(roomId, _roomData);
var canDel = msg.senderId === _currentUser.uid || role !== 'member' || isAdmin(_currentUser.uid);
var canMod = (role === 'owner' || role === 'admin' || isAdmin(_currentUser.uid)) && msg.senderId !== _currentUser.uid;

var menu = document.createElement('div');
menu.id = 'ctx-menu'; menu.className = 'ctx-menu';
menu.style.cssText = 'position:fixed;bottom:80px;right:12px;left:12px;z-index:300';

if (canDel) {
  var d = document.createElement('div');
  d.className = 'ctx-item danger';
  d.innerHTML = '🗑 حذف الرسالة';
  d.onclick = async function() {
    await db.ref('messages/' + roomId + '/' + msgId).remove();
    menu.remove();
  };
  menu.appendChild(d);
}
if (canMod && msg.senderId) {
  var k = document.createElement('div'); k.className = 'ctx-item';
  k.innerHTML = '🚪 طرد';
  k.onclick = async function() { await RoomsModule.kickUser(roomId, msg.senderId); menu.remove(); };

  var b = document.createElement('div'); b.className = 'ctx-item danger';
  b.innerHTML = '🚫 حظر';
  b.onclick = async function() { await RoomsModule.banUser(roomId, msg.senderId); menu.remove(); };

  menu.appendChild(k); menu.appendChild(b);

  if (role === 'owner' || isAdmin(_currentUser.uid)) {
    var a = document.createElement('div'); a.className = 'ctx-item';
    a.innerHTML = '🛡 تعيين أدمن';
    a.onclick = async function() { await RoomsModule.assignAdmin(roomId, msg.senderId); menu.remove(); };
    menu.appendChild(a);
  }
}
if (!menu.children.length) return;
document.body.appendChild(menu);
setTimeout(function() {
  document.addEventListener('click', function() { menu.remove(); }, { once: true });
}, 100);
```

}

/* ── Members Panel ── */
function _listenMembers(roomId, roomData) {
var panel = document.getElementById(‘members-panel’);
if (!panel) return;
panel.innerHTML = ‘<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>’;
_memberListener = db.ref(‘rooms/’ + roomId + ‘/usersOnline’).on(‘value’, async function(snap) {
panel.innerHTML = ‘<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>’;
var uids = Object.keys(snap.val() || {});
for (var i = 0; i < uids.length; i++) {
var uid = uids[i];
try {
var uSnap = await db.ref(‘users/’ + uid).once(‘value’);
var u = uSnap.val(); if (!u) continue;
var role = uid === roomData.ownerId ? ‘owner’
: (roomData.admins && roomData.admins[uid]) ? ‘admin’ : ‘member’;

```
      var badges  = isAdmin(uid) ? getAdminBadges() : (u.badges || []);
      var top3    = getTop3Badges(badges);
      var bHtml   = top3.map(function(k) { return buildBadgeSVGSmall(k); }).join('');

      var row = document.createElement('div');
      row.className = 'member-row';

      // Avatar
      var aviInner = '';
      if (u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'))) {
        aviInner = '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
      } else {
        aviInner = sanitize(u.avatar || '👤');
      }

      row.innerHTML =
        '<div class="member-avi">' + aviInner + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="member-name">' + sanitize(u.username || '') + '</div>' +
          '<div class="member-badges">' + bHtml + '</div>' +
        '</div>' +
        '<div class="member-role ' + role + '">' +
          (role === 'owner' ? '👑' : role === 'admin' ? '🛡' : '') +
        '</div>';
      row.onclick = function() { ProfileModule.viewUserProfile(uid, _currentUser.uid); };
      panel.appendChild(row);
    } catch(e) {}
  }
});
```

}

/* ── Room Input ── */
function _buildRoomInput(roomId) {
var input   = document.getElementById(‘room-chat-input’);
var sendBtn = document.getElementById(‘btn-send-room’);
var emjBtn  = document.getElementById(‘btn-emoji-room’);
var picker  = document.getElementById(‘emoji-picker-room’);
if (!input || !sendBtn) return;

```
sendBtn.onclick  = function() { _sendRoomMsg(roomId, input); };
input.onkeydown  = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendRoomMsg(roomId, input); }
};

picker.innerHTML = '';
EMOJI_LIST.forEach(function(em) {
  var s = document.createElement('span');
  s.textContent = em;
  s.onclick = function() { input.value += em; input.focus(); };
  picker.appendChild(s);
});
emjBtn.onclick = function(e) { e.stopPropagation(); picker.classList.toggle('hidden'); };
document.addEventListener('click', function() { picker.classList.add('hidden'); });
```

}

async function _sendRoomMsg(roomId, input) {
var text = (input.value || ‘’).trim();
if (!text) return;
input.value = ‘’;
try {
// Get fresh user data for current badges
var userSnap = await db.ref(‘users/’ + _currentUser.uid).once(‘value’);
var u = userSnap.val() || _userData;
var myBadges = isAdmin(_currentUser.uid) ? getAdminBadges() : (u.badges || []);

```
  await db.ref('messages/' + roomId).push({
    senderId:     _currentUser.uid,
    senderName:   u.username || _userData.username,
    senderAvatar: u.avatar   || _userData.avatar || '👤',
    senderBadges: myBadges,
    text:         text,
    type:         'text',
    isAdmin:      isAdmin(_currentUser.uid),
    timestamp:    firebase.database.ServerValue.TIMESTAMP,
  });

  // XP +1 per message (cap 200/day)
  if (!u) return;
  var today = new Date().toDateString();
  var cnt   = u.msgXPToday === today ? (u.msgXPCount || 0) : 0;
  var updates = { totalMessages: (u.totalMessages || 0) + 1 };
  if (cnt < 200) {
    var nx = Math.min((u.xp || 0) + 1, 100 * XP_PER_LEVEL);
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
_peerUid = peerUid;
_chatId  = getChatId(_currentUser.uid, peerUid);

```
try {
  var snap = await db.ref('users/' + peerUid).once('value');
  _peerData = snap.val() || peerData || {};
} catch(e) { _peerData = peerData || {}; }

showScreen('screen-private');

// Header
var hAvi  = document.getElementById('private-header-avi');
var hName = document.getElementById('private-header-name');
var hStat = document.getElementById('private-header-status');

// Avatar supports photo URL
if (hAvi) {
  if (_peerData.avatar && (_peerData.avatar.startsWith('data:') || _peerData.avatar.startsWith('http'))) {
    hAvi.innerHTML = '<img src="' + _peerData.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>';
  } else {
    hAvi.textContent = _peerData.avatar || '👤';
  }
}
if (hName) hName.textContent = _peerData.username || '...';
if (hStat) {
  hStat.textContent = _peerData.online ? '🟢 متصل الآن' : '⚫ ' + formatLastSeen(_peerData.lastSeen);
  hStat.style.color = _peerData.online ? 'var(--online)' : 'var(--text-secondary)';
}

// Click avatar or name → open peer profile (slide-up)
if (hAvi) hAvi.onclick = function() { ProfileModule.viewUserProfile(peerUid, _currentUser.uid); };
var headerBtn = document.getElementById('private-header-info-btn');
if (headerBtn) headerBtn.onclick = function() { ProfileModule.viewUserProfile(peerUid, _currentUser.uid); };

_listenPrivateMsgs();
_buildPrivateInput();

document.getElementById('btn-private-back').onclick = function() {
  _cleanupPrivate();
  showScreen('screen-app');
};
```

}

function _listenPrivateMsgs() {
var msgsEl = document.getElementById(‘private-messages’);
if (!msgsEl) return;
msgsEl.innerHTML = ‘’;
var ref = db.ref(‘privateChats/’ + _chatId).orderByChild(‘timestamp’).limitToLast(100);
_msgListener = ref.on(‘child_added’, function(snap) {
var msg  = snap.val(); if (!msg) return;
var isOwn = msg.senderId === _currentUser.uid;

```
  var row = document.createElement('div');
  row.className = 'msg-row' + (isOwn ? ' own' : '');

  // Avatar
  var avatarVal = isOwn ? (_userData.avatar || '👤') : (_peerData.avatar || '👤');
  var aviHtml   = '';
  if (avatarVal.startsWith('data:') || avatarVal.startsWith('http')) {
    aviHtml = '<img src="' + avatarVal + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
  } else {
    aviHtml = sanitize(avatarVal);
  }

  // Badges for private chat (top 3 next to name)
  var senderBadges = isOwn
    ? (isAdmin(_currentUser.uid) ? getAdminBadges() : (_userData.badges || []))
    : (isAdmin(_peerUid)         ? getAdminBadges() : (_peerData.badges  || []));
  var top3 = getTop3Badges(senderBadges);
  var bHtml = top3.map(function(k) { return buildBadgeSVGSmall(k); }).join('');

  var senderName = isOwn ? (_userData.username || '') : (_peerData.username || '');

  row.innerHTML =
    '<div class="msg-avatar" style="cursor:pointer">' + aviHtml + '</div>' +
    '<div class="msg-content">' +
      '<div class="msg-sender-row">' +
        '<span class="msg-sender" style="cursor:pointer">' + sanitize(senderName) + '</span>' +
        (bHtml ? '<span class="msg-badges">' + bHtml + '</span>' : '') +
      '</div>' +
      '<div class="msg-bubble">' + sanitize(msg.text) + '</div>' +
      '<div class="msg-time">' + formatTime(msg.timestamp) + (isOwn && msg.seen ? ' ✔✔' : '') + '</div>' +
    '</div>';

  // Click avatar or name → open profile
  var clickUid = isOwn ? _currentUser.uid : _peerUid;
  row.querySelector('.msg-avatar').onclick = function() {
    ProfileModule.viewUserProfile(clickUid, _currentUser.uid);
  };
  row.querySelector('.msg-sender').onclick = function() {
    ProfileModule.viewUserProfile(clickUid, _currentUser.uid);
  };

  msgsEl.appendChild(row);
  _scrollToBottom(msgsEl);
  if (!isOwn && !msg.seen) {
    db.ref('privateChats/' + _chatId + '/' + snap.key + '/seen').set(true);
  }
});

// Typing indicator
_typingListener = db.ref('typing/' + _chatId + '/' + _peerUid).on('value', function(snap) {
  var el = document.getElementById('typing-indicator');
  if (el) el.classList.toggle('hidden', !snap.val());
});
```

}

function _buildPrivateInput() {
var input   = document.getElementById(‘private-chat-input’);
var sendBtn = document.getElementById(‘btn-send-private’);
var emjBtn  = document.getElementById(‘btn-emoji-private’);
var picker  = document.getElementById(‘emoji-picker-private’);
if (!input || !sendBtn) return;

```
var typingTimer;
input.oninput = function() {
  db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(function() {
    db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(false);
  }, 2000);
};

sendBtn.onclick = function() { _sendPrivateMsg(input); };
input.onkeydown = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendPrivateMsg(input); }
};

picker.innerHTML = '';
EMOJI_LIST.forEach(function(em) {
  var s = document.createElement('span'); s.textContent = em;
  s.onclick = function() { input.value += em; input.focus(); };
  picker.appendChild(s);
});
emjBtn.onclick = function(e) { e.stopPropagation(); picker.classList.toggle('hidden'); };
document.addEventListener('click', function() { picker.classList.add('hidden'); });
```

}

async function _sendPrivateMsg(input) {
var text = (input.value || ‘’).trim();
if (!text) return;
input.value = ‘’;
try {
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
await db.ref(‘privateChats/’ + _chatId).push({
senderId:   _currentUser.uid,
senderName: _userData.username,
text:       text,
seen:       false,
timestamp:  firebase.database.ServerValue.TIMESTAMP,
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
if (_msgListener && _roomId) {
db.ref(‘messages/’ + _roomId).off(‘child_added’, _msgListener);
_msgListener = null;
}
if (_memberListener && _roomId) {
db.ref(‘rooms/’ + _roomId + ‘/usersOnline’).off(‘value’, _memberListener);
_memberListener = null;
}
if (_onlineCountRef && _roomId) {
db.ref(‘rooms/’ + _roomId + ‘/usersOnline’).off(‘value’, _onlineCountRef);
_onlineCountRef = null;
}
if (_onlineRef) { _onlineRef.remove(); _onlineRef = null; }
var mp = document.getElementById(‘members-panel’);
if (mp) mp.classList.remove(‘open’);
var cm = document.getElementById(‘ctx-menu’);
if (cm) cm.remove();
}

function _cleanupPrivate() {
if (_msgListener && _chatId) {
db.ref(‘privateChats/’ + _chatId).off(‘child_added’, _msgListener);
_msgListener = null;
}
if (_typingListener && _chatId && _peerUid) {
db.ref(‘typing/’ + _chatId + ‘/’ + _peerUid).off(‘value’, _typingListener);
_typingListener = null;
db.ref(‘typing/’ + _chatId + ‘/’ + _currentUser.uid).set(false);
}
}

return {
init: init,
openRoom: openRoom,
openPrivateChat: openPrivateChat,
};
})();
