// ═══════════════════════════════════════
//  UTILS.JS — Shared helpers & badge system
// ═══════════════════════════════════════

const XP_PER_LEVEL = 900;
const LEVEL_THRESHOLDS = [];
for (let i = 0; i <= 100; i++) LEVEL_THRESHOLDS[i] = i * XP_PER_LEVEL;

function getLevelFromXP(xp) {
  if (!xp) return 0;
  return Math.min(100, Math.floor(xp / XP_PER_LEVEL));
}
function getLevelProgress(xp) {
  if (!xp) return 0;
  const lvl = getLevelFromXP(xp);
  if (lvl >= 100) return 100;
  const base = lvl * XP_PER_LEVEL;
  return Math.round(((xp - base) / XP_PER_LEVEL) * 100);
}

/* ── Badge Definitions ── */
const BADGE_DEFS = {
  friends_bronze: { name: 'رفيق المبتدئ', cat: 'friends', tier: 1, req: { friends: 5 } },
  friends_silver: { name: 'رفيق الساحر',  cat: 'friends', tier: 2, req: { friends: 20 } },
  friends_gold:   { name: 'رفيق الأساطير',cat: 'friends', tier: 3, req: { friends: 50 } },
  friends_diamond:{ name: 'رفيق الماس',   cat: 'friends', tier: 4, req: { friends: 100 } },
  login_bronze:   { name: 'خبير التسجيل', cat: 'login',   tier: 1, req: { loginDays: 7 } },
  login_silver:   { name: 'خبير التسجيل', cat: 'login',   tier: 2, req: { loginDays: 30 } },
  login_gold:     { name: 'خبير التسجيل', cat: 'login',   tier: 3, req: { loginDays: 100 } },
  login_diamond:  { name: 'خبير التسجيل', cat: 'login',   tier: 4, req: { loginDays: 365 } },
  room_bronze:    { name: 'الفرقة النشيطة', cat: 'room',  tier: 1, req: { messages: 100 } },
  room_silver:    { name: 'الفرقة النشيطة', cat: 'room',  tier: 2, req: { messages: 500 } },
  room_gold:      { name: 'الفرقة النشيطة', cat: 'room',  tier: 3, req: { messages: 2000 } },
  room_diamond:   { name: 'الفرقة النشيطة', cat: 'room',  tier: 4, req: { messages: 10000 } },
  admin_badge:    { name: 'أدمن',    cat: 'special', tier: 4 },
  founder:        { name: 'مؤسس',    cat: 'special', tier: 4 },
  legend:         { name: 'أسطوري', cat: 'special', tier: 4 },
};

function getAdminBadges() {
  return Object.keys(BADGE_DEFS);
}

function computeBadges(userData, isAdminFlag) {
  if (isAdminFlag) return getAdminBadges();
  const earned = [];
  const friends  = Object.keys(userData.friends || {}).length;
  const loginDays = userData.loginDays || 0;
  const messages  = userData.totalMessages || 0;
  if (friends >= 100) earned.push('friends_diamond');
  else if (friends >= 50) earned.push('friends_gold');
  else if (friends >= 20) earned.push('friends_silver');
  else if (friends >= 5) earned.push('friends_bronze');
  if (loginDays >= 365) earned.push('login_diamond');
  else if (loginDays >= 100) earned.push('login_gold');
  else if (loginDays >= 30) earned.push('login_silver');
  else if (loginDays >= 7) earned.push('login_bronze');
  if (messages >= 10000) earned.push('room_diamond');
  else if (messages >= 2000) earned.push('room_gold');
  else if (messages >= 500) earned.push('room_silver');
  else if (messages >= 100) earned.push('room_bronze');
  const level = getLevelFromXP(userData.xp || 0);
  if (level >= 100) earned.push('legend');
  return earned;
}

/* ────────────────────────────────────────
   Badge SVG Generators
──────────────────────────────────────── */
function buildBadgeSVG(key) {
  const def = BADGE_DEFS[key];
  if (!def) return '';
  if (def.cat === 'friends') return friendsBadgeSVG(def.tier);
  if (def.cat === 'login')   return loginBadgeSVG(def.tier);
  if (def.cat === 'room')    return roomBadgeSVG(def.tier);
  if (key === 'admin_badge') return adminBadgeSVG();
  if (key === 'founder')     return founderBadgeSVG();
  if (key === 'legend')      return legendBadgeSVG();
  return '';
}

/* Same as buildBadgeSVG but smaller size for inline display */
function buildBadgeSVGSmall(key) {
  const def = BADGE_DEFS[key];
  if (!def) return '';
  const full = buildBadgeSVG(key);
  // replace width/height 56 with 20
  return full.replace(/width="56" height="56"/g, 'width="20" height="20"');
}

/* Get top 3 badges for display next to name */
function getTop3Badges(badges) {
  if (!badges || !badges.length) return [];
  // Priority: special badges first, then highest tier
  const priority = ['admin_badge','founder','legend'];
  const result = [];
  for (const p of priority) {
    if (badges.includes(p)) result.push(p);
    if (result.length === 3) return result;
  }
  // Add remaining by tier (highest first)
  const rest = badges.filter(b => !priority.includes(b));
  rest.sort((a,b) => (BADGE_DEFS[b]?.tier||0) - (BADGE_DEFS[a]?.tier||0));
  for (const b of rest) {
    result.push(b);
    if (result.length === 3) break;
  }
  return result;
}

const TIER_COLORS = {
  1: { bg1:'#F09858', bg2:'#9A3600', outer:'#6A2200', dot:'#CD7F32', ring:'#FFB060' },
  2: { bg1:'#DDE8F0', bg2:'#5878A0', outer:'#304858', dot:'#A0B8CC', ring:'#C0D4E8' },
  3: { bg1:'#FFE070', bg2:'#B06800', outer:'#7A4800', dot:'#FFD040', ring:'#FFE870' },
  4: { bg1:'#C0E8FF', bg2:'#2030A0', outer:'#102060', dot:'#80C0FF', ring:'#A0D8FF' },
};

function tierDots(t) {
  const c = TIER_COLORS[t];
  const pts = [[40,5],[62,12],[75,34],[75,46],[62,68],[40,75],[18,68],[5,46],[5,34],[18,12]];
  return pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${c.dot}"/>`).join('');
}
function tierBase(t, extraRing) {
  extraRing = extraRing || '';
  const c = TIER_COLORS[t];
  return `
    <circle cx="40" cy="40" r="38" fill="${c.outer}"/>
    ${tierDots(t)}
    <defs>
      <radialGradient id="rg_${t}" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="${c.bg1}"/>
        <stop offset="100%" stop-color="${c.bg2}"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="32" fill="url(#rg_${t})"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="${c.ring}" stroke-width="2" opacity="0.7"/>
    ${extraRing}`;
}

function friendsBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const extras = tier >= 3 ? `<circle cx="40" cy="40" r="27" fill="none" stroke="${c.ring}" stroke-width="1" opacity="0.4"/>` : '';
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${tierBase(tier, extras)}
    <circle cx="33" cy="28" r="7" fill="white" opacity="0.95"/>
    <path d="M18,50 Q18,38 33,38 Q48,38 48,50" fill="white" opacity="0.9"/>
    <circle cx="50" cy="30" r="5.5" fill="white" opacity="0.75"/>
    <path d="M37,50 Q38,42 50,42 Q62,42 62,50" fill="white" opacity="0.7"/>
    ${tier === 4 ? `<polygon points="40,62 46,67 40,74 34,67" fill="#A0DFFF" opacity="0.9"/>` : ''}
  </svg>`;
}

function loginBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const calColor = tier===1?'#FF6030':tier===2?'#6080A0':tier===3?'#D08000':'#8040C0';
  const ckColor  = tier===1?'#FF6030':tier===2?'#5070A0':tier===3?'#C07800':'#9040D0';
  const star = tier>=3 ? `<polygon points="40,25 41.5,28.5 45,28.5 42.5,31 43.5,35 40,33 36.5,35 37.5,31 35,28.5 38.5,28.5" fill="${tier===4?'#D090FF':'#FFD040'}"/>` : '';
  const sparkle = tier===4 ? `<line x1="28" y1="26" x2="28" y2="30" stroke="#D090FF" stroke-width="1.5" opacity="0.7"/><line x1="26" y1="28" x2="30" y2="28" stroke="#D090FF" stroke-width="1.5" opacity="0.7"/>` : '';
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${tierBase(tier)}
    <rect x="22" y="22" width="36" height="32" rx="5" fill="white" opacity="0.95"/>
    <rect x="22" y="22" width="36" height="12" rx="5" fill="${calColor}" opacity="0.9"/>
    <rect x="27" y="18" width="5" height="8" rx="2" fill="${c.dot}"/>
    <rect x="48" y="18" width="5" height="8" rx="2" fill="${c.dot}"/>
    <polyline points="30,42 37,50 52,34" fill="none" stroke="${ckColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${star}${sparkle}
  </svg>`;
}

function roomBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const roofColor  = tier===1?'#FF6030':tier===2?'#6080A0':tier===3?'#D08000':'#9040C0';
  const badgeColor = tier===1?'#CD7F32':tier===2?'#8090A8':tier===3?'#C07800':'#8030B0';
  const lvColor    = tier===4?'#E0B0FF':tier===3?'#FFD040':'white';
  const star = tier>=3 ? `<polygon points="40,19 41.5,22.5 45,22.5 42.5,25 43.5,28.5 40,27 36.5,28.5 37.5,25 35,22.5 38.5,22.5" fill="${tier===4?'#D090FF':'#FFD040'}"/>` : '';
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${tierBase(tier)}
    <polygon points="40,18 62,34 62,58 18,58 18,34" fill="white" opacity="0.95"/>
    <polygon points="40,18 62,34 18,34" fill="${roofColor}" opacity="0.9"/>
    <rect x="33" y="42" width="14" height="16" rx="2" fill="${roofColor}" opacity="0.7"/>
    <circle cx="57" cy="58" r="10" fill="${badgeColor}" stroke="${tier>=3?c.dot:'white'}" stroke-width="1.5"/>
    <text x="57" y="62" text-anchor="middle" font-size="9" font-weight="600" fill="${lvColor}" font-family="sans-serif">LV</text>
    ${star}
  </svg>`;
}

function adminBadgeSVG() {
  const pts = [[40,5],[62,12],[75,34],[75,46],[62,68],[40,75],[18,68],[5,46],[5,34],[18,12]];
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="38" fill="#300010"/>
    ${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#FF4060"/>`).join('')}
    <defs>
      <radialGradient id="rg_admin" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#FF7080"/><stop offset="100%" stop-color="#800020"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="32" fill="url(#rg_admin)"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="#FF4060" stroke-width="2" opacity="0.7"/>
    <text x="40" y="46" text-anchor="middle" font-size="28" font-family="sans-serif">🛡</text>
  </svg>`;
}

function founderBadgeSVG() {
  const pts = [[40,5],[62,12],[75,34],[75,46],[62,68],[40,75],[18,68],[5,46],[5,34],[18,12]];
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="38" fill="#102060"/>
    ${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#80C0FF"/>`).join('')}
    <defs>
      <radialGradient id="rg_found" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#C0E8FF"/><stop offset="100%" stop-color="#2030A0"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="32" fill="url(#rg_found)"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="#A0D8FF" stroke-width="2"/>
    <polygon points="40,20 43,30 54,30 45,37 48,47 40,41 32,47 35,37 26,30 37,30" fill="#FFD040" opacity="0.9"/>
  </svg>`;
}

function legendBadgeSVG() {
  const pts = [[40,5],[62,12],[75,34],[75,46],[62,68],[40,75],[18,68],[5,46],[5,34],[18,12]];
  return `<svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="38" fill="#200060"/>
    ${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#C080FF"/>`).join('')}
    <defs>
      <radialGradient id="rg_legend" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#E0B8FF"/><stop offset="50%" stop-color="#8040D0"/><stop offset="100%" stop-color="#2800A0"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="32" fill="url(#rg_legend)"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="#D090FF" stroke-width="2.5" opacity="0.8"/>
    <circle cx="40" cy="40" r="27" fill="none" stroke="#7030B0" stroke-width="1" opacity="0.5"/>
    <polygon points="40,22 43,31 53,31 45,37 48,46 40,41 32,46 35,37 27,31 37,31" fill="#FFD040" opacity="0.95"/>
    <circle cx="40" cy="37" r="5" fill="#FFF0A0" opacity="0.6"/>
  </svg>`;
}

/* Level badge SVG (small, for avatar corner) */
function levelBadgeSVG(level) {
  const tier = Math.floor(level / 20);
  const configs = [
    { fill:'#9B7ED4', stroke:'#6B4FB8', wings:false, base:false },
    { fill:'#7B68C8', stroke:'#5A48A8', wings:false, base:false },
    { fill:'#6548C0', stroke:'#4830A0', wings:false, base:false },
    { fill:'#5038B8', stroke:'#D4A017', wings:true,  base:false },
    { fill:'#4428B0', stroke:'#FFD700', wings:true,  base:true  },
  ];
  const cf = configs[Math.min(tier, 4)];
  const t  = Math.min(tier, 4);
  const pts = [
    '16,5 27,11 27,23 16,29 5,23 5,11',
    '16,4 28,11 28,22 16,29 4,22 4,11',
    '16,3 28,10 28,22 16,29 4,22 4,10',
    '16,3 28,10 28,22 16,29 4,22 4,10',
    '16,3 28,10 28,22 16,29 4,22 4,10',
  ][t];
  let wingsL = '', wingsR = '', pedestal = '';
  if (cf.wings) {
    wingsL = `<path d="M5,14 C0,10 -4,12 -3,16 C-2,19 2,18 4,17 C0,20 -2,24 1,25 C4,26 7,21 9,18" fill="#E8A000" opacity="0.95"/>`;
    wingsR = `<path d="M27,14 C32,10 36,12 35,16 C34,19 30,18 28,17 C32,20 34,24 31,25 C28,26 25,21 23,18" fill="#E8A000" opacity="0.95"/>`;
  }
  if (cf.base) {
    pedestal = `<rect x="10" y="29" width="12" height="4" rx="1" fill="#7818B8" stroke="#FFD700" stroke-width="0.5"/>`;
  }
  return `<svg viewBox="-6 0 44 36" xmlns="http://www.w3.org/2000/svg">
    ${wingsL}${wingsR}
    <polygon points="${pts}" fill="${cf.fill}" stroke="${cf.stroke}" stroke-width="1.5"/>
    <polygon points="${pts}" fill="rgba(255,255,255,0.1)"/>
    <text x="16" y="21" text-anchor="middle" font-size="9" font-weight="700" fill="white" font-family="sans-serif">${level}</text>
    ${pedestal}
  </svg>`;
}

/* ── Time formatting ── */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}
function formatLastSeen(ts) {
  if (!ts) return 'غير معروف';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'للتو';
  if (diff < 3600000) return `منذ ${Math.floor(diff/60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff/3600000)} س`;
  return `منذ ${Math.floor(diff/86400000)} يوم`;
}

/* ── Country list ── */
const COUNTRIES = [
  'السعودية','الإمارات','مصر','الكويت','قطر','البحرين','عُمان','الأردن',
  'العراق','سوريا','لبنان','اليمن','ليبيا','تونس','الجزائر','المغرب',
  'السودان','موريتانيا','الصومال','جيبوتي','جزر القمر','فلسطين',
  'المملكة المتحدة','الولايات المتحدة','كندا','أستراليا','ألمانيا','فرنسا','تركيا','غيرها'
];

/* ── Avatars ── */
const MALE_AVATARS   = ['👦','🧑','👨','🧔','👲','🧑‍💼','👨‍💻','🧑‍🎤','👨‍🎓','👨‍✈️','🦸‍♂️','🧙‍♂️'];
const FEMALE_AVATARS = ['👧','👩','🧑‍🦰','👩‍🦱','👩‍🦳','🧑‍💼','👩‍💻','🧑‍🎤','👩‍🎓','👩‍✈️','🦸‍♀️','🧝‍♀️'];

/* ── Emoji list ── */
const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🥳','😜',
  '👍','👏','🙌','🔥','💯','❤️','💜','⭐',
  '😢','😭','😤','😱','🤔','🤣','😅','🫡',
  '🎉','🎊','🏆','💎','✨','🌟','💫','🙏',
  '👑','🛡️','⚔️','🎯','💪','🤝','🫶','❓',
];

/* ── Toast ── */
function showToast(msg) {
  var t = document.getElementById('app-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'app-toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 2500);
}

/* ── Generate random 6-digit ID ── */
function genUID6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ── Sanitize text ── */
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Chat ID from two UIDs ── */
function getChatId(a, b) {
  return [a, b].sort().join('_');
}

/* ── Check admin ── */
function isAdmin(uid) {
  if (!uid) return false;
  try {
    return typeof ADMIN_UIDS !== 'undefined' &&
           Array.isArray(ADMIN_UIDS) &&
           ADMIN_UIDS.indexOf(uid) >= 0;
  } catch(e) { return false; }
}

/* ── Convert image file to base64 data URL ── */
function fileToDataURL(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Resize image to max dimension (returns data URL) ── */
function resizeImage(dataURL, maxW, maxH) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        var ratio = Math.min(maxW/w, maxH/h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = dataURL;
  });
}

/* ── Render avatar: emoji string OR photo URL ── */
function renderAvatar(el, avatarStr) {
  if (!el) return;
  if (avatarStr && (avatarStr.startsWith('data:') || avatarStr.startsWith('http'))) {
    var img = el.querySelector('img');
    if (!img) {
      el.textContent = '';
      img = document.createElement('img');
      img.style.width = '100%'; img.style.height = '100%';
      img.style.objectFit = 'cover'; img.style.borderRadius = '50%';
      el.appendChild(img);
    }
    img.src = avatarStr;
  } else {
    el.innerHTML = '';
    el.textContent = avatarStr || '👤';
  }
}
