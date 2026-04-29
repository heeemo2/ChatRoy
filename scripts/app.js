// ═══════════════════════════════════════
//  APP.JS — Main Router & State Manager
// ═══════════════════════════════════════

/* ── Screen Manager ── */
function showScreen(id) {
document.querySelectorAll(’.screen’).forEach(function(s) { s.classList.remove(‘active’); });
var el = document.getElementById(id);
if (el) el.classList.add(‘active’);
}

function openModal(id) {
var m = document.getElementById(id);
if (!m) return;
m.style.display = ‘flex’;
requestAnimationFrame(function() { m.classList.add(‘open’); });
}

function closeModal(id) {
var m = document.getElementById(id);
if (!m) return;
m.classList.remove(‘open’);
setTimeout(function() { m.style.display = ‘’; }, 300);
}

/* ── Global State ── */
var _appUser          = null;
var _appUserData      = null;
var _presenceInterval = null;
var _userDataListener = null;

/* ── DOM Ready ── */
document.addEventListener(‘DOMContentLoaded’, function() {

// Modal backdrop close
document.querySelectorAll(’.modal-overlay’).forEach(function(overlay) {
overlay.addEventListener(‘click’, function(e) {
if (e.target === overlay) closeModal(overlay.id);
});
});

// Init auth
if (typeof AuthModule !== ‘undefined’) AuthModule.init();

// Init bottom nav
_initBottomNav();

// Start Firebase
if (typeof firebase !== ‘undefined’ &&
typeof FIREBASE_READY !== ‘undefined’ &&
FIREBASE_READY === true) {
_startAuthListener();
} else {
showScreen(‘screen-auth’);
}

});

/* ── Bottom Nav ── */
function _initBottomNav() {
document.querySelectorAll(’.nav-btn’).forEach(function(btn) {
btn.addEventListener(‘click’, function() {
document.querySelectorAll(’.nav-btn’).forEach(function(b) { b.classList.remove(‘active’); });
btn.classList.add(‘active’);
var tab = btn.dataset.tab;
document.querySelectorAll(’.tab-panel’).forEach(function(p) { p.classList.remove(‘active’); });
var panel = document.getElementById(‘tab-’ + tab);
if (panel) panel.classList.add(‘active’);
if (tab === ‘friends’ && _appUser && typeof FriendsModule !== ‘undefined’) {
FriendsModule.loadFriends();
}
});
});
}

/* ── Firebase Auth Listener ── */
function _startAuthListener() {
auth.onAuthStateChanged(function(user) {
if (!user) {
_cleanup();
showScreen(‘screen-auth’);
return;
}
_appUser = user;
db.ref(‘users/’ + user.uid).once(‘value’).then(function(snap) {
if (!snap.exists()) {
if (typeof ProfileModule !== ‘undefined’) ProfileModule.showSetup(user);
var watcher = db.ref(‘users/’ + user.uid).on(‘value’, function(profileSnap) {
if (profileSnap.exists()) {
db.ref(‘users/’ + user.uid).off(‘value’, watcher);
_bootApp(user, profileSnap.val());
}
});
} else {
_bootApp(user, snap.val());
}
}).catch(function(e) {
console.error(‘DB read error:’, e);
showScreen(‘screen-auth’);
});
});
}

/* ── Boot App ── */
function _bootApp(user, userData) {
_appUser     = user;
_appUserData = userData;

if (_userDataListener) {
db.ref(‘users/’ + user.uid).off(‘value’, _userDataListener);
}
_userDataListener = db.ref(‘users/’ + user.uid).on(‘value’, function(snap) {
var fresh = snap.val();
if (!fresh) return;
_appUserData = fresh;
if (typeof ProfileModule !== ‘undefined’) ProfileModule.renderProfileTab(user, fresh);
});

try { ChatModule.init(user, userData); }    catch(e) { console.error(‘Chat:’, e); }
try { RoomsModule.init(user, userData); }   catch(e) { console.error(‘Rooms:’, e); }
try { FriendsModule.init(user, userData); } catch(e) { console.error(‘Friends:’, e); }
try { FriendsModule.listenRequestCount(user.uid); } catch(e) {}
try { ProfileModule.renderProfileTab(user, userData); } catch(e) { console.error(‘Profile:’, e); }

ProfileModule.checkDailyLogin(user.uid).catch(function() {});
try { _presenceInterval = ProfileModule.startPresenceTracking(user.uid); } catch(e) {}

// Reset to rooms tab
document.querySelectorAll(’.nav-btn’).forEach(function(b) { b.classList.remove(‘active’); });
var roomsNav = document.querySelector(’.nav-btn[data-tab=“rooms”]’);
if (roomsNav) roomsNav.classList.add(‘active’);

document.querySelectorAll(’.tab-panel’).forEach(function(p) { p.classList.remove(‘active’); });
var roomsPanel = document.getElementById(‘tab-rooms’);
if (roomsPanel) roomsPanel.classList.add(‘active’);

showScreen(‘screen-app’);
}

/* ── Cleanup on logout ── */
function _cleanup() {
if (_presenceInterval) { clearInterval(_presenceInterval); _presenceInterval = null; }
if (_userDataListener && _appUser) {
try { db.ref(‘users/’ + _appUser.uid).off(‘value’, _userDataListener); } catch(e) {}
_userDataListener = null;
}
try { RoomsModule.destroy(); }   catch(e) {}
try { FriendsModule.destroy(); } catch(e) {}
if (_appUser) {
try { db.ref(‘users/’ + _appUser.uid + ‘/online’).set(false); } catch(e) {}
}
_appUser = null;
_appUserData = null;
}
