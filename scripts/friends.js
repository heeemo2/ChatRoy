// ═══════════════════════════════════════
//  FRIENDS.JS
// ═══════════════════════════════════════

var FriendsModule = (function() {
var _currentUser = null;
var _userData    = null;
var _activeTab   = ‘friends’;
var _reqListener = null;
var _allUsers    = [];

function init(user, userData) {
_currentUser = user;
_userData    = userData;
_bindSubTabs();
_bindSearch();
loadFriends();
_prefetchUsers();
}

async function _prefetchUsers() {
try {
var snap = await db.ref(‘users’).once(‘value’);
_allUsers = [];
snap.forEach(function(child) {
if (child.key !== _currentUser.uid) {
_allUsers.push(Object.assign({ uid: child.key }, child.val()));
}
});
} catch(e) { console.error(‘prefetch:’, e); }
}

function _bindSubTabs() {
document.querySelectorAll(’.friends-tab’).forEach(function(btn) {
btn.onclick = function() {
document.querySelectorAll(’.friends-tab’).forEach(function(b) { b.classList.remove(‘active’); });
btn.classList.add(‘active’);
_activeTab = btn.dataset.tab;
if (_activeTab === ‘friends’)       loadFriends();
else if (_activeTab === ‘requests’) _loadRequests();
else {
_clearList(’<div class="empty-state"><div class="empty-icon">🔍</div><p>ابحث بالاسم أعلاه</p></div>’);
document.getElementById(‘friends-search-input’).focus();
}
};
});
}

function _bindSearch() {
var input = document.getElementById(‘friends-search-input’);
if (!input) return;
var timer;
input.addEventListener(‘input’, function() {
clearTimeout(timer);
var q = input.value.trim();
document.querySelectorAll(’.friends-tab’).forEach(function(b) { b.classList.remove(‘active’); });
var searchTab = document.querySelector(’.friends-tab[data-tab=“search”]’);
if (searchTab) searchTab.classList.add(‘active’);
_activeTab = ‘search’;
if (!q) {
_clearList(’<div class="empty-state"><div class="empty-icon">🔍</div><p>ابحث بالاسم أو الـ ID</p></div>’);
return;
}
timer = setTimeout(function() { _doSearch(q); }, 300);
});
}

function _doSearch(q) {
var qLower = q.toLowerCase();
_clearList(’<div class="spinner"></div>’);
var results = _allUsers.filter(function(u) {
var nameMatch = u.username && u.username.toLowerCase().includes(qLower);
var idMatch   = u.id6 && u.id6.toString().includes(q);
return nameMatch || idMatch;
}).slice(0, 20);

```
if (_allUsers.length === 0) {
  _prefetchUsers().then(function() {
    results = _allUsers.filter(function(u) {
      var nameMatch = u.username && u.username.toLowerCase().includes(qLower);
      var idMatch   = u.id6 && u.id6.toString().includes(q);
      return nameMatch || idMatch;
    }).slice(0, 20);
    _renderSearchResults(results);
  });
  return;
}
_renderSearchResults(results);
```

}

function _renderSearchResults(results) {
if (!results.length) {
_clearList(’<div class="empty-state"><div class="empty-icon">😕</div><p>لا نتائج — جرب اسماً مختلفاً</p></div>’);
return;
}
var list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
results.forEach(async function(u) {
try {
var snap    = await db.ref(‘users/’ + u.uid).once(‘value’);
var fresh   = snap.val();
if (!fresh) return;
var mySnap  = await db.ref(‘users/’ + _currentUser.uid).once(‘value’);
var me      = mySnap.val() || {};
var isFriend = me.friends && me.friends[u.uid];
var hasSent  = me.requests && me.requests[u.uid] === ‘sent’;
var card = _buildCard(u.uid, fresh, isFriend ? ‘friend’ : hasSent ? ‘sent’ : ‘none’);
list.appendChild(card);
} catch(e) {}
});
}

function loadFriends() {
db.ref(‘users/’ + _currentUser.uid).once(‘value’).then(function(snap) {
var me = snap.val() || {};
_userData = me;
var friendIds = Object.keys(me.friends || {});
if (!friendIds.length) {
_clearList(’<div class="empty-state"><div class="empty-icon">👥</div><p>لا أصدقاء بعد<br>ابحث لإضافة أصدقاء</p></div>’);
return;
}
var list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
friendIds.forEach(async function(uid) {
try {
var uSnap = await db.ref(‘users/’ + uid).once(‘value’);
var u = uSnap.val();
if (u) list.appendChild(_buildCard(uid, u, ‘friend’));
} catch(e) {}
});
}).catch(function(e) { console.error(‘loadFriends:’, e); });
}

async function _loadRequests() {
_clearList(’<div class="spinner"></div>’);
try {
var snap    = await db.ref(‘users/’ + _currentUser.uid + ‘/requests’).once(‘value’);
var reqs    = snap.val() || {};
var incoming = Object.entries(reqs).filter(function(entry) { return entry[1] === ‘received’; });
if (!incoming.length) {
_clearList(’<div class="empty-state"><div class="empty-icon">📩</div><p>لا طلبات صداقة</p></div>’);
return;
}
var list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
for (var i = 0; i < incoming.length; i++) {
var uid = incoming[i][0];
try {
var uSnap = await db.ref(‘users/’ + uid).once(‘value’);
var u = uSnap.val();
if (u) list.appendChild(_buildCard(uid, u, ‘request’));
} catch(e) {}
}
} catch(e) {
_clearList(’<div class="empty-state"><p>خطأ في التحميل</p></div>’);
}
}

function _buildCard(uid, u, type) {
var card = document.createElement(‘div’);
card.className = ‘friend-card’;

```
var badges = isAdmin(uid) ? getAdminBadges() : (u.badges || []);
var top3   = getTop3Badges(badges);
var badgesHtml = top3.map(function(k) {
  return '<span style="display:inline-flex">' + buildBadgeSVGSmall(k) + '</span>';
}).join('');

var actionsHTML = '';
if      (type === 'friend')  actionsHTML = '<button class="btn-chat">💬 دردشة</button>';
else if (type === 'request') actionsHTML = '<button class="btn-accept">✓ قبول</button><button class="btn-reject">✕</button>';
else if (type === 'sent')    actionsHTML = '<button class="btn-reject" disabled style="opacity:.5">مُرسل ✓</button>';
else                         actionsHTML = '<button class="btn-add">➕ إضافة</button>';

// Avatar: supports photo URL or emoji
var aviInner = '';
if (u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'))) {
  aviInner = '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
} else {
  aviInner = sanitize(u.avatar || '👤');
}

card.innerHTML =
  '<div class="friend-avatar">' +
    '<div class="avi" style="cursor:pointer">' + aviInner + '</div>' +
    '<div class="friend-status ' + (u.online ? 'online' : '') + '"></div>' +
  '</div>' +
  '<div class="friend-info" style="cursor:pointer">' +
    '<div class="friend-name" style="display:flex;align-items:center;gap:4px">' +
      sanitize(u.username || '—') +
      '<span style="display:flex;gap:2px">' + badgesHtml + '</span>' +
    '</div>' +
    '<div class="friend-meta">' + sanitize(u.country || '') + ' • #' + sanitize(u.id6 || '000000') + '</div>' +
    '<div class="friend-meta">' + (u.online ? '🟢 متصل الآن' : '⚫ ' + formatLastSeen(u.lastSeen)) + '</div>' +
  '</div>' +
  '<div class="friend-actions">' + actionsHTML + '</div>';

card.querySelector('.avi').onclick         = function() { ProfileModule.viewUserProfile(uid, _currentUser.uid); };
card.querySelector('.friend-info').onclick = function() { ProfileModule.viewUserProfile(uid, _currentUser.uid); };

var addBtn = card.querySelector('.btn-add');
if (addBtn) {
  addBtn.onclick = async function() {
    addBtn.disabled = true; addBtn.textContent = '...';
    try {
      await sendRequest(_currentUser.uid, uid);
      addBtn.textContent = 'مُرسل ✓';
      showToast('تم إرسال طلب الصداقة ✓');
    } catch(e) {
      addBtn.disabled = false; addBtn.textContent = '➕ إضافة';
      showToast('خطأ في الإرسال');
    }
  };
}

var chatBtn = card.querySelector('.btn-chat');
if (chatBtn) {
  chatBtn.onclick = function() {
    if (typeof ChatModule !== 'undefined') ChatModule.openPrivateChat(uid, u);
  };
}

var acceptBtn = card.querySelector('.btn-accept');
if (acceptBtn) {
  acceptBtn.onclick = async function() {
    acceptBtn.disabled = true;
    try {
      await acceptRequest(_currentUser.uid, uid);
      card.remove();
      showToast('تمت إضافة الصديق ✓');
      var snap = await db.ref('users/' + _currentUser.uid).once('value');
      _userData = snap.val() || _userData;
    } catch(e) {
      acceptBtn.disabled = false;
      showToast('خطأ');
    }
  };
}

var rejectBtn = card.querySelector('.btn-reject');
if (rejectBtn && type === 'request') {
  rejectBtn.onclick = async function() {
    await rejectRequest(_currentUser.uid, uid);
    card.remove();
  };
}

return card;
```

}

function _clearList(html) {
var list = document.getElementById(‘friends-list’);
if (list) list.innerHTML = html || ‘’;
}

async function sendRequest(fromUid, toUid) {
var updates = {};
updates[‘users/’ + fromUid + ‘/requests/’ + toUid]   = ‘sent’;
updates[‘users/’ + toUid  + ‘/requests/’ + fromUid]  = ‘received’;
await db.ref().update(updates);
}

async function acceptRequest(myUid, fromUid) {
var updates = {};
updates[‘users/’ + myUid   + ‘/friends/’ + fromUid]  = true;
updates[‘users/’ + fromUid + ‘/friends/’ + myUid]    = true;
updates[‘users/’ + myUid   + ‘/requests/’ + fromUid] = null;
updates[‘users/’ + fromUid + ‘/requests/’ + myUid]   = null;
await db.ref().update(updates);
try {
var snap  = await db.ref(‘users/’ + myUid).once(‘value’);
var u     = snap.val();
if (!u) return;
var today = new Date().toDateString();
var cnt   = u.friendXPToday === today ? (u.friendXPCount || 0) : 0;
if (cnt < 5) {
var nx = Math.min((u.xp || 0) + 5, 100 * XP_PER_LEVEL);
await db.ref(‘users/’ + myUid).update({
xp: nx, level: getLevelFromXP(nx),
friendXPToday: today, friendXPCount: cnt + 1,
});
}
} catch(e) {}
}

async function rejectRequest(myUid, fromUid) {
var updates = {};
updates[‘users/’ + myUid   + ‘/requests/’ + fromUid] = null;
updates[‘users/’ + fromUid + ‘/requests/’ + myUid]   = null;
await db.ref().update(updates);
}

function listenRequestCount(uid) {
if (_reqListener) {
try { db.ref(‘users/’ + uid + ‘/requests’).off(‘value’, _reqListener); } catch(e) {}
}
_reqListener = db.ref(‘users/’ + uid + ‘/requests’).on(‘value’, function(snap) {
var reqs = snap.val() || {};
var cnt  = Object.values(reqs).filter(function(v) { return v === ‘received’; }).length;
var badge = document.getElementById(‘friends-badge’);
if (!badge) return;
badge.textContent = cnt;
badge.classList.toggle(‘hidden’, cnt === 0);
});
}

function destroy() {
if (_reqListener && _currentUser) {
try { db.ref(‘users/’ + _currentUser.uid + ‘/requests’).off(‘value’, _reqListener); } catch(e) {}
}
_reqListener = null;
}

return {
init: init,
sendRequest: sendRequest,
acceptRequest: acceptRequest,
rejectRequest: rejectRequest,
loadFriends: loadFriends,
listenRequestCount: listenRequestCount,
destroy: destroy,
};
})();
