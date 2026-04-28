// ═══════════════════════════════════════
//  AUTH.JS
// ═══════════════════════════════════════

const AuthModule = (() => {

  function init() {
    _bindTabs();
    _bindForms();
    _bindSocial();
  }

  function _bindTabs() {
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        const form = document.getElementById('form-' + btn.dataset.tab);
        if (form) form.classList.remove('hidden');
        _clearError();
      });
    });
  }

  function _isFirebaseReady() {
    // Safe check — FIREBASE_READY may not be defined if config is wrong
    try { return (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY === true); }
    catch(e) { return false; }
  }

  function _bindForms() {
    // LOGIN
    document.getElementById('btn-login').addEventListener('click', async () => {
      if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      if (!email || !pass) return _showError('يرجى ملء جميع الحقول');
      _setLoading('btn-login', true, 'دخول');
      try {
        await auth.signInWithEmailAndPassword(email, pass);
      } catch(e) {
        console.error('Login:', e.code, e.message);
        _showError(_authError(e.code, e.message));
        _setLoading('btn-login', false, 'دخول');
      }
    });

    // REGISTER
    document.getElementById('btn-register').addEventListener('click', async () => {
      if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
      const email = document.getElementById('reg-email').value.trim();
      const pass  = document.getElementById('reg-pass').value;
      const pass2 = document.getElementById('reg-pass2').value;
      if (!email || !pass) return _showError('يرجى ملء جميع الحقول');
      if (pass !== pass2)  return _showError('كلمتا المرور غير متطابقتين');
      if (pass.length < 6) return _showError('كلمة المرور 6 أحرف على الأقل');
      _setLoading('btn-register', true, 'إنشاء حساب');
      try {
        await auth.createUserWithEmailAndPassword(email, pass);
      } catch(e) {
        console.error('Register:', e.code, e.message);
        _showError(_authError(e.code, e.message));
        _setLoading('btn-register', false, 'إنشاء حساب');
      }
    });
  }

  function _bindSocial() {
    document.getElementById('btn-google').addEventListener('click', async () => {
      if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
      try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch(e) {
        console.error('Google:', e.code, e.message);
        _showError(_authError(e.code, e.message));
      }
    });

    document.getElementById('btn-facebook').addEventListener('click', async () => {
      if (!_isFirebaseReady()) return _showError('⚙️ أضف بيانات Firebase الصحيحة في firebase-config.js');
      try {
        await auth.signInWithPopup(new firebase.auth.FacebookAuthProvider());
      } catch(e) {
        console.error('Facebook:', e.code, e.message);
        _showError(_authError(e.code, e.message));
      }
    });
  }

  function _authError(code, msg) {
    const map = {
      'auth/user-not-found':              'البريد الإلكتروني غير مسجل',
      'auth/wrong-password':              'كلمة المرور غير صحيحة',
      'auth/invalid-credential':          'البريد أو كلمة المرور غير صحيحة',
      'auth/invalid-login-credentials':   'البريد أو كلمة المرور غير صحيحة',
      'auth/invalid-email':               'صيغة البريد الإلكتروني غير صحيحة',
      'auth/email-already-in-use':        'هذا البريد مسجّل مسبقاً — جرب تسجيل الدخول',
      'auth/weak-password':               'كلمة المرور ضعيفة (6 أحرف على الأقل)',
      'auth/too-many-requests':           'محاولات كثيرة — انتظر قليلاً',
      'auth/user-disabled':               'هذا الحساب موقوف',
      'auth/network-request-failed':      'خطأ في الاتصال بالإنترنت',
      'auth/popup-closed-by-user':        'تم إغلاق نافذة تسجيل الدخول',
      'auth/popup-blocked':               'افتح السماح بالنوافذ في المتصفح',
      'auth/operation-not-allowed':       '⚠️ فعّل Email/Password في Firebase Console → Authentication → Sign-in method',
      'auth/unauthorized-domain':         '⚠️ أضف نطاقك في Firebase Console → Authentication → Authorized Domains',
      'auth/configuration-not-found':     '⚠️ تحقق من صحة firebase-config.js',
    };
    if (map[code]) return map[code];
    if (msg && msg.includes('OPERATION_NOT_ALLOWED')) return '⚠️ فعّل Email/Password في Firebase Console';
    if (msg && msg.includes('EMAIL_EXISTS'))          return 'هذا البريد مسجّل مسبقاً';
    if (msg && msg.includes('WEAK_PASSWORD'))         return 'كلمة المرور ضعيفة جداً';
    return 'خطأ: ' + (code || 'غير معروف');
  }

  function _showError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 6000);
  }

  function _clearError() {
    const el = document.getElementById('auth-error');
    if (el) { el.classList.remove('show'); clearTimeout(el._t); }
  }

  function _setLoading(id, on, label) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? '...' : label;
  }

  return { init };
})();
