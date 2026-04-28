// ════════════════════════════════════════
//  firebase-config.js
//  ⚠️  استبدل القيم أدناه بقيم مشروعك
//  من: Firebase Console > Project Settings > Your Apps > SDK setup
// ════════════════════════════════════════

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXA1x9fJe6zPFo7yiK1kSRsoR89aSff5k",
  authDomain: "itchat-web-8c4ed.firebaseapp.com",
  databaseURL: "https://itchat-web-8c4ed-default-rtdb.firebaseio.com",
  projectId: "itchat-web-8c4ed",
  storageBucket: "itchat-web-8c4ed.firebasestorage.app",
  messagingSenderId: "787261764804",
  appId: "1:787261764804:web:68cfdba7878669c7dbc591",
  measurementId: "G-G8S46BLQ0Y"
};

// ════════════════════════════════════════
//  Admin UIDs
//  بعد إنشاء حسابك: انسخ الـ UID من
//  Firebase Console > Authentication > Users
//  وضعه هنا بين علامتي التنصيص
// ════════════════════════════════════════
const ADMIN_UIDS = [
  "jBvCAZ10dKNxNHJVCidWhi6J7W22",
];

// ════════════════════════════════════════
//  Safe Firebase Init — لا يكسر الصفحة
// ════════════════════════════════════════
var auth, db, storage;
var FIREBASE_READY = false;

(function safeInit() {
  try {
    var isPlaceholder =
      !firebaseConfig.apiKey ||
      firebaseConfig.apiKey.indexOf('YOUR_') === 0 ||
      !firebaseConfig.databaseURL ||
      firebaseConfig.databaseURL.indexOf('YOUR_PROJECT-default') >= 0;

    if (isPlaceholder) {
      console.warn('[ChatVibe] Firebase config not set.');
      _showBanner('⚙️ أضف بيانات Firebase في firebase-config.js');
      return;
    }

    // Try reuse if already initialized
    try {
      firebase.app();
      auth    = firebase.auth();
      db      = firebase.database();
      storage = firebase.storage();
      FIREBASE_READY = true;
      console.info('[ChatVibe] Firebase reused ✓');
      return;
    } catch(e) { /* not initialized yet, continue */ }

    // Fresh init
    firebase.initializeApp(firebaseConfig);
    auth    = firebase.auth();
    db      = firebase.database();
    storage = firebase.storage();
    FIREBASE_READY = true;
    console.info('[ChatVibe] Firebase initialized ✓');

  } catch(err) {
    console.error('[ChatVibe] Init error:', err.message);
    _showBanner('⚠️ خطأ في Firebase: ' + err.message);
  }
})();

function _showBanner(msg) {
  function _render() {
    var b = document.getElementById('fb-banner');
    if (b) b.remove();
    b = document.createElement('div');
    b.id = 'fb-banner';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#7C4DFF,#A040FF);color:#fff;font-family:Cairo,sans-serif;padding:12px 16px;text-align:center;font-size:13px;font-weight:600;line-height:1.8;box-shadow:0 4px 24px rgba(0,0,0,.6)';
    b.textContent = msg;
    document.body.prepend(b);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _render);
  } else {
    _render();
  }
}
