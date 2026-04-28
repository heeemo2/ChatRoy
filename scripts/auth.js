// ═══════════════════════════════════════
//  AUTH.JS — Authentication System
// ═══════════════════════════════════════

const AuthModule = (() => {

  function init() {
    _bindTabs();
    _bindForms();
    _bindSocial();
  }

  /* ── Tabs ── */
  function _bindTabs() {
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        const form = document.getElementById('form-' + target);
        if (form) form.classList.remove('hidden');
        _clearError();
      });
    });
  }

  /* ── Email/Password ── */
  function _bindForms() {
    // LOGIN
    document.getElementById('btn-login').addEventListener('click', async () => {
      if (!FIREBASE_READY) return _showError('⚙️ أضف بيانات Firebase في firebase-config.js أولاً');
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      if (!email || !pass) return _showError('يرجى ملء جميع الحقول');
      _setLoading('btn-login', true, 'دخول');
      try {
        await auth.signInWithEmailAndPassword(email, pass);
        // onAuthStateChanged in app.js handles the rest
      } catch(e) {
        console.error('Login error:', e.code, e.message);
        _showError(_authError(e.code, e.message));
        _setLoading('btn-login', false, 'دخول');
      }
    });

    // REGISTER
    document.getElementById('btn-register').addEventListener('click', async () => {
      if (!FIREBASE_READY) return _showError('⚙️ أضف بيانات Firebase في firebase-config.js أولاً');
      const email = document.getElementById('reg-email').value.trim();
      const pass  = document.getElementById('reg-pass').value;
      const pass2 = document.getElementById('reg-pass2').value;
      if (!email || !pass) return _showError('يرجى ملء جميع الحقول');
      if (pass !== pass2)  return _showError('كلمتا المرور غير متطابقتين');
      if (pass.length < 6) return _showError('كلمة المرور 6 أحرف على الأقل');
      _setLoading('btn-register', true, 'إنشاء حساب');
      try {
        await auth.createUserWithEmailAndPassword(email, pass);
        // onAuthStateChanged handles the rest
      } catch(e) {
        console.error('Register error:', e.code, e.message);
        _showError(_authError(e.code, e.message));
        _setLoading('btn-register', false, 'إنشاء حساب');
      }
    });
  }

  /* ── Social ── */
  function _bindSocial() {
    document.getElementById('btn-google').addEventListener('click', async () => {
      if (!FIREBASE_READY) return _showError('⚙️ أضف بيانات Firebase في firebase-config.js أولاً');
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch(e) {
        console.error('Google error:', e.code, e.message);
        _showError(_authError(e.code, e.message));
      }
    });

    document.getElementById('btn-facebook').addEventListener('click', async () => {
      if (!FIREBASE_READY) return _showError('⚙️ أضف بيانات Firebase في firebase-config.js أولاً');
      try {
        const provider = new firebase.auth.FacebookAuthProvider();
        await auth.signInWithPopup(provider);
      } catch(e) {
        console.error('Facebook error:', e.code, e.message);
        _showError(_authError(e.code, e.message));
      }
    });
  }

  /* ── Error translator ── */
  function _authError(code, rawMsg) {
    const map = {
      // Auth errors
      'auth/user-not-found':              'البريد الإلكتروني غير مسجل',
      'auth/wrong-password':              'كلمة المرور غير صحيحة',
      'auth/invalid-credential':          'البريد أو كلمة المرور غير صحيحة',
      'auth/invalid-email':               'صيغة البريد الإلكتروني غير صحيحة',
      'auth/email-already-in-use':        'هذا البريد مسجّل مسبقاً، جرب تسجيل الدخول',
      'auth/weak-password':               'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)',
      'auth/too-many-requests':           'محاولات كثيرة جداً، انتظر قليلاً',
      'auth/user-disabled':               'هذا الحساب موقوف',
      'auth/network-request-failed':      'خطأ في الاتصال بالإنترنت',
      'auth/popup-closed-by-user':        'تم إغلاق نافذة تسجيل الدخول',
      'auth/popup-blocked':               'افتح السماح بالنوافذ المنبثقة في المتصفح',
      'auth/cancelled-popup-request':     'تم إلغاء طلب تسجيل الدخول',
      'auth/account-exists-with-different-credential': 'هذا البريد مرتبط بطريقة تسجيل مختلفة',
      'auth/operation-not-allowed':       '⚠️ هذه الطريقة غير مفعّلة — فعّل Email/Password في Firebase Console',
      'auth/configuration-not-found':     '⚠️ إعدادات Firebase غير صحيحة، تحقق من firebase-config.js',
      'auth/api-key-not-valid':           '⚠️ مفتاح API غير صحيح في firebase-config.js',
      'auth/app-not-authorized':          '⚠️ هذا النطاق غير مصرح به في Firebase — أضف النطاق في Authorized Domains',
      'auth/unauthorized-domain':         '⚠️ النطاق غير مصرح به — أضفه في Firebase Console → Authentication → Settings → Authorized Domains',
      'auth/internal-error':              'خطأ داخلي في Firebase، حاول مجدداً',
      'auth/timeout':                     'انتهت المهلة، حاول مجدداً',
    };

    // Known mapped error
    if (map[code]) return map[code];

    // Try to extract useful info from raw message
    if (rawMsg) {
      if (rawMsg.includes('OPERATION_NOT_ALLOWED'))
        return '⚠️ فعّل Email/Password في Firebase Console → Authentication → Sign-in method';
      if (rawMsg.includes('EMAIL_NOT_FOUND'))
        return 'البريد الإلكتروني غير مسجل';
      if (rawMsg.includes('INVALID_PASSWORD'))
        return 'كلمة المرور غير صحيحة';
      if (rawMsg.includes('TOO_MANY_ATTEMPTS'))
        return 'محاولات كثيرة، انتظر قليلاً';
      if (rawMsg.includes('WEAK_PASSWORD'))
        return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
      if (rawMsg.includes('EMAIL_EXISTS'))
        return 'هذا البريد مسجّل مسبقاً';
      if (rawMsg.includes('INVALID_EMAIL'))
        return 'صيغة البريد غير صحيحة';
    }

    // Fallback — show the code so user can report it
    return 'خطأ: ' + (code || 'غير معروف');
  }

  /* ── UI helpers ── */
  function _showError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    // Keep critical config errors visible longer
    const duration = msg.startsWith('⚠️') ? 8000 : 4000;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  function _clearError() {
    const el = document.getElementById('auth-error');
    if (el) { el.classList.remove('show'); clearTimeout(el._hideTimer); }
  }

  function _setLoading(btnId, loading, label) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? '...' : label;
  }

  return { init };
})();
