// ═══════════════════════════════════════
//  AUTH.JS
// ═══════════════════════════════════════

var AuthModule = (function() {

function init() {
_bindTabs();
_bindForms();
_bindSocial();
}

function _bindTabs() {
document.querySelectorAll(’.auth-tab’).forEach(function(btn) {
btn.addEventListener(‘click’, function() {
document.querySelectorAll(’.auth-tab’).forEach(function(b) { b.classList.remove(‘active’); });
btn.classList.add(‘active’);
document.querySelectorAll(’.auth-form’).forEach(function(f) { f.classList.add(‘hidden’); });
var form = document.getElementById(‘form-’ + btn.dataset.tab);
if (form) form.classList.remove(‘hidden’);
_clearError();
});
});
}

function _isFirebaseReady() {
try { return (typeof FIREBASE_READY !== ‘undefined’ && FIREBASE_READY === true); }
catch(e) { return false; }
}

function _bindForms() {
document.getElementById(‘btn-login’).addEventListener(‘click’, async function() {
if (!_isFirebaseReady()) return _showError(‘⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js’);
var email = document.getElementById(‘login-email’).value.trim();
var pass  = document.getElementById(‘login-pass’).value;
if (!email || !pass) return _showError(‘يرجى ملء جميع الحقول’);
_setLoading(‘btn-login’, true, ‘دخول’);
try {
await auth.signInWithEmailAndPassword(email, pass);
} catch(e) {
_showError(_authError(e.code, e.message));
_setLoading(‘btn-login’, false, ‘دخول’);
}
});

```
document.getElementById('btn-register').addEventListener('click', async function() {
  if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
  var email = document.getElementById('reg-email').value.trim();
  var pass  = document.getElementById('reg-pass').value;
  var pass2 = document.getElementById('reg-pass2').value;
  if (!email || !pass) return _showError('يرجى ملء جميع الحقول');
  if (pass !== pass2)  return _showError('كلمتا المرور غير متطابقتين');
  if (pass.length < 6) return _showError('كلمة المرور 6 أحرف على الأقل');
  _setLoading('btn-register', true, 'إنشاء حساب');
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
  } catch(e) {
    _showError(_authError(e.code, e.message));
    _setLoading('btn-register', false, 'إنشاء حساب');
  }
});
```

}

function _bindSocial() {
document.getElementById(‘btn-google’).addEventListener(‘click’, async function() {
if (!_isFirebaseReady()) return _showError(‘⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js’);
try {
await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
} catch(e) {
_showError(_authError(e.code, e.message));
}
});

```
document.getElementById('btn-facebook').addEventListener('click', async function() {
  if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
  try {
    await auth.signInWithPopup(new firebase.auth.FacebookAuthProvider());
  } catch(e) {
    _showError(_authError(e.code, e.message));
  }
});
```

}

function _authError(code, msg) {
var map = {
‘auth/user-not-found’:            ‘البريد الإلكتروني غير مسجل’,
‘auth/wrong-password’:            ‘كلمة المرور غير صحيحة’,
‘auth/invalid-credential’:        ‘البريد أو كلمة المرور غير صحيحة’,
‘auth/invalid-login-credentials’: ‘البريد أو كلمة المرور غير صحيحة’,
‘auth/invalid-email’:             ‘صيغة البريد الإلكتروني غير صحيحة’,
‘auth/email-already-in-use’:      ‘هذا البريد مسجّل مسبقاً — جرب تسجيل الدخول’,
‘auth/weak-password’:             ‘كلمة المرور ضعيفة (6 أحرف على الأقل)’,
‘auth/too-many-requests’:         ‘محاولات كثيرة — انتظر قليلاً’,
‘auth/user-disabled’:             ‘هذا الحساب موقوف’,
‘auth/network-request-failed’:    ‘خطأ في الاتصال بالإنترنت’,
‘auth/popup-closed-by-user’:      ‘تم إغلاق نافذة تسجيل الدخول’,
‘auth/popup-blocked’:             ‘افتح السماح بالنوافذ في المتصفح’,
‘auth/operation-not-allowed’:     ‘⚠️ فعّل Email/Password في Firebase Console’,
‘auth/unauthorized-domain’:       ‘⚠️ أضف نطاقك في Firebase Console → Authentication → Authorized Domains’,
‘auth/configuration-not-found’:   ‘⚠️ تحقق من صحة firebase-config.js’,
};
if (map[code]) return map[code];
if (msg && msg.includes(‘OPERATION_NOT_ALLOWED’)) return ‘⚠️ فعّل Email/Password في Firebase Console’;
if (msg && msg.includes(‘EMAIL_EXISTS’))          return ‘هذا البريد مسجّل مسبقاً’;
if (msg && msg.includes(‘WEAK_PASSWORD’))         return ‘كلمة المرور ضعيفة جداً’;
return ’خطأ: ’ + (code || ‘غير معروف’);
}

function _showError(msg) {
var el = document.getElementById(‘auth-error’);
if (!el) return;
el.textContent = msg;
el.classList.add(‘show’);
clearTimeout(el._t);
el._t = setTimeout(function() { el.classList.remove(‘show’); }, 6000);
}

function _clearError() {
var el = document.getElementById(‘auth-error’);
if (el) { el.classList.remove(‘show’); clearTimeout(el._t); }
}

function _setLoading(id, on, label) {
var btn = document.getElementById(id);
if (!btn) return;
btn.disabled = on;
btn.textContent = on ? ‘…’ : label;
}

return { init: init };
})();
