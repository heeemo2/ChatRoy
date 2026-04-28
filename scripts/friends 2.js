// ═══════════════════════════════════════
//  FRIENDS.JS
// ═══════════════════════════════════════

const FriendsModule = (() => {
  let _currentUser  = null;
  let _userData     = null;
  let _activeTab    = 'friends';
  let _reqListener  = null;

  function init(user, userData) {
    _currentUser = user;
    _userData    = userData;
    _bindSubTabs();
    _bindSearch();
    loadFriends();
  }

  /* ── Sub-tabs ── */
  function _bindSubTabs() {
    document.querySelectorAll('.friends-tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.friends-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeTab = btn.dataset.tab;
        if (_activeTab === 'friends') loadFriends();
        else if (_activeTab === 'requests') _loadRequests();
        else _clearList('<div class="empty-state"><div class="empty-icon">🔍</div><p>ابحث بالاسم أعلاه</p></div>');
      };
    });
  }

  /* ── Search ── */
  function _bindSearch() {
    const input = document.getElementById('friends-search-input');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) { if (_activeTab === 'search') _clearList(); return; }
      if (q.length < 2) return;
      // Switch to search tab automatically
      document.querySelectorAll('.friends-tab').forEach(b => b.classList.remove('active'));
      const searchTab = document.querySelector('.friends-tab[data-tab="search"]');
      if (searchTab) searchTab.classList.add('active');
      _activeTab = 'search';
      timer = setTimeout(() => _doSearch(q), 400);
    });
  }

  async function _doSearch(q) {
    _clearList('<div class="spinner"></div>');
    try {
      const snap = await db.ref('users')
        .orderByChild('usernameLower')
        .startAt(q.toLowerCase())
        .endAt(q.toLowerCase() + '\uf8ff')
        .limitToFirst(20).once('value');
      const results = [];
      snap.forEach(child => {
        if (child.key !== _currentUser.uid) results.push({ uid: child.key, ...child.val() });
      });
      if (!results.length) return _clearList('<div class="empty-state"><div class="empty-icon">😕</div><p>لا نتائج</p></div>');
      const list = document.getElementById('friends-list');
      list.innerHTML = '';
      results.forEach(u => {
        const isFriend = _userData.friends && _userData.friends[u.uid];
        const hasSent  = _userData.requests && _userData.requests[u.uid] === 'sent';
        const card = _buildCard(u.uid, u, isFriend ? 'friend' : hasSent ? 'sent' : 'none');
        list.appendChild(card);
      });
    } catch(e) { _clearList('<div class="empty-state"><p>خطأ في البحث</p></div>'); }
  }

  /* ── Load Friends ── */
  function loadFriends() {
    const friendIds = Object.keys(_userData.friends || {});
    if (!friendIds.length) return _clearList('<div class="empty-state"><div class="empty-icon">👥</div><p>لا أصدقاء بعد<br>ابحث لإضافة أصدقاء</p></div>');
    _clearList('<div class="spinner"></div>');
    const list = document.getElementById('friends-list');
    list.innerHTML = '';
    friendIds.forEach(async uid => {
      try {
        const snap = await db.ref('users/' + uid).once('value');
        const u = snap.val();
        if (u) list.appendChild(_buildCard(uid, u, 'friend'));
      } catch(e) {}
    });
  }

  /* ── Load Requests ── */
  async function _loadRequests() {
    _clearList('<div class="spinner"></div>');
    try {
      const snap = await db.ref('users/' + _currentUser.uid + '/requests').once('value');
      const reqs = snap.val() || {};
      const incoming = Object.entries(reqs).filter(([, v]) => v === 'received');
      if (!incoming.length) return _clearList('<div class="empty-state"><div class="empty-icon">📩</div><p>لا طلبات صداقة</p></div>');
      const list = document.getElementById('friends-list');
      list.innerHTML = '';
      incoming.forEach(async ([uid]) => {
        const uSnap = await db.ref('users/' + uid).once('value');
        const u = uSnap.val();
        if (u) list.appendChild(_buildCard(uid, u, 'request'));
      });
    } catch(e) {}
  }

  /* ── Build Card ── */
  function _buildCard(uid, u, type) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    let actions = '';
    if (type === 'friend')  actions = '<button class="btn-chat">💬 دردشة</button>';
    else if (type === 'request') actions = '<button class="btn-accept">✓</button><button class="btn-reject">✕</button>';
    else if (type === 'sent') actions = '<button class="btn-reject" disabled>مُرسل</button>';
    else actions = '<button class="btn-add">➕</button>';

    card.innerHTML =
      '<div class="friend-avatar">' +
        '<div class="avi">' + sanitize(u.avatar || '👤') + '</div>' +
        '<div class="friend-status ' + (u.online ? 'online' : '') + '"></div>' +
      '</div>' +
      '<div class="friend-info">' +
        '<div class="friend-name">' + sanitize(u.username || '') + '</div>' +
        '<div class="friend-meta">' + (u.online ? '🟢 متصل' : '⚫ ' + formatLastSeen(u.lastSeen)) + '</div>' +
      '</div>' +
      '<div class="friend-actions">' + actions + '</div>';

    card.querySelector('.avi').onclick = () =>
      ProfileModule.viewUserProfile(uid, _currentUser.uid);

    const addBtn = card.querySelector('.btn-add');
    if (addBtn) addBtn.onclick = async () => {
      await sendRequest(_currentUser.uid, uid);
      addBtn.disabled = true; addBtn.textContent = 'مُرسل';
      showToast('تم إرسال طلب الصداقة ✓');
    };

    const chatBtn = card.querySelector('.btn-chat');
    if (chatBtn) chatBtn.onclick = () => ChatModule.openPrivateChat(uid, u);

    const acceptBtn = card.querySelector('.btn-accept');
    if (acceptBtn) acceptBtn.onclick = async () => {
      await acceptRequest(_currentUser.uid, uid);
      card.remove(); showToast('تمت إضافة الصديق ✓');
    };

    const rejectBtn = card.querySelector('.btn-reject');
    if (rejectBtn && type === 'request') rejectBtn.onclick = async () => {
      await rejectRequest(_currentUser.uid, uid);
      card.remove();
    };

    return card;
  }

  function _clearList(html = '') {
    const list = document.getElementById('friends-list');
    if (list) list.innerHTML = html;
  }

  /* ── CRUD ── */
  async function sendRequest(fromUid, toUid) {
    const updates = {};
    updates['users/' + fromUid + '/requests/' + toUid] = 'sent';
    updates['users/' + toUid  + '/requests/' + fromUid] = 'received';
    await db.ref().update(updates);
  }

  async function acceptRequest(myUid, fromUid) {
    const updates = {};
    updates['users/' + myUid   + '/friends/' + fromUid] = true;
    updates['users/' + fromUid + '/friends/' + myUid]   = true;
    updates['users/' + myUid   + '/requests/' + fromUid] = null;
    updates['users/' + fromUid + '/requests/' + myUid]   = null;
    await db.ref().update(updates);
    // +5 XP (cap 5/day)
    try {
      const snap = await db.ref('users/' + myUid).once('value');
      const u = snap.val(); if (!u) return;
      const today = new Date().toDateString();
      const cnt = u.friendXPToday === today ? (u.friendXPCount || 0) : 0;
      if (cnt < 5) {
        const nx = Math.min((u.xp||0)+5, 100*XP_PER_LEVEL);
        await db.ref('users/' + myUid).update({ xp:nx, level:getLevelFromXP(nx), friendXPToday:today, friendXPCount:cnt+1 });
      }
    } catch(e) {}
  }

  async function rejectRequest(myUid, fromUid) {
    await db.ref('users/' + myUid   + '/requests/' + fromUid).remove();
    await db.ref('users/' + fromUid + '/requests/' + myUid).remove();
  }

  /* ── Request badge count ── */
  function listenRequestCount(uid) {
    if (_reqListener) db.ref('users/' + uid + '/requests').off('value', _reqListener);
    _reqListener = db.ref('users/' + uid + '/requests').on('value', snap => {
      const cnt = Object.values(snap.val() || {}).filter(v => v === 'received').length;
      const badge = document.getElementById('friends-badge');
      if (!badge) return;
      badge.textContent = cnt;
      badge.classList.toggle('hidden', cnt === 0);
    });
  }

  function destroy() {
    if (_reqListener) db.ref('users/' + (_currentUser && _currentUser.uid || '') + '/requests').off('value', _reqListener);
    _reqListener = null;
  }

  return { init, sendRequest, acceptRequest, rejectRequest, loadFriends, listenRequestCount, destroy };
})();
