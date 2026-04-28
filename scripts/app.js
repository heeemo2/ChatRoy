// ═══════════════════════════════════════
//  APP.JS — Main Router & State Manager
// ═══════════════════════════════════════

/* ── Screen Manager ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  // reset scroll
  if (el) el.scrollTop = 0;
}

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  setTimeout(() => { m.style.display = ''; }, 300);
}

/* ── Global State ── */
let _appUser          = null;
let _appUserData      = null;
let _presenceInterval = null;
let _userDataListener = null;
let _appBooted        = false;

/* ── DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {

  // Modal backdrop close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Init auth UI
  AuthModule.init();

  // Init bottom nav
  _initBottomNav();

  // Start Firebase or show auth
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

      // Reload data when switching tabs
      if (tab === 'friends' && _appUser) FriendsModule.loadFriends();
      if (tab === 'rooms'   && _appUser) RoomsModule.listenRooms();
    });
  });
}

/* ── Firebase Auth Listener ── */
function _startAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      _cleanup();
      showScreen('screen-auth');
      _appBooted = false;
      return;
    }

    _appUser = user;

    try {
      const snap = await db.ref('users/' + user.uid).once('value');

      if (!snap.exists()) {
        // First time — show setup wizard
        ProfileModule.showSetup(user);
        // Watch for profile creation completion
        const setupWatcher = db.ref('users/' + user.uid).on('value', profileSnap => {
          if (profileSnap.exists()) {
            db.ref('users/' + user.uid).off('value', setupWatcher);
            _bootApp(user, profileSnap.val());
          }
        });
      } else {
        _bootApp(user, snap.val());
      }
    } catch(e) {
      console.error('Auth state error:', e);
      showScreen('screen-auth');
    }
  });
}

/* ── Boot App ── */
async function _bootApp(user, userData) {
  _appUser     = user;
  _appUserData = userData;

  // Live user data listener — updates profile + badges in real time
  if (_userDataListener) {
    db.ref('users/' + user.uid).off('value', _userDataListener);
  }
  _userDataListener = db.ref('users/' + user.uid).on('value', snap => {
    const fresh = snap.val();
    if (!fresh) return;
    _appUserData = fresh;
    ProfileModule.renderProfileTab(user, fresh);
  });

  // Init all modules
  try { ChatModule.init(user, userData); }    catch(e) { console.error('ChatModule:', e); }
  try { RoomsModule.init(user, userData); }   catch(e) { console.error('RoomsModule:', e); }
  try { FriendsModule.init(user, userData); } catch(e) { console.error('FriendsModule:', e); }
  try { FriendsModule.listenRequestCount(user.uid); } catch(e) {}
  try { ProfileModule.renderProfileTab(user, userData); } catch(e) { console.error('Profile:', e); }

  // XP & presence
  try { await ProfileModule.checkDailyLogin(user.uid); } catch(e) {}
  try { _presenceInterval = ProfileModule.startPresenceTracking(user.uid); } catch(e) {}

  // Reset nav to rooms tab
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const roomsNav = document.querySelector('.nav-btn[data-tab="rooms"]');
  if (roomsNav) roomsNav.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const roomsPanel = document.getElementById('tab-rooms');
  if (roomsPanel) roomsPanel.classList.add('active');

  _appBooted = true;
  showScreen('screen-app');
}

/* ── Cleanup on logout ── */
function _cleanup() {
  if (_presenceInterval) {
    clearInterval(_presenceInterval);
    _presenceInterval = null;
  }
  if (_userDataListener && _appUser) {
    try { db.ref('users/' + _appUser.uid).off('value', _userDataListener); } catch(e) {}
    _userDataListener = null;
  }
  try { if (RoomsModule.destroy)   RoomsModule.destroy(); }   catch(e) {}
  try { if (FriendsModule.destroy) FriendsModule.destroy(); } catch(e) {}

  // Clear online status
  if (_appUser) {
    try {
      db.ref('users/' + _appUser.uid + '/online').set(false);
      db.ref('users/' + _appUser.uid + '/lastSeen')
        .set(firebase.database.ServerValue.TIMESTAMP);
    } catch(e) {}
  }

  _appUser = _appUserData = null;
  _appBooted = false;
}
