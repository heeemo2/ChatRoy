// ═══════════════════════════════════════
//  UTILS.JS — Helpers, Badges, Levels (v2 UPGRADED)
// ═══════════════════════════════════════

/* ── Level Calculation ── */
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
function getLevelTier(level) {
  if (level <= 20) return 'bronze';
  if (level <= 40) return 'silver';
  if (level <= 60) return 'gold';
  if (level <= 80) return 'diamond';
  return 'legend';
}
function getLevelTierLabel(level) {
  const map = { bronze:'برونزي', silver:'فضي', gold:'ذهبي', diamond:'ماسي', legend:'أسطوري' };
  return map[getLevelTier(level)] || '';
}

/* ══ ROOM XP ══ */
const ROOM_XP_LEVELS = [
  { min:0,    max:199,        label:'غرفة جديدة',  color:'#8B7355', emoji:'🌱' },
  { min:200,  max:599,        label:'غرفة نشطة',   color:'#5A8FA5', emoji:'⚡' },
  { min:600,  max:1499,       label:'غرفة قوية',   color:'#C4A000', emoji:'🔥' },
  { min:1500, max:3999,       label:'غرفة مشهورة', color:'#7B4FBF', emoji:'💎' },
  { min:4000, max:Infinity,   label:'غرفة أسطورية',color:'#E8400C', emoji:'👑' },
];
function getRoomLevelInfo(xp) {
  xp = xp || 0;
  for (let i = ROOM_XP_LEVELS.length-1; i>=0; i--)
    if (xp >= ROOM_XP_LEVELS[i].min) return { ...ROOM_XP_LEVELS[i], xp, tier:i };
  return { ...ROOM_XP_LEVELS[0], xp, tier:0 };
}
function getRoomXPProgress(xp) {
  xp = xp || 0;
  const info = getRoomLevelInfo(xp);
  if (info.tier === ROOM_XP_LEVELS.length-1) return 100;
  return Math.min(100, Math.round(((xp-info.min)/(info.max-info.min))*100));
}

/* ══ BADGE DEFS ══ */
const BADGE_DEFS = {
  friends_bronze:  { name:'رفيق المبتدئ',    cat:'friends',     tier:1, req:{friends:5},    rarity:'شائع',      desc:'أضف 5 أصدقاء',         perks:'' },
  friends_silver:  { name:'رفيق الساحر',     cat:'friends',     tier:2, req:{friends:20},   rarity:'نادر',      desc:'أضف 20 صديقاً',         perks:'' },
  friends_gold:    { name:'رفيق الأساطير',   cat:'friends',     tier:3, req:{friends:50},   rarity:'نادر جداً', desc:'أضف 50 صديقاً',         perks:'' },
  friends_diamond: { name:'رفيق الماس',      cat:'friends',     tier:4, req:{friends:100},  rarity:'أسطوري',    desc:'أضف 100 صديق',          perks:'لون اسم مميز' },
  login_bronze:    { name:'مداوم الحضور',    cat:'login',       tier:1, req:{loginDays:7},  rarity:'شائع',      desc:'سجّل الدخول 7 أيام',    perks:'' },
  login_silver:    { name:'مخلص التطبيق',    cat:'login',       tier:2, req:{loginDays:30}, rarity:'نادر',      desc:'سجّل الدخول 30 يوماً',  perks:'' },
  login_gold:      { name:'مواظب الدردشة',   cat:'login',       tier:3, req:{loginDays:100},rarity:'نادر جداً', desc:'سجّل الدخول 100 يوم',   perks:'' },
  login_diamond:   { name:'أسطورة الحضور',   cat:'login',       tier:4, req:{loginDays:365},rarity:'أسطوري',    desc:'سجّل الدخول 365 يوماً', perks:'إطار بروفايل ذهبي' },
  room_bronze:     { name:'ثرثار المبتدئ',   cat:'room',        tier:1, req:{messages:100}, rarity:'شائع',      desc:'أرسل 100 رسالة',        perks:'' },
  room_silver:     { name:'خبير الدردشة',    cat:'room',        tier:2, req:{messages:500}, rarity:'نادر',      desc:'أرسل 500 رسالة',        perks:'' },
  room_gold:       { name:'محترف الدردشة',   cat:'room',        tier:3, req:{messages:2000},rarity:'نادر جداً', desc:'أرسل 2000 رسالة',       perks:'' },
  room_diamond:    { name:'إمبراطور الكلام', cat:'room',        tier:4, req:{messages:10000},rarity:'أسطوري',   desc:'أرسل 10,000 رسالة',     perks:'شارة بريق متحرك' },
  first_login:     { name:'الإنطلاقة',       cat:'achievement', tier:1, rarity:'شائع',      desc:'أول تسجيل دخول للتطبيق',    perks:'' },
  active_user:     { name:'مستخدم نشيط',     cat:'achievement', tier:2, rarity:'نادر',      desc:'تسجيل دخول لأكثر من أسبوعين',perks:'' },
  social_star:     { name:'نجم اجتماعي',     cat:'achievement', tier:2, rarity:'نادر',      desc:'شارك في غرف متعددة',         perks:'' },
  friend_of_all:   { name:'صديق الجميع',     cat:'achievement', tier:3, rarity:'نادر جداً', desc:'80+ صديق في قائمتك',         perks:'' },
  room_leader:     { name:'قائد الغرفة',     cat:'achievement', tier:3, rarity:'نادر جداً', desc:'امتلك غرفة نشطة',            perks:'أيقونة تاج' },
  chat_pro:        { name:'محترف دردشة',     cat:'achievement', tier:3, rarity:'نادر جداً', desc:'أرسل 1000+ رسالة',           perks:'' },
  vip:             { name:'VIP',              cat:'achievement', tier:4, rarity:'أسطوري',    desc:'عضو VIP حصري',               perks:'لقب + إطار ذهبي' },
  supporter:       { name:'داعم التطبيق',    cat:'achievement', tier:4, rarity:'أسطوري',    desc:'دعم تطوير التطبيق',          perks:'شكر خاص + شارة حصرية' },
  admin_badge:     { name:'مدير',            cat:'special',     tier:4, rarity:'حصري',      desc:'صلاحيات إدارية',             perks:'لون ذهبي وتحكم كامل' },
  founder:         { name:'مؤسس',            cat:'special',     tier:4, rarity:'حصري',      desc:'مؤسس التطبيق',               perks:'لقب خاص' },
  legend:          { name:'أسطوري',          cat:'special',     tier:4, rarity:'أسطوري',    desc:'وصل للمستوى 100',            perks:'لقب أسطوري' },
};

const RARITY_COLORS = {
  'شائع':'#8BA0A8','نادر':'#4A90D9','نادر جداً':'#A050E0','أسطوري':'#FF8C00','حصري':'#FF2060'
};

function getAdminBadges() { return Object.keys(BADGE_DEFS); }

function computeBadges(userData, isAdminUser) {
  if (isAdminUser) return getAdminBadges();
  const earned = [];
  const friends  = Object.keys(userData.friends||{}).length;
  const loginDays= userData.loginDays||0;
  const messages = userData.totalMessages||0;
  const level    = getLevelFromXP(userData.xp||0);
  if (friends>=100) earned.push('friends_diamond');
  else if (friends>=50) earned.push('friends_gold');
  else if (friends>=20) earned.push('friends_silver');
  else if (friends>=5)  earned.push('friends_bronze');
  if (loginDays>=365) earned.push('login_diamond');
  else if (loginDays>=100) earned.push('login_gold');
  else if (loginDays>=30)  earned.push('login_silver');
  else if (loginDays>=7)   earned.push('login_bronze');
  if (messages>=10000) earned.push('room_diamond');
  else if (messages>=2000) earned.push('room_gold');
  else if (messages>=500)  earned.push('room_silver');
  else if (messages>=100)  earned.push('room_bronze');
  if (loginDays>=1) earned.push('first_login');
  if (loginDays>=14) earned.push('active_user');
  if (friends>=30) earned.push('social_star');
  if (friends>=80) earned.push('friend_of_all');
  if (messages>=1000) earned.push('chat_pro');
  if (level>=100) earned.push('legend');
  return earned;
}

/* ══ SVG BADGE SYSTEM ══ */
const TIER_COLORS = {
  1:{ bg1:'#F5B97A',bg2:'#8A3D00',outer:'#5C2500',dot:'#D4895A',ring:'#FFC880',shine:'rgba(255,210,170,0.55)' },
  2:{ bg1:'#E8F2FF',bg2:'#4A6FA0',outer:'#243552',dot:'#90B4D8',ring:'#B8D4F0',shine:'rgba(200,230,255,0.55)' },
  3:{ bg1:'#FFE880',bg2:'#9A5A00',outer:'#6A3800',dot:'#FFD000',ring:'#FFEC60',shine:'rgba(255,245,150,0.65)' },
  4:{ bg1:'#C8F0FF',bg2:'#1828B0',outer:'#081060',dot:'#60C8FF',ring:'#90E0FF',shine:'rgba(160,230,255,0.65)' },
};

function _tierShield(t) {
  const c = TIER_COLORS[t];
  const dotPts=[[40,4],[62,13],[76,35],[76,45],[62,67],[40,76],[18,67],[4,45],[4,35],[18,13]];
  const dots=dotPts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="${c.dot}" opacity="0.9"/>`).join('');
  return `<defs>
    <radialGradient id="sg${t}" cx="45%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${c.bg1}"/><stop offset="70%" stop-color="${c.bg2}"/><stop offset="100%" stop-color="${c.outer}"/>
    </radialGradient>
    <filter id="glow${t}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="40" cy="40" r="39" fill="${c.outer}" opacity="0.95"/>
  ${dots}
  <circle cx="40" cy="40" r="33" fill="url(#sg${t})"/>
  <circle cx="40" cy="40" r="33" fill="none" stroke="${c.ring}" stroke-width="2.2" opacity="0.85"/>
  <ellipse cx="40" cy="28" rx="16" ry="10" fill="${c.shine}"/>`;
}

function friendsBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const extra=tier===4?`<polygon points="40,63 45,68 40,75 35,68" fill="${c.ring}" opacity="0.9"/><line x1="40" y1="55" x2="40" y2="63" stroke="${c.ring}" stroke-width="1.5"/>`:'';
  const inner=tier>=3?`<circle cx="40" cy="40" r="28" fill="none" stroke="${c.ring}" stroke-width="1" opacity="0.4"/>`:'';
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${_tierShield(tier)}${inner}
    <circle cx="32" cy="29" r="7.5" fill="white" opacity="0.95"/>
    <path d="M17,51 Q18,38 32,38 Q46,38 47,51" fill="white" opacity="0.9"/>
    <circle cx="51" cy="31" r="5.8" fill="white" opacity="0.78"/>
    <path d="M38,51 Q39,43 51,43 Q63,43 63,51" fill="white" opacity="0.7"/>
    ${extra}</svg>`;
}

function loginBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const calC=[,'#F06830','#5080A8','#C07800','#7040C0'][tier];
  const ckC =[,'#E85820','#4070A0','#B06800','#8040D0'][tier];
  const star=tier>=3?`<polygon points="40,24 42,29 47,29 43,32 45,37 40,34 35,37 37,32 33,29 38,29" fill="${tier===4?'#C090FF':'#FFD040'}"/>`:'';
  const sparkle=tier===4?`<line x1="27" y1="25" x2="27" y2="30" stroke="#C090FF" stroke-width="1.5" opacity="0.8"/><line x1="25" y1="27" x2="30" y2="27" stroke="#C090FF" stroke-width="1.5" opacity="0.8"/>`:'';
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${_tierShield(tier)}
    <rect x="21" y="22" width="38" height="33" rx="5" fill="white" opacity="0.95"/>
    <rect x="21" y="22" width="38" height="13" rx="5" fill="${calC}" opacity="0.9"/>
    <rect x="27" y="17" width="5" height="9" rx="2.5" fill="${c.dot}"/>
    <rect x="48" y="17" width="5" height="9" rx="2.5" fill="${c.dot}"/>
    <polyline points="29,43 37,51 53,33" fill="none" stroke="${ckC}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${star}${sparkle}</svg>`;
}

function roomBadgeSVG(tier) {
  const c = TIER_COLORS[tier];
  const roofC=[,'#F06830','#5080A8','#C07800','#8040C0'][tier];
  const badgeC=[,'#C07830','#7090B0','#B07000','#7030B0'][tier];
  const lvC=tier===4?'#E0B0FF':tier===3?'#FFD040':'white';
  const star=tier>=3?`<polygon points="40,19 42,24 47,24 43,27 45,32 40,29 35,32 37,27 33,24 38,24" fill="${tier===4?'#D090FF':'#FFD040'}"/>`:'';
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    ${_tierShield(tier)}
    <polygon points="40,19 63,35 63,60 17,60 17,35" fill="white" opacity="0.95"/>
    <polygon points="40,19 63,35 17,35" fill="${roofC}" opacity="0.9"/>
    <rect x="33" y="43" width="14" height="17" rx="3" fill="${roofC}" opacity="0.7"/>
    <circle cx="58" cy="60" r="11" fill="${badgeC}" stroke="${tier>=3?c.dot:'white'}" stroke-width="1.8"/>
    <text x="58" y="64" text-anchor="middle" font-size="10" font-weight="700" fill="${lvC}" font-family="sans-serif">LV</text>
    ${star}</svg>`;
}

function achievementBadgeSVG(key) {
  const configs = {
    first_login:{icon:'🚀',bg1:'#80C8FF',bg2:'#1840C0',outer:'#081060'},
    active_user:{icon:'⚡',bg1:'#FFE060',bg2:'#C07000',outer:'#7A4000'},
    social_star:{icon:'⭐',bg1:'#FFD080',bg2:'#C06000',outer:'#784000'},
    friend_of_all:{icon:'🌍',bg1:'#80E8A0',bg2:'#186030',outer:'#0A3018'},
    room_leader:{icon:'👑',bg1:'#FFD040',bg2:'#9A5000',outer:'#5A2800'},
    chat_pro:{icon:'💬',bg1:'#C0A8FF',bg2:'#4010B0',outer:'#200870'},
    vip:{icon:'💎',bg1:'#C8F8FF',bg2:'#0850B8',outer:'#04286A'},
    supporter:{icon:'❤️',bg1:'#FFA0C0',bg2:'#C02060',outer:'#700030'},
  };
  const cf=configs[key]||{icon:'✨',bg1:'#D0D0D0',bg2:'#606060',outer:'#303030'};
  const uid=key.replace(/_/g,'');
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ag${uid}" cx="45%" cy="35%" r="60%">
        <stop offset="0%" stop-color="${cf.bg1}"/><stop offset="100%" stop-color="${cf.bg2}"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="39" fill="${cf.outer}"/>
    ${[[40,3],[62,12],[77,34],[77,46],[62,68],[40,77],[18,68],[3,46],[3,34],[18,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="${cf.bg1}" opacity="0.7"/>`).join('')}
    <circle cx="40" cy="40" r="33" fill="url(#ag${uid})"/>
    <circle cx="40" cy="40" r="33" fill="none" stroke="${cf.bg1}" stroke-width="2" opacity="0.6"/>
    <ellipse cx="40" cy="28" rx="15" ry="9" fill="rgba(255,255,255,0.45)"/>
    <text x="40" y="49" text-anchor="middle" font-size="26" font-family="serif">${cf.icon}</text>
  </svg>`;
}

function adminBadgeSVG() {
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="rg_admin" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#FF8090"/><stop offset="100%" stop-color="#800020"/></radialGradient></defs>
    <circle cx="40" cy="40" r="39" fill="#300010"/>
    ${[[40,3],[62,12],[77,34],[77,46],[62,68],[40,77],[18,68],[3,46],[3,34],[18,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="#FF5070" opacity="0.9"/>`).join('')}
    <circle cx="40" cy="40" r="33" fill="url(#rg_admin)"/>
    <circle cx="40" cy="40" r="33" fill="none" stroke="#FF5070" stroke-width="2.5" opacity="0.8"/>
    <ellipse cx="40" cy="28" rx="15" ry="9" fill="rgba(255,180,200,0.4)"/>
    <text x="40" y="51" text-anchor="middle" font-size="30" font-family="serif">🛡</text>
  </svg>`;
}

function founderBadgeSVG() {
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="rg_found" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#C8E8FF"/><stop offset="100%" stop-color="#1830A8"/></radialGradient></defs>
    <circle cx="40" cy="40" r="39" fill="#081040"/>
    ${[[40,3],[62,12],[77,34],[77,46],[62,68],[40,77],[18,68],[3,46],[3,34],[18,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="#90C8FF" opacity="0.85"/>`).join('')}
    <circle cx="40" cy="40" r="33" fill="url(#rg_found)"/>
    <circle cx="40" cy="40" r="33" fill="none" stroke="#A8D8FF" stroke-width="2.2"/>
    <ellipse cx="40" cy="28" rx="15" ry="9" fill="rgba(180,220,255,0.5)"/>
    <polygon points="40,21 43,31 54,31 45,37 48,47 40,42 32,47 35,37 26,31 37,31" fill="#FFD040" opacity="0.97"/>
  </svg>`;
}

function legendBadgeSVG() {
  return `<svg width="60" height="60" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="rg_legend" cx="45%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#E8C0FF"/><stop offset="50%" stop-color="#8040D8"/><stop offset="100%" stop-color="#280898"/>
      </radialGradient>
      <filter id="glow_legend"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="40" cy="40" r="39" fill="#180058"/>
    ${[[40,3],[62,12],[77,34],[77,46],[62,68],[40,77],[18,68],[3,46],[3,34],[18,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.8" fill="#C080FF" opacity="0.9"/>`).join('')}
    <circle cx="40" cy="40" r="33" fill="url(#rg_legend)"/>
    <circle cx="40" cy="40" r="33" fill="none" stroke="#D090FF" stroke-width="2.5" opacity="0.9"/>
    <circle cx="40" cy="40" r="27" fill="none" stroke="#8040C0" stroke-width="1" opacity="0.5"/>
    <ellipse cx="40" cy="27" rx="15" ry="9" fill="rgba(240,200,255,0.45)"/>
    <polygon points="40,21 43,31 54,31 45,37 48,47 40,41 32,47 35,37 26,31 37,31" fill="#FFD040" filter="url(#glow_legend)" opacity="0.97"/>
    <path d="M12,55 C6,50 5,43 10,40 C8,48 14,52 20,50 C14,58 16,65 22,66" fill="#E8A000" opacity="0.9"/>
    <path d="M68,55 C74,50 75,43 70,40 C72,48 66,52 60,50 C66,58 64,65 58,66" fill="#E8A000" opacity="0.9"/>
  </svg>`;
}

function buildBadgeSVG(key) {
  const def = BADGE_DEFS[key];
  if (!def) return '';
  if (def.cat==='friends')     return friendsBadgeSVG(def.tier);
  if (def.cat==='login')       return loginBadgeSVG(def.tier);
  if (def.cat==='room')        return roomBadgeSVG(def.tier);
  if (def.cat==='achievement') return achievementBadgeSVG(key);
  if (key==='admin_badge')     return adminBadgeSVG();
  if (key==='founder')         return founderBadgeSVG();
  if (key==='legend')          return legendBadgeSVG();
  return '';
}

/* ── Level Badge Hex ── */
function levelBadgeSVG(level) {
  const tier = getLevelTier(level);
  const cfg = {
    bronze: {fill:'#C47B38',stroke:'#8A4800',glow:'#FFAA60',text:'white',wings:false,fire:false},
    silver: {fill:'#7890C0',stroke:'#405880',glow:'#B0D0F8',text:'white',wings:false,fire:false},
    gold:   {fill:'#D4A010',stroke:'#8A5800',glow:'#FFE060',text:'white',wings:false,fire:false},
    diamond:{fill:'#3858C8',stroke:'#0818A8',glow:'#80C8FF',text:'white',wings:true, fire:false},
    legend: {fill:'#6020C0',stroke:'#2008A0',glow:'#D080FF',text:'#FFE84A',wings:true,fire:true},
  };
  const cf = cfg[tier];
  const pts = '16,3 29,10 29,23 16,30 3,23 3,10';
  let wL='',wR='',fireEl='',ped='';
  if (cf.wings) {
    wL=`<path d="M3,13 C-3,9 -7,12 -5,17 C-3,21 2,19 4,17 C-1,22 -3,27 1,28 C5,29 8,23 10,19" fill="#E8A800" opacity="0.95"/>`;
    wR=`<path d="M29,13 C35,9 39,12 37,17 C35,21 30,19 28,17 C33,22 35,27 31,28 C27,29 24,23 22,19" fill="#E8A800" opacity="0.95"/>`;
  }
  if (cf.fire) {
    fireEl=`<ellipse cx="16" cy="33" rx="9" ry="4" fill="#FF6000" opacity="0.7"/><ellipse cx="16" cy="33" rx="6" ry="3" fill="#FFB800" opacity="0.8"/>`;
    ped=`<rect x="10" y="30" width="12" height="4" rx="1.5" fill="#4010A0" stroke="#FFD700" stroke-width="0.6"/>`;
  } else if (cf.wings) {
    ped=`<rect x="10" y="30" width="12" height="4" rx="1.5" fill="#1030A8" stroke="#A0C8FF" stroke-width="0.6"/>`;
  }
  return `<svg viewBox="-10 0 52 38" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="lbg${level}" cx="45%" cy="35%" r="60%">
        <stop offset="0%" stop-color="${cf.glow}"/><stop offset="100%" stop-color="${cf.fill}"/>
      </radialGradient>
      <filter id="lglow${level}"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${fireEl}${wL}${wR}
    <polygon points="${pts}" fill="${cf.stroke}" filter="url(#lglow${level})"/>
    <polygon points="${pts}" fill="url(#lbg${level})"/>
    <polygon points="${pts}" fill="rgba(255,255,255,0.12)"/>
    <ellipse cx="16" cy="13" rx="7" ry="4" fill="rgba(255,255,255,0.25)"/>
    <text x="16" y="21" text-anchor="middle" font-size="${level>=100?'7.5':'9'}" font-weight="800" fill="${cf.text}" font-family="sans-serif" letter-spacing="-0.5">${level}</text>
    ${ped}
  </svg>`;
}

/* ── Badge Detail Popup ── */
function showBadgeDetail(key, earnedDate) {
  const def = BADGE_DEFS[key];
  if (!def) return;
  const rarityColor = RARITY_COLORS[def.rarity] || '#888';
  const svg = buildBadgeSVG(key);
  const dateStr = earnedDate ? new Date(earnedDate).toLocaleDateString('ar') : 'غير محدد';
  let modal = document.getElementById('modal-badge-detail');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-badge-detail';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="text-align:center">
      <div class="modal-handle"></div>
      <div id="badge-detail-svg" style="display:flex;justify-content:center;margin:8px 0 16px"></div>
      <div id="badge-detail-name" style="font-size:20px;font-weight:700;margin-bottom:6px"></div>
      <div id="badge-detail-rarity" style="font-size:12px;font-weight:600;padding:3px 12px;border-radius:20px;display:inline-block;margin-bottom:12px"></div>
      <div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;text-align:right">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:5px">📋 سبب الحصول</div>
        <div id="badge-detail-desc" style="font-size:14px;color:var(--text-primary)"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <div style="flex:1;background:var(--bg-input);border-radius:var(--radius-sm);padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-secondary)">📅 تاريخ الحصول</div>
          <div id="badge-detail-date" style="font-size:13px;font-weight:600;margin-top:4px"></div>
        </div>
        <div style="flex:1;background:var(--bg-input);border-radius:var(--radius-sm);padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--text-secondary)">✨ المميزات</div>
          <div id="badge-detail-perks" style="font-size:13px;font-weight:600;margin-top:4px"></div>
        </div>
      </div>
      <button class="btn-outline" onclick="closeModal('modal-badge-detail')" style="width:100%;justify-content:center">إغلاق</button>
    </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('badge-detail-svg').innerHTML = svg;
  document.getElementById('badge-detail-name').textContent = def.name;
  const re = document.getElementById('badge-detail-rarity');
  re.textContent = def.rarity;
  re.style.cssText = `font-size:12px;font-weight:600;padding:3px 12px;border-radius:20px;display:inline-block;margin-bottom:12px;background:${rarityColor}22;color:${rarityColor};border:1px solid ${rarityColor}55`;
  document.getElementById('badge-detail-desc').textContent = def.desc;
  document.getElementById('badge-detail-date').textContent = dateStr;
  document.getElementById('badge-detail-perks').textContent = def.perks || '—';
  openModal('modal-badge-detail');
}

/* ── Room Level Badge ── */
function roomLevelBadgeSVG(xp) {
  const info = getRoomLevelInfo(xp);
  const bgs = [{bg:'#8B7355',glow:'#C0A070'},{bg:'#3A7090',glow:'#70C0E0'},{bg:'#B08800',glow:'#FFD840'},{bg:'#6030A8',glow:'#C080FF'},{bg:'#C83000',glow:'#FF9040'}];
  const cf = bgs[info.tier]||bgs[0];
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="rlg${info.tier}" cx="45%" cy="35%" r="65%"><stop offset="0%" stop-color="${cf.glow}"/><stop offset="100%" stop-color="${cf.bg}"/></radialGradient></defs>
    <rect x="1" y="1" width="30" height="30" rx="8" fill="${cf.bg}" opacity="0.3"/>
    <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#rlg${info.tier})"/>
    <text x="16" y="21" text-anchor="middle" font-size="16" font-family="serif">${info.emoji}</text>
  </svg>`;
}

/* ── Time ── */
function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});
}
function formatLastSeen(ts) {
  if (!ts) return 'غير معروف';
  const diff = Date.now()-ts;
  if (diff<60000) return 'للتو';
  if (diff<3600000) return `منذ ${Math.floor(diff/60000)} د`;
  if (diff<86400000) return `منذ ${Math.floor(diff/3600000)} س`;
  return `منذ ${Math.floor(diff/86400000)} يوم`;
}

const COUNTRIES=['السعودية','الإمارات','مصر','الكويت','قطر','البحرين','عُمان','الأردن','العراق','سوريا','لبنان','اليمن','ليبيا','تونس','الجزائر','المغرب','السودان','موريتانيا','الصومال','جيبوتي','جزر القمر','فلسطين','المملكة المتحدة','الولايات المتحدة','كندا','أستراليا','ألمانيا','فرنسا','تركيا','غيرها'];
const MALE_AVATARS=['👦','🧑','👨','🧔','👲','🧑‍💼','👨‍💻','🧑‍🎤','👨‍🎓','👨‍✈️','🦸‍♂️','🧙‍♂️'];
const FEMALE_AVATARS=['👧','👩','🧑‍🦰','👩‍🦱','👩‍🦳','🧑‍💼','👩‍💻','🧑‍🎤','👩‍🎓','👩‍✈️','🦸‍♀️','🧝‍♀️'];
const EMOJI_LIST=['😀','😂','🥰','😍','🤩','😎','🥳','😜','👍','👏','🙌','🔥','💯','❤️','💜','⭐','😢','😭','😤','😱','🤔','🤣','😅','🫡','🎉','🎊','🏆','💎','✨','🌟','💫','🙏','👑','🛡️','⚔️','🎯','💪','🤝','🫶','❓'];

function showToast(msg) {
  let t=document.getElementById('app-toast');
  if (!t){t=document.createElement('div');t.id='app-toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}
function genUID6(){return String(Math.floor(100000+Math.random()*900000));}
function sanitize(str){if(!str)return '';return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function getChatId(a,b){return [a,b].sort().join('_');}
function isAdmin(uid){return typeof ADMIN_UIDS!=='undefined'&&ADMIN_UIDS.includes(uid);}
