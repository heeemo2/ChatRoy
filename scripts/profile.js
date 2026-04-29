// ═══════════════════════════════════════
//  PROFILE.JS — with photo upload support
// ═══════════════════════════════════════

const ProfileModule = (() => {

let _currentUser = null;
let _userData    = null;
let _setup = { gender: null, avatar: null, country: null, photoURL: null };

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
document.querySelectorAll(’.gender-card’).forEach(card => {
card.onclick = () => {
document.querySelectorAll(’.gender-card’).forEach(c => c.classList.remove(‘selected’));
card.classList.add(‘selected’);
_setup.gender = card.dataset.gender;
};
});
document.getElementById(‘btn-setup-next1’).onclick = () => {
if (!_setup.gender) return showToast(‘اختر جنسك أولاً’);
_step2();
};
}

function _step2() {
_showStep(‘setup-step-2’);
const sel = document.getElementById(‘setup-country’);
sel.innerHTML = ‘<option value="">— اختر دولتك —</option>’;
COUNTRIES.forEach(c => {
const opt = document.createElement(‘option’);
opt.value = c; opt.textContent = c;
sel.appendChild(opt);
});
document.getElementById(‘btn-setup-next2’).onclick = () => {
_setup.country = sel.value;
if (!_setup.country) return showToast(‘اختر دولتك’);
_step3();
};
document.getElementById(‘btn-setup-back2’).onclick = () => _step1();
}

function _step3() {
_showStep(‘setup-step-3’);
const grid = document.getElementById(‘avatar-grid’);
grid.innerHTML = ‘’;
const list = _setup.gender === ‘male’ ? MALE_AVATARS : FEMALE_AVATARS;

```
// Photo upload button first
const uploadDiv = document.createElement('div');
uploadDiv.className = 'avatar-opt upload-opt';
uploadDiv.innerHTML = '<span style="font-size:22px">📷</span><span style="font-size:9px;margin-top:2px;color:var(--text-secondary)">صورتي</span>';
uploadDiv.style.flexDirection = 'column';
uploadDiv.style.gap = '2px';
uploadDiv.onclick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return showToast('الصورة أكبر من 2MB');
    const dataURL = await _fileToDataURL(file);
    const compressed = await _compressImage(dataURL, 200);
    _setup.photoURL = compressed;
    _setup.avatar   = null;
    document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
    uploadDiv.classList.add('selected');
    uploadDiv.innerHTML = `<img src="${compressed}" style="width:48px;height:48px;border-radius:50%;object-fit:cover"/>`;
    showToast('تم اختيار الصورة ✓');
  };
  input.click();
};
grid.appendChild(uploadDiv);

list.forEach(emoji => {
  const div = document.createElement('div');
  div.className = 'avatar-opt';
  div.textContent = emoji;
  div.onclick = () => {
    document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
    div.classList.add('selected');
    _setup.avatar   = emoji;
    _setup.photoURL = null;
  };
  grid.appendChild(div);
});
document.getElementById('btn-setup-next3').onclick = () => {
  if (!_setup.avatar && !_setup.photoURL) return showToast('اختر صورة أولاً');
  _step4();
};
document.getElementById('btn-setup-back3').onclick = () => _step2();
```

}

function _step4() {
_showStep(‘setup-step-4’);
const input = document.getElementById(‘setup-username’);
const btn   = document.getElementById(‘btn-setup-finish’);

```
btn.onclick = async () => {
  const uname = input.value.trim();
  if (!uname || uname.length < 3) return showToast('الاسم 3 أحرف على الأقل');
  if (uname.length > 20)          return showToast('الاسم 20 حرفاً كحد أقصى');
  if (!/^[\u0600-\u06FFa-zA-Z0-9_]+$/.test(uname)) return showToast('أحرف، أرقام، _ فقط');

  btn.disabled = true; btn.textContent = 'جارٍ الحفظ...';
  try {
    const snap = await db.ref('usernames/' + uname.toLowerCase()).once('value');
    if (snap.exists()) {
      showToast('الاسم مستخدم، جرب آخر');
      btn.disabled = false; btn.textContent = 'إنهاء الإعداد';
      return;
    }
    const uid  = _currentUser.uid;
    const id6  = genUID6();
    const now  = Date.now();
    const data = {
      username: uname, usernameLower: uname.toLowerCase(),
      avatar:   _setup.photoURL ? null  : (_setup.avatar || '👤'),
      photoURL: _setup.photoURL || null,
      gender: _setup.gender, country: _setup.country,
      bio: '', level: 0, xp: 0,
      loginDays: 0, lastLoginDate: '',
      totalMessages: 0,
      online: true, lastSeen: now, createdAt: now,
      id6, canChangeUsername: true,
      friends: {}, requests: {}, badges: [],
    };
    if (isAdmin(uid)) {
      data.badges = getAdminBadges();
      data.xp     = 100 * XP_PER_LEVEL;
      data.level  = 100;
    }
    const updates = {};
    updates['users/' + uid] = data;
    updates['usernames/' + uname.toLowerCase()] = uid;
    await db.ref().update(updates);
    showToast('مرحباً بك! 🎉');
  } catch(e) {
    showToast('حدث خطأ، حاول مجدداً');
    btn.disabled = false; btn.textContent = 'إنهاء الإعداد';
  }
};
document.getElementById('btn-setup-back4').onclick = () => _step3();
```

}

function _showStep(id) {
document.querySelectorAll(’.setup-step’).forEach(s => s.classList.remove(‘active’));
document.getElementById(id).classList.add(‘active’);
}

/* ══════════════════════════════
IMAGE UTILITIES
══════════════════════════════ */
function _fileToDataURL(file) {
return new Promise((res, rej) => {
const r = new FileReader();
r.onload  = e => res(e.target.result);
r.onerror = rej;
r.readAsDataURL(file);
});
}

function _compressImage(dataURL, maxDim = 200) {
return new Promise(res => {
const img = new Image();
img.onload = () => {
const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
const w = Math.round(img.width  * ratio);
const h = Math.round(img.height * ratio);
const canvas = document.createElement(‘canvas’);
canvas.width = w; canvas.height = h;
canvas.getContext(‘2d’).drawImage(img, 0, 0, w, h);
res(canvas.toDataURL(‘image/jpeg’, 0.75));
};
img.src = dataURL;
});
}

/* ══════════════════════════════
AVATAR RENDER HELPER (global)
══════════════════════════════ */
window.renderAvatar = function(container, userData, size = 46) {
if (!container) return;
if (userData && userData.photoURL) {
container.innerHTML = `<img src="${userData.photoURL}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover"/>`;
} else {
container.textContent = (userData && userData.avatar) ? userData.avatar : ‘👤’;
container.style.fontSize = Math.round(size * 0.55) + ‘px’;
}
};

/* ══════════════════════════════
PROFILE TAB
══════════════════════════════ */
function renderProfileTab(user, userData) {
if (!user || !userData) return;
_currentUser = user;
_userData    = userData;

```
const admin    = isAdmin(user.uid);
const level    = admin ? 100 : getLevelFromXP(userData.xp || 0);
const progress = admin ? 100 : getLevelProgress(userData.xp || 0);
const badges   = admin ? getAdminBadges() : (userData.badges || []);

// Avatar / photo
const aviEl = document.getElementById('profile-avi');
if (aviEl) renderAvatar(aviEl, userData, 86);

// Level badge
const lvlBadgeEl = document.getElementById('profile-lvl-badge');
if (lvlBadgeEl) lvlBadgeEl.innerHTML = levelBadgeSVG(level);

// Name
const nameEl = document.getElementById('profile-username');
if (nameEl) {
  nameEl.textContent = userData.username || 'مستخدم';
  if (admin) {
    nameEl.style.background = 'linear-gradient(135deg,#FFD040,#FF8000)';
    nameEl.style.webkitBackgroundClip = 'text';
    nameEl.style.webkitTextFillColor  = 'transparent';
  }
}
_setEl('profile-id', '#' + (userData.id6 || '000000'));
_setEl('profile-country',
  (userData.gender === 'male' ? '👦 ' : '👧 ') + (userData.country || ''));
_setEl('profile-bio-text', userData.bio || 'لا توجد نبذة بعد...');

_setEl('profile-level-label', 'المستوى ' + level);
_setEl('profile-xp-label',
  admin ? 'MAX' : ((userData.xp || 0) % XP_PER_LEVEL) + ' / ' + XP_PER_LEVEL + ' XP');
const barEl = document.getElementById('profile-level-bar');
if (barEl) barEl.style.width = progress + '%';

_setEl('stat-friends',  Object.keys(userData.friends  || {}).length);
_setEl('stat-messages', userData.totalMessages || 0);
_setEl('stat-days',     userData.loginDays     || 0);

// Badges grid
const grid = document.getElementById('badges-grid');
if (grid) {
  grid.innerHTML = '';
  Object.keys(BADGE_DEFS).forEach(key => {
    const earned = badges.includes(key);
    const def = BADGE_DEFS[key];
    const item = document.createElement('div');
    item.className = 'badge-item' + (earned ? '' : ' locked');
    item.innerHTML = buildBadgeSVG(key) +
      '<span class="badge-name">' + def.name + '</span>';
    grid.appendChild(item);
  });
}

// Action buttons
const editBioBtn = document.getElementById('btn-edit-bio');
if (editBioBtn) editBioBtn.onclick = _showEditBio;

const chgPhotoBtn = document.getElementById('btn-change-photo');
if (chgPhotoBtn) chgPhotoBtn.onclick = _showChangePhoto;

const chgUnameBtn = document.getElementById('btn-change-username');
if (chgUnameBtn) chgUnameBtn.onclick = () => {
  if (!userData.canChangeUsername) return showToast('يمكنك تغيير الاسم مرة واحدة فقط');
  _showChangeUsername();
};

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) logoutBtn.onclick = () => auth.signOut();
```

}

function _setEl(id, val) {
const el = document.getElementById(id);
if (el) el.textContent = val;
}

/* ── Change Photo ── */
function _showChangePhoto() {
const input = document.createElement(‘input’);
input.type = ‘file’;
input.accept = ’image/*’;
input.onchange = async (e) => {
const file = e.target.files[0];
if (!file) return;
if (file.size > 5 * 1024 * 1024) return showToast(‘الصورة أكبر من 5MB’);
showToast(‘جارٍ الرفع…’);
try {
const dataURL    = await _fileToDataURL(file);
const compressed = await _compressImage(dataURL, 200);
await db.ref(‘users/’ + _currentUser.uid + ‘/photoURL’).set(compressed);
await db.ref(‘users/’ + _currentUser.uid + ‘/avatar’).set(null);
showToast(‘تم تحديث الصورة ✓’);
} catch(err) {
showToast(‘خطأ في الرفع’);
}
};
input.click();
}

/* ── Edit Bio ── */
function _showEditBio() {
const textarea = document.getElementById(‘bio-input’);
if (textarea) textarea.value = _userData.bio || ‘’;
openModal(‘modal-edit-bio’);
document.getElementById(‘btn-save-bio’).onclick = async () => {
const bio = (document.getElementById(‘bio-input’).value || ‘’).trim().slice(0, 150);
await db.ref(‘users/’ + _currentUser.uid + ‘/bio’).set(bio);
showToast(‘تم حفظ النبذة ✓’);
closeModal(‘modal-edit-bio’);
};
}

/* ── Change Username ── */
function _showChangeUsername() {
openModal(‘modal-change-username’);
document.getElementById(‘new-username-input’).value = ‘’;
document.getElementById(‘btn-save-username’).onclick = async () => {
const uname = (document.getElementById(‘new-username-input’).value || ‘’).trim();
if (!uname || uname.length < 3) return showToast(‘الاسم 3 أحرف على الأقل’);
if (uname.toLowerCase() === (_userData.username || ‘’).toLowerCase())
return showToast(‘نفس الاسم الحالي’);
const snap = await db.ref(‘usernames/’ + uname.toLowerCase()).once(‘value’);
if (snap.exists()) return showToast(‘الاسم مستخدم’);
const updates = {};
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
══════════════════════════════ */
async function viewUserProfile(uid, currentUserUid) {
try {
const snap = await db.ref(‘users/’ + uid).once(‘value’);
const u = snap.val();
if (!u) return;

```
  const admin  = isAdmin(uid);
  const level  = admin ? 100 : getLevelFromXP(u.xp || 0);
  const badges = admin ? getAdminBadges() : (u.badges || []);

  // Avatar
  const aviEl = document.getElementById('view-profile-avi');
  if (aviEl) renderAvatar(aviEl, u, 80);

  _setEl('view-profile-name',    u.username || '');
  _setEl('view-profile-id',      '#' + (u.id6 || '000000'));
  _setEl('view-profile-level',   'المستوى ' + level);
  _setEl('view-profile-country',
    (u.gender === 'male' ? '👦 ' : '👧 ') + (u.country || ''));
  _setEl('view-profile-bio', u.bio || '...');

  const onlineEl = document.getElementById('view-profile-online');
  if (onlineEl) {
    if (u.online) { onlineEl.textContent = '🟢 متصل الآن'; onlineEl.style.color = 'var(--online)'; }
    else          { onlineEl.textContent = '⚫ ' + formatLastSeen(u.lastSeen); onlineEl.style.color = 'var(--text-secondary)'; }
  }

  const badgeRow = document.getElementById('view-profile-badges');
  if (badgeRow) {
    badgeRow.innerHTML = '';
    badges.slice(0, 6).forEach(key => {
      const d = document.createElement('div');
      d.innerHTML = buildBadgeSVG(key);
      d.title = (BADGE_DEFS[key] || {}).name || '';
      badgeRow.appendChild(d);
    });
  }

  const actionsEl = document.getElementById('view-profile-actions');
  if (actionsEl) {
    actionsEl.innerHTML = '';
    if (uid !== currentUserUid) {
      const myFriendSnap = await db.ref('users/' + currentUserUid + '/friends/' + uid).once('value');
      if (myFriendSnap.exists()) {
        const btn = document.createElement('button');
        btn.className = 'btn-primary'; btn.style.marginTop = '12px';
        btn.textContent = '💬 مراسلة';
        btn.onclick = () => {
          closeModal('modal-view-profile');
          if (typeof ChatModule !== 'undefined') ChatModule.openPrivateChat(uid, u);
        };
        actionsEl.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn-primary'; btn.style.marginTop = '12px';
        btn.textContent = '➕ إضافة صديق';
        btn.onclick = async () => {
          await FriendsModule.sendRequest(currentUserUid, uid);
          showToast('تم إرسال طلب الصداقة ✓');
          closeModal('modal-view-profile');
        };
        actionsEl.appendChild(btn);
      }
    }
  }
  openModal('modal-view-profile');
} catch(e) { console.error('viewUserProfile:', e); }
```

}

/* ── Daily login XP ── */
async function checkDailyLogin(uid) {
try {
const snap = await db.ref(‘users/’ + uid).once(‘value’);
const u = snap.val();
if (!u) return;
if (isAdmin(uid)) {
const adminBadges = getAdminBadges();
const maxXP = 100 * XP_PER_LEVEL;
const updates = {
level: 100, xp: maxXP, badges: adminBadges,
lastLoginDate: new Date().toDateString(),
loginDays: (u.loginDays || 0) + (u.lastLoginDate === new Date().toDateString() ? 0 : 1),
};
await db.ref(‘users/’ + uid).update(updates);
return;
}
const today = new Date().toDateString();
if (u.lastLoginDate === today) return;
const newXP = Math.min((u.xp || 0) + 50, 100 * XP_PER_LEVEL);
await db.ref(‘users/’ + uid).update({
xp: newXP, loginDays: (u.loginDays || 0) + 1,
lastLoginDate: today, level: getLevelFromXP(newXP),
});
showToast(‘🎁 +50 XP دخول يومي!’);
} catch(e) { console.error(‘checkDailyLogin:’, e); }
}

/* ── Presence ── */
function startPresenceTracking(uid) {
const presRef = db.ref(‘users/’ + uid + ‘/online’);
const seenRef = db.ref(‘users/’ + uid + ‘/lastSeen’);
presRef.set(true);
presRef.onDisconnect().set(false);
seenRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
const iv = setInterval(async () => {
try {
const snap = await db.ref(‘users/’ + uid).once(‘value’);
const u = snap.val(); if (!u) return;
const todayKey = new Date().toDateString();
const presenceToday = u.presenceXPToday === todayKey ? (u.presenceXPCount || 0) : 0;
if (presenceToday >= 300) return;
const newXP = Math.min((u.xp || 0) + 1, 100 * XP_PER_LEVEL);
await db.ref(‘users/’ + uid).update({
xp: newXP, level: getLevelFromXP(newXP),
presenceXPToday: todayKey, presenceXPCount: presenceToday + 1,
});
} catch(e) {}
}, 60000);
return iv;
}

return { showSetup, renderProfileTab, viewUserProfile, checkDailyLogin, startPresenceTracking };
})();
