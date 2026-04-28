// ═══════════════════════════════════════
//  APP.JS — Main Router & State Manager
// ═══════════════════════════════════════

/* ── Screen Manager ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = ''; }, 300);
}

/* ── Global State ── */
let _appUser          = null;
let _appUserData      = null;
let _presenceInterval = null;
let _userDataListener = null;

/* ── Boot after DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Always init Auth UI (tabs + buttons work immediately)
  AuthModule.init();

  // Bottom nav
  _initBottomNav();

  // Start Firebase listener only if configured
  if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
    _startAuthListener();
  } else {
    showScreen('screen-auth');
    console.warn('ChatVibe: أضف بيانات Firebase في firebase-config.js');
  }
});

/* ── Bottom Nav ── */
function _initBottomNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ── Firebase Auth Listener ── */
function _startAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      _cleanup();
      showScreen('screen-auth');
      return;
    }
    _appUser = user;
    try {
      const snap = await db.ref('users/' + user.uid).once('value');
      if (!snap.exists()) {
        ProfileModule.showSetup(user);
        db.ref('users/' + user.uid).on('value', profileSnap => {
          if (profileSnap.exists()) {
            db.ref('users/' + user.uid).off('value');
            _bootApp(user, profileSnap.val());
          }
        });
      } else {
        _bootApp(user, snap.val());
      }
    } catch(e) {
      console.error('Auth error:', e);
      showScreen('screen-auth');
    }
  });
}

/* ── Boot App ── */
async function _bootApp(user, userData) {
  _appUser     = user;
  _appUserData = userData;

  if (_userDataListener) db.ref('users/' + user.uid).off('value', _userDataListener);
  _userDataListener = db.ref('users/' + user.uid).on('value', snap => {
    _appUserData = snap.val();
    if (_appUserData) ProfileModule.renderProfileTab(user, _appUserData);
  });

  ChatModule.init(user, userData);
  RoomsModule.init(user, userData);
  FriendsModule.init(user, userData);
  FriendsModule.listenRequestCount(user.uid);
  ProfileModule.renderProfileTab(user, userData);

  await ProfileModule.checkDailyLogin(user.uid);
  _presenceInterval = ProfileModule.startPresenceTracking(user.uid);

  showScreen('screen-app');
}

/* ── Cleanup ── */
function _cleanup() {
  if (_presenceInterval) clearInterval(_presenceInterval);
  if (_userDataListener && _appUser) {
    db.ref('users/' + _appUser.uid).off('value', _userDataListener);
  }
  if (typeof RoomsModule !== 'undefined' && RoomsModule.destroy) RoomsModule.destroy();
  if (typeof FriendsModule !== 'undefined' && FriendsModule.destroy) FriendsModule.destroy();
  _appUser = _appUserData = _presenceInterval = _userDataListener = null;
}
