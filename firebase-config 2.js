// ════════════════════════════════════════
//  firebase-config.js
//  ⚠️  استبدل القيم أدناه بقيم مشروعك
// ════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Admin UIDs — أضف UIDs الأدمن هنا بعد التسجيل
const ADMIN_UIDS = [
  // "paste_uid_here",
];

// ════════════════════════════════════════
//  Safe init — never crashes the page
// ════════════════════════════════════════
let auth, db, storage;
let FIREBASE_READY = false;

(function safeInit() {
  try {
    // Check if config values are still placeholders
    const isPlaceholder =
      !firebaseConfig.apiKey ||
       firebaseConfig.apiKey.startsWith('YOUR_') ||
      !firebaseConfig.databaseURL ||
       firebaseConfig.databaseURL.includes('YOUR_PROJECT-default');

    if (isPlaceholder) {
      console.warn('[ChatVibe] Firebase config not set. Running in UI-only mode.');
      _showConfigBanner('لم يتم إعداد Firebase بعد — أضف بياناتك في firebase-config.js');
      return;
    }

    // Init Firebase
    firebase.initializeApp(firebaseConfig);
    auth    = firebase.auth();
    db      = firebase.database();
    storage = firebase.storage();
    FIREBASE_READY = true;

    // ── Verify connectivity with a quick ping ──
    auth.onAuthStateChanged(() => {}); // triggers internal check
    console.info('[ChatVibe] Firebase initialized ✓');

  } catch (err) {
    console.error('[ChatVibe] Firebase init error:', err.code, err.message);

    let msg = 'خطأ في تهيئة Firebase: ' + err.message;

    if (err.message && err.message.includes('already exists')) {
      // App already initialized (hot reload) — reuse existing
      try {
        auth    = firebase.auth();
        db      = firebase.database();
        storage = firebase.storage();
        FIREBASE_READY = true;
        console.info('[ChatVibe] Reused existing Firebase app ✓');
        return;
      } catch(e2) { /* fall through */ }
    }

    if (err.message && (err.message.includes('api-key') || err.message.includes('apiKey'))) {
      msg = '⚠️ مفتاح API غير صحيح في firebase-config.js';
    }

    _showConfigBanner(msg);
  }
})();

/* ── Banner helper ── */
function _showConfigBanner(msg) {
  function render() {
    // Remove existing banner
    const old = document.getElementById('fb-banner');
    if (old) old.remove();

    const b = document.createElement('div');
    b.id = 'fb-banner';
    b.style.cssText = [
      'position:fixed','top:0','left:0','right:0','z-index:9999',
      'background:linear-gradient(135deg,#7C4DFF,#A040FF)',
      'color:#fff','font-family:Cairo,Tajawal,sans-serif',
      'padding:12px 16px','text-align:center',
      'font-size:13px','font-weight:600','line-height:1.6',
      'box-shadow:0 4px 24px rgba(0,0,0,.6)',
    ].join(';');
    b.innerHTML =
      '<div>' + msg + '</div>' +
      '<div style="font-size:11px;opacity:.85;margin-top:3px">' +
        'Firebase Console → Authentication → Sign-in method → تفعيل Email/Password' +
      '</div>';
    document.body.prepend(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
}
