// ═══════════════════════════════════════
//  FRIENDS.JS
// ═══════════════════════════════════════

const FriendsModule = (() => {
let _currentUser  = null;
let _userData     = null;
let _activeTab    = ‘friends’;
let _reqListener  = null;
let _allUsers     = [];

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
const snap = await db.ref(‘users’).once(‘value’);
_allUsers = [];
snap.forEach(child => {
if (child.key !== _currentUser.uid) {
_allUsers.push({ uid: child.key, …child.val() });
}
});
} catch(e) { console.error(‘prefetch:’, e); }
}

function _bindSubTabs() {
document.querySelectorAll(’.friends-tab’).forEach(btn => {
btn.onclick = () => {
document.querySelectorAll(’.friends-tab’).forEach(b => b.classList.remove(‘active’));
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
const input = document.getElementById(‘friends-search-input’);
if (!input) return;
let timer;
input.addEventListener(‘input’, () => {
clearTimeout(timer);
const q = input.value.trim();
document.querySelectorAll(’.friends-tab’).forEach(b => b.classList.remove(‘active’));
const searchTab = document.querySelector(’.friends-tab[data-tab=“search”]’);
if (searchTab) searchTab.classList.add(‘active’);
_activeTab = ‘search’;
if (!q) {
_clearList(’<div class="empty-state"><div class="empty-icon">🔍</div><p>ابحث بالاسم أو الـ ID</p></div>’);
return;
}
timer = setTimeout(() => _doSearch(q), 300);
});
}

function _doSearch(q) {
const qLower = q.toLowerCase();
_clearList(’<div class="spinner"></div>’);
let results = _allUsers.filter(u => {
const nameMatch = u.username && u.username.toLowerCase().includes(qLower);
const idMatch   = u.id6 && u.id6.toString().includes(q);
return nameMatch || idMatch;
}).slice(0, 20);

```
if (_allUsers.length === 0) {
  _prefetchUsers().then(() => {
    results = _allUsers.filter(u => {
      const nameMatch = u.username && u.username.toLowerCase().includes(qLower);
      const idMatch   = u.id6 && u.id6.toString().includes(q);
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
const list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
results.forEach(async u => {
try {
const snap = await db.ref(‘users/’ + u.uid).once(‘value’);
const fresh = snap.val();
if (!fresh) return;
const mySnap = await db.ref(‘users/’ + _currentUser.uid).once(‘value’);
const me = mySnap.val() || {};
const isFriend = me.friends && me.friends[u.uid];
const hasSent  = me.requests && me.requests[u.uid] === ‘sent’;
const card = _buildCard(u.uid, fresh, isFriend ? ‘friend’ : hasSent ? ‘sent’ : ‘none’);
list.appendChild(card);
} catch(e) {}
});
}

function loadFriends() {
db.ref(‘users/’ + _currentUser.uid).once(‘value’).then(snap => {
const me = snap.val() || {};
_userData = me;
const friendIds = Object.keys(me.friends || {});
if (!friendIds.length) {
_clearList(’<div class="empty-state"><div class="empty-icon">👥</div><p>لا أصدقاء بعد<br>ابحث لإضافة أصدقاء</p></div>’);
return;
}
const list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
friendIds.forEach(async uid => {
try {
const uSnap = await db.ref(‘users/’ + uid).once(‘value’);
const u = uSnap.val();
if (u) list.appendChild(_buildCard(uid, u, ‘friend’));
} catch(e) {}
});
}).catch(e => { console.error(‘loadFriends:’, e); });
}

async function _loadRequests() {
_clearList(’<div class="spinner"></div>’);
try {
const snap = await db.ref(‘users/’ + _currentUser.uid + ‘/requests’).once(‘value’);
const reqs = snap.val() || {};
const incoming = Object.entries(reqs).filter(([, v]) => v === ‘received’);
if (!incoming.length) {
_clearList(’<div class="empty-state"><div class="empty-icon">📩</div><p>لا طلبات صداقة</p></div>’);
return;
}
const list = document.getElementById(‘friends-list’);
list.innerHTML = ‘’;
for (const [uid] of incoming) {
try {
const uSnap = await db.ref(‘users/’ + uid).once(‘value’);
const u = uSnap.val();
if (u) list.appendChild(_buildCard(uid, u, ‘request’));
} catch(e) {}
}
} catch(e) {
_clearList(’<div class="empty-state"><p>خطأ في التحميل</p></div>’);
}
}

function _buildCard(uid, u, type) {
const card = document.createElement(‘div’);
card.className = ‘friend-card’;

```
let actionsHTML = '';
if      (type === 'friend')  actionsHTML = '<button class="btn-chat">💬 دردشة</button>';
else if (type === 'request') actionsHTML = '<button class="btn-accept">✓ قبول</button><button class="btn-reject">✕</button>';
else if (type === 'sent')    actionsHTML = '<button class="btn-reject" disabled style="opacity:.5">مُرسل ✓</button>';
else                         actionsHTML = '<button class="btn-add">➕ إضافة</button>';

// Avatar: photo or emoji
const aviContent = u.photoURL
  ? `<img src="${u.photoURL}" alt="avi"/>`
  : sanitize(u.avatar || '👤');

card.innerHTML =
  '<div class="friend-avatar">' +
    '<div class="avi" style="cursor:pointer">' + aviContent + '</div>' +
    '<div class="friend-status ' + (u.online ? 'online' : '') + '"></div>' +
  '</div>' +
  '<div class="friend-info" style="cursor:pointer">' +
    '<div class="friend-name">' + sanitize(u.username || '—') + '</div>' +
    '<div class="friend-meta">' + sanitize(u.country || '') + ' • #' + sanitize(u.id6 || '000000') + '</div>' +
    '<div class="friend-meta">' + (u.online ? '🟢 متصل الآن' : '⚫ ' + formatLastSeen(u.lastSeen)) + '</div>' +
  '</div>' +
  '<div class="friend-actions">' + actionsHTML + '</div>';

card.querySelector('.avi').onclick         = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);
card.querySelector('.friend-info').onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);

const addBtn = card.querySelector('.btn-add');
if (addBtn) {
  addBtn.onclick = async () => {
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

const chatBtn = card.querySelector('.btn-chat');
if (chatBtn) {
  chatBtn.onclick = () => {
    if (typeof ChatModule !== 'undefined') ChatModule.openPrivateChat(uid, u);
  };
}

const acceptBtn = card.querySelector('.btn-accept');
if (acceptBtn) {
  acceptBtn.onclick = async () => {
    acceptBtn.disabled = true;
    try {
      await acceptRequest(_currentUser.uid, uid);
      card.remove();
      showToast('تمت إضافة الصديق ✓');
      const snap = await db.ref('users/' + _currentUser.uid).once('value');
      _userData = snap.val() || _userData;
    } catch(e) {
      acceptBtn.disabled = false;
      showToast('خطأ');
    }
  };
}

const rejectBtn = card.querySelector('.btn-reject');
if (rejectBtn && type === 'request') {
  rejectBtn.onclick = async () => {
    await rejectRequest(_currentUser.uid, uid);
    card.remove();
  };
}

return card;
```

}

function _clearList(html) {
const list = document.getElementById(‘friends-list’);
if (list) list.innerHTML = html || ‘’;
}

async function sendRequest(fromUid, toUid) {
const updates = {};
updates[‘users/’ + fromUid + ‘/requests/’ + toUid]  = ‘sent’;
updates[‘users/’ + toUid  + ‘/requests/’ + fromUid] = ‘received’;
await db.ref().update(updates);
}

async function acceptRequest(myUid, fromUid) {
const updates = {};
updates[‘users/’ + myUid   + ‘/friends/’ + fromUid] = true;
updates[‘users/’ + fromUid + ‘/friends/’ + myUid]   = true;
updates[‘users/’ + myUid   + ‘/requests/’ + fromUid] = null;
updates[‘users/’ + fromUid + ‘/requests/’ + myUid]   = null;
await db.ref().update(updates);
try {
const snap = await db.ref(‘users/’ + myUid).once(‘value’);
const u = snap.val(); if (!u) return;
const today = new Date().toDateString();
const cnt = u.friendXPToday === today ? (u.friendXPCount || 0) : 0;
if (cnt < 5) {
const nx = Math.min((u.xp || 0) + 5, 100 * XP_PER_LEVEL);
await db.ref(‘users/’ + myUid).update({
xp: nx, level: getLevelFromXP(nx),
friendXPToday: today, friendXPCount: cnt + 1,
});
}
} catch(e) {}
}

async function rejectRequest(myUid, fromUid) {
const updates = {};
updates[‘users/’ + myUid   + ‘/requests/’ + fromUid] = null;
updates[‘users/’ + fromUid + ‘/requests/’ + myUid]   = null;
await db.ref().update(updates);
}

function listenRequestCount(uid) {
if (_reqListener) {
try { db.ref(‘users/’ + uid + ‘/requests’).off(‘value’, _reqListener); } catch(e) {}
}
_reqListener = db.ref(‘users/’ + uid + ‘/requests’).on(‘value’, snap => {
const reqs = snap.val() || {};
const cnt = Object.values(reqs).filter(v => v === ‘received’).length;
const badge = document.getElementById(‘friends-badge’);
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
init, sendRequest, acceptRequest, rejectRequest,
loadFriends, listenRequestCount, destroy,
};
})();
