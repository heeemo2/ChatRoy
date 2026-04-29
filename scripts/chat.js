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
    // requestAnimationFrame ensures DOM is painted before scroll
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /* ══════════════════════════════
     ROOM CHAT
  ══════════════════════════════ */
  async function openRoom(roomId, roomData) {
    const ok = await RoomsModule.canEnterRoom(roomId, _currentUser.uid);
    if (!ok) return showToast('🚫 أنت محظور من هذه الغرفة');

    _cleanupRoom();
    _roomId   = roomId;
    _roomData = roomData;

    showScreen('screen-room');

    // Header
    const hAvi = document.getElementById('room-header-avi');
    const hName = document.getElementById('room-header-name');
    if (hAvi)  hAvi.textContent  = roomData.avatar || '🏠';
    if (hName) hName.textContent = roomData.name   || 'غرفة';

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

    // Back
    document.getElementById('btn-room-back').onclick = () => {
      _cleanupRoom();
      showScreen('screen-app');
    };

    // Members panel toggle
    document.getElementById('btn-room-members').onclick = () => {
      document.getElementById('members-panel').classList.toggle('open');
    };
  }

  function _sendSysMsg(roomId, { text, legendary }) {
    db.ref('messages/' + roomId).push({
      type: 'system', text, legendary: !!legendary,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  function _listenRoomMsgs(roomId) {
    const msgsEl = document.getElementById('chat-messages');
    if (!msgsEl) return;
    msgsEl.innerHTML = '';

    const joinedAt = Date.now();

    const ref = db.ref('messages/' + roomId)
      .orderByChild('timestamp')
      .startAt(joinedAt)
      .limitToLast(100);

    _msgListener = ref.on('child_added', snap => {
      const msg = snap.val(); if (!msg) return;
      msgsEl.appendChild(_buildBubble(snap.key, msg, roomId));
      _scrollToBottom(msgsEl);
    });
  }


  function _buildBubble(msgId, msg, roomId) {
    if (msg.type === 'system') {
      const d = document.createElement('div');
      d.className = 'sys-msg' + (msg.legendary ? ' legendary' : '');
      d.textContent = msg.text; return d;
    }
    const isOwn   = msg.senderId === _currentUser.uid;
    const isAdm   = isAdmin(msg.senderId);
    const row     = document.createElement('div');
    row.className = 'msg-row' + (isOwn ? ' own' : '') + (isAdm ? ' is-admin' : '');
    row.dataset.msgId = msgId;

    const avi = document.createElement('div');
    avi.className = 'msg-avatar';
    avi.textContent = msg.senderAvatar || '👤';
    avi.onclick = () => ProfileModule.viewUserProfile(msg.senderId, _currentUser.uid);

    const content = document.createElement('div');
    content.className = 'msg-content';
    content.innerHTML =
      '<div class="msg-sender ' + (isAdm ? 'admin-name' : '') + '">' + sanitize(msg.senderName || '') + '</div>' +
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
  }

  /* ── Context Menu ── */
  function _ctxMenu(msgId, msg, roomId) {
    document.getElementById('ctx-menu')?.remove();
    const role   = _getRole(roomId, _roomData);
    const canDel = msg.senderId === _currentUser.uid || role !== 'member' || isAdmin(_currentUser.uid);
    const canMod = (role === 'owner' || role === 'admin' || isAdmin(_currentUser.uid)) && msg.senderId !== _currentUser.uid;

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
  }

  /* ── Members Panel ── */
  function _listenMembers(roomId, roomData) {
    const panel = document.getElementById('members-panel');
    if (!panel) return;
    panel.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>';
    _memberListener = db.ref('rooms/' + roomId + '/usersOnline').on('value', async snap => {
      panel.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">المتواجدون</div>';
      for (const uid of Object.keys(snap.val() || {})) {
        try {
          const uSnap = await db.ref('users/' + uid).once('value');
          const u = uSnap.val(); if (!u) continue;
          const role = uid === roomData.ownerId ? 'owner'
                     : (roomData.admins && roomData.admins[uid]) ? 'admin' : 'member';
          const row = document.createElement('div');
          row.className = 'member-row';
          row.innerHTML =
            '<div class="member-avi">' + sanitize(u.avatar || '👤') + '</div>' +
            '<div class="member-name">' + sanitize(u.username || '') + '</div>' +
            '<div class="member-role ' + role + '">' +
              (role === 'owner' ? '👑' : role === 'admin' ? '🛡' : '') +
            '</div>';
          row.onclick = () => ProfileModule.viewUserProfile(uid, _currentUser.uid);
          panel.appendChild(row);
        } catch(e) {}
      }
    });
  }

  /* ── Room Input ── */
  function _buildRoomInput(roomId) {
    const input   = document.getElementById('room-chat-input');
    const sendBtn = document.getElementById('btn-send-room');
    const emjBtn  = document.getElementById('btn-emoji-room');
    const picker  = document.getElementById('emoji-picker-room');
    if (!input || !sendBtn) return;

    sendBtn.onclick = () => _sendRoomMsg(roomId, input);
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendRoomMsg(roomId, input); } };

    // Emoji picker
    picker.innerHTML = '';
    EMOJI_LIST.forEach(em => {
      const s = document.createElement('span');
      s.textContent = em;
      s.onclick = () => { input.value += em; input.focus(); };
      picker.appendChild(s);
    });
    emjBtn.onclick = e => { e.stopPropagation(); picker.classList.toggle('hidden'); };
    document.addEventListener('click', () => picker.classList.add('hidden'));
  }

  async function _sendRoomMsg(roomId, input) {
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    try {
      await db.ref('messages/' + roomId).push({
        senderId: _currentUser.uid,
        senderName: _userData.username,
        senderAvatar: _userData.avatar || '👤',
        text, type: 'text',
        isAdmin: isAdmin(_currentUser.uid),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
      // XP +1 per message (cap 200/day)
      const snap = await db.ref('users/' + _currentUser.uid).once('value');
      const u = snap.val(); if (!u) return;
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
  }

  /* ══════════════════════════════
     PRIVATE CHAT
  ══════════════════════════════ */
  async function openPrivateChat(peerUid, peerData) {
    if (!peerUid || !_currentUser) return;
    _cleanupPrivate();
    _peerUid  = peerUid;
    _chatId   = getChatId(_currentUser.uid, peerUid);

    // Always fetch fresh peer data
    try {
      const snap = await db.ref('users/' + peerUid).once('value');
      _peerData = snap.val() || peerData || {};
    } catch(e) { _peerData = peerData || {}; }

    showScreen('screen-private');

    const hAvi  = document.getElementById('private-header-avi');
    const hName = document.getElementById('private-header-name');
    const hStat = document.getElementById('private-header-status');
    if (hAvi)  hAvi.textContent  = _peerData.avatar   || '👤';
    if (hName) hName.textContent = _peerData.username  || '...';
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
  }

  function _listenPrivateMsgs() {
    const msgsEl = document.getElementById('private-messages');
    if (!msgsEl) return;
    msgsEl.innerHTML = '';
    const ref = db.ref('privateChats/' + _chatId).orderByChild('timestamp').limitToLast(100);
    _msgListener = ref.on('child_added', snap => {
      const msg = snap.val(); if (!msg) return;
      const isOwn = msg.senderId === _currentUser.uid;
      const row = document.createElement('div');
      row.className = 'msg-row' + (isOwn ? ' own' : '');
      row.innerHTML =
        '<div class="msg-avatar">' + sanitize(isOwn ? (_userData.avatar||'👤') : (_peerData.avatar||'👤')) + '</div>' +
        '<div class="msg-content">' +
          '<div class="msg-bubble">' + sanitize(msg.text) + '</div>' +
          '<div class="msg-time">' + formatTime(msg.timestamp) + (isOwn && msg.seen ? ' ✔✔' : '') + '</div>' +
        '</div>';
      msgsEl.appendChild(row);
      _scrollToBottom(msgsEl);
      if (!isOwn && !msg.seen) db.ref('privateChats/' + _chatId + '/' + snap.key + '/seen').set(true);
    });
    // Typing
    _typingListener = db.ref('typing/' + _chatId + '/' + _peerUid).on('value', snap => {
      const el = document.getElementById('typing-indicator');
      if (el) el.classList.toggle('hidden', !snap.val());
    });
  }

  function _buildPrivateInput() {
    const input   = document.getElementById('private-chat-input');
    const sendBtn = document.getElementById('btn-send-private');
    const emjBtn  = document.getElementById('btn-emoji-private');
    const picker  = document.getElementById('emoji-picker-private');
    if (!input || !sendBtn) return;

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
  }

  async function _sendPrivateMsg(input) {
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    try {
      db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(false);
      await db.ref('privateChats/' + _chatId).push({
        senderId: _currentUser.uid,
        senderName: _userData.username,
        text, seen: false,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch(e) { console.error('sendPrivateMsg:', e); }
  }

  /* ── Helpers ── */
  function _getRole(roomId, roomData) {
    if (!roomData) return 'member';
    if (roomData.ownerId === _currentUser.uid) return 'owner';
    if (roomData.admins && roomData.admins[_currentUser.uid]) return 'admin';
    return 'member';
  }

  function _cleanupRoom() {
    if (_msgListener && _roomId) { db.ref('messages/' + _roomId).off('child_added', _msgListener); _msgListener = null; }
    if (_memberListener && _roomId) { db.ref('rooms/' + _roomId + '/usersOnline').off('value', _memberListener); _memberListener = null; }
    if (_onlineRef) { _onlineRef.remove(); _onlineRef = null; }
    document.getElementById('members-panel')?.classList.remove('open');
    document.getElementById('ctx-menu')?.remove();
  }

  function _cleanupPrivate() {
    if (_msgListener && _chatId) { db.ref('privateChats/' + _chatId).off('child_added', _msgListener); _msgListener = null; }
    if (_typingListener && _chatId && _peerUid) {
      db.ref('typing/' + _chatId + '/' + _peerUid).off('value', _typingListener); _typingListener = null;
      db.ref('typing/' + _chatId + '/' + _currentUser.uid).set(false);
    }
  }

  return { init, openRoom, openPrivateChat };
})();
