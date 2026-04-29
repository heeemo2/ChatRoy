// ═══════════════════════════════════════
//  PROFILE.JS
// ═══════════════════════════════════════

var ProfileModule = (function() {

var _currentUser = null;
var _userData    = null;
var _setup = { gender: null, avatar: null, country: null };

/* ══════════════════════════════
SETUP WIZARD
══════════════════════════════ */
function showSetup(user) {
_currentUser = user;
showScreen(‘screen-setup’);
_step1();
}

function _step1() {
_showStep(‘setup-step-1’);
document.querySelectorAll(’.gender-card’).forEach(function(card) {
card.onclick = function() {
document.querySelectorAll(’.gender-card’).forEach(function(c) { c.classList.remove(‘selected’); });
card.classList.add(‘selected’);
_setup.gender = card.dataset.gender;
};
});
document.getElementById(‘btn-setup-next1’).onclick = function() {
if (!_setup.gender) return showToast(‘اختر جنسك أولاً’);
_step2();
};
}

function _step2() {
_showStep(‘setup-step-2’);
var sel = document.getElementById(‘setup-country’);
sel.innerHTML = ‘<option value="">— اختر دولتك —</option>’;
COUNTRIES.forEach(function(c) {
var opt = document.createElement(‘option’);
opt.value = c; opt.textContent = c;
sel.appendChild(opt);
});
document.getElementById(‘btn-setup-next2’).onclick = function() {
_setup.country = sel.value;
if (!_setup.country) return showToast(‘اختر دولتك’);
_step3();
};
document.getElementById(‘btn-setup-back2’).onclick = function() { _step1(); };
}

function _step3() {
_showStep(‘setup-step-3’);
var grid = document.getElementById(‘avatar-grid’);
grid.innerHTML = ‘’;
var list = _setup.gender === ‘male’ ? MALE_AVATARS : FEMALE_AVATARS;
list.forEach(function(emoji) {
var div = document.createElement(‘div’);
div.className = ‘avatar-opt’;
div.textContent = emoji;
div.onclick = function() {
document.querySelectorAll(’.avatar-opt’).forEach(function(a) { a.classList.remove(‘selected’); });
div.classList.add(‘selected’);
_setup.avatar = emoji;
};
grid.appendChild(div);
});
document.getElementById(‘btn-setup-next3’).onclick = function() {
if (!_setup.avatar) return showToast(‘اختر صورة أولاً’);
_step4();
};
document.getElementById(‘btn-setup-back3’).onclick = function() { _step2(); };
}

function _step4() {
*showStep(‘setup-step-4’);
var input = document.getElementById(‘setup-username’);
var btn   = document.getElementById(‘btn-setup-finish’);
btn.onclick = async function() {
var uname = input.value.trim();
if (!uname || uname.length < 3) return showToast(‘الاسم 3 أحرف على الأقل’);
if (uname.length > 20)          return showToast(‘الاسم 20 حرفاً كحد أقصى’);
if (!/^[\u0600-\u06FFa-zA-Z0-9*]+$/.test(uname)) return showToast(‘أحرف، أرقام، _ فقط’);
btn.disabled = true; btn.textContent = ‘جارٍ الحفظ…’;
try {
var snap = await db.ref(‘usernames/’ + uname.toLowerCase()).once(‘value’);
if (snap.exists()) {
showToast(‘الاسم مستخدم، جرب آخر’);
btn.disabled = false; btn.textContent = ‘إنهاء الإعداد’;
return;
}
var uid  = _currentUser.uid;
var id6  = genUID6();
var now  = Date.now();
var data = {
username: uname, usernameLower: uname.toLowerCase(),
avatar: _setup.avatar, gender: _setup.gender, country: _setup.country,
bio: ‘’, level: 0, xp: 0,
loginDays: 0, lastLoginDate: ‘’,
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
updates[‘users/’ + uid] = data;
updates[‘usernames/’ + uname.toLowerCase()] = uid;
await db.ref().update(updates);
showToast(‘مرحباً بك! 🎉’);
} catch(e) {
showToast(‘حدث خطأ، حاول مجدداً’);
btn.disabled = false; btn.textContent = ‘إنهاء الإعداد’;
}
};
document.getElementById(‘btn-setup-back4’).onclick = function() { _step3(); };
}

function _showStep(id) {
document.querySelectorAll(’.setup-step’).forEach(function(s) { s.classList.remove(‘active’); });
document.getElementById(id).classList.add(‘active’);
}

/* ══════════════════════════════
PROFILE TAB
══════════════════════════════ */
function renderProfileTab(user, userData) {
if (!user || !userData) return;
_currentUser = user;
_userData    = userData;

```
var admin    = isAdmin(user.uid);
var level    = admin ? 100 : getLevelFromXP(userData.xp || 0);
var progress = admin ? 100 : getLevelProgress(userData.xp || 0);
var badges   = admin ? getAdminBadges() : (userData.badges || []);

// Avatar (supports photo URL or emoji)
var aviEl = document.getElementById('profile-avi');
if (aviEl) renderAvatar(aviEl, userData.avatar || '👤');

// Level badge
var lvlBadgeEl = document.getElementById('profile-lvl-badge');
if (lvlBadgeEl) lvlBadgeEl.innerHTML = levelBadgeSVG(level);

// Name
var nameEl = document.getElementById('profile-username');
if (nameEl) {
  nameEl.textContent = userData.username || 'مستخدم';
  if (admin) {
    nameEl.style.background = 'linear-gradient(135deg,#FFD040,#FF8000)';
    nameEl.style.webkitBackgroundClip = 'text';
    nameEl.style.webkitTextFillColor  = 'transparent';
  } else {
    nameEl.style.background = '';
    nameEl.style.webkitBackgroundClip = '';
    nameEl.style.webkitTextFillColor  = '';
  }
}

// Top 3 badges next to name
var top3El = document.getElementById('profile-top-badges');
if (top3El) {
  top3El.innerHTML = '';
  var top3 = getTop3Badges(badges);
  top3.forEach(function(key) {
    var d = document.createElement('div');
    d.innerHTML = buildBadgeSVGSmall(key);
    d.title = (BADGE_DEFS[key] || {}).name || '';
    top3El.appendChild(d);
  });
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

// Badges grid
var grid = document.getElementById('badges-grid');
if (grid) {
  grid.innerHTML = '';
  Object.keys(BADGE_DEFS).forEach(function(key) {
    var earned = badges.includes(key);
    var def = BADGE_DEFS[key];
    var item = document.createElement('div');
    item.className = 'badge-item' + (earned ? '' : ' locked');
    item.innerHTML = buildBadgeSVG(key) + '<span class="badge-name">' + def.name + '</span>';
    grid.appendChild(item);
  });
}

// Photo change button
var changePhotoBtn = document.getElementById('btn-change-photo');
if (changePhotoBtn) {
  changePhotoBtn.onclick = function() {
    document.getElementById('profile-photo-input').click();
  };
}
// Profile avatar click also opens photo picker
if (aviEl) {
  aviEl.onclick = function() {
    document.getElementById('profile-photo-input').click();
  };
}
// Profile photo hint
var hint = document.querySelector('.profile-avi-edit-hint');
if (hint) {
  hint.onclick = function() {
    document.getElementById('profile-photo-input').click();
  };
}

// File input for profile photo
var photoInput = document.getElementById('profile-photo-input');
if (photoInput) {
  photoInput.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      showToast('جارٍ رفع الصورة...');
      var dataURL = await fileToDataURL(file);
      var resized = await resizeImage(dataURL, 400, 400);
      await db.ref('users/' + _currentUser.uid + '/avatar').set(resized);
      renderAvatar(aviEl, resized);
      showToast('تم تحديث الصورة ✓');
    } catch(err) {
      showToast('فشل رفع الصورة');
      console.error('Photo upload:', err);
    }
    photoInput.value = '';
  };
}

// Edit bio
var editBioBtn = document.getElementById('btn-edit-bio');
if (editBioBtn) editBioBtn.onclick = _showEditBio;

// Change username
var chgUnameBtn = document.getElementById('btn-change-username');
if (chgUnameBtn) {
  chgUnameBtn.onclick = function() {
    if (!userData.canChangeUsername) return showToast('يمكنك تغيير الاسم مرة واحدة فقط');
    _showChangeUsername();
  };
}

// Logout
var logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) logoutBtn.onclick = function() { auth.signOut(); };
```

}

function _setEl(id, val) {
var el = document.getElementById(id);
if (el) el.textContent = val;
}

/* ── Edit Bio ── */
function _showEditBio() {
var textarea = document.getElementById(‘bio-input’);
if (textarea) textarea.value = _userData.bio || ‘’;
openModal(‘modal-edit-bio’);
document.getElementById(‘btn-save-bio’).onclick = async function() {
var bio = (document.getElementById(‘bio-input’).value || ‘’).trim().slice(0, 150);
await db.ref(‘users/’ + _currentUser.uid + ‘/bio’).set(bio);
showToast(‘تم حفظ النبذة ✓’);
closeModal(‘modal-edit-bio’);
};
}

/* ── Change Username ── */
function _showChangeUsername() {
openModal(‘modal-change-username’);
document.getElementById(‘new-username-input’).value = ‘’;
document.getElementById(‘btn-save-username’).onclick = async function() {
var uname = (document.getElementById(‘new-username-input’).value || ‘’).trim();
if (!uname || uname.length < 3) return showToast(‘الاسم 3 أحرف على الأقل’);
if (uname.toLowerCase() === (_userData.username || ‘’).toLowerCase()) return showToast(‘نفس الاسم الحالي’);
var snap = await db.ref(‘usernames/’ + uname.toLowerCase()).once(‘value’);
if (snap.exists()) return showToast(‘الاسم مستخدم’);
var updates = {};
updates[‘users/’ + _currentUser.uid + ‘/username’]          = uname;
updates[‘users/’ + _currentUser.uid + ‘/usernameLower’]     = uname.toLowerCase();
updates[‘users/’ + _currentUser.uid + ‘/canChangeUsername’] = false;
updates[‘usernames/’ + (_userData.username || ‘’).toLowerCase()] = null;
updates[‘usernames/’ + uname.toLowerCase()]                 = _currentUser.uid;
await db.ref().update(updates);
showToast(‘تم تغيير الاسم ✓’);
closeModal(‘modal-change-username’);
};
}

/* ══════════════════════════════
VIEW OTHER USER PROFILE
— slide-up modal from bottom
══════════════════════════════ */
async function viewUserProfile(uid, currentUserUid) {
try {
var snap = await db.ref(‘users/’ + uid).once(‘value’);
var u = snap.val();
if (!u) return;

```
  var admin  = isAdmin(uid);
  var level  = admin ? 100 : getLevelFromXP(u.xp || 0);
  var badges = admin ? getAdminBadges() : (u.badges || []);

  // Avatar
  var aviEl = document.getElementById('view-profile-avi');
  if (aviEl) renderAvatar(aviEl, u.avatar || '👤');

  _setEl('view-profile-name',    u.username || '');
  _setEl('view-profile-id',      '#' + (u.id6 || '000000'));
  _setEl('view-profile-level',   'المستوى ' + level);
  _setEl('view-profile-country', (u.gender === 'male' ? '👦 ' : '👧 ') + (u.country || ''));
  _setEl('view-profile-bio',     u.bio || '...');

  var onlineEl = document.getElementById('view-profile-online');
  if (onlineEl) {
    if (u.online) { onlineEl.textContent = '🟢 متصل الآن'; onlineEl.style.color = 'var(--online)'; }
    else          { onlineEl.textContent = '⚫ ' + formatLastSeen(u.lastSeen); onlineEl.style.color = 'var(--text-secondary)'; }
  }

  // Top 3 badges
  var top3El = document.getElementById('view-profile-top-badges');
  if (top3El) {
    top3El.innerHTML = '';
    var top3 = getTop3Badges(badges);
    top3.forEach(function(key) {
      var d = document.createElement('div');
      d.innerHTML = buildBadgeSVGSmall(key);
      d.title = (BADGE_DEFS[key] || {}).name || '';
      top3El.appendChild(d);
    });
  }

  // All badges row (up to 6)
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

  // Actions
  var actionsEl = document.getElementById('view-profile-actions');
  if (actionsEl) {
    actionsEl.innerHTML = '';
    if (uid !== currentUserUid) {
      var myFriendSnap = await db.ref('users/' + currentUserUid + '/friends/' + uid).once('value');
      if (myFriendSnap.exists()) {
        var btn = document.createElement('button');
        btn.className = 'btn-primary'; btn.style.marginTop = '12px';
        btn.textContent = '💬 مراسلة';
        btn.onclick = function() {
          closeModal('modal-view-profile');
          if (typeof ChatModule !== 'undefined') ChatModule.openPrivateChat(uid, u);
        };
        actionsEl.appendChild(btn);
      } else {
        var btn2 = document.createElement('button');
        btn2.className = 'btn-primary'; btn2.style.marginTop = '12px';
        btn2.textContent = '➕ إضافة صديق';
        btn2.onclick = async function() {
          await FriendsModule.sendRequest(currentUserUid, uid);
          showToast('تم إرسال طلب الصداقة ✓');
          closeModal('modal-view-profile');
        };
        actionsEl.appendChild(btn2);
      }
    }
  }

  openModal('modal-view-profile');
} catch(e) { console.error('viewUserProfile:', e); }
```

}

/* ── Daily login XP + Admin upgrade ── */
async function checkDailyLogin(uid) {
try {
var snap = await db.ref(‘users/’ + uid).once(‘value’);
var u = snap.val();
if (!u) return;

```
  if (isAdmin(uid)) {
    var adminBadges = getAdminBadges();
    var maxXP = 100 * XP_PER_LEVEL;
    var updates = {
      level: 100, xp: maxXP, badges: adminBadges,
      lastLoginDate: new Date().toDateString(),
      loginDays: (u.loginDays || 0) + (u.lastLoginDate === new Date().toDateString() ? 0 : 1),
    };
    await db.ref('users/' + uid).update(updates);
    return;
  }

  var today = new Date().toDateString();
  if (u.lastLoginDate === today) return;
  var newXP = Math.min((u.xp || 0) + 50, 100 * XP_PER_LEVEL);
  await db.ref('users/' + uid).update({
    xp: newXP,
    loginDays: (u.loginDays || 0) + 1,
    lastLoginDate: today,
    level: getLevelFromXP(newXP),
  });
  showToast('🎁 +50 XP دخول يومي!');
} catch(e) { console.error('checkDailyLogin:', e); }
```

}

/* ── Presence tracking ── */
function startPresenceTracking(uid) {
var presRef = db.ref(‘users/’ + uid + ‘/online’);
var seenRef = db.ref(‘users/’ + uid + ‘/lastSeen’);
presRef.set(true);
presRef.onDisconnect().set(false);
seenRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

```
var iv = setInterval(async function() {
  try {
    var snap = await db.ref('users/' + uid).once('value');
    var u = snap.val();
    if (!u) return;
    var todayKey = new Date().toDateString();
    var presenceToday = u.presenceXPToday === todayKey ? (u.presenceXPCount || 0) : 0;
    if (presenceToday >= 300) return;
    var newXP = Math.min((u.xp || 0) + 1, 100 * XP_PER_LEVEL);
    await db.ref('users/' + uid).update({
      xp: newXP, level: getLevelFromXP(newXP),
      presenceXPToday: todayKey,
      presenceXPCount: presenceToday + 1,
    });
  } catch(e) {}
}, 60000);
return iv;
```

}

return {
showSetup: showSetup,
renderProfileTab: renderProfileTab,
viewUserProfile: viewUserProfile,
checkDailyLogin: checkDailyLogin,
startPresenceTracking: startPresenceTracking,
};
})();
