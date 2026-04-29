// profile.js - with photo upload support

const ProfileModule = (() => {

  let _currentUser = null;
  let _userData    = null;
  let _setup = { gender: null, avatar: null, country: null, photoURL: null };

  function showSetup(user) {
    _currentUser = user;
    showScreen('screen-setup');
    _step1();
  }

  function _step1() {
    _showStep('setup-step-1');
    document.querySelectorAll('.gender-card').forEach(function(card) {
      card.onclick = function() {
        document.querySelectorAll('.gender-card').forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        _setup.gender = card.dataset.gender;
      };
    });
    document.getElementById('btn-setup-next1').onclick = function() {
      if (!_setup.gender) return showToast('اختر جنسك اولا');
      _step2();
    };
  }

  function _step2() {
    _showStep('setup-step-2');
    var sel = document.getElementById('setup-country');
    sel.innerHTML = '<option value="">— اختر دولتك —</option>';
    COUNTRIES.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
    document.getElementById('btn-setup-next2').onclick = function() {
      _setup.country = sel.value;
      if (!_setup.country) return showToast('اختر دولتك');
      _step3();
    };
    document.getElementById('btn-setup-back2').onclick = function() { _step1(); };
  }

  function _step3() {
    _showStep('setup-step-3');
    var grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';
    var list = _setup.gender === 'male' ? MALE_AVATARS : FEMALE_AVATARS;

    var uploadDiv = document.createElement('div');
    uploadDiv.className = 'avatar-opt upload-opt';
    uploadDiv.innerHTML = '<span style="font-size:22px">&#128247;</span><span style="font-size:9px;margin-top:2px;color:var(--text-secondary)">صورتي</span>';
    uploadDiv.style.cssText += ';flex-direction:column;gap:2px';
    uploadDiv.onclick = function() {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return showToast('الصورة اكبر من 2MB');
        _fileToDataURL(file).then(function(dataURL) {
          return _compressImage(dataURL, 200);
        }).then(function(compressed) {
          _setup.photoURL = compressed;
          _setup.avatar   = null;
          document.querySelectorAll('.avatar-opt').forEach(function(a) { a.classList.remove('selected'); });
          uploadDiv.classList.add('selected');
          uploadDiv.innerHTML = '<img src="' + compressed + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover"/>';
          showToast('تم اختيار الصورة');
        });
      };
      fileInput.click();
    };
    grid.appendChild(uploadDiv);

    list.forEach(function(emoji) {
      var div = document.createElement('div');
      div.className = 'avatar-opt';
      div.textContent = emoji;
      div.onclick = function() {
        document.querySelectorAll('.avatar-opt').forEach(function(a) { a.classList.remove('selected'); });
        div.classList.add('selected');
        _setup.avatar   = emoji;
        _setup.photoURL = null;
      };
      grid.appendChild(div);
    });

    document.getElementById('btn-setup-next3').onclick = function() {
      if (!_setup.avatar && !_setup.photoURL) return showToast('اختر صورة اولا');
      _step4();
    };
    document.getElementById('btn-setup-back3').onclick = function() { _step2(); };
  }

  function _step4() {
    _showStep('setup-step-4');
    var input = document.getElementById('setup-username');
    var btn   = document.getElementById('btn-setup-finish');

    btn.onclick = async function() {
      var uname = input.value.trim();
      if (!uname || uname.length < 3) return showToast('الاسم 3 احرف على الاقل');
      if (uname.length > 20)          return showToast('الاسم 20 حرفا كحد اقصى');
      if (!/^[\u0600-\u06FFa-zA-Z0-9_]+$/.test(uname)) return showToast('احرف وارقام فقط');
      btn.disabled = true; btn.textContent = '...';
      try {
        var snap = await db.ref('usernames/' + uname.toLowerCase()).once('value');
        if (snap.exists()) {
          showToast('الاسم مستخدم');
          btn.disabled = false; btn.textContent = 'انهاء الاعداد';
          return;
        }
        var uid = _currentUser.uid;
        var id6 = genUID6();
        var now = Date.now();
        var data = {
          username: uname, usernameLower: uname.toLowerCase(),
          avatar:   _setup.photoURL ? null : (_setup.avatar || '?'),
          photoURL: _setup.photoURL || null,
          gender: _setup.gender, country: _setup.country,
          bio: '', level: 0, xp: 0,
          loginDays: 0, lastLoginDate: '',
          totalMessages: 0,
          online: true, lastSeen: now, createdAt: now,
          id6: id6, canChangeUsername: true,
          friends: {}, requests: {}, badges: [],
        };
        if (isAdmin(uid)) {
          data.badges = getAdminBadges();
          data.xp     = 100 * XP_PER_LEVEL;
          data.level  = 100;
        }
        var updates = {};
        updates['users/' + uid] = data;
        updates['usernames/' + uname.toLowerCase()] = uid;
        await db.ref().update(updates);
        showToast('مرحبا بك!');
      } catch(e) {
        showToast('حدث خطا');
        btn.disabled = false; btn.textContent = 'انهاء الاعداد';
      }
    };
    document.getElementById('btn-setup-back4').onclick = function() { _step3(); };
  }

  function _showStep(id) {
    document.querySelectorAll('.setup-step').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  function _fileToDataURL(file) {
    return new Promise(function(res, rej) {
      var r = new FileReader();
      r.onload  = function(e) { res(e.target.result); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function _compressImage(dataURL, maxDim) {
    if (!maxDim) maxDim = 200;
    return new Promise(function(res) {
      var img = new Image();
      img.onload = function() {
        var ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        var w = Math.round(img.width  * ratio);
        var h = Math.round(img.height * ratio);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataURL;
    });
  }

  window.renderAvatar = function(container, userData, size) {
    if (!size) size = 46;
    if (!container) return;
    if (userData && userData.photoURL) {
      container.innerHTML = '<img src="' + userData.photoURL + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover"/>';
    } else {
      container.textContent = (userData && userData.avatar) ? userData.avatar : '?';
      container.style.fontSize = Math.round(size * 0.55) + 'px';
    }
  };

  function renderProfileTab(user, userData) {
    if (!user || !userData) return;
    _currentUser = user;
    _userData    = userData;

    var admin    = isAdmin(user.uid);
    var level    = admin ? 100 : getLevelFromXP(userData.xp || 0);
    var progress = admin ? 100 : getLevelProgress(userData.xp || 0);
    var badges   = admin ? getAdminBadges() : (userData.badges || []);

    var aviEl = document.getElementById('profile-avi');
    if (aviEl) renderAvatar(aviEl, userData, 86);

    var lvlBadgeEl = document.getElementById('profile-lvl-badge');
    if (lvlBadgeEl) lvlBadgeEl.innerHTML = levelBadgeSVG(level);

    var nameEl = document.getElementById('profile-username');
    if (nameEl) {
      nameEl.textContent = userData.username || 'مستخدم';
      if (admin) {
        nameEl.style.background = 'linear-gradient(135deg,#FFD040,#FF8000)';
        nameEl.style.webkitBackgroundClip = 'text';
        nameEl.style.webkitTextFillColor  = 'transparent';
      }
    }
    _setEl('profile-id', '#' + (userData.id6 || '000000'));
    _setEl('profile-country', (userData.gender === 'male' ? '👦 ' : '👧 ') + (userData.country || ''));
    _setEl('profile-bio-text', userData.bio || 'لا توجد نبذة بعد...');
    _setEl('profile-level-label', 'المستوى ' + level);
    _setEl('profile-xp-label', admin ? 'MAX' : ((userData.xp || 0) % XP_PER_LEVEL) + ' / ' + XP_PER_LEVEL + ' XP');

    var barEl = document.getElementById('profile-level-bar');
    if (barEl) barEl.style.width = progress + '%';

    _setEl('stat-friends',  Object.keys(userData.friends  || {}).length);
    _setEl('stat-messages', userData.totalMessages || 0);
    _setEl('stat-days',     userData.loginDays     || 0);

    var grid = document.getElementById('badges-grid');
    if (grid) {
      grid.innerHTML = '';
      Object.keys(BADGE_DEFS).forEach(function(key) {
        var earned = badges.indexOf(key) >= 0;
        var def = BADGE_DEFS[key];
        var item = document.createElement('div');
        item.className = 'badge-item' + (earned ? '' : ' locked');
        item.innerHTML = buildBadgeSVG(key) + '<span class="badge-name">' + def.name + '</span>';
        grid.appendChild(item);
      });
    }

    var editBioBtn = document.getElementById('btn-edit-bio');
    if (editBioBtn) editBioBtn.onclick = _showEditBio;

    var chgPhotoBtn = document.getElementById('btn-change-photo');
    if (chgPhotoBtn) chgPhotoBtn.onclick = _showChangePhoto;

    var chgUnameBtn = document.getElementById('btn-change-username');
    if (chgUnameBtn) chgUnameBtn.onclick = function() {
      if (!userData.canChangeUsername) return showToast('يمكنك تغيير الاسم مرة واحدة فقط');
      _showChangeUsername();
    };

    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.onclick = function() { auth.signOut(); };
  }

  function _setEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _showChangePhoto() {
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return showToast('الصورة اكبر من 5MB');
      showToast('جار الرفع...');
      _fileToDataURL(file).then(function(dataURL) {
        return _compressImage(dataURL, 200);
      }).then(function(compressed) {
        return db.ref('users/' + _currentUser.uid + '/photoURL').set(compressed).then(function() {
          return db.ref('users/' + _currentUser.uid + '/avatar').set(null);
        });
      }).then(function() {
        showToast('تم تحديث الصورة');
      }).catch(function() {
        showToast('خطا في الرفع');
      });
    };
    fileInput.click();
  }

  function _showEditBio() {
    var textarea = document.getElementById('bio-input');
    if (textarea) textarea.value = _userData.bio || '';
    openModal('modal-edit-bio');
    document.getElementById('btn-save-bio').onclick = async function() {
      var bio = (document.getElementById('bio-input').value || '').trim().slice(0, 150);
      await db.ref('users/' + _currentUser.uid + '/bio').set(bio);
      showToast('تم حفظ النبذة');
      closeModal('modal-edit-bio');
    };
  }

  function _showChangeUsername() {
    openModal('modal-change-username');
    document.getElementById('new-username-input').value = '';
    document.getElementById('btn-save-username').onclick = async function() {
      var uname = (document.getElementById('new-username-input').value || '').trim();
      if (!uname || uname.length < 3) return showToast('الاسم 3 احرف على الاقل');
      if (uname.toLowerCase() === (_userData.username || '').toLowerCase()) return showToast('نفس الاسم الحالي');
      var snap = await db.ref('usernames/' + uname.toLowerCase()).once('value');
      if (snap.exists()) return showToast('الاسم مستخدم');
      var updates = {};
      updates['users/' + _currentUser.uid + '/username']          = uname;
      updates['users/' + _currentUser.uid + '/usernameLower']     = uname.toLowerCase();
      updates['users/' + _currentUser.uid + '/canChangeUsername'] = false;
      updates['usernames/' + (_userData.username || '').toLowerCase()] = null;
      updates['usernames/' + uname.toLowerCase()]                 = _currentUser.uid;
      await db.ref().update(updates);
      showToast('تم تغيير الاسم');
      closeModal('modal-change-username');
    };
  }

  async function viewUserProfile(uid, currentUserUid) {
    try {
      var snap = await db.ref('users/' + uid).once('value');
      var u = snap.val();
      if (!u) return;

      var admin  = isAdmin(uid);
      var level  = admin ? 100 : getLevelFromXP(u.xp || 0);
      var badges = admin ? getAdminBadges() : (u.badges || []);

      var aviEl = document.getElementById('view-profile-avi');
      if (aviEl) renderAvatar(aviEl, u, 80);

      _setEl('view-profile-name',    u.username || '');
      _setEl('view-profile-id',      '#' + (u.id6 || '000000'));
      _setEl('view-profile-level',   'المستوى ' + level);
      _setEl('view-profile-country', (u.gender === 'male' ? '👦 ' : '👧 ') + (u.country || ''));
      _setEl('view-profile-bio', u.bio || '...');

      var onlineEl = document.getElementById('view-profile-online');
      if (onlineEl) {
        if (u.online) { onlineEl.textContent = 'متصل الآن'; onlineEl.style.color = 'var(--online)'; }
        else          { onlineEl.textContent = formatLastSeen(u.lastSeen); onlineEl.style.color = 'var(--text-secondary)'; }
      }

      var badgeRow = document.getElementById('view-profile-badges');
      if (badgeRow) {
        badgeRow.innerHTML = '';
        badges.slice(0, 6).forEach(function(key) {
          var d = document.createElement('div');
          d.innerHTML = buildBadgeSVG(key);
          d.title = (BADGE_DEFS[key] || {}).name || '';
          badgeRow.appendChild(d);
        });
      }

      var actionsEl = document.getElementById('view-profile-actions');
      if (actionsEl) {
        actionsEl.innerHTML = '';
        if (uid !== currentUserUid) {
          var myFriendSnap = await db.ref('users/' + currentUserUid + '/friends/' + uid).once('value');
          if (myFriendSnap.exists()) {
            var chatBtn = document.createElement('button');
            chatBtn.className = 'btn-primary'; chatBtn.style.marginTop = '12px';
            chatBtn.textContent = 'مراسلة';
            chatBtn.onclick = function() {
              closeModal('modal-view-profile');
              if (typeof ChatModule !== 'undefined') ChatModule.openPrivateChat(uid, u);
            };
            actionsEl.appendChild(chatBtn);
          } else {
            var addBtn = document.createElement('button');
            addBtn.className = 'btn-primary'; addBtn.style.marginTop = '12px';
            addBtn.textContent = 'اضافة صديق';
            addBtn.onclick = async function() {
              await FriendsModule.sendRequest(currentUserUid, uid);
              showToast('تم ارسال الطلب');
              closeModal('modal-view-profile');
            };
            actionsEl.appendChild(addBtn);
          }
        }
      }
      openModal('modal-view-profile');
    } catch(e) { console.error('viewUserProfile:', e); }
  }

  async function checkDailyLogin(uid) {
    try {
      var snap = await db.ref('users/' + uid).once('value');
      var u = snap.val();
      if (!u) return;
      if (isAdmin(uid)) {
        await db.ref('users/' + uid).update({
          level: 100, xp: 100 * XP_PER_LEVEL, badges: getAdminBadges(),
          lastLoginDate: new Date().toDateString(),
          loginDays: (u.loginDays || 0) + (u.lastLoginDate === new Date().toDateString() ? 0 : 1),
        });
        return;
      }
      var today = new Date().toDateString();
      if (u.lastLoginDate === today) return;
      var newXP = Math.min((u.xp || 0) + 50, 100 * XP_PER_LEVEL);
      await db.ref('users/' + uid).update({
        xp: newXP, loginDays: (u.loginDays || 0) + 1,
        lastLoginDate: today, level: getLevelFromXP(newXP),
      });
      showToast('+50 XP دخول يومي!');
    } catch(e) { console.error('checkDailyLogin:', e); }
  }

  function startPresenceTracking(uid) {
    var presRef = db.ref('users/' + uid + '/online');
    var seenRef = db.ref('users/' + uid + '/lastSeen');
    presRef.set(true);
    presRef.onDisconnect().set(false);
    seenRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
    var iv = setInterval(async function() {
      try {
        var snap = await db.ref('users/' + uid).once('value');
        var u = snap.val(); if (!u) return;
        var todayKey = new Date().toDateString();
        var presenceToday = u.presenceXPToday === todayKey ? (u.presenceXPCount || 0) : 0;
        if (presenceToday >= 300) return;
        var newXP = Math.min((u.xp || 0) + 1, 100 * XP_PER_LEVEL);
        await db.ref('users/' + uid).update({
          xp: newXP, level: getLevelFromXP(newXP),
          presenceXPToday: todayKey, presenceXPCount: presenceToday + 1,
        });
      } catch(e) {}
    }, 60000);
    return iv;
  }

  return { showSetup, renderProfileTab, viewUserProfile, checkDailyLogin, startPresenceTracking };
})();
