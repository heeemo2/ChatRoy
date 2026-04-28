// ═══════════════════════════════════════
//  ROOMS.JS
// ═══════════════════════════════════════

const RoomsModule = (() => {
  let _currentUser = null;
  let _userData    = null;
  let _roomsRef    = null;
  const PUBLIC_ROOM_ID = '__public__';

  function init(user, userData) {
    _currentUser = user;
    _userData    = userData;
    _ensurePublicRoom();
    _bindCreateRoom();
    listenRooms();
  }

  async function _ensurePublicRoom() {
    try {
      const snap = await db.ref('rooms/' + PUBLIC_ROOM_ID).once('value');
      if (!snap.exists()) {
        await db.ref('rooms/' + PUBLIC_ROOM_ID).set({
          name: 'الغرفة العامة', avatar: '🌍',
          ownerId: 'system', admins: {}, bannedUsers: {},
          usersOnline: 0, isPublic: true, createdAt: Date.now(),
        });
      }
    } catch(e) {}
  }

  function listenRooms() {
    const list = document.getElementById('rooms-list');
    if (!list) return;
    list.innerHTML = '<div class="spinner"></div>';

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
  }

  function _buildCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML =
      (room.isPublic ? '<span class="public-room-badge">عام</span>' : '') +
      '<div class="room-avatar">' + sanitize(room.avatar || '🏠') + '</div>' +
      '<div class="room-info">' +
        '<div class="room-name">' + sanitize(room.name) + '</div>' +
        '<div class="room-online">' + (typeof room.usersOnline === 'object' ? Object.keys(room.usersOnline||{}).length : (room.usersOnline||0)) + ' متواجد</div>' +
      '</div>';
    card.addEventListener('click', () => ChatModule.openRoom(room.id, room));
    return card;
  }

  function _bindCreateRoom() {
    const btn = document.getElementById('btn-create-room');
    if (btn) btn.onclick = () => openModal('modal-create-room');

    const saveBtn = document.getElementById('btn-save-room');
    if (saveBtn) saveBtn.onclick = _createRoom;
  }

  async function _createRoom() {
    const name   = (document.getElementById('room-name-input').value || '').trim();
    const avatar = (document.getElementById('room-avatar-input').value || '').trim() || '🏠';
    if (!name) return showToast('أدخل اسم الغرفة');
    const btn = document.getElementById('btn-save-room');
    if (btn) btn.disabled = true;
    try {
      const ref = db.ref('rooms').push();
      await ref.set({
        name, avatar, ownerId: _currentUser.uid,
        admins: {}, bannedUsers: {}, usersOnline: 0,
        isPublic: false, createdAt: Date.now(),
      });
      showToast('تم إنشاء الغرفة ✓');
      closeModal('modal-create-room');
      document.getElementById('room-name-input').value   = '';
      document.getElementById('room-avatar-input').value = '';
    } catch(e) { showToast('خطأ في الإنشاء'); }
    if (btn) btn.disabled = false;
  }

  async function banUser(roomId, targetUid) {
    await db.ref('rooms/' + roomId + '/bannedUsers/' + targetUid).set(true);
    await db.ref('rooms/' + roomId + '/usersOnline/' + targetUid).remove();
    showToast('تم حظر المستخدم');
  }

  async function kickUser(roomId, targetUid) {
    await db.ref('rooms/' + roomId + '/usersOnline/' + targetUid).remove();
    showToast('تم طرد المستخدم');
  }

  async function assignAdmin(roomId, targetUid) {
    await db.ref('rooms/' + roomId + '/admins/' + targetUid).set(true);
    showToast('تم تعيين أدمن ✓');
  }

  async function canEnterRoom(roomId, uid) {
    const snap = await db.ref('rooms/' + roomId + '/bannedUsers/' + uid).once('value');
    return !snap.exists();
  }

  function destroy() {
    if (_roomsRef) { db.ref('rooms').off('value', _roomsRef); _roomsRef = null; }
  }

  return { init, listenRooms, banUser, kickUser, assignAdmin, canEnterRoom, destroy, PUBLIC_ROOM_ID };
})();
