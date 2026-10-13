(function(){

const APP_VERSION = 'v0.9.5';

const CATS = {
  politique:  {label:"Politique",  color:"#8A6A34"},
  science:    {label:"Science",    color:"#3F7A72"},
  culture:    {label:"Culture",    color:"#8F4F68"},
  guerre:     {label:"Guerre",     color:"#8C4038"},
  religion:   {label:"Religion",   color:"#48607E"},
  decouverte: {label:"Découverte", color:"#5C7A3C"},
  personnage: {label:"Personnage", color:"#9C8347", protected:true},
  sans_categorie: {label:"Sans catégorie", color:"#8A8F98", locked:true},
};

let isDarkMode = false;
let timelineShowImages = true; // réglage « Images sur la frise »
const COLORS = {
  ink:'#1E2530', slate:'#5A6275', slateDim:'#93998F',
  brass:'#8A6A34', line:'rgba(138,106,52,0.28)'
};
function brassA(a){ return isDarkMode ? `rgba(201,169,97,${a})` : `rgba(138,106,52,${a})`; }
function inkA(a){ return isDarkMode ? `rgba(237,230,214,${a})` : `rgba(30,37,48,${a})`; }
function applyCanvasTheme(){
  COLORS.ink = isDarkMode ? '#EDE6D6' : '#1E2530';
  COLORS.slate = isDarkMode ? '#A69C86' : '#5A6275';
  COLORS.slateDim = isDarkMode ? '#786F5D' : '#93998F';
  COLORS.brass = isDarkMode ? '#C9A961' : '#8A6A34';
  COLORS.line = brassA(0.28);
}
function catOf(key){ return CATS[key] || CATS.sans_categorie; }

/* ---------- Catégories multiples (v0.7) ----------
   Chaque élément possède désormais un tableau "cats" (ex : ['personnage','deluge','lignee_jesus']).
   La première catégorie est la catégorie principale : c'est elle qui donne sa couleur sur la frise et la carte.
   Le champ historique "cat" est conservé et toujours égal à cats[0], pour rester compatible
   avec les anciennes sauvegardes et les fichiers exportés par la v0.6. */
function itemCats(it){ return (Array.isArray(it.cats) && it.cats.length) ? it.cats : [it.cat || 'sans_categorie']; }
function itemHasCat(it, key){ return itemCats(it).includes(key); }
function itemInCats(it, set){ return itemCats(it).some(k=>set.has(k)); }
function normalizeItemCats(it){
  let arr = (Array.isArray(it.cats) && it.cats.length) ? it.cats.slice() : [it.cat || 'sans_categorie'];
  arr = [...new Set(arr.filter(k=>CATS[k]))];
  if(arr.length>1) arr = arr.filter(k=>k!=='sans_categorie');
  if(!arr.length) arr = ['sans_categorie'];
  it.cats = arr; it.cat = arr[0];
  return it;
}
function escapeHtml(str){
  return String(str==null?'':str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Gestion du premier plan pour les modales pouvant s'ouvrir l'une par-dessus l'autre
// (ex : ajouter un événement depuis la carte, ou choisir un lieu sur la carte depuis le formulaire)
/* ---------- Notes et mentions de liens (v0.9) ----------
   Une adresse internet saisie dans une note n'est pas affichée en entier (elle mangerait la ligne) :
   elle devient une mention compacte, à la manière de Notion — domaine + titre de page deviné d'après
   la fin de l'adresse. L'adresse complète reste visible en infobulle et au survol. */
const NOTE_URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
function mentionLabel(url){
  try{
    const u = new URL(url.startsWith('www.') ? 'https://'+url : url);
    const host = u.hostname.replace(/^www\./,'');
    const parts = decodeURIComponent(u.pathname).split('/').filter(Boolean);
    const last = parts.length ? parts[parts.length-1] : '';
    if(last && last.length<=30 && !/^\d+$/.test(last)){
      const pretty = last.replace(/\.(html?|php|aspx?|pdf)$/i,'').replace(/[-_]+/g,' ').trim();
      if(pretty.length>=4) return host+' · '+pretty; // en dessous, c'est presque toujours un code de langue (/fr/, /en/)
    }
    return host;
  }catch(err){
    return url.replace(/^https?:\/\//,'').slice(0,40);
  }
}

/* ---------- Renvois d'un événement à l'autre (v0.9.5) ----------
   Le bouton « copier le lien » d'une fiche produit une adresse du type
   .../Bibline/#e=<identifiant>&t=<titre>. Collée dans une description ou une note, elle s'affiche
   comme un simple #Titre cliquable ; collée dans une autre application, elle ouvre Bibline sur
   l'événement. Le titre est transporté en plus de l'identifiant car celui-ci est propre à chaque
   appareil : un élément reçu par « Recevoir » y porte un autre identifiant. Si l'identifiant ne
   correspond à rien ici, le titre prend le relais.
   Taper directement #Titre fonctionne aussi : le plus long titre existant qui suit le dièse est
   reconnu, ce qui permet les noms à espaces. Sans correspondance, le texte reste du texte. */
function eventLink(it){
  return location.origin + location.pathname
    + '#e=' + encodeURIComponent(it.id) + '&t=' + encodeURIComponent(it.t);
}
function parseEventHash(hash){
  const h = String(hash||'').replace(/^#/,'');
  if(!/^e=/.test(h)) return null;
  const p = new URLSearchParams(h);
  return {id:p.get('e'), t:p.get('t')};
}
function findEventByRef(ref){
  if(!ref) return null;
  let it = ref.id ? ALL_ITEMS.find(x=>x.id===ref.id) : null;
  if(!it && ref.t){
    const n = normalize(ref.t);
    it = ALL_ITEMS.find(x=>normalize(x.t)===n);
  }
  return it || null;
}
// Titres classés du plus long au plus court : « Noé et le déluge » l'emporte ainsi sur « Noé »
let TITLE_INDEX = null;
function titleIndex(){
  if(!TITLE_INDEX){
    TITLE_INDEX = ALL_ITEMS.filter(it=>it.t && it.t.trim())
      .map(it=>({it, len:it.t.length, norm:normalize(it.t)}))
      .sort((a,b)=>b.len-a.len);
  }
  return TITLE_INDEX;
}
function invalidateTitleIndex(){ TITLE_INDEX = null; }
// Cherche, à cette position du texte, le titre d'événement le plus long qui corresponde
function matchEventTitleAt(text, pos){
  const rest = text.slice(pos, pos+120);
  const restNorm = normalize(rest);
  for(const entry of titleIndex()){
    if(entry.len > rest.length) continue;
    if(restNorm.startsWith(entry.norm) && normalize(rest.slice(0, entry.len))===entry.norm){
      return {item:entry.it, length:entry.len};
    }
  }
  return null;
}
function eventTagHtml(item, shownTitle){
  return `<a class="note-event" href="${escapeHtml(eventLink(item))}" data-event-id="${escapeHtml(item.id)}"`
       + ` title="${escapeHtml(T().goToEventTitle(item.t))}"><span class="ne-icon">#</span>${escapeHtml(shownTitle)}</a>`;
}
// Texte courant : les #Titre deviennent des renvois, le reste part vers la détection des versets
function eventTagsToHtml(text){
  if(!text) return '';
  let out='', last=0;
  for(let i=0;i<text.length;i++){
    if(text[i] !== '#') continue;
    // Un dièse collé à un mot (couleur #8A6A34, mot-dièse) n'ouvre pas un renvoi
    if(i>0 && /[\p{L}\p{N}]/u.test(text[i-1])) continue;
    const found = matchEventTitleAt(text, i+1);
    if(!found) continue;
    out += bibleTextToHtml(text.slice(last, i));
    out += eventTagHtml(found.item, text.substr(i+1, found.length));
    last = i + 1 + found.length;
    i = last - 1;
  }
  out += bibleTextToHtml(text.slice(last));
  return out;
}

function noteToHtml(text){
  if(!text) return '';
  let out='', last=0, m;
  const re = new RegExp(NOTE_URL_RE.source, 'gi');
  while((m = re.exec(text))!==null){
    let raw = m[0], tail='';
    // La ponctuation finale appartient à la phrase, pas à l'adresse
    const trail = raw.match(/[.,;:!?»)\]]+$/);
    if(trail){ tail = trail[0]; raw = raw.slice(0, raw.length-tail.length); }
    if(!raw) continue;
    const href = raw.startsWith('www.') ? 'https://'+raw : raw;
    out += eventTagsToHtml(text.slice(last, m.index));
    let ref = null;
    try{ ref = parseEventHash(new URL(href).hash); }catch(err){ ref = null; }
    const linked = ref ? findEventByRef(ref) : null;
    if(ref && linked){
      // Lien Bibline collé : il s'affiche comme le renvoi qu'il est, pas comme une adresse
      out += eventTagHtml(linked, linked.t);
    } else if(ref){
      out += escapeHtml('#' + (ref.t || '?')); // événement absent de cet appareil : texte simple
    } else {
      out += `<a class="note-mention" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(href)}">`
          +  `<span class="nm-icon">🔗</span><span class="nm-label">${escapeHtml(mentionLabel(raw))}</span></a>`;
    }
    out += escapeHtml(tail);
    last = m.index + m[0].length;
  }
  out += eventTagsToHtml(text.slice(last));
  return out;
}
function renderNote(container, text){
  const html = noteToHtml((text||'').trim());
  container.innerHTML = html;
  container.classList.toggle('has-data', !!html);
}

/* Message fugitif en bas de l'écran (lien copié, événement introuvable…) */
let toastTimer = null;
function showToast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2600);
}
// Le presse-papiers moderne exige une page servie en HTTPS : repli sur l'ancienne méthode sinon
async function copyText(text){
  try{
    if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); return true; }
  }catch(err){ /* on tente le repli ci-dessous */ }
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position='fixed'; ta.style.top='-1000px'; ta.style.opacity='0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(err){ return false; }
}

let topmostZ = 70;
function bringToFront(el){ topmostZ++; el.style.zIndex = topmostZ; }

const ERAS = [
  {start:-4500, end:-3300, title:"Néolithique", abbr:"NÉO."},
  {start:-3300, end:476,   title:"Antiquité", abbr:"ANTIQ."},
  {start:476,   end:1492,  title:"Moyen Âge", abbr:"M.-ÂGE"},
  {start:1492,  end:1650,  title:"Renaissance", abbr:"RENAIS."},
  {start:1650,  end:1789,  title:"Époque moderne", abbr:"ÉP. MOD."},
  {start:1789,  end:2026,  title:"Époque contemporaine", abbr:"ÉP. CONT."},
];
function eraOf(year){ return ERAS.find(e=>year>=e.start && year<e.end) || null; }

// Les événements et périodes livrés avec l'application sont dans data.json : ces deux tableaux
// démarrent vides et sont remplis au lancement, soit depuis la base locale, soit depuis ce fichier.
const EVENTS = [];

const PERIOD_ITEMS = [];


let ALL_ITEMS = EVENTS.concat(PERIOD_ITEMS);
function rebuildAllItems(){ ALL_ITEMS = EVENTS.concat(PERIOD_ITEMS); invalidateTitleIndex(); schedulePersist(); }
function genId(prefix){ return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ---------- Calendrier (pour la précision mois / jour) ---------- */
const MONTH_ABBR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const MONTH_FULL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const MONTH_LEN = [31,28,31,30,31,30,31,31,30,31,30,31];

function isLeapYear(y){ return (y%4===0 && (y%100!==0 || y%400===0)); }
function daysInYear(y){ return isLeapYear(y)?366:365; }
function daysInMonth(y,m){ return m===1 ? (isLeapYear(y)?29:28) : MONTH_LEN[m]; }
function yearFracToYMD(yf){
  let y=Math.floor(yf);
  let rem=(yf-y)*daysInYear(y);
  let dayIdx=Math.floor(rem);
  let m=0;
  while(dayIdx>=daysInMonth(y,m)){ dayIdx-=daysInMonth(y,m); m++; }
  return {y,m,d:dayIdx};
}
function ymdToYearFrac(y,m,d,hourFrac){
  let days=0;
  for(let i=0;i<m;i++) days+=daysInMonth(y,i);
  days+=d;
  if(hourFrac) days += hourFrac/24;
  return y+days/daysInYear(y);
}
function addMonthsYM(y,m,count){
  const total=m+count;
  const yy=y+Math.floor(total/12);
  const mm=((total%12)+12)%12;
  return {y:yy,m:mm};
}
function addDaysYMD(y,m,d,count){
  d+=count;
  while(d>=daysInMonth(y,m)){ d-=daysInMonth(y,m); m++; if(m>11){m=0;y++;} }
  while(d<0){ m--; if(m<0){m=11;y--;} d+=daysInMonth(y,m); }
  return {y,m,d};
}

/* ---------- État de la vue ---------- */
const MIN_YEAR = -4500, MAX_YEAR = 2036;
const MIN_SPAN = 0.02;
const PAD_START = 36;          // marge de départ (gauche en paysage / haut en portrait)
const PAD_END_H = 170;         // marge de fin en paysage : espace réservé aux libellés du dernier événement
const PAD_END_V = 40;          // marge de fin en portrait
function eventBaseOffset(){ return isVertical ? 88 : 64; }
const PERIOD_BASE_OFFSET = -26;

let viewStart = MIN_YEAR, viewEnd = MAX_YEAR;
let activeCats = new Set(Object.keys(CATS));
let markerRects = [];
let periodRects = [];
let allChipEls = {};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let dpr = Math.max(1, window.devicePixelRatio || 1);
let W=0, H=0, contentMain=0;
let isVertical = false;
let AXIS_CROSS = 0;
let ERA_THICKNESS = 220;

let uiReady = false;      // passe à true une fois toute l'interface construite
let lastVertical = null;  // orientation du rendu précédent, pour ne réagir qu'aux vrais changements
function updateLayout(){
  isVertical = H > W;
  if(isVertical){
    contentMain = Math.max(10, H - PAD_START - PAD_END_V);
    AXIS_CROSS = Math.max(90, Math.min(170, W*0.36));
    ERA_THICKNESS = Math.max(50, AXIS_CROSS - 14);
  } else {
    contentMain = Math.max(10, W - PAD_START - PAD_END_H);
    AXIS_CROSS = H*0.46;
    ERA_THICKNESS = 220;
  }
  document.getElementById('app').classList.toggle('portrait', isVertical);
  if(lastVertical !== null && lastVertical !== isVertical) syncDetailOrientation();
  lastVertical = isVertical;
}

function resize(){
  const rect = canvas.getBoundingClientRect();
  W = rect.width; H = rect.height;
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  updateLayout();
  if(typeof resizeMinimap==='function') resizeMinimap();
  render();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', ()=> setTimeout(resize,60));

/* ---------- Abstraction d'axe : "main" = dimension temps, "cross" = dimension perpendiculaire ---------- */
function timeToMain(y){ return PAD_START + (y - viewStart) / (viewEnd - viewStart) * contentMain; }
function mainToTime(pix){ return viewStart + ((pix-PAD_START)/contentMain) * (viewEnd - viewStart); }
function pt(mainPix, crossOffset){
  return isVertical ? {x:AXIS_CROSS+crossOffset, y:mainPix} : {x:mainPix, y:AXIS_CROSS+crossOffset};
}
function mainOf(clientX, clientY, rect){
  const mx=clientX-rect.left, my=clientY-rect.top;
  return isVertical ? my : mx;
}

function pad2(n){ return String(n).padStart(2,'0'); }
function formatYear(y){ y = Math.round(y); return y < 0 ? `${Math.abs(y)} av. n. è.` : `${y}`; }
function formatDatePart(year, month, day, hour, minute){
  if(day && month){
    let s = `${day} ${MONTH_FULL[month-1]} ${formatYear(year)}`;
    if(hour!=null) s += ` · ${pad2(hour)}:${pad2(minute||0)}`;
    return s;
  }
  if(month) return `${MONTH_FULL[month-1]} ${formatYear(year)}`;
  return formatYear(year);
}
function formatFullDate(e){
  const year = e.year!=null ? e.year : Math.floor(e.y);
  const prefix = e.approx ? 'Vers ' : '';
  return prefix + formatDatePart(year, e.month, e.day, e.hour, e.minute);
}
function shade(hex, percent){
  const num = parseInt(hex.slice(1),16);
  let r=(num>>16)+percent, g=((num>>8)&0xff)+percent, b=(num&0xff)+percent;
  r=Math.min(255,Math.max(0,r)); g=Math.min(255,Math.max(0,g)); b=Math.min(255,Math.max(0,b));
  return `rgb(${r},${g},${b})`;
}
function roundRect(x,y,w,h,r){
  r = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function fitText(text, maxWidth){
  if(maxWidth<=0) return '';
  if(ctx.measureText(text).width<=maxWidth) return text;
  let t=text;
  while(t.length>1 && ctx.measureText(t+'…').width>maxWidth) t=t.slice(0,-1);
  return t.length>1 ? t+'…' : t;
}

/* ---------- Graduations adaptatives : année → mois → jour ---------- */
const YEAR_STEPS=[1,2,5,10,20,50,100,200,500,1000,2000];
const MONTH_STEPS=[1,2,3,6];
const DAY_STEPS=[1,2,5,10,15];

function pickTickPlan(){
  const span = viewEnd-viewStart;
  const pxPerYear = contentMain/span;
  if(span > 6){
    ctx.font = "11px 'Montserrat',sans-serif";
    for(const s of YEAR_STEPS){
      const spacingPx = s*pxPerYear;
      const sampleY = Math.floor(viewStart/s)*s;
      const labelW = ctx.measureText(formatYear(sampleY)).width;
      const minGap = isVertical ? 36 : Math.max(85, labelW+26);
      if(spacingPx >= minGap) return {unit:'year', step:s};
    }
    return {unit:'year', step:YEAR_STEPS[YEAR_STEPS.length-1]};
  }
  if(span > 0.45){
    for(const s of MONTH_STEPS) if((s/12)*pxPerYear>=(isVertical?32:85)) return {unit:'month', step:s};
    return {unit:'month', step:6};
  }
  for(const s of DAY_STEPS) if((s/365.25)*pxPerYear>=(isVertical?28:70)) return {unit:'day', step:s};
  return {unit:'day', step:DAY_STEPS[DAY_STEPS.length-1]};
}

function generateTicks(plan){
  const ticks=[];
  if(plan.unit==='year'){
    const interval=plan.step, minor=interval/5;
    const majorStart = Math.ceil(viewStart/interval)*interval;
    for(let y=majorStart-interval; y<=viewEnd+interval; y+=interval){
      ticks.push({yf:y, major:true, label:formatYear(y)});
    }
    const minorStart = Math.ceil(viewStart/minor)*minor;
    for(let y=minorStart-minor; y<=viewEnd+minor; y+=minor){
      const modVal = ((y % interval)+interval) % interval;
      if(modVal > 1e-6 && Math.abs(modVal-interval) > 1e-6){
        ticks.push({yf:y, major:false, label:null});
      }
    }
  } else if(plan.unit==='month'){
    let {y,m} = yearFracToYMD(viewStart);
    m = m - (m % plan.step);
    let cur={y,m}, safety=0;
    while(safety++<400){
      const yf = ymdToYearFrac(cur.y,cur.m,0);
      if(yf > viewEnd+0.05) break;
      if(yf >= viewStart-0.2) ticks.push({yf, major:true, label:`${MONTH_ABBR[cur.m]} ${formatYear(cur.y)}`});
      cur = addMonthsYM(cur.y,cur.m,plan.step);
    }
  } else {
    let {y,m,d} = yearFracToYMD(viewStart);
    d = d - (d % plan.step);
    let cur={y,m,d}, safety=0;
    while(safety++<800){
      const yf = ymdToYearFrac(cur.y,cur.m,cur.d);
      if(yf > viewEnd+0.02) break;
      if(yf >= viewStart-0.05){
        const label = cur.d===0 ? `${MONTH_ABBR[cur.m]} ${formatYear(cur.y)}` : `${cur.d+1} ${MONTH_ABBR[cur.m]}`;
        ticks.push({yf, major:true, label});
      }
      cur = addDaysYMD(cur.y,cur.m,cur.d,plan.step);
    }
  }
  return ticks;
}

/* ---------- Rendu ---------- */
function render(){
  ctx.clearRect(0,0,W,H);
  drawEras();
  drawPeriodBars();
  drawAxis();
  drawEvents();
  if(typeof renderMinimap==='function') renderMinimap();
  updateResetViewVisibility();
}
function updateResetViewVisibility(){
  // En portrait, le bouton reste entièrement géré par CSS (toujours masqué) : on ne touche à rien.
  if(isVertical) return;
  const btn = document.getElementById('reset-view');
  if(!btn) return;
  const isDefaultView = Math.abs(viewStart-MIN_YEAR) < 0.5 && Math.abs(viewEnd-MAX_YEAR) < 0.5;
  btn.style.display = isDefaultView ? 'none' : 'flex';
}

function drawEras(){
  const crossFar = -ERA_THICKNESS;
  const ERA_GAP = 1.5; // petite marge entre deux bandes adjacentes, pour qu'elles ne collent plus l'une à l'autre
  ERAS.forEach((p,i)=>{
    const m1=Math.max(PAD_START, timeToMain(p.start));
    const m2=Math.min(PAD_START+contentMain, timeToMain(p.end));
    if(m2<PAD_START || m1>PAD_START+contentMain) return;
    const A=pt(m1+ERA_GAP,crossFar), B=pt(m2-ERA_GAP,0);
    const rx=Math.min(A.x,B.x), ry=Math.min(A.y,B.y), rw=Math.max(0,Math.abs(B.x-A.x)), rh=Math.max(0,Math.abs(B.y-A.y));
    ctx.fillStyle = i%2===0 ? brassA(0.05) : (isDarkMode?'rgba(111,168,160,0.08)':'rgba(63,122,114,0.06)');
    ctx.fillRect(rx,ry,rw,rh);
    const S1=pt(m2,crossFar), S2=pt(m2,0);
    ctx.strokeStyle=brassA(0.2); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(S1.x,S1.y); ctx.lineTo(S2.x,S2.y); ctx.stroke();

    const bandExtent = m2-m1;
    if(bandExtent>16){
      ctx.font="600 11px 'Montserrat',sans-serif";
      // largeur disponible pour le texte : le long de la bande en paysage, l'épaisseur de la bande en portrait
      const available = isVertical ? (ERA_THICKNESS-20) : (bandExtent-16);
      const fullLabel = p.title.toUpperCase();
      const fullW = ctx.measureText(fullLabel).width;
      const abbrW = ctx.measureText(p.abbr).width;
      let label = null;
      if(fullW <= available) label = fullLabel;
      else if(abbrW <= available) label = p.abbr;
      // sinon : aucune place, on n'affiche rien plutôt que de superposer du texte tronqué illisible

      if(label){
        const labelMain = isVertical ? Math.min(Math.max(m1,PAD_START+6), m2-6) : Math.min(Math.max(m1,PAD_START+10), m2-10);
        const LP = pt(labelMain, crossFar+10);
        ctx.fillStyle=brassA(0.85);
        ctx.textBaseline='top'; ctx.textAlign='left';
        ctx.fillText(label, LP.x, LP.y);
      }
    }
  });
}

/* ---------- Décongestion en vue globale : les catégories non "mises en avant" restent visibles, mais en transparence et sans texte ---------- */
const OVERVIEW_THRESHOLD_YEARS = 1200;
let overviewFilterEnabled = true;
let overviewCats = new Set(['personnage']);
/* Condition supplémentaire (v0.9.5) : catégories qui ne s'affichent pas d'elles-mêmes mais
   restreignent celles ci-dessus. « Personnage » au-dessus et « Religion » ici : seuls les éléments
   qui portent les deux restent au premier plan en vue très dézoomée. Plusieurs catégories ici
   élargissent la condition (il suffit d'en porter une), sinon la frise se viderait d'un coup. */
let overviewRequiredCats = new Set();
function isItemEmphasized(it){
  if(overviewFilterEnabled && (viewEnd-viewStart) > OVERVIEW_THRESHOLD_YEARS){
    if(!itemInCats(it, overviewCats)) return false;
    if(overviewRequiredCats.size && !itemInCats(it, overviewRequiredCats)) return false;
  }
  return true;
}

function drawPeriodBars(){
  periodRects=[];
  const activeItems = PERIOD_ITEMS.filter(p=>itemInCats(p, activeCats) && p.end>=viewStart-50 && p.start<=viewEnd+50);
  const dimmed = activeItems.filter(p=>!isItemEmphasized(p));
  const emphasized = activeItems.filter(p=>isItemEmphasized(p)).sort((a,b)=>a.start-b.start);

  // Catégories en retrait : simple bande fine et translucide, sans texte, pour ne pas surcharger la vue
  dimmed.forEach(p=>{
    const m1=Math.max(PAD_START-20, timeToMain(p.start));
    const m2=Math.min(PAD_START+contentMain+20, timeToMain(p.end));
    const color = catOf(p.cat).color;
    const c1=pt(m1, PERIOD_BASE_OFFSET-4), c2=pt(m2, PERIOD_BASE_OFFSET+4);
    const rx=Math.min(c1.x,c2.x), ry=Math.min(c1.y,c2.y);
    const rw=Math.max(2,Math.abs(c2.x-c1.x)), rh=Math.max(2,Math.abs(c2.y-c1.y));
    ctx.fillStyle=color+'30'; ctx.strokeStyle='transparent';
    roundRect(rx,ry,rw,rh,3);
    ctx.fill();
    periodRects.push({x:rx,y:ry,w:rw,h:rh,item:p});
  });

  const rowGap=22;
  const maxRows = Math.max(1, Math.min(6, Math.floor((ERA_THICKNESS-20)/rowGap)));
  const rowEndMain=[];
  emphasized.forEach(p=>{
    const m1=Math.max(PAD_START-20, timeToMain(p.start));
    const m2=Math.min(PAD_START+contentMain+20, timeToMain(p.end));
    ctx.font="600 11px 'Montserrat',sans-serif";
    const labelW = ctx.measureText(p.t).width;
    const barLen = Math.max(2, m2-m1);
    const showInside = !isVertical && barLen > labelW+20;
    const afterExtent = isVertical ? 16 : (labelW+14);
    const extentMain = showInside ? barLen : barLen+afterExtent;

    let row=0;
    while(row<maxRows && rowEndMain[row]!==undefined && rowEndMain[row] > m1-10) row++;
    if(row>=maxRows) row=maxRows-1;
    rowEndMain[row] = m1+extentMain;
    const crossOffset = PERIOD_BASE_OFFSET - row*rowGap;
    const color = catOf(p.cat).color;

    const c1=pt(m1, crossOffset-6), c2=pt(m2, crossOffset+6);
    const rx=Math.min(c1.x,c2.x), ry=Math.min(c1.y,c2.y);
    const rw=Math.max(2,Math.abs(c2.x-c1.x)), rh=Math.max(2,Math.abs(c2.y-c1.y));
    ctx.fillStyle=color+'22'; ctx.strokeStyle=color; ctx.lineWidth=1.4;
    roundRect(rx,ry,rw,rh,5);
    ctx.fill(); ctx.stroke();

    ctx.font="600 11px 'Montserrat',sans-serif"; ctx.textBaseline='middle';
    if(showInside){
      const mid=pt((m1+m2)/2, crossOffset);
      ctx.textAlign='center'; ctx.fillStyle='#FBF8EF';
      ctx.fillText(p.t, mid.x, mid.y);
    } else {
      const after=pt(m2+8, crossOffset);
      ctx.fillStyle=COLORS.ink;
      if(isVertical){
        ctx.textAlign='right';
        ctx.fillText(fitText(p.t, Math.max(30, after.x-8)), after.x, after.y);
      } else {
        ctx.textAlign='left';
        ctx.fillText(p.t, after.x, after.y);
      }
    }
    periodRects.push({x:rx,y:ry,w:rw,h:rh,item:p});
  });
}

function drawAxis(){
  const A=pt(PAD_START,0), B=pt(PAD_START+contentMain,0);
  const grad=ctx.createLinearGradient(A.x,A.y,B.x,B.y);
  grad.addColorStop(0,brassA(0.15));
  grad.addColorStop(0.5,brassA(0.8));
  grad.addColorStop(1,brassA(0.15));
  ctx.strokeStyle=grad; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();

  const plan = pickTickPlan();
  const ticks = generateTicks(plan);

  ctx.font="11px 'Montserrat',sans-serif";
  ticks.forEach(tk=>{
    const m=timeToMain(tk.yf);
    if(m<PAD_START-30||m>PAD_START+contentMain+30) return;
    const tickLen = tk.major?10:4;
    const P1=pt(m,-tickLen), P2=pt(m,tickLen);
    ctx.strokeStyle = tk.major?brassA(0.8):brassA(0.28);
    ctx.lineWidth = tk.major?1.3:1;
    ctx.beginPath(); ctx.moveTo(P1.x,P1.y); ctx.lineTo(P2.x,P2.y); ctx.stroke();
    if(tk.label){
      ctx.fillStyle=COLORS.slate;
      if(isVertical){
        const LP=pt(m, tickLen+6);
        ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(tk.label, LP.x, LP.y);
      } else {
        const LP=pt(m, 14);
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(tk.label, LP.x, LP.y);
      }
    }
  });
}

/* ---------- Cache d'images pour les vignettes de la frise ---------- */
const thumbImageCache = {};
function getThumbImage(url){
  if(!url) return null;
  let entry = thumbImageCache[url];
  if(!entry){
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    entry = {img, loaded:false, error:false};
    thumbImageCache[url] = entry;
    img.onload = ()=>{ entry.loaded = true; render(); };
    img.onerror = ()=>{ entry.error = true; };
    img.src = url;
  }
  return entry;
}

function parseImgPosition(pos){
  const p = (pos||'center center').split(' ');
  const fx = p.includes('left') ? 0 : p.includes('right') ? 1 : 0.5;
  const fy = p.includes('top') ? 0 : p.includes('bottom') ? 1 : 0.5;
  return {fx, fy};
}

function drawThumb(x,y,color,letter,imgUrl,thumbW,thumbH,imgPosition){
  const w=thumbW||30, h=thumbH||22, rx=x-w/2, ry=y-h/2, radius=Math.min(8, w*0.08);
  const entry = imgUrl ? getThumbImage(imgUrl) : null;

  if(entry && entry.loaded){
    ctx.save();
    roundRect(rx,ry,w,h,radius);
    ctx.clip();
    const iw=entry.img.naturalWidth||1, ih=entry.img.naturalHeight||1;
    const scale = Math.max(w/iw, h/ih);
    const dw=iw*scale, dh=ih*scale;
    const {fx,fy} = parseImgPosition(imgPosition);
    const dx = rx - (dw-w)*fx, dy = ry - (dh-h)*fy;
    ctx.drawImage(entry.img, dx, dy, dw, dh);
    ctx.restore();
    roundRect(rx,ry,w,h,radius);
    ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1.5; ctx.stroke();
    // Petit repère de catégorie en coin, pour garder le code couleur visible même avec une image
    ctx.beginPath(); ctx.arc(rx+11,ry+11,6,0,Math.PI*2);
    ctx.fillStyle=color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=1.2; ctx.stroke();
    return;
  }

  roundRect(rx,ry,w,h,radius);
  const g=ctx.createLinearGradient(rx,ry,rx,ry+h);
  g.addColorStop(0,color); g.addColorStop(1,shade(color,-25));
  ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.95)';
  ctx.font=`600 ${Math.round(h*0.4)}px 'Montserrat',sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(letter,x,y+0.5);
}

function drawDimmedBubble(e){
  const m = timeToMain(e.y);
  const P = pt(m, eventBaseOffset()); // même niveau que la 1ère rangée d'événements complets : pas de saut au passage en vue emphasée
  const color = catOf(e.cat).color;
  ctx.beginPath();
  ctx.arc(P.x,P.y,4,0,Math.PI*2);
  ctx.fillStyle = color+'55';
  ctx.fill();
  markerRects.push({x:P.x-10,y:P.y-10,w:20,h:20,item:e});
}

function drawEvents(){
  markerRects=[];
  const activeEvents = EVENTS.filter(e=>itemInCats(e, activeCats) && e.y>=viewStart-50 && e.y<=viewEnd+50);
  const dimmed = activeEvents.filter(e=>!isItemEmphasized(e));
  const visible = activeEvents.filter(e=>isItemEmphasized(e)).sort((a,b)=>a.y-b.y);

  // Catégories en retrait : simples bulles translucides, sans texte, pour ne pas surcharger la vue globale
  dimmed.forEach(drawDimmedBubble);

  const spanYears = viewEnd-viewStart;
  const showThumbs = timelineShowImages && !isVertical && spanYears < 260 && visible.length <= 40;
  const THUMB_W = 90, THUMB_H = 66; // vignettes ~3x plus grandes qu'auparavant (30x22)
  const rowGap = showThumbs ? THUMB_H+14 : 22;
  const markerHalf = showThumbs ? THUMB_W/2 : 7;

  // En vue globale horizontale, les événements mis en avant se distinguaient mal des bulles en retrait
  // (même niveau) : on les descend d'un cran supplémentaire pour bien les démarquer visuellement.
  const inOverview = overviewFilterEnabled && spanYears > OVERVIEW_THRESHOLD_YEARS;
  const overviewNotch = (inOverview && !isVertical) ? 34 : 0;

  const crossAvail = isVertical ? Math.max(60, W-AXIS_CROSS-10) : Math.max(60, H-AXIS_CROSS-eventBaseOffset()-overviewNotch-20);
  const maxRows = Math.max(1, Math.min(6, Math.floor(crossAvail/rowGap)));

  // Seuils de visibilité du texte, exprimés en pixels d'espace disponible pour le libellé :
  // en dessous de HIDE_AT : aucun texte (juste le marqueur, cliquable) ; au-dessus de FULL_AT : opacité pleine ;
  // entre les deux : fondu progressif + troncature — utilisé uniquement en dernier recours, quand même
  // la poussée en rangée supplémentaire ne suffit plus (toutes les rangées disponibles sont occupées).
  const HIDE_AT = 16, FULL_AT = 60;

  if(!isVertical){
    // Paysage : la place nécessaire par événement (marqueur + texte) est mesurée réellement,
    // et un événement dont le texte toucherait le suivant est poussé sur la rangée d'en dessous
    // plutôt que de laisser les deux textes se confondre.
    ctx.font = "12px 'Montserrat',sans-serif";
    const rows = Array.from({length:maxRows}, ()=>[]);
    const rowEndMain = [];
    visible.forEach(e=>{
      const m = timeToMain(e.y);
      const label = (e.approx?'~ ':'') + e.t;
      const labelW = ctx.measureText(label).width;
      const rightExtent = markerHalf + 8 + labelW; // du centre du marqueur jusqu'à la fin estimée du texte
      let row=0;
      while(row<maxRows-1 && rowEndMain[row]!==undefined && rowEndMain[row] > m-markerHalf-4) row++;
      rowEndMain[row] = m + rightExtent;
      rows[row].push({e,m});
    });
    const edgeMain = W - 14; // bord réel du canevas, pas seulement la fin de la zone de contenu

    rows.forEach((rowItems, rowIdx)=>{
      const crossOffset = eventBaseOffset() + overviewNotch + rowIdx*rowGap;
      rowItems.forEach((item, idx)=>{
        const nextM = idx+1<rowItems.length ? rowItems[idx+1].m : edgeMain;
        const gap = nextM - item.m - markerHalf - 6;
        drawEventMarker(item.e, item.m, crossOffset, gap, showThumbs, HIDE_AT, FULL_AT, markerHalf, false, THUMB_W, THUMB_H);
      });
    });
  } else {
    // Portrait : le texte reste horizontal (perpendiculaire à l'axe temps) donc ce n'est pas lui qui
    // détermine les collisions le long de l'axe, mais la taille du marqueur (vignette ou pastille) :
    // deux événements trop proches en date sont poussés sur des rangées différentes pour ne jamais
    // superposer leurs images/pastilles.
    const markerSpan = showThumbs ? THUMB_H+10 : 22;
    const rowEndMain=[];
    const placed = visible.map(e=>{
      const m = timeToMain(e.y);
      let row=0;
      while(row<maxRows-1 && rowEndMain[row]!==undefined && rowEndMain[row] > m-markerSpan/2) row++;
      rowEndMain[row] = m+markerSpan;
      return {e,m,row};
    });
    placed.forEach((item,idx)=>{
      const prevGap = idx>0 ? item.m-placed[idx-1].m : 999;
      const nextGap = idx<placed.length-1 ? placed[idx+1].m-item.m : 999;
      const localGap = Math.min(prevGap, nextGap);
      const crossOffset = eventBaseOffset() + item.row*rowGap;
      drawEventMarker(item.e, item.m, crossOffset, localGap, showThumbs, HIDE_AT, FULL_AT, markerHalf, true, THUMB_W, THUMB_H);
    });
  }
}

function drawEventMarker(e, m, crossOffset, gapPx, showThumbs, hideAt, fullAt, markerHalf, isVerticalMode, thumbW, thumbH){
  const P = pt(m, crossOffset);
  const color = catOf(e.cat).color;

  const stemStart = pt(m,0);
  const stemEnd = pt(m, crossOffset-(showThumbs?(thumbH/2+14):6));
  ctx.strokeStyle=COLORS.line; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(stemStart.x,stemStart.y); ctx.lineTo(stemEnd.x,stemEnd.y); ctx.stroke();

  const CLICK_PAD = 8; // marge ajoutée à la zone cliquable, au-delà de la taille visuelle du marqueur
  if(showThumbs){
    drawThumb(P.x,P.y,color,catOf(e.cat).label[0],e.img,thumbW,thumbH,e.imgPosition);
    markerRects.push({x:P.x-thumbW/2-CLICK_PAD,y:P.y-thumbH/2-CLICK_PAD,w:thumbW+CLICK_PAD*2,h:thumbH+CLICK_PAD*2,item:e});
  } else {
    ctx.beginPath(); ctx.arc(P.x,P.y,4.5,0,Math.PI*2);
    ctx.fillStyle=color; ctx.fill();
    ctx.strokeStyle=inkA(0.35); ctx.lineWidth=1; ctx.stroke();
    markerRects.push({x:P.x-7-CLICK_PAD,y:P.y-7-CLICK_PAD,w:14+CLICK_PAD*2,h:14+CLICK_PAD*2,item:e});
  }

  const gap = Math.max(0, gapPx);
  if(gap <= hideAt) return; // pas assez de place : on n'affiche pas de texte, seulement le marqueur

  const alpha = Math.min(1, (gap-hideAt)/(fullAt-hideAt));
  const label = (e.approx?'~ ':'') + e.t;
  ctx.font="12px 'Montserrat',sans-serif";
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const labelX = P.x+(showThumbs?(thumbW/2+10):9);
  const edgeLimit = Math.max(20, W-labelX-10);
  const maxLabelWidth = isVerticalMode ? edgeLimit : Math.min(edgeLimit, gap);
  const shown = fitText(label, maxLabelWidth);
  if(!shown) return;
  ctx.fillStyle = inkA((0.35+0.65*alpha).toFixed(2));
  ctx.fillText(shown, labelX, P.y);
  // Le texte affiché fait aussi partie de la zone cliquable de l'événement
  const shownW = ctx.measureText(shown).width;
  markerRects.push({x:labelX-4,y:P.y-12,w:shownW+8,h:24,item:e});
}

/* ---------- Interactions : pan / zoom (souris, tactile, molette, pincement) ---------- */
let activePointers = new Map();
let dragging=false, dragStartMain=0, dragStartView=[0,0];
let pinchStartDist=0, pinchStartSpan=0, pinchStartMidTime=0;
let inertiaFrame=null;

/* v0.7 — Glissement moins sensible :
   1) Seuil de démarrage : la frise ne bouge qu'une fois le doigt (ou la souris) déplacé de quelques pixels,
      ce qui évite les micro-déplacements lors d'un simple appui et rend les « taps » fiables.
   2) Vitesse de lancer calculée sur les ~90 dernières ms (et non plus sur le seul dernier mouvement,
      dont l'intervalle de quelques ms produisait des pics de vitesse et des lancers démesurés), puis plafonnée.
   3) Pas d'inertie si le doigt s'est immobilisé avant d'être relevé.
   4) Un glissement ne déclenche plus l'ouverture d'un élément au relâchement.
   5) Pincement : le point sous les doigts reste fixe (plus de recentrage brutal), et la reprise à un doigt
      après un pincement ne provoque plus de saut (coordonnées désormais relatives au canevas). */
const DRAG_THRESHOLD_MOUSE = 4;   // px
const DRAG_THRESHOLD_TOUCH = 10;  // px
const FLING_SAMPLE_WINDOW = 90;   // ms
const FLING_IDLE_CUTOFF = 70;     // ms
const FLING_MIN_SPEED = 0.3;      // px/ms en dessous duquel on ne lance pas
const FLING_MAX_SPEED = 2.2;      // px/ms
const FLING_FRICTION = 0.9;       // amortissement par tranche de 16 ms
let pointerDownPos = null, dragMoved = false, suppressNextClick = false, dragPointerType = 'mouse';
let moveSamples = [];

function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

function stopInertia(){ if(inertiaFrame){ cancelAnimationFrame(inertiaFrame); inertiaFrame=null; } }

function pushMoveSample(mainPos){
  const now = performance.now();
  moveSamples.push({t:now, pos:mainPos});
  while(moveSamples.length>2 && now-moveSamples[0].t > FLING_SAMPLE_WINDOW) moveSamples.shift();
}
function releaseVelocity(){
  if(moveSamples.length<2) return 0;
  const last = moveSamples[moveSamples.length-1];
  if(performance.now()-last.t > FLING_IDLE_CUTOFF) return 0;
  const first = moveSamples[0];
  const dt = last.t-first.t;
  if(dt < 16) return 0;
  const v = (last.pos-first.pos)/dt;
  return Math.max(-FLING_MAX_SPEED, Math.min(FLING_MAX_SPEED, v));
}

function startInertia(vPxPerMs){
  let vel = vPxPerMs, lastT = performance.now();
  function step(now){
    const dt = Math.min(40, Math.max(1, now-lastT)); lastT = now;
    const yearsPerPx = (viewEnd-viewStart)/contentMain;
    const deltaYears = -vel*dt*yearsPerPx;
    const before = viewStart;
    setView(viewStart+deltaYears, viewEnd+deltaYears, false);
    vel *= Math.pow(FLING_FRICTION, dt/16);
    // On s'arrête quand c'est assez lent, ou en butée (début / fin de la frise)
    if(Math.abs(vel) > 0.02 && viewStart!==before) inertiaFrame = requestAnimationFrame(step);
    else inertiaFrame = null;
  }
  inertiaFrame = requestAnimationFrame(step);
}

function beginSingleDrag(clientX, clientY){
  const rect=canvas.getBoundingClientRect();
  const mainPos = mainOf(clientX, clientY, rect);
  dragStartMain = mainPos; dragStartView=[viewStart,viewEnd];
  moveSamples = [];
  pushMoveSample(mainPos);
}

canvas.addEventListener('pointerdown', e=>{
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  stopInertia();
  if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }
  if(activePointers.size===1){
    suppressNextClick = false;
    dragMoved = false;
    dragPointerType = e.pointerType || 'mouse';
    pointerDownPos = {x:e.clientX, y:e.clientY};
    dragging = true;
    beginSingleDrag(e.clientX, e.clientY);
  } else if(activePointers.size===2){
    dragging=false; dragMoved = true; // un pincement n'est jamais un « tap »
    canvas.classList.remove('dragging');
    const pts=[...activePointers.values()];
    pinchStartDist = dist(pts[0],pts[1]);
    pinchStartSpan = viewEnd-viewStart;
    const rect=canvas.getBoundingClientRect();
    const midMain = mainOf((pts[0].x+pts[1].x)/2, (pts[0].y+pts[1].y)/2, rect);
    pinchStartMidTime = mainToTime(midMain);
  }
});

canvas.addEventListener('pointermove', e=>{
  if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, {x:e.clientX,y:e.clientY});

  if(activePointers.size>=2){
    const pts=[...activePointers.values()].slice(0,2);
    const d=dist(pts[0],pts[1]);
    if(pinchStartDist>10){
      const rect=canvas.getBoundingClientRect();
      const midMain = mainOf((pts[0].x+pts[1].x)/2, (pts[0].y+pts[1].y)/2, rect);
      const scale = pinchStartDist/Math.max(1,d);
      const newSpan = Math.max(MIN_SPAN, Math.min(MAX_YEAR-MIN_YEAR, pinchStartSpan*scale));
      // L'instant situé sous les doigts au début du pincement reste sous les doigts
      const ratio = (midMain-PAD_START)/contentMain;
      const ns = pinchStartMidTime - ratio*newSpan;
      setView(ns, ns+newSpan, false);
    }
    return;
  }

  if(dragging && activePointers.has(e.pointerId)){
    if(!dragMoved){
      const threshold = dragPointerType==='mouse' ? DRAG_THRESHOLD_MOUSE : DRAG_THRESHOLD_TOUCH;
      if(!pointerDownPos || Math.hypot(e.clientX-pointerDownPos.x, e.clientY-pointerDownPos.y) < threshold) return;
      // Seuil franchi : on démarre le glissement à partir de la position actuelle (pas de saut)
      dragMoved = true;
      canvas.classList.add('dragging');
      beginSingleDrag(e.clientX, e.clientY);
      return;
    }
    const rect=canvas.getBoundingClientRect();
    const mainPos = mainOf(e.clientX,e.clientY,rect);
    const span = dragStartView[1]-dragStartView[0];
    const deltaYears = -((mainPos-dragStartMain)/contentMain)*span;
    setView(dragStartView[0]+deltaYears, dragStartView[1]+deltaYears, false);
    pushMoveSample(mainPos);
  } else if(activePointers.size===0) {
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const hit = markerRects.some(r=>mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h) ||
                periodRects.some(r=>mx>=r.x-6&&mx<=r.x+r.w+6&&my>=r.y-6&&my<=r.y+r.h+6);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  }
});

function endPointer(e){
  if(!activePointers.has(e.pointerId)) return;
  activePointers.delete(e.pointerId);
  if(activePointers.size===0){
    if(dragging){
      dragging=false; canvas.classList.remove('dragging');
      if(dragMoved){
        const v = (e.type==='pointercancel') ? 0 : releaseVelocity();
        if(Math.abs(v) > FLING_MIN_SPEED) startInertia(v);
      }
    }
    if(dragMoved) suppressNextClick = true;
    pinchStartDist=0;
    pointerDownPos=null;
  } else if(activePointers.size===1){
    // Fin d'un pincement : on reprend un glissement à un doigt depuis la position réelle du doigt restant
    const remaining=[...activePointers.values()][0];
    dragging=true; dragMoved=true;
    canvas.classList.add('dragging');
    beginSingleDrag(remaining.x, remaining.y);
    pinchStartDist=0;
  }
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

canvas.addEventListener('click', e=>{
  if(suppressNextClick){ suppressNextClick=false; return; } // fin d'un glissement : ce n'est pas un clic
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const hitEvent = markerRects.find(r=>mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h);
  if(hitEvent){ openDetail(hitEvent.item); return; }
  const hitPeriod = periodRects.find(r=>mx>=r.x-6&&mx<=r.x+r.w+6&&my>=r.y-6&&my<=r.y+r.h+6);
  if(hitPeriod){ openDetail(hitPeriod.item); }
});

canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  stopInertia();
  const rect=canvas.getBoundingClientRect();
  const mainPos = mainOf(e.clientX,e.clientY,rect);
  const yearAtCursor = mainToTime(mainPos);
  const factor = Math.pow(1.0016, e.deltaY);
  let newSpan = (viewEnd-viewStart)*factor;
  newSpan = Math.max(MIN_SPAN, Math.min(MAX_YEAR-MIN_YEAR, newSpan));
  const ratio = (mainPos-PAD_START)/contentMain;
  const ns = yearAtCursor-ratio*newSpan, ne = ns+newSpan;
  setView(ns,ne,false);
}, {passive:false});

function zoomStep(factor){
  stopInertia();
  const mid=(viewStart+viewEnd)/2;
  let newSpan=Math.max(MIN_SPAN, Math.min(MAX_YEAR-MIN_YEAR,(viewEnd-viewStart)*factor));
  setView(mid-newSpan/2, mid+newSpan/2, true);
}
document.getElementById('reset-view').onclick=()=>{ stopInertia(); setView(MIN_YEAR,MAX_YEAR,true); };

function setView(s,e,animate){
  const span=e-s;
  if(s<MIN_YEAR){ s=MIN_YEAR; e=s+span; }
  if(e>MAX_YEAR){ e=MAX_YEAR; s=e-span; }
  if(animate) animateTo(s,e);
  else { viewStart=s; viewEnd=e; render(); }
}
let animFrame=null;
function animateTo(targetS,targetE){
  const fromS=viewStart, fromE=viewEnd, dur=480, t0=performance.now();
  if(animFrame) cancelAnimationFrame(animFrame);
  function step(now){
    const t=Math.min(1,(now-t0)/dur);
    const eased=1-Math.pow(1-t,3);
    viewStart=fromS+(targetS-fromS)*eased;
    viewEnd=fromE+(targetE-fromE)*eased;
    render();
    if(t<1) animFrame=requestAnimationFrame(step);
  }
  animFrame=requestAnimationFrame(step);
}

/* ---------- Filtres catégories de la frise (barre du bas uniquement) ---------- */
function toggleCategory(key){
  if(activeCats.has(key)) activeCats.delete(key); else activeCats.add(key);
  allChipEls[key].forEach(el=>{
    el.classList.toggle('active', activeCats.has(key));
    el.classList.toggle('inactive', !activeCats.has(key));
  });
  render();
  if(typeof renderMapMarkers==='function' && mapMarkersLayer) renderMapMarkers();
}
const filtersEl=document.getElementById('filters');
const filtersChipsEl=document.getElementById('filters-chips');
const filterToggleBtn=document.getElementById('filter-toggle');

function renderFilterChips(){
  filtersChipsEl.innerHTML='';
  allChipEls={};
  Object.entries(CATS).forEach(([key,c])=>{
    const chip=document.createElement('div');
    chip.className='chip'+(activeCats.has(key)?' active':' inactive');
    chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${c.label}`;
    chip.onclick=()=>toggleCategory(key);
    if(!allChipEls[key]) allChipEls[key]=[];
    allChipEls[key].push(chip);
    filtersChipsEl.appendChild(chip);
  });
}
renderFilterChips();

function positionFiltersPopover(){
  const r = filterToggleBtn.getBoundingClientRect();
  if(isVertical){
    // Barre d'action en bas : le panneau s'ouvre au-dessus du bouton
    filtersEl.style.top = 'auto';
    filtersEl.style.bottom = (window.innerHeight - r.top + 10) + 'px';
    filtersEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 300)) + 'px';
  } else {
    // Barre d'action à gauche : le panneau s'ouvre à droite du bouton
    filtersEl.style.bottom = 'auto';
    filtersEl.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 260)) + 'px';
    filtersEl.style.left = (r.right + 10) + 'px';
  }
}
filterToggleBtn.addEventListener('click', (ev)=>{
  ev.stopPropagation();
  const open = filtersEl.classList.toggle('open');
  filterToggleBtn.classList.toggle('active', open);
  if(open) positionFiltersPopover();
});
document.addEventListener('click', e=>{
  if(!e.target.closest('#filters') && !e.target.closest('#filter-toggle')){
    filtersEl.classList.remove('open');
    filterToggleBtn.classList.remove('active');
  }
});

/* ---------- Filtres de catégorie propres à la recherche (indépendants de la frise) ---------- */
let searchCats = new Set();
const searchCatsEl=document.getElementById('search-cats');

function renderSearchCatChips(){
  searchCatsEl.querySelectorAll('.chip').forEach(el=>el.remove());
  Object.entries(CATS).forEach(([key,c])=>{
    const chip=document.createElement('div');
    chip.className='chip small'+(searchCats.has(key)?' active':'');
    chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${c.label}`;
    chip.onclick=()=>{
      if(searchCats.has(key)) searchCats.delete(key); else searchCats.add(key);
      chip.classList.toggle('active', searchCats.has(key));
      updateSearchResults();
    };
    searchCatsEl.appendChild(chip);
  });
}
renderSearchCatChips();

/* ---------- Gestion des catégories (création dynamique depuis le formulaire d'édition) ---------- */
function slugify(name){
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  return base || 'categorie';
}
function addCategory(name, color){
  let key = slugify(name), n=1;
  while(CATS[key]){ key = slugify(name)+'_'+n; n++; }
  CATS[key] = {label:name, color};
  activeCats.add(key);
  renderFilterChips();
  renderSearchCatChips();
  renderCatFormChips();
  renderOverviewCatsList();
  renderExportCatsList();
  render();
  schedulePersist();
  return key;
}
function updateCategoryColor(key,color){
  if(!CATS[key] || CATS[key].locked) return;
  CATS[key].color = color;
  renderFilterChips(); renderSearchCatChips(); renderCatFormChips(); renderOverviewCatsList(); renderOverviewFilterList(); renderExportCatsList();
  render();
  schedulePersist();
}
function updateCategoryLabel(key,label){
  if(!CATS[key] || CATS[key].locked) return;
  const trimmed = label.trim();
  if(!trimmed) return;
  CATS[key].label = trimmed;
  renderFilterChips(); renderSearchCatChips(); renderCatFormChips(); renderOverviewCatsList(); renderOverviewFilterList(); renderExportCatsList();
  render();
  schedulePersist();
}
function deleteCategory(key, mode){
  if(!CATS[key] || CATS[key].locked || CATS[key].protected) return;
  // Avec les catégories multiples : en mode "purge", seuls les éléments qui n'appartiennent QU'À cette
  // catégorie sont supprimés ; ceux qui en ont d'autres la perdent simplement (Noé ne disparaît pas si
  // l'on supprime la catégorie "Déluge", puisqu'il reste un "Personnage").
  const onlyThis = it => { const c=itemCats(it); return c.length===1 && c[0]===key; };
  if(mode==='purge'){
    for(let i=EVENTS.length-1;i>=0;i--){ if(onlyThis(EVENTS[i])) EVENTS.splice(i,1); }
    for(let i=PERIOD_ITEMS.length-1;i>=0;i--){ if(onlyThis(PERIOD_ITEMS[i])) PERIOD_ITEMS.splice(i,1); }
  }
  delete CATS[key];
  EVENTS.forEach(normalizeItemCats);
  PERIOD_ITEMS.forEach(normalizeItemCats);
  activeCats.delete(key); activeCats.add('sans_categorie');
  searchCats.delete(key);
  overviewCats.delete(key); overviewRequiredCats.delete(key);
  selectedCatKeys = selectedCatKeys.filter(k=>k!==key);
  renderFilterChips(); renderSearchCatChips(); renderCatFormChips(); renderCatManageList(); renderOverviewCatsList(); renderOverviewFilterList(); renderExportCatsList();
  rebuildAllItems();
  updateEventCounterBadge();
  render();
}

const catDeleteOverlay = document.getElementById('catdelete-overlay');
let catPendingDeleteKey = null;
function openCatDeleteChoice(key, label){
  catPendingDeleteKey = key;
  document.getElementById('catdelete-label').textContent = label;
  catDeleteOverlay.classList.add('open');
}
document.getElementById('catdelete-reassign').addEventListener('click', ()=>{
  if(catPendingDeleteKey) deleteCategory(catPendingDeleteKey, 'reassign');
  catDeleteOverlay.classList.remove('open');
});
document.getElementById('catdelete-purge').addEventListener('click', ()=>{
  if(catPendingDeleteKey) deleteCategory(catPendingDeleteKey, 'purge');
  catDeleteOverlay.classList.remove('open');
});
document.getElementById('catdelete-cancel').onclick = ()=> catDeleteOverlay.classList.remove('open');
document.getElementById('catdelete-close').onclick = ()=> catDeleteOverlay.classList.remove('open');
catDeleteOverlay.addEventListener('click', e=>{ if(e.target===catDeleteOverlay) catDeleteOverlay.classList.remove('open'); });

const catmanageOverlay = document.getElementById('catmanage-overlay');
const catmanageList = document.getElementById('catmanage-list');
function renderCatManageList(){
  catmanageList.innerHTML='';
  Object.entries(CATS).forEach(([key,c])=>{
    const row=document.createElement('div');
    row.className='catmanage-row';
    if(c.locked){
      row.innerHTML = `<span class="dot" style="background:${c.color}"></span>
        <span class="cm-locked">${c.label}</span>
        <span class="cm-locked-tag">catégorie fixe</span>`;
    } else if(c.protected){
      row.innerHTML = `
        <input type="color" class="cm-color" value="${c.color}">
        <input type="text" class="cm-text" value="${c.label}" readonly title="Le nom de cette catégorie ne peut pas être modifié">
        <span class="cm-locked-tag">non supprimable</span>`;
      row.querySelector('.cm-color').addEventListener('input', e=> updateCategoryColor(key, e.target.value));
    } else {
      row.innerHTML = `
        <input type="color" class="cm-color" value="${c.color}">
        <input type="text" class="cm-text" value="${c.label}">
        <button type="button" class="cm-delete" title="Supprimer">🗑</button>`;
      row.querySelector('.cm-color').addEventListener('input', e=> updateCategoryColor(key, e.target.value));
      row.querySelector('.cm-text').addEventListener('change', e=> updateCategoryLabel(key, e.target.value));
      row.querySelector('.cm-delete').addEventListener('click', ()=>{
        openCatDeleteChoice(key, c.label);
      });
    }
    catmanageList.appendChild(row);
  });
}
document.getElementById('catmanage-open').addEventListener('click', (ev)=>{
  ev.stopPropagation();
  renderCatManageList();
  catmanageOverlay.classList.add('open');
});
document.getElementById('catmanage-close').onclick = ()=> catmanageOverlay.classList.remove('open');
catmanageOverlay.addEventListener('click', e=>{ if(e.target===catmanageOverlay) catmanageOverlay.classList.remove('open'); });

/* ---------- Paramètres ---------- */
const STRINGS = {
  fr:{
    searchPlaceholder:"Rechercher",
    filterBtn:"Filtres", filtersHeader:"Catégories",
    addBtnTitle:"Ajouter un élément", resetTitle:"Vue d'ensemble", settingsTitle:"Paramètres",
    catmanageOpenTitle:"Gérer les catégories", catmanageTitle:"Gérer les catégories",
    editBtnLabel:"Modifier",
    modalAddTitle:"Ajouter un élément", modalEditTitle:"Modifier l'élément",
    typeEvent:"Événement", typePeriod:"Période",
    cancelBtn:"Annuler", saveBtn:"Enregistrer",
    settingsHeading:"Paramètres",
    langLabel:"Langue", langSub:"Interface de l'application",
    modeLabel:"Mode d'affichage", modeSub:"Clair par défaut, ou sombre",
    storageLabel:"Stockage local", storageSub:"Vos données sont enregistrées automatiquement sur cet appareil",
    counterLabel:"Nombre total d'éléments", counterSub:"Afficher un compteur sous le titre",
    overviewLabel:"Catégories en vue globale", overviewSub:"Simplifie l'affichage très dézoomé",
    mentionsLabel:"Mentions",
    counterText:(n)=>`${n} élément${n>1?'s':''} au total`,
    deleteCatConfirm:(label)=>`Supprimer la catégorie « ${label} » ? Les éléments concernés seront reclassés dans « Sans catégorie ».`,
    deleteItemConfirm:(t)=>`Supprimer définitivement « ${t} » ? Cette action est irréversible.`,
    sourceLink:"Voir la source →",
    goToYearLabel:"Aller à l'année",
    railCharactersTitle:"Liste des personnages", railDatesTitle:"Liste des dates", railMapTitle:"Plan",
    charactersModalTitle:"Liste des personnages", datesModalTitle:"Liste des dates", mapModalTitle:"Plan",
    deleteBtnLabel:"Supprimer",
    expandMoreLabel:"Voir plus de détails", expandLessLabel:"Réduire les détails",
    accCategory:"Catégories", accDescription:"Description", accImage:"Image",
    accLink:"Lien / source", accLocation:"Lieu",
    optionalHint:"(optionnel)",
    sendBtnLabel:"Envoyer", receiveBtnLabel:"Recevoir",
    exchangeLabel:"Échanger des données", exchangeSub:"Exporter ou importer des événements au format fichier",
    exportModalTitle:"Envoyer des événements", exportDownloadBtn:"Télécharger le fichier",
    exportSelectAllBtn:"Tout sélectionner", exportCancelBtn:"Annuler",
    mapAddModeLabel:"Ajouter un événement ici",
    prevLabel:"Événement précédent", nextLabel:"Événement suivant",
    mapBtnTitle:"Voir sur la carte",
    copyLinkTitle:"Copier le lien de cet événement",
    linkCopied:"Lien copié : collez-le dans une note ou ailleurs",
    linkCopyFailed:"Le presse-papiers n'est pas accessible ici",
    eventNotFound:"Cet événement n'existe pas sur cet appareil",
    goToEventTitle:(t)=>`Aller à « ${t} »`,
    overviewFilterLabel:"Condition supplémentaire",
    overviewFilterHint:"Ces catégories ne s'affichent pas d'elles-mêmes : elles restreignent les précédentes. Avec « Personnage » au-dessus et « Religion » ici, seuls les personnages également classés en religion restent au premier plan. Plusieurs catégories ici élargissent la condition : il suffit d'en porter une.",
    catPrimaryTitle:"Catégorie principale (couleur sur la frise)", catMakePrimaryTitle:"Définir comme catégorie principale",
    catNoneSelected:"(aucune sélectionnée)",
    catMultiHint:"Plusieurs catégories possibles. La catégorie marquée ★ donne sa couleur à l'élément ; touchez ☆ pour en changer.",
    accBible:"Références bibliques",
    bibleHelp:"Séparez plusieurs références par « ; ». Formats acceptés : Gn 6, Gn 6:9, Gn 6:9-22, Mt 3:1-4:11, Jean 1:1, 3, 5-7, Jude 3.",
    bibleErrBook:"livre non reconnu", bibleErrAmbiguous:(l)=>`abréviation ambiguë (${l}…)`,
    bibleErrChapter:(b,m)=>`${b} ne compte que ${m} chapitre${m>1?'s':''}`, bibleErrOrder:"versets dans le désordre",
    bibleErrFormat:"format non reconnu (ex : Gn 6:9-22)",
    timelineImgLabel:"Images sur la frise", timelineImgSub:"Affiche les vignettes des événements sur la frise (vue rapprochée, paysage)",
    accNote:"Note", noteHelp:"Les adresses internet s'affichent sous forme de mention compacte, et les versets cités (ex : Gen 3:15) deviennent des liens vers JW Library.",
    notePlaceholder:"Note personnelle, réflexions, liens…",
    catManageBtn:"⚙ Gérer les catégories",
    familyTreeLabel:"Arbre généalogique", familyTreeSoon:"bientôt",
    familyTreeNote:"L'arbre généalogique arrivera dans une prochaine version : ce bouton y mènera.",
    bibleRowLabel:"Ouvrir les versets dans", bibleRowSub:"JW Library si l'application est installée, sinon jw.org",
  },
  en:{
    searchPlaceholder:"Search",
    filterBtn:"Filters", filtersHeader:"Categories",
    addBtnTitle:"Add an item", resetTitle:"Overview", settingsTitle:"Settings",
    catmanageOpenTitle:"Manage categories", catmanageTitle:"Manage categories",
    editBtnLabel:"Edit",
    modalAddTitle:"Add an item", modalEditTitle:"Edit item",
    typeEvent:"Event", typePeriod:"Period",
    cancelBtn:"Cancel", saveBtn:"Save",
    settingsHeading:"Settings",
    langLabel:"Language", langSub:"Application interface",
    modeLabel:"Display mode", modeSub:"Light by default, or dark",
    storageLabel:"Local storage", storageSub:"Your data is saved automatically on this device",
    counterLabel:"Total item count", counterSub:"Show a counter under the title",
    overviewLabel:"Overview categories", overviewSub:"Simplifies the fully zoomed-out display",
    mentionsLabel:"Credits",
    counterText:(n)=>`${n} item${n>1?'s':''} total`,
    deleteCatConfirm:(label)=>`Delete the "${label}" category? Affected items will be moved to "Uncategorized".`,
    deleteItemConfirm:(t)=>`Permanently delete "${t}"? This action cannot be undone.`,
    sourceLink:"View source →",
    goToYearLabel:"Go to year",
    railCharactersTitle:"Characters list", railDatesTitle:"Dates list", railMapTitle:"Map",
    charactersModalTitle:"Characters list", datesModalTitle:"Dates list", mapModalTitle:"Map",
    deleteBtnLabel:"Delete",
    expandMoreLabel:"Show more details", expandLessLabel:"Show less",
    accCategory:"Categories", accDescription:"Description", accImage:"Image",
    accLink:"Link / source", accLocation:"Location",
    optionalHint:"(optional)",
    sendBtnLabel:"Send", receiveBtnLabel:"Receive",
    exchangeLabel:"Exchange data", exchangeSub:"Export or import events as a file",
    exportModalTitle:"Send events", exportDownloadBtn:"Download file",
    exportSelectAllBtn:"Select all", exportCancelBtn:"Cancel",
    mapAddModeLabel:"Add an event here",
    prevLabel:"Previous event", nextLabel:"Next event",
    mapBtnTitle:"View on map",
    copyLinkTitle:"Copy this event's link",
    linkCopied:"Link copied — paste it in a note or anywhere else",
    linkCopyFailed:"The clipboard is not available here",
    eventNotFound:"This event does not exist on this device",
    goToEventTitle:(t)=>`Go to \u201C${t}\u201D`,
    overviewFilterLabel:"Extra condition",
    overviewFilterHint:"These categories never show on their own: they narrow the ones above. With \u201CCharacter\u201D above and \u201CReligion\u201D here, only characters also filed under religion stay in the foreground. Several categories here widen the condition: carrying one is enough.",
    catPrimaryTitle:"Main category (colour on the timeline)", catMakePrimaryTitle:"Set as main category",
    catNoneSelected:"(none selected)",
    catMultiHint:"Several categories allowed. The one marked ★ gives the item its colour; tap ☆ to change it.",
    accBible:"Bible references",
    bibleHelp:"Separate several references with \";\". Accepted formats: Gen 6, Gen 6:9, Gen 6:9-22, Mt 3:1-4:11, John 1:1, 3, 5-7, Jude 3.",
    bibleErrBook:"unknown book", bibleErrAmbiguous:(l)=>`ambiguous abbreviation (${l}…)`,
    bibleErrChapter:(b,m)=>`${b} only has ${m} chapter${m>1?'s':''}`, bibleErrOrder:"verses out of order",
    bibleErrFormat:"unrecognised format (e.g. Gen 6:9-22)",
    timelineImgLabel:"Images on the timeline", timelineImgSub:"Show event thumbnails on the timeline (close-up view, landscape)",
    accNote:"Note", noteHelp:"Web addresses appear as a compact mention, and verses cited here (e.g. Gen 3:15) become JW Library links.",
    notePlaceholder:"Personal note, thoughts, links…",
    catManageBtn:"⚙ Manage categories",
    familyTreeLabel:"Family tree", familyTreeSoon:"soon",
    familyTreeNote:"The family tree is coming in a future version; this button will lead to it.",
    bibleRowLabel:"Open verses in", bibleRowSub:"JW Library if the app is installed, otherwise jw.org",
  },
  es:{
    searchPlaceholder:"Buscar",
    filterBtn:"Filtros", filtersHeader:"Categorías",
    addBtnTitle:"Añadir un elemento", resetTitle:"Vista general", settingsTitle:"Ajustes",
    catmanageOpenTitle:"Gestionar categorías", catmanageTitle:"Gestionar categorías",
    editBtnLabel:"Editar",
    modalAddTitle:"Añadir un elemento", modalEditTitle:"Editar elemento",
    typeEvent:"Evento", typePeriod:"Período",
    cancelBtn:"Cancelar", saveBtn:"Guardar",
    settingsHeading:"Ajustes",
    langLabel:"Idioma", langSub:"Interfaz de la aplicación",
    modeLabel:"Modo de visualización", modeSub:"Claro por defecto, u oscuro",
    storageLabel:"Almacenamiento local", storageSub:"Tus datos se guardan automáticamente en este dispositivo",
    counterLabel:"Número total de elementos", counterSub:"Mostrar un contador bajo el título",
    overviewLabel:"Categorías en vista general", overviewSub:"Simplifica la visualización muy alejada",
    mentionsLabel:"Créditos",
    counterText:(n)=>`${n} elemento${n>1?'s':''} en total`,
    deleteCatConfirm:(label)=>`¿Eliminar la categoría « ${label} »? Los elementos afectados se reclasificarán en « Sin categoría ».`,
    deleteItemConfirm:(t)=>`¿Eliminar definitivamente « ${t} »? Esta acción es irreversible.`,
    sourceLink:"Ver la fuente →",
    goToYearLabel:"Ir al año",
    railCharactersTitle:"Lista de personajes", railDatesTitle:"Lista de fechas", railMapTitle:"Mapa",
    charactersModalTitle:"Lista de personajes", datesModalTitle:"Lista de fechas", mapModalTitle:"Mapa",
    deleteBtnLabel:"Eliminar",
    expandMoreLabel:"Ver más detalles", expandLessLabel:"Reducir detalles",
    accCategory:"Categorías", accDescription:"Descripción", accImage:"Imagen",
    accLink:"Enlace / fuente", accLocation:"Lugar",
    optionalHint:"(opcional)",
    sendBtnLabel:"Enviar", receiveBtnLabel:"Recibir",
    exchangeLabel:"Intercambiar datos", exchangeSub:"Exportar o importar eventos como archivo",
    exportModalTitle:"Enviar eventos", exportDownloadBtn:"Descargar archivo",
    exportSelectAllBtn:"Seleccionar todo", exportCancelBtn:"Cancelar",
    mapAddModeLabel:"Añadir un evento aquí",
    prevLabel:"Evento anterior", nextLabel:"Evento siguiente",
    mapBtnTitle:"Ver en el mapa",
    copyLinkTitle:"Copiar el enlace de este evento",
    linkCopied:"Enlace copiado: péguelo en una nota o donde quiera",
    linkCopyFailed:"El portapapeles no está disponible aquí",
    eventNotFound:"Este evento no existe en este dispositivo",
    goToEventTitle:(t)=>`Ir a \u00AB${t}\u00BB`,
    overviewFilterLabel:"Condición adicional",
    overviewFilterHint:"Estas categorías no se muestran por sí solas: restringen las anteriores. Con \u00ABPersonaje\u00BB arriba y \u00ABReligión\u00BB aquí, solo los personajes también clasificados en religión quedan en primer plano. Varias categorías aquí amplían la condición: basta con pertenecer a una.",
    catPrimaryTitle:"Categoría principal (color en la línea de tiempo)", catMakePrimaryTitle:"Definir como categoría principal",
    catNoneSelected:"(ninguna seleccionada)",
    catMultiHint:"Se permiten varias categorías. La marcada con ★ da su color al elemento; toca ☆ para cambiarla.",
    accBible:"Referencias bíblicas",
    bibleHelp:"Separa varias referencias con «;». Formatos aceptados: Gé 6, Gé 6:9, Gé 6:9-22, Mt 3:1-4:11, Juan 1:1, 3, 5-7, Judas 3.",
    bibleErrBook:"libro no reconocido", bibleErrAmbiguous:(l)=>`abreviatura ambigua (${l}…)`,
    bibleErrChapter:(b,m)=>`${b} solo tiene ${m} capítulo${m>1?'s':''}`, bibleErrOrder:"versículos desordenados",
    bibleErrFormat:"formato no reconocido (ej.: Gé 6:9-22)",
    timelineImgLabel:"Imágenes en la línea de tiempo", timelineImgSub:"Muestra las miniaturas de los eventos en la línea de tiempo (vista cercana, horizontal)",
    accNote:"Nota", noteHelp:"Las direcciones de internet aparecen como una mención compacta, y los versículos citados (ej.: Gén 3:15) se convierten en enlaces a JW Library.",
    notePlaceholder:"Nota personal, reflexiones, enlaces…",
    catManageBtn:"⚙ Gestionar categorías",
    familyTreeLabel:"Árbol genealógico", familyTreeSoon:"pronto",
    familyTreeNote:"El árbol genealógico llegará en una próxima versión; este botón llevará a él.",
    bibleRowLabel:"Abrir los versículos en", bibleRowSub:"JW Library si la aplicación está instalada; si no, jw.org",
  },
  zh:{
    searchPlaceholder:"搜索",
    filterBtn:"筛选", filtersHeader:"分类",
    addBtnTitle:"添加项目", resetTitle:"总览", settingsTitle:"设置",
    catmanageOpenTitle:"管理分类", catmanageTitle:"管理分类",
    editBtnLabel:"编辑",
    modalAddTitle:"添加项目", modalEditTitle:"编辑项目",
    typeEvent:"事件", typePeriod:"时期",
    cancelBtn:"取消", saveBtn:"保存",
    settingsHeading:"设置",
    langLabel:"语言", langSub:"应用界面语言",
    modeLabel:"显示模式", modeSub:"默认浅色，或深色",
    storageLabel:"本地存储", storageSub:"您的数据会自动保存在此设备上",
    counterLabel:"项目总数", counterSub:"在标题下方显示计数",
    overviewLabel:"总览显示的分类", overviewSub:"简化极度缩小时的显示",
    mentionsLabel:"鸣谢",
    counterText:(n)=>`共 ${n} 个项目`,
    deleteCatConfirm:(label)=>`删除分类"${label}"？相关项目将被重新归类为"未分类"。`,
    deleteItemConfirm:(t)=>`确定永久删除"${t}"吗？此操作无法撤销。`,
    sourceLink:"查看来源 →",
    goToYearLabel:"跳转到年份",
    railCharactersTitle:"人物列表", railDatesTitle:"日期列表", railMapTitle:"地图",
    charactersModalTitle:"人物列表", datesModalTitle:"日期列表", mapModalTitle:"地图",
    deleteBtnLabel:"删除",
    expandMoreLabel:"查看更多详情", expandLessLabel:"收起详情",
    accCategory:"分类", accDescription:"描述", accImage:"图片",
    accLink:"链接／来源", accLocation:"地点",
    optionalHint:"（可选）",
    sendBtnLabel:"发送", receiveBtnLabel:"接收",
    exchangeLabel:"数据交换", exchangeSub:"以文件形式导出或导入事件",
    exportModalTitle:"发送事件", exportDownloadBtn:"下载文件",
    exportSelectAllBtn:"全选", exportCancelBtn:"取消",
    mapAddModeLabel:"在此处添加事件",
    prevLabel:"上一个事件", nextLabel:"下一个事件",
    mapBtnTitle:"在地图上查看",
    copyLinkTitle:"复制此事件的链接",
    linkCopied:"链接已复制，可粘贴到笔记或其他位置",
    linkCopyFailed:"此处无法使用剪贴板",
    eventNotFound:"此设备上不存在该事件",
    goToEventTitle:(t)=>`跳转到“${t}”`,
    overviewFilterLabel:"附加条件",
    overviewFilterHint:"这些分类本身不会显示，它们只用来收窄上面的选择。上面选“人物”、这里选“宗教”，则只有同时属于两者的人物才留在前景。这里选多个分类会放宽条件：属于其中之一即可。",
    catPrimaryTitle:"主分类（时间轴上的颜色）", catMakePrimaryTitle:"设为主分类",
    catNoneSelected:"（未选择）",
    catMultiHint:"可选择多个分类。带 ★ 的分类决定元素的颜色；点击 ☆ 可更改。",
    accBible:"圣经经文",
    bibleHelp:"多个经文请用“;”分隔。书卷名请使用法文、英文或西班牙文，例如：Gen 6:9-22、Mt 3:1-4:11、John 1:1, 3, 5-7。",
    bibleErrBook:"无法识别书卷", bibleErrAmbiguous:(l)=>`缩写不明确（${l}…）`,
    bibleErrChapter:(b,m)=>`${b} 只有 ${m} 章`, bibleErrOrder:"经节顺序有误",
    bibleErrFormat:"格式无法识别（例如：Gen 6:9-22）",
    timelineImgLabel:"时间轴上的图片", timelineImgSub:"在时间轴上显示事件缩略图（放大视图、横向）",
    accNote:"笔记", noteHelp:"粘贴到这里的网址会显示为紧凑的提及卡片，文中引用的经文（如 Gen 3:15）会变成 JW Library 链接。",
    notePlaceholder:"个人笔记、想法、链接…",
    catManageBtn:"⚙ 管理分类",
    familyTreeLabel:"家谱", familyTreeSoon:"即将推出",
    familyTreeNote:"家谱将在后续版本中推出，此按钮届时会打开该视图。",
    bibleRowLabel:"经文打开方式", bibleRowSub:"已安装 JW Library 时使用该应用，否则使用 jw.org",
  }
};
let currentLang = 'fr';

function T(){ return STRINGS[currentLang]; }

function applyLanguage(lang){
  currentLang = lang;
  const s = T();
  document.getElementById('lang-select').value = lang;
  searchBox.placeholder = s.searchPlaceholder;
  document.getElementById('filter-toggle').title = s.filterBtn;
  document.getElementById('filters-header-label').textContent = s.filtersHeader;
  document.getElementById('add-btn').title = s.addBtnTitle;
  document.getElementById('reset-view').title = s.resetTitle;
  document.getElementById('rail-settings').title = s.settingsTitle;
  document.getElementById('catmanage-open').title = s.catmanageOpenTitle;
  document.getElementById('catmanage-title').textContent = s.catmanageTitle;
  document.getElementById('edit-btn-label').textContent = s.editBtnLabel;
  document.getElementById('edit-cancel').textContent = s.cancelBtn;
  document.getElementById('edit-save').textContent = s.saveBtn;
  document.getElementById('settings-title').textContent = s.settingsHeading;
  document.getElementById('lang-row-label').textContent = s.langLabel;
  document.getElementById('lang-row-sub').textContent = s.langSub;
  document.getElementById('mode-row-label').textContent = s.modeLabel;
  document.getElementById('mode-row-sub').textContent = s.modeSub;
  document.getElementById('storage-row-label').textContent = s.storageLabel;
  document.getElementById('storage-row-sub').textContent = s.storageSub;
  document.getElementById('counter-row-label').textContent = s.counterLabel;
  document.getElementById('counter-row-sub').textContent = s.counterSub;
  document.getElementById('overview-row-label').textContent = s.overviewLabel;
  document.getElementById('overview-row-sub').textContent = s.overviewSub;
  document.getElementById('mentions-row-label').textContent = s.mentionsLabel;
  typeSegment.querySelector('[data-type="event"]').textContent = s.typeEvent;
  typeSegment.querySelector('[data-type="period"]').textContent = s.typePeriod;
  document.getElementById('d-link').textContent = s.sourceLink;
  document.getElementById('rail-characters').title = s.railCharactersTitle;
  document.getElementById('rail-dates').title = s.railDatesTitle;
  document.getElementById('rail-map').title = s.railMapTitle;
  document.getElementById('characters-modal-title').textContent = s.charactersModalTitle;
  document.getElementById('dateslist-modal-title').textContent = s.datesModalTitle;
  document.getElementById('map-modal-title').textContent = s.mapModalTitle;
  document.getElementById('edit-delete').textContent = s.deleteBtnLabel;
  document.getElementById('desc-toggle-label').textContent = s.accDescription;
  document.getElementById('image-toggle-label').textContent = s.accImage;
  document.getElementById('link-toggle-label').textContent = s.accLink;
  document.getElementById('location-toggle-label').textContent = s.accLocation;
  document.getElementById('category-toggle-label').textContent = s.accCategory;
  document.getElementById('bible-toggle-label').textContent = s.accBible;
  document.getElementById('bible-toggle-hint').textContent = s.optionalHint;
  document.getElementById('f-bible-help').textContent = s.bibleHelp;
  document.getElementById('timelineimg-row-label').textContent = s.timelineImgLabel;
  document.getElementById('timelineimg-row-sub').textContent = s.timelineImgSub;
  document.getElementById('note-toggle-label').textContent = s.accNote;
  document.getElementById('note-toggle-hint').textContent = s.optionalHint;
  document.getElementById('f-note-help').textContent = s.noteHelp;
  document.getElementById('f-note').placeholder = s.notePlaceholder;
  document.getElementById('cat-manage-btn').textContent = s.catManageBtn;
  document.getElementById('family-tree-label').textContent = s.familyTreeLabel;
  document.getElementById('family-tree-soon').textContent = s.familyTreeSoon;
  document.getElementById('family-tree-note').textContent = s.familyTreeNote;
  document.getElementById('bible-row-label').textContent = s.bibleRowLabel;
  document.getElementById('bible-row-sub').textContent = s.bibleRowSub;
  renderCatFormChips();
  if(typeof fBiblePreview!=='undefined' && fBibleRefs) renderBibleRefs(fBiblePreview, fBibleRefs.value, true);
  document.getElementById('desc-toggle-hint').textContent = s.optionalHint;
  document.getElementById('image-toggle-hint').textContent = s.optionalHint;
  document.getElementById('link-toggle-hint').textContent = s.optionalHint;
  document.getElementById('exchange-row-label').textContent = s.exchangeLabel;
  document.getElementById('exchange-row-sub').textContent = s.exchangeSub;
  document.getElementById('export-open-btn').textContent = s.sendBtnLabel;
  document.getElementById('import-trigger-btn').textContent = s.receiveBtnLabel;
  document.getElementById('export-modal-title').textContent = s.exportModalTitle;
  document.getElementById('export-confirm').textContent = s.exportDownloadBtn;
  document.getElementById('export-select-all').textContent = s.exportSelectAllBtn;
  document.getElementById('export-cancel').textContent = s.exportCancelBtn;
  document.getElementById('map-add-mode-label').textContent = s.mapAddModeLabel;
  document.getElementById('dbl-prev').title = s.prevLabel;
  document.getElementById('dbl-next').title = s.nextLabel;
  document.getElementById('d-prev').title = s.prevLabel;
  document.getElementById('d-next').title = s.nextLabel;
  document.getElementById('dbl-map-btn').title = s.mapBtnTitle;
  document.getElementById('dbl-copy-link').title = s.copyLinkTitle;
  document.getElementById('overview-filter-label').textContent = s.overviewFilterLabel;
  document.getElementById('overview-filter-hint').textContent = s.overviewFilterHint;
  document.getElementById('d-map-btn').title = s.mapBtnTitle;
  document.getElementById('dbl-expand-label').textContent =
    detailBarLandscape.classList.contains('expanded') ? s.expandLessLabel : s.expandMoreLabel;
  updateEventCounterBadge();
}

document.getElementById('lang-select').addEventListener('change', (e)=>{
  applyLanguage(e.target.value);
  saveSettings();
  refreshOpenDetail(); // noms des livres bibliques dans la nouvelle langue
});

/* Mode sombre */
const darkModeToggle = document.getElementById('dark-mode-toggle');
darkModeToggle.addEventListener('change', ()=>{
  isDarkMode = darkModeToggle.checked;
  document.body.classList.toggle('dark-mode', isDarkMode);
  applyCanvasTheme();
  render();
  if(typeof saveSettings==='function') saveSettings();
});

/* Images sur la carte */
const timelineImagesToggle = document.getElementById('timeline-images-toggle');
timelineImagesToggle.addEventListener('change', ()=>{
  timelineShowImages = timelineImagesToggle.checked;
  render();
  saveSettings();
});
/* Ouverture des versets : JW Library ou jw.org */
const bibleTargetSelect = document.getElementById('bible-target-select');
bibleTargetSelect.addEventListener('change', ()=>{
  bibleTarget = bibleTargetSelect.value==='web' ? 'web' : 'app';
  refreshOpenDetail(); // régénère les liens affichés
  saveSettings();
});

/* Mémorisation des réglages sur l'appareil (langue, mode sombre, images sur la carte, versets) */
/* Ne pas renommer : cette clé identifie les réglages déjà enregistrés sur chaque appareil
   (langue, mode sombre, images sur la frise, ouverture des versets). La renommer les remettrait
   tous à zéro, sans aucun message, au prochain lancement. */
const SETTINGS_KEY = 'frise-settings';
function saveSettings(){
  try{
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      lang: currentLang, dark: isDarkMode, timelineImages: timelineShowImages, bibleTarget,
      overviewEnabled: overviewFilterEnabled,
      overviewCats: [...overviewCats], overviewRequiredCats: [...overviewRequiredCats]
    }));
  }catch(err){ /* stockage indisponible (navigation privée…) : les réglages restent valables pour la session */ }
}
function loadSettings(){
  let st = null;
  try{ st = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); }catch(err){ st = null; }
  if(!st) return;
  if(typeof st.timelineImages==='boolean'){ timelineShowImages = st.timelineImages; timelineImagesToggle.checked = st.timelineImages; }
  if(st.bibleTarget==='web' || st.bibleTarget==='app'){ bibleTarget = st.bibleTarget; bibleTargetSelect.value = st.bibleTarget; }
  // Vue globale : ces choix décident de ce qui s'affiche au démarrage, ils doivent survivre à la fermeture
  if(Array.isArray(st.overviewCats)) overviewCats = new Set(st.overviewCats);
  if(Array.isArray(st.overviewRequiredCats)) overviewRequiredCats = new Set(st.overviewRequiredCats);
  if(typeof st.overviewEnabled==='boolean'){
    overviewFilterEnabled = st.overviewEnabled;
    overviewToggle.checked = st.overviewEnabled;
  }
  renderOverviewCatsList(); renderOverviewFilterList();
  if(st.lang && STRINGS[st.lang]) applyLanguage(st.lang);
  if(typeof st.dark==='boolean' && st.dark!==isDarkMode){
    darkModeToggle.checked = st.dark;
    darkModeToggle.dispatchEvent(new Event('change'));
  }
}
// Réaffiche le détail ouvert (ex : après changement de langue ou de cible des versets), sans le rouvrir s'il est fermé
function refreshOpenDetail(){
  if(!currentDetailItem) return;
  if(detail.classList.contains('open')) openDetailPanelPortrait(currentDetailItem);
  else if(detailBarLandscape.classList.contains('open')){
    const wasExpanded = detailBarLandscape.classList.contains('expanded');
    openDetailBarLandscape(currentDetailItem);
    if(wasExpanded){
      detailBarLandscape.classList.add('expanded');
      document.getElementById('dbl-expand-label').textContent = T().expandLessLabel;
    }
  }
}

/* Catégories affichées en vue globale (décongestion) */
const overviewToggle = document.getElementById('overview-toggle');
const overviewCatsListEl = document.getElementById('overview-cats-list');
function renderOverviewCatsList(){
  overviewCatsListEl.innerHTML='';
  overviewCatsListEl.style.opacity = overviewFilterEnabled ? '1' : '0.4';
  overviewCatsListEl.style.pointerEvents = overviewFilterEnabled ? 'auto' : 'none';
  Object.entries(CATS).forEach(([key,c])=>{
    const chip=document.createElement('div');
    chip.className='chip'+(overviewCats.has(key)?' active':'');
    chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${c.label}`;
    chip.onclick=()=>{
      if(overviewCats.has(key)) overviewCats.delete(key); else overviewCats.add(key);
      renderOverviewCatsList();
      render();
      saveSettings();
    };
    overviewCatsListEl.appendChild(chip);
  });
  document.getElementById('overview-cats-toggle-count').textContent = overviewCats.size>0 ? `(${overviewCats.size})` : '';
}
overviewToggle.addEventListener('change', ()=>{
  overviewFilterEnabled = overviewToggle.checked;
  renderOverviewCatsList();
  renderOverviewFilterList();
  render();
  saveSettings();
});
const overviewFilterListEl = document.getElementById('overview-filter-list');
function renderOverviewFilterList(){
  overviewFilterListEl.innerHTML='';
  overviewFilterListEl.style.opacity = overviewFilterEnabled ? '1' : '0.4';
  overviewFilterListEl.style.pointerEvents = overviewFilterEnabled ? 'auto' : 'none';
  Object.entries(CATS).forEach(([key,c])=>{
    const chip=document.createElement('div');
    chip.className='chip'+(overviewRequiredCats.has(key)?' active':'');
    chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${escapeHtml(c.label)}`;
    chip.onclick=()=>{
      if(overviewRequiredCats.has(key)) overviewRequiredCats.delete(key); else overviewRequiredCats.add(key);
      renderOverviewFilterList();
      render();
      saveSettings();
    };
    overviewFilterListEl.appendChild(chip);
  });
  document.getElementById('overview-filter-toggle-count').textContent =
    overviewRequiredCats.size>0 ? `(${overviewRequiredCats.size})` : '';
}
const overviewFilterToggleBtn = document.getElementById('overview-filter-toggle');
overviewFilterToggleBtn.addEventListener('click', (ev)=>{
  ev.stopPropagation();
  const open = overviewFilterListEl.classList.toggle('open');
  overviewFilterToggleBtn.classList.toggle('open', open);
});
document.addEventListener('click', e=>{
  if(!e.target.closest('#overview-filter-toggle') && !e.target.closest('#overview-filter-list')){
    overviewFilterListEl.classList.remove('open');
    overviewFilterToggleBtn.classList.remove('open');
  }
});

const overviewCatsToggleBtn = document.getElementById('overview-cats-toggle');
overviewCatsToggleBtn.addEventListener('click', (ev)=>{
  ev.stopPropagation();
  const open = overviewCatsListEl.classList.toggle('open');
  overviewCatsToggleBtn.classList.toggle('open', open);
});
document.addEventListener('click', e=>{
  if(!e.target.closest('#overview-cats-toggle') && !e.target.closest('#overview-cats-list')){
    overviewCatsListEl.classList.remove('open');
    overviewCatsToggleBtn.classList.remove('open');
  }
});
renderOverviewCatsList();
renderOverviewFilterList();

/* ---------- Envoyer / Recevoir : export et import de données au format JSON ---------- */
let exportCats = new Set();
let exportSearchQuery = '';
const exportCatsListEl = document.getElementById('export-cats-list');
function itemCountForCat(key){
  return EVENTS.filter(e=>itemHasCat(e,key)).length + PERIOD_ITEMS.filter(p=>itemHasCat(p,key)).length;
}
function renderExportCatsList(){
  exportCatsListEl.innerHTML='';
  const q = normalize(exportSearchQuery);
  Object.entries(CATS).forEach(([key,c])=>{
    if(q && !normalize(c.label).includes(q)) return;
    const row=document.createElement('label');
    row.className='export-cat-row';
    row.innerHTML = `<input type="checkbox" ${exportCats.has(key)?'checked':''}>
      <span class="dot" style="background:${c.color}"></span>
      <span>${c.label}</span>
      <span class="ec-count">${itemCountForCat(key)}</span>`;
    row.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) exportCats.add(key); else exportCats.delete(key);
    });
    exportCatsListEl.appendChild(row);
  });
  if(!exportCatsListEl.children.length){
    exportCatsListEl.innerHTML = `<div class="side-table-empty">Aucune catégorie ne correspond à cette recherche.</div>`;
  }
}

const exportOverlay = document.getElementById('export-overlay');
document.getElementById('export-open-btn').addEventListener('click', ()=>{
  exportSearchQuery=''; document.getElementById('export-cat-search').value='';
  renderExportCatsList();
  exportOverlay.classList.add('open');
});
document.getElementById('export-close').onclick = ()=> exportOverlay.classList.remove('open');
document.getElementById('export-cancel').onclick = ()=> exportOverlay.classList.remove('open');
exportOverlay.addEventListener('click', e=>{ if(e.target===exportOverlay) exportOverlay.classList.remove('open'); });
document.getElementById('export-cat-search').addEventListener('input', e=>{
  exportSearchQuery = e.target.value;
  renderExportCatsList();
});
document.getElementById('export-select-all').addEventListener('click', ()=>{
  const allSelected = Object.keys(CATS).every(k=>exportCats.has(k));
  if(allSelected) exportCats.clear();
  else Object.keys(CATS).forEach(k=>exportCats.add(k));
  renderExportCatsList();
});

document.getElementById('export-confirm').addEventListener('click', ()=>{
  const wanted = exportCats.size>0 ? exportCats : null;
  const events = EVENTS.filter(e=>!wanted || itemInCats(e, wanted)).map(({id, ...rest})=>rest);
  const periods = PERIOD_ITEMS.filter(p=>!wanted || itemInCats(p, wanted)).map(({id, ...rest})=>rest);
  const usedCats = new Set([...events.flatMap(e=>itemCats(e)), ...periods.flatMap(p=>itemCats(p))]);
  const categories = {};
  usedCats.forEach(key=>{ if(CATS[key]) categories[key] = {label:CATS[key].label, color:CATS[key].color}; });

  const payload = {app:'bibline', version:2, appVersion:APP_VERSION, exportedAt:new Date().toISOString(), categories, events, periods};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bibline-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  exportOverlay.classList.remove('open');
});

/* Recevoir : ouvre directement l'explorateur de fichiers, sans étape intermédiaire */
document.getElementById('import-trigger-btn').addEventListener('click', ()=>{
  document.getElementById('import-file-input').click();
});
document.getElementById('import-file-input').addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById('import-status');
  statusEl.style.display = 'block';
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(!data || (!Array.isArray(data.events) && !Array.isArray(data.periods))){
        throw new Error('format inattendu');
      }
      // Catégories : on ajoute celles qui n'existent pas encore, sans écraser celles déjà présentes
      if(data.categories){
        Object.entries(data.categories).forEach(([key,c])=>{
          if(!CATS[key]) CATS[key] = {label:c.label, color:c.color};
        });
      }
      let importedEvents=0, importedPeriods=0;
      // Fichiers v0.6 : un seul champ "cat" ; fichiers v0.7 : tableau "cats" — normalizeItemCats gère les deux
      (data.events||[]).forEach(ev=>{
        EVENTS.push(normalizeItemCats({...ev, id:genId('e'), isPeriod:false}));
        importedEvents++;
      });
      (data.periods||[]).forEach(p=>{
        PERIOD_ITEMS.push(normalizeItemCats({...p, id:genId('p'), isPeriod:true}));
        importedPeriods++;
      });
      refreshAllViews();
      statusEl.textContent = `${importedEvents} événement(s) et ${importedPeriods} période(s) importés avec succès.`;
    }catch(err){
      statusEl.textContent = "Ce fichier n'a pas pu être lu : vérifiez qu'il s'agit bien d'un export de cette application.";
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* Compteur total d'éléments : donnée permanente affichée dans les paramètres */
function updateEventCounterBadge(){
  document.getElementById('counter-row-value').textContent = String(EVENTS.length + PERIOD_ITEMS.length);
}

/* Ouverture / fermeture du panneau paramètres */
const settingsOverlay = document.getElementById('settings-overlay');
document.getElementById('rail-settings').addEventListener('click', ()=>{
  settingsOverlay.classList.add('open');
});
document.getElementById('settings-close').onclick = ()=> settingsOverlay.classList.remove('open');
settingsOverlay.addEventListener('click', e=>{ if(e.target===settingsOverlay) settingsOverlay.classList.remove('open'); });

/* ---------- Recherche ---------- */
const searchBox=document.getElementById('search-box');
const searchResults=document.getElementById('search-results');
function normalize(s){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

// Reconnaît une saisie de type "1789", "-3200", "3200 av", "3200 av. n. è." → renvoie l'année (négative si av. n. è.)
function parseYearQuery(raw){
  const q = raw.trim().toLowerCase();
  if(q==='') return null;
  if(/^-?\d{1,6}$/.test(q)) return parseInt(q,10);
  const m = q.match(/^(\d{1,6})\s*av/);
  if(m) return -parseInt(m[1],10);
  return null;
}

// Navigue vers un élément (événement ou période) : centre la frise dessus et ouvre son détail
function goToItem(it){
  if(it.isPeriod){
    const pad=(it.end-it.start)*0.4+10;
    setView(it.start-pad, it.end+pad, true);
  } else {
    const span=120;
    setView(it.y-span/2, it.y+span/2, true);
  }
  setTimeout(()=>openDetail(it), 500);
}
// Centre la frise sur une année donnée, sans élément associé
function goToYear(year){
  const span=200;
  setView(year-span/2, year+span/2, true);
}

function updateSearchResults(){
  const raw = searchBox.value;
  const q=normalize(raw.trim());
  const pool = searchCats.size>0 ? ALL_ITEMS.filter(it=>itemInCats(it, searchCats)) : ALL_ITEMS;
  if(!q){ searchResults.classList.remove('show'); return; }

  const yearMatch = parseYearQuery(raw);
  // Titre d'abord, puis éléments dont les références bibliques correspondent (ex : « Gn 6 », « Genèse 6 »)
  const byTitle = pool.filter(it=>normalize(it.t).includes(q));
  const byRefs = pool.filter(it=>!byTitle.includes(it) && it.bibleRefs && bibleRefsSearchText(it).includes(q));
  const matches = byTitle.concat(byRefs).slice(0,8);
  if(matches.length===0 && yearMatch==null){ searchResults.classList.remove('show'); return; }

  let html = '';
  if(yearMatch!=null){
    html += `<div class="search-item search-item-year" data-year="${yearMatch}">
      <span class="si-left"><span class="sdot" style="background:${COLORS.brass}"></span><span class="stitle">${T().goToYearLabel} ${formatYear(yearMatch)}</span></span>
      <span class="sy">→</span>
    </div>`;
  }
  html += matches.map(it=>{
    const dateLabel = it.isPeriod
      ? `${formatYear(it.startYear!=null?it.startYear:Math.floor(it.start))}–${formatYear(it.endYear!=null?it.endYear:Math.floor(it.end))}`
      : formatYear(it.year!=null?it.year:Math.floor(it.y));
    return `<div class="search-item" data-id="${it.id}">
      <span class="si-left"><span class="sdot" style="background:${catOf(it.cat).color}"></span><span class="stitle">${escapeHtml(it.t)}</span></span>
      <span class="sy">${dateLabel}</span>
    </div>`;
  }).join('');
  searchResults.innerHTML = html;
  searchResults.classList.add('show');
}
searchBox.addEventListener('input', updateSearchResults);
searchBox.addEventListener('focus', ()=>{
  searchCatsEl.classList.add('show');
  if(searchBox.value.trim()) updateSearchResults();
});

searchResults.addEventListener('click', e=>{
  const yearItem = e.target.closest('.search-item-year');
  if(yearItem){
    goToYear(parseInt(yearItem.dataset.year,10));
    searchResults.classList.remove('show');
    searchBox.value='';
    return;
  }
  const item=e.target.closest('.search-item');
  if(!item) return;
  const it = ALL_ITEMS.find(x=>x.id===item.dataset.id);
  if(!it) return;
  goToItem(it);
  searchResults.classList.remove('show');
  searchBox.value='';
});
document.addEventListener('click', e=>{
  if(!e.target.closest('#search-wrap')){
    searchResults.classList.remove('show');
    searchCatsEl.classList.remove('show');
  }
});

/* ---------- Références bibliques (v0.7) ----------
   Fonctionnement repris du module Obsidian « JW Library Linker » (github.com/msakowski/obsidian-library-linker,
   licence Apache 2.0) : une référence comme « Gn 6:9-22 » devient un lien
   jwlibrary:///finder?bible=01006009-01006022&wtlocale=F qui ouvre le passage directement dans JW Library.
   Code du passage = livre (2 chiffres) + chapitre (3 chiffres) + verset (3 chiffres).
   Les noms de livres (français, anglais, espagnol) proviennent des fichiers de ce même module. */
// Le tableau BIBLE_BOOKS est défini dans bible-books.js, chargé juste avant ce fichier.
const BIBLE_SINGLE_CHAPTER = [31, 57, 63, 64, 65]; // Abdias, Philémon, 2 Jean, 3 Jean, Jude
const BIBLE_WTLOCALE = {fr:'F', en:'E', es:'S', zh:'CHS'};
let bibleTarget = 'app'; // 'app' = JW Library, 'web' = jw.org dans le navigateur

function bibleNameLang(){ return ({fr:'F', en:'E', es:'S'})[currentLang] || 'E'; }
function bibleClean(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.\s\-\/’']/g,''); }
let BIBLE_INDEX = null;
function bibleIndex(){
  if(!BIBLE_INDEX){
    BIBLE_INDEX = BIBLE_BOOKS.map((b,i)=>({
      id:i+1,
      byLang:{F:b.n.F.map(bibleClean), E:b.n.E.map(bibleClean), S:b.n.S.map(bibleClean)},
      aliases:b.a.map(bibleClean)
    }));
  }
  return BIBLE_INDEX;
}
// Retrouve un livre à partir d'un nom complet, d'une abréviation ou du début d'un nom (FR/EN/ES, accents facultatifs)
function findBibleBook(query){
  const c = bibleClean(query);
  if(!c) return {error:'book'};
  const idx = bibleIndex();
  const order = [bibleNameLang(),'F','E','S'].filter((v,i,a)=>a.indexOf(v)===i);
  for(const mode of ['exact','prefix']){
    const test = mode==='exact' ? (t=>t===c) : (t=>t.startsWith(c));
    const ids = new Set(idx.filter(b=>Object.values(b.byLang).some(ts=>ts.some(test)) || b.aliases.some(test)).map(b=>b.id));
    if(ids.size===1) return {id:[...ids][0]};
    if(ids.size>1){
      // Plusieurs livres possibles : on privilégie la langue de l'interface, puis le français
      for(const L of order){
        const inLang = idx.filter(b=>b.byLang[L].some(test)).map(b=>b.id);
        if(inLang.length===1) return {id:inLang[0]};
      }
      return {error:'ambiguous', ids:[...ids]};
    }
  }
  return {error:'book'};
}
function bibleCode(book, ch, v){ return String(book).padStart(2,'0')+String(ch).padStart(3,'0')+String(v).padStart(3,'0'); }

// Analyse UNE référence (« Gn 6:9-22 », « 1 R 18 », « Jude 3 », « Mt 3:1-4:11 », « Jean 1:1, 3, 5-7 »)
function parseBibleRef(raw){
  const s = raw.trim().replace(/[–—]/g,'-');
  if(!s) return null;
  const m = s.match(/^([1-5]\s*\.?\s*)?([^\d]+?)\s*(\d[\d\s:.,\-]*)$/u);
  if(!m) return {raw:s, error:'format'};
  const found = findBibleBook((m[1]||'')+m[2]);
  if(found.error) return {raw:s, error:found.error, ids:found.ids};
  const id = found.id, book = BIBLE_BOOKS[id-1], maxCh = book.c;
  const single = BIBLE_SINGLE_CHAPTER.includes(id);
  const n = m[3].replace(/\s+/g,'').replace(/\./g,':').replace(/,+$/,'');
  let segs = [], chapterOnly = false, r;
  if((r = n.match(/^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?((?:,\d+(?:-\d+)?)*)$/))){
    const c=+r[1], v=+r[2];
    if(r[3] && r[5]) return {raw:s, error:'format'};
    segs.push({c1:c, v1:v, c2:r[3]?+r[3]:c, v2:r[4]?+r[4]:v});
    if(r[5]) r[5].split(',').filter(Boolean).forEach(p=>{ const [a,b]=p.split('-').map(Number); segs.push({c1:c, v1:a, c2:c, v2:b||a}); });
  } else if((r = n.match(/^(\d+)(?:-(\d+))?((?:,\d+(?:-\d+)?)*)$/))){
    if(single){
      // Livre d'un seul chapitre : « Jude 3 » désigne le verset 3
      segs.push({c1:1, v1:+r[1], c2:1, v2:r[2]?+r[2]:+r[1]});
      if(r[3]) r[3].split(',').filter(Boolean).forEach(p=>{ const [a,b]=p.split('-').map(Number); segs.push({c1:1, v1:a, c2:1, v2:b||a}); });
    } else {
      if(r[3]) return {raw:s, error:'format'};
      chapterOnly = true;
      segs.push({c1:+r[1], v1:1, c2:r[2]?+r[2]:+r[1], v2:1});
    }
  } else {
    return {raw:s, error:'format'};
  }
  for(const g of segs){
    if(g.c1<1 || g.c2<1 || g.c1>maxCh || g.c2>maxCh) return {raw:s, error:'chapter', max:maxCh, id};
    if(g.v1<1 || g.v2<1) return {raw:s, error:'format'};
    if(g.c2<g.c1 || (g.c2===g.c1 && g.v2<g.v1 && !chapterOnly)) return {raw:s, error:'order'};
  }
  return {raw:s, id, segs, chapterOnly, single};
}
function parseBibleRefs(text){
  if(!text) return [];
  return text.split(/[;\n]+/).map(parseBibleRef).filter(Boolean);
}
function bibleBookName(id){ return BIBLE_BOOKS[id-1].n[bibleNameLang()][0]; }
// Découpe une référence analysée en morceaux cliquables (un par plage de versets, comme le module Obsidian)
function bibleRefParts(ref){
  const {id, segs, chapterOnly, single} = ref;
  const book = bibleBookName(id);
  if(chapterOnly){
    const g = segs[0];
    return [{text:`${book} ${g.c1}${g.c2!==g.c1?'-'+g.c2:''}`, param:bibleCode(id,g.c1,1)}];
  }
  return segs.map((g,i)=>{
    let nums;
    if(g.c2!==g.c1) nums = `${g.c1}:${g.v1}-${g.c2}:${g.v2}`;
    else {
      const v = g.v2!==g.v1 ? `${g.v1}-${g.v2}` : `${g.v1}`;
      nums = (i===0 && !single) ? `${g.c1}:${v}` : v;
    }
    const start = bibleCode(id,g.c1,g.v1), end = bibleCode(id,g.c2,g.v2);
    return {text: i===0 ? `${book} ${nums}` : nums, param: start===end ? start : `${start}-${end}`};
  });
}
function bibleUrl(param){
  const loc = BIBLE_WTLOCALE[currentLang] || 'F';
  return bibleTarget==='web'
    ? `https://www.jw.org/finder?wtlocale=${loc}&prefer=lang&bible=${param}`
    : `jwlibrary:///finder?bible=${param}&wtlocale=${loc}`;
}
function bibleErrorText(ref){
  const s = T();
  if(ref.error==='book') return s.bibleErrBook;
  if(ref.error==='ambiguous') return s.bibleErrAmbiguous((ref.ids||[]).slice(0,4).map(bibleBookName).join(', '));
  if(ref.error==='chapter') return s.bibleErrChapter(bibleBookName(ref.id), ref.max);
  if(ref.error==='order') return s.bibleErrOrder;
  return s.bibleErrFormat;
}
// Remplit un conteneur avec les puces de références ; showErrors = true dans le formulaire (aperçu)
function renderBibleRefs(container, text, showErrors){
  const refs = parseBibleRefs(text);
  if(!refs.length){ container.innerHTML=''; container.style.display = showErrors ? '' : 'none'; return; }
  const targetAttr = bibleTarget==='web' ? ' target="_blank" rel="noopener"' : '';
  container.innerHTML = refs.map(ref=>{
    if(ref.error){
      if(showErrors) return `<span class="bible-ref-chip invalid" title="${escapeHtml(bibleErrorText(ref))}"><span class="bref-icon">⚠</span>${escapeHtml(ref.raw)} <span class="bref-err">— ${escapeHtml(bibleErrorText(ref))}</span></span>`;
      return `<span class="bible-ref-chip unlinked"><span class="bref-icon">📖</span>${escapeHtml(ref.raw)}</span>`;
    }
    const links = bibleRefParts(ref).map(p=>`<a href="${bibleUrl(p.param)}"${targetAttr}>${escapeHtml(p.text)}</a>`).join(', ');
    return `<span class="bible-ref-chip"><span class="bref-icon">📖</span>${links}</span>`;
  }).join('');
  container.style.display = '';
}
/* ---------- Versets cités au fil d'une note (v0.9.2) ----------
   Dans le texte libre d'une note, « Gen 3:15 » devient un lien vers JW Library, comme dans le champ
   « Références bibliques ». Le texte reste exactement tel qu'il a été saisi ; seule sa couleur change.
   Deux garde-fous évitent de transformer une phrase ordinaire en lien :
   — le chapitre ET le verset sont exigés (sauf pour les cinq livres à chapitre unique, ex. « Jude 3 »)
   — quelques abréviations qui sont aussi des mots courants ne sont pas reconnues ici (« de », « est »,
     « la », « le », « ne » en français) ; elles restent utilisables dans le champ « Références bibliques ». */
const NOTE_BIBLE_SKIP = {
  fr:['de','est','la','le','ne'],
  en:['am','can','he','is'],
  es:['de','la','mi'],
  zh:[]
};
const NOTE_BIBLE_SKIP_ALWAYS = ['phil']; // « Phil. » désigne Philippiens ou Philémon selon la langue
let NOTE_BIBLE_NAMES = null;
function noteBibleNames(){
  if(NOTE_BIBLE_NAMES) return NOTE_BIBLE_NAMES;
  // Reconnaissance au nom exact (toutes langues confondues), sans devinette sur un début de mot :
  // au fil d'un texte, « A 3:1 » ne doit pas devenir Amos.
  NOTE_BIBLE_NAMES = new Map();
  const claimed = new Map();
  BIBLE_BOOKS.forEach((b,i)=>{
    const id = i+1;
    const add = (n)=>{
      const c = bibleClean(n);
      if(!c) return;
      if(claimed.has(c) && claimed.get(c)!==id){ NOTE_BIBLE_NAMES.delete(c); return; } // nom revendiqué par deux livres
      claimed.set(c, id);
      NOTE_BIBLE_NAMES.set(c, id);
    };
    Object.values(b.n).forEach(arr=>arr.forEach(add));
    (b.a||[]).forEach(add);
  });
  return NOTE_BIBLE_NAMES;
}
function noteBibleSkipped(cleanName){
  if(NOTE_BIBLE_SKIP_ALWAYS.includes(cleanName)) return true;
  return (NOTE_BIBLE_SKIP[currentLang] || []).includes(cleanName);
}
const NOTE_BIBLE_RE = /(^|[^\p{L}\p{N}])((?:[1-5]\s?\.?\s?)?\p{L}[\p{L}.\-]{0,16}(?:\s\p{L}[\p{L}.\-]{0,16}){0,2})\s?(\d{1,3}(?::\d{1,3}(?:\s?-\s?\d{1,3}(?::\d{1,3})?)?(?:\s?,\s?\d{1,3}(?:\s?-\s?\d{1,3})?)*)?)/gu;

// Le nom du livre est cherché parmi les derniers mots précédant le numéro : « lire dans Gen 3:15 »
// n'est pas le livre « lire dans Gen », mais bien « Gen ».
function noteBibleMatch(bookRaw, numsRaw){
  const words = [];
  const wordRe = /\S+/g;
  let w;
  while((w = wordRe.exec(bookRaw))!==null) words.push({text:w[0], index:w.index});
  const names = noteBibleNames();
  for(let take=Math.min(3, words.length); take>=1; take--){
    const slice = words.slice(words.length-take);
    const cand = slice.map(p=>p.text).join(' ');
    const c = bibleClean(cand);
    if(!c || noteBibleSkipped(c)) continue;
    const id = names.get(c);
    if(!id) continue;
    const ref = parseBibleRef(cand+' '+numsRaw);
    if(!ref || ref.error) continue;
    if(ref.chapterOnly && !BIBLE_SINGLE_CHAPTER.includes(id)) continue; // « Actes 5 » reste une phrase
    return {ref, startInBook: slice[0].index};
  }
  return null;
}

function bibleTextToHtml(text){
  if(!text) return '';
  let out='', last=0, m;
  const re = new RegExp(NOTE_BIBLE_RE.source, 'gu');
  const targetAttr = bibleTarget==='web' ? ' target="_blank" rel="noopener"' : '';
  while((m = re.exec(text))!==null){
    const found = noteBibleMatch(m[2], m[3]);
    if(!found) continue;
    const parts = bibleRefParts(found.ref);
    const start = m.index + m[1].length + found.startInBook;
    const end = m.index + m[0].length;
    out += escapeHtml(text.slice(last, start));
    const shown = text.slice(start, end);
    const title = parts.map(p=>p.text).join(', ');
    out += `<a class="note-bible" href="${escapeHtml(bibleUrl(parts[0].param))}"${targetAttr} title="${escapeHtml(title)}">`
        +  `<span class="nb-icon">📖</span>${escapeHtml(shown)}</a>`;
    last = end;
  }
  out += escapeHtml(text.slice(last));
  return out;
}

// Texte des références (noms normalisés) utilisé pour la recherche
function bibleRefsSearchText(it){
  if(!it.bibleRefs) return '';
  const extra = parseBibleRefs(it.bibleRefs).filter(r=>!r.error).map(r=>bibleRefParts(r).map(p=>p.text).join(' ')).join(' ');
  return normalize(it.bibleRefs+' '+extra);
}

/* ---------- Panneau détail : deux présentations selon l'orientation ---------- */
const detail=document.getElementById('detail');
document.getElementById('detail-close').onclick=()=>detail.classList.remove('open');
let currentDetailItem = null;

function dateLabelFor(item){
  return item.isPeriod
    ? `${item.approx?'Vers ':''}${formatDatePart(item.startYear!=null?item.startYear:Math.floor(item.start), item.startMonth, item.startDay, item.startHour, item.startMinute)} – ${formatDatePart(item.endYear!=null?item.endYear:Math.floor(item.end), item.endMonth, item.endDay, item.endHour, item.endMinute)}`
    : formatFullDate(item);
}
function sortTimeOf(it){ return it.isPeriod ? it.start : it.y; }

// Bascule le volet ouvert d'une présentation à l'autre quand l'appareil change d'orientation
function syncDetailOrientation(){
  if(!uiReady || !currentDetailItem) return;
  const portraitOpen = detail.classList.contains('open');
  const landscapeOpen = detailBarLandscape.classList.contains('open');
  if(isVertical && landscapeOpen){
    setLandscapeBarOpen(false);
    openDetailPanelPortrait(currentDetailItem);
  } else if(!isVertical && portraitOpen){
    detail.classList.remove('open');
    openDetailBarLandscape(currentDetailItem);
  }
}

// Point d'entrée unique : choisit la présentation adaptée à l'orientation actuelle
function openDetail(item){
  currentDetailItem = item;
  if(isVertical) openDetailPanelPortrait(item);
  else openDetailBarLandscape(item);
}

function openDetailPanelPortrait(item){
  document.getElementById('d-title').textContent=item.t;
  document.getElementById('d-date').textContent = dateLabelFor(item);
  renderNote(document.getElementById('d-desc'), item.d);
  renderNote(document.getElementById('d-note'), item.note); // portrait : la note reste visible en permanence
  document.getElementById('d-cats').innerHTML = itemCats(item).map((k,i)=>{
    const c = catOf(k);
    const suffix = (i===0 && item.isPeriod) ? ' · '+T().typePeriod : '';
    return `<span class="cat-badge" style="color:${c.color};border:1px solid ${c.color}55;background:${c.color}15;">${escapeHtml(c.label)}${suffix}</span>`;
  }).join('');
  renderBibleRefs(document.getElementById('d-refs'), item.bibleRefs, false);

  const imgBox = document.getElementById('d-image');
  imgBox.innerHTML = item.img ? `<img src="${escapeHtml(item.img)}" alt="" referrerpolicy="no-referrer" style="object-position:${escapeHtml(item.imgPosition||'center center')};">` : 'emplacement image';

  const linkEl = document.getElementById('d-link');
  if(item.link){ linkEl.href = item.link; linkEl.style.display = 'inline-block'; }
  else { linkEl.style.display = 'none'; }

  const dMapBtn = document.getElementById('d-map-btn');
  dMapBtn.style.display = (item.lat!=null && item.lng!=null) ? 'flex' : 'none';

  detail.classList.add('open');
}

const detailBarLandscape = document.getElementById('detail-bar-landscape');
const appEl = document.getElementById('app');
// Ouverture / fermeture du bandeau paysage, en un seul endroit : le titre de l'application
// se retire en même temps, sinon il se superpose à la frise une fois la place réduite.
function setLandscapeBarOpen(open){
  detailBarLandscape.classList.toggle('open', open);
  if(!open) detailBarLandscape.classList.remove('expanded');
  appEl.classList.toggle('detail-bar-open', open);
}
function openDetailBarLandscape(item){
  document.getElementById('dbl-title').textContent = item.t;
  document.getElementById('dbl-date').textContent = dateLabelFor(item);
  renderNote(document.getElementById('dbl-desc'), item.d);
  // Paysage : la note n'apparaît qu'en vue détaillée (le CSS la masque tant que le bandeau n'est pas déplié)
  renderNote(document.getElementById('dbl-note'), item.note);

  const era = eraOf(item.isPeriod ? item.start : item.y);
  const metaEl = document.getElementById('dbl-meta');
  let metaHtml = '';
  if(era) metaHtml += `<span class="cat-badge" style="color:${COLORS.brass};border:1px solid ${COLORS.brass}55;background:${COLORS.brass}15;">${era.title}</span>`;
  itemCats(item).forEach(k=>{
    const c = catOf(k);
    metaHtml += `<span class="cat-badge" style="color:${c.color};border:1px solid ${c.color}55;background:${c.color}15;">${escapeHtml(c.label)}</span>`;
  });
  metaEl.innerHTML = metaHtml;
  renderBibleRefs(document.getElementById('dbl-refs'), item.bibleRefs, false);

  const imgBox = document.getElementById('dbl-image');
  imgBox.innerHTML = item.img ? `<img src="${escapeHtml(item.img)}" alt="" referrerpolicy="no-referrer" style="object-position:${escapeHtml(item.imgPosition||'center center')};">` : 'emplacement image';

  const locWrap = document.getElementById('dbl-location-wrap');
  const locEl = document.getElementById('dbl-location');
  if(item.locationName || (item.lat!=null && item.lng!=null)){
    locWrap.classList.add('has-data');
    locEl.textContent = '📍 ' + (item.locationName || `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`);
  } else {
    locWrap.classList.remove('has-data');
  }
  const linkRow = document.getElementById('dbl-link-row');
  const linkEl = document.getElementById('dbl-link');
  if(item.link){ linkEl.href = item.link; linkRow.classList.add('has-data'); }
  else { linkRow.classList.remove('has-data'); }

  const mapBtn = document.getElementById('dbl-map-btn');
  mapBtn.style.display = (item.lat!=null && item.lng!=null) ? 'flex' : 'none';

  detailBarLandscape.classList.remove('expanded');
  document.getElementById('dbl-expand-label').textContent = T().expandMoreLabel;
  setLandscapeBarOpen(true);
}
document.getElementById('dbl-close').onclick = ()=> setLandscapeBarOpen(false);
document.getElementById('dbl-expand-toggle').onclick = ()=>{
  const expanded = detailBarLandscape.classList.toggle('expanded');
  document.getElementById('dbl-expand-label').textContent = expanded ? T().expandLessLabel : T().expandMoreLabel;
};
document.getElementById('dbl-copy-link').onclick = async ()=>{
  if(!currentDetailItem) return;
  const ok = await copyText(eventLink(currentDetailItem));
  showToast(ok ? T().linkCopied : T().linkCopyFailed);
};
document.getElementById('dbl-edit').onclick = ()=>{
  if(currentDetailItem) openEditModal(currentDetailItem);
};
document.getElementById('dbl-map-btn').onclick = ()=>{
  const item = currentDetailItem;
  if(!item || item.lat==null || item.lng==null) return;
  openMapModal({focus:[item.lat, item.lng]});
};
document.getElementById('dbl-prev').addEventListener('click', ()=> navigateRelative(-1));
document.getElementById('d-prev').addEventListener('click', ()=> navigateRelative(-1));
document.getElementById('d-next').addEventListener('click', ()=> navigateRelative(1));
document.getElementById('d-map-btn').onclick = ()=>{
  const item = currentDetailItem;
  if(!item || item.lat==null || item.lng==null) return;
  openMapModal({focus:[item.lat, item.lng]});
};
document.getElementById('dbl-next').addEventListener('click', ()=> navigateRelative(1));
function navigateRelative(delta){
  if(!currentDetailItem) return;
  const sorted = ALL_ITEMS.filter(it=>itemInCats(it, activeCats)).sort((a,b)=> sortTimeOf(a)-sortTimeOf(b));
  const idx = sorted.findIndex(x=>x.id===currentDetailItem.id);
  if(idx<0) return;
  const newIdx = idx+delta;
  if(newIdx<0 || newIdx>=sorted.length) return;
  goToItem(sorted[newIdx]);
}
detailBarLandscape.addEventListener('transitionend', (e)=>{
  if(e.propertyName==='height') resize();
});

// Un renvoi ouvre l'événement visé sans recharger la page
document.addEventListener('click', (e)=>{
  const tag = e.target.closest && e.target.closest('.note-event');
  if(!tag) return;
  e.preventDefault();
  const it = findEventByRef(parseEventHash(new URL(tag.href, location.href).hash));
  if(it){
    detail.classList.remove('open');
    goToItem(it);
  } else {
    showToast(T().eventNotFound);
  }
});

document.getElementById('edit-btn').onclick = ()=>{
  if(currentDetailItem) openEditModal(currentDetailItem);
};

/* ---------- Formulaire d'ajout / modification d'élément ---------- */
const editOverlay = document.getElementById('edit-overlay');
const editModalTitle = document.getElementById('edit-modal-title');
const formError = document.getElementById('form-error');
const typeSegment = document.getElementById('type-segment');
const startDateLabel = document.getElementById('start-date-label');
const endDateRow = document.getElementById('end-date-row');
const fTitle = document.getElementById('f-title');
const fStartYear = document.getElementById('f-start-year');
const fStartMonth = document.getElementById('f-start-month');
const fStartDay = document.getElementById('f-start-day');
const fStartHour = document.getElementById('f-start-hour');
const fStartMinute = document.getElementById('f-start-minute');
const fEndYear = document.getElementById('f-end-year');
const fEndMonth = document.getElementById('f-end-month');
const fEndDay = document.getElementById('f-end-day');
const fEndHour = document.getElementById('f-end-hour');
const fEndMinute = document.getElementById('f-end-minute');
const fApprox = document.getElementById('f-approx');
const fDesc = document.getElementById('f-desc');
const fImage = document.getElementById('f-image');
const fImageUrl = document.getElementById('f-image-url');
const fImagePreview = document.getElementById('f-image-preview');
const fLink = document.getElementById('f-link');
const fNote = document.getElementById('f-note');
const fNotePreview = document.getElementById('f-note-preview');
const fBibleRefs = document.getElementById('f-bible-refs');
const fBiblePreview = document.getElementById('f-bible-preview');
const fLocationName = document.getElementById('f-location-name');
const fLat = document.getElementById('f-lat');
const fLng = document.getElementById('f-lng');
const catSelectList = document.getElementById('cat-select-list');
const catAddBtn = document.getElementById('cat-add-btn');
const catNewForm = document.getElementById('cat-new-form');

let editingItem = null;
let editingType = 'event';
let selectedCatKeys = []; // ordre = ordre de sélection ; la 1re est la catégorie principale (couleur)
let formImageValue = null;
let formImagePosition = 'center center';

// Peuplement des listes de mois (une seule fois)
[fStartMonth, fEndMonth].forEach(sel=>{
  MONTH_FULL.forEach((name,i)=>{
    const opt=document.createElement('option');
    opt.value=String(i+1); opt.textContent=name.charAt(0).toUpperCase()+name.slice(1);
    sel.appendChild(opt);
  });
});

/* Ère de la date : « av. n. è. » ou « de n. è. ».
   Le champ « Année » ne reçoit donc qu'un nombre positif, car le clavier numérique des téléphones et
   tablettes ne propose pas la touche « - ». Au clavier physique, saisir « -3200 » reste possible :
   le signe bascule automatiquement le sélecteur et disparaît du champ. */
function eraBtns(prefix){ return document.getElementById(prefix+'-era').querySelectorAll('.seg-btn'); }
function isBce(prefix){
  const active = document.querySelector('#'+prefix+'-era .seg-btn.active');
  return !!active && active.dataset.era==='bce';
}
function setEra(prefix, bce){
  eraBtns(prefix).forEach(b=> b.classList.toggle('active', (b.dataset.era==='bce')===!!bce));
}
['start','end'].forEach(prefix=>{
  eraBtns(prefix).forEach(btn=>{
    btn.addEventListener('click', ()=> setEra(prefix, btn.dataset.era==='bce'));
  });
});
function wireYearInput(prefix, inp){
  inp.addEventListener('input', ()=>{
    const raw = inp.value;
    const cleaned = raw.replace(/[^\d]/g,'');
    if(/-/.test(raw)) setEra(prefix, true);
    if(cleaned !== raw) inp.value = cleaned;
  });
}
wireYearInput('start', fStartYear);
wireYearInput('end', fEndYear);

// Révélation progressive réelle : année saisie → affiche le mois ; mois choisi → affiche le jour ; jour saisi → affiche heure/minute
function wireProgressiveDate(prefix, yearInp, monthSel, dayInp, hourInp, minInp){
  const monthWrap = document.getElementById(prefix+'-month-wrap');
  const dayWrap = document.getElementById(prefix+'-day-wrap');
  const timeWrap = document.getElementById(prefix+'-time-wrap');

  function syncMonth(){
    const has = yearInp.value.trim()!=='';
    monthWrap.style.display = has ? '' : 'none';
    if(!has){ monthSel.value=''; syncDay(); }
  }
  function syncDay(){
    const has = monthSel.value!=='';
    dayWrap.style.display = has ? '' : 'none';
    if(!has){ dayInp.value=''; syncTime(); }
  }
  function syncTime(){
    const has = dayInp.value.trim()!=='';
    timeWrap.style.display = has ? '' : 'none';
    if(!has){ hourInp.value=''; minInp.value=''; }
  }
  yearInp.addEventListener('input', syncMonth);
  monthSel.addEventListener('change', syncDay);
  dayInp.addEventListener('input', syncTime);
}
wireProgressiveDate('start', fStartYear, fStartMonth, fStartDay, fStartHour, fStartMinute);
wireProgressiveDate('end', fEndYear, fEndMonth, fEndDay, fEndHour, fEndMinute);

/* Accordéons du formulaire : repliés par défaut, s'ouvrent au clic ou automatiquement si des données existent déjà */
function setupAccordion(toggleId, bodyId){
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  function set(open){
    toggle.classList.toggle('open', open);
    body.classList.toggle('open', open);
  }
  toggle.addEventListener('click', ()=> set(!body.classList.contains('open')));
  return set;
}
const setCategoryAccordion = setupAccordion('category-toggle', 'category-body');
const setDescAccordion = setupAccordion('desc-toggle', 'desc-body');
const setImageAccordion = setupAccordion('image-toggle', 'image-body');
const setLinkAccordion = setupAccordion('link-toggle', 'link-body');
const setBibleAccordion = setupAccordion('bible-toggle', 'bible-body');
const setNoteAccordion = setupAccordion('note-toggle', 'note-body');
fNote.addEventListener('input', ()=> renderNote(fNotePreview, fNote.value));
fBibleRefs.addEventListener('input', ()=> renderBibleRefs(fBiblePreview, fBibleRefs.value, true));
const setLocationAccordion = setupAccordion('location-toggle', 'location-body');
document.getElementById('f-pick-on-map').addEventListener('click', ()=>{
  mapPickForForm = true;
  openMapModal();
});

// Bascule Événement / Période
typeSegment.querySelectorAll('.seg-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    editingType = btn.dataset.type;
    typeSegment.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b===btn));
    const isPeriod = editingType==='period';
    endDateRow.style.display = isPeriod ? '' : 'none';
    startDateLabel.textContent = isPeriod ? 'Date de début *' : 'Date *';
  });
});

function toggleFormCat(key){
  if(selectedCatKeys.includes(key)){
    selectedCatKeys = selectedCatKeys.filter(k=>k!==key);
  } else if(key==='sans_categorie'){
    selectedCatKeys = ['sans_categorie']; // "Sans catégorie" exclut toutes les autres
  } else {
    selectedCatKeys = selectedCatKeys.filter(k=>k!=='sans_categorie').concat(key);
  }
  renderCatFormChips();
}
function makeFormCatPrimary(key){
  if(!selectedCatKeys.includes(key)) return;
  selectedCatKeys = [key, ...selectedCatKeys.filter(k=>k!==key)];
  renderCatFormChips();
}
function renderCatFormChips(){
  selectedCatKeys = selectedCatKeys.filter(k=>CATS[k]);
  catSelectList.querySelectorAll('.cat-form-chip').forEach(el=>el.remove());
  Object.entries(CATS).forEach(([key,c])=>{
    const selIdx = selectedCatKeys.indexOf(key);
    const chip=document.createElement('div');
    chip.className='chip cat-form-chip'+(selIdx>=0?' active':'')+(selIdx===0 && selectedCatKeys.length>1?' primary':'');
    chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${escapeHtml(c.label)}`
      + (selIdx===0 && selectedCatKeys.length>1 ? `<span class="cat-primary-star" title="${escapeHtml(T().catPrimaryTitle)}">★</span>` : '')
      + (selIdx>0 ? `<span class="cat-make-primary" title="${escapeHtml(T().catMakePrimaryTitle)}">☆</span>` : '');
    chip.onclick=(ev)=>{
      if(ev.target.closest('.cat-make-primary')){ ev.stopPropagation(); makeFormCatPrimary(key); return; }
      toggleFormCat(key);
    };
    catSelectList.insertBefore(chip, catAddBtn);
  });
  const summary = document.getElementById('category-toggle-summary');
  const labels = selectedCatKeys.map(k=>CATS[k].label);
  summary.textContent = labels.length ? `— ${labels.join(' · ')}` : T().catNoneSelected;
  const hint = document.getElementById('cat-multi-hint');
  if(hint) hint.textContent = T().catMultiHint;
}
renderCatFormChips();

catAddBtn.addEventListener('click', ()=>{
  catNewForm.classList.toggle('show');
});
// Gestion des catégories accessible directement depuis le formulaire (et plus seulement depuis les filtres)
document.getElementById('cat-manage-btn').addEventListener('click', ()=>{
  renderCatManageList();
  catmanageOverlay.classList.add('open');
  bringToFront(catmanageOverlay); // doit passer au-dessus du formulaire déjà ouvert
});
document.getElementById('new-cat-confirm').addEventListener('click', ()=>{
  const name = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;
  if(!name) return;
  const newKey = addCategory(name, color);
  if(!selectedCatKeys.includes(newKey)) toggleFormCat(newKey);
  document.getElementById('new-cat-name').value='';
  catNewForm.classList.remove('show');
});

fImage.addEventListener('change', ()=>{
  const file = fImage.files && fImage.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    formImageValue = reader.result;
    fImageUrl.value = '';
    fImagePreview.innerHTML = `<img src="${escapeHtml(formImageValue)}" alt="" style="object-position:${escapeHtml(formImagePosition)};">`;
    updateImagePositionUI();
  };
  reader.readAsDataURL(file);
});

let imageUrlDebounce = null;
/* Grille de cadrage 3x3 : ajuste object-position pour mieux cadrer l'image sur la frise / dans les détails */
const POSITIONS = [
  ['top left','top center','top right'],
  ['center left','center center','center right'],
  ['bottom left','bottom center','bottom right'],
];
const imagePositionRow = document.getElementById('f-image-position-row');
const imagePositionGrid = document.getElementById('image-position-grid');
POSITIONS.flat().forEach(pos=>{
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pos-btn'+(pos===formImagePosition?' active':'');
  btn.dataset.pos = pos;
  btn.title = pos;
  btn.innerHTML = '<span class="pos-dot"></span>';
  btn.addEventListener('click', ()=>{
    formImagePosition = pos;
    imagePositionGrid.querySelectorAll('.pos-btn').forEach(b=>b.classList.toggle('active', b.dataset.pos===pos));
    const img = fImagePreview.querySelector('img');
    if(img) img.style.objectPosition = pos;
  });
  imagePositionGrid.appendChild(btn);
});
function updateImagePositionUI(){
  const hasImage = !!formImageValue;
  imagePositionRow.style.display = hasImage ? 'block' : 'none';
  imagePositionGrid.querySelectorAll('.pos-btn').forEach(b=>b.classList.toggle('active', b.dataset.pos===formImagePosition));
}

fImageUrl.addEventListener('input', ()=>{
  const url = fImageUrl.value.trim();
  // La valeur réelle est mise à jour immédiatement (important si l'utilisateur enregistre
  // avant la fin du délai d'aperçu) ; seul le chargement visuel de l'aperçu est différé.
  if(url){
    formImageValue = url;
    fImage.value = '';
  } else if(formImageValue && formImageValue.startsWith('http')){
    formImageValue = null;
  }
  updateImagePositionUI();
  clearTimeout(imageUrlDebounce);
  imageUrlDebounce = setTimeout(()=>{
    fImagePreview.innerHTML = '';
    if(!url) return;
    const imgEl = document.createElement('img');
    imgEl.alt = '';
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.style.objectPosition = formImagePosition;
    imgEl.addEventListener('error', ()=>{
      fImagePreview.innerHTML = '<span style="color:#8C4038;font-size:11px;">Image introuvable à cette adresse (le site refuse peut-être l\'affichage externe)</span>';
    });
    imgEl.src = url;
    fImagePreview.appendChild(imgEl);
  }, 450);
});

function showFormError(msg){
  formError.textContent = msg;
  formError.classList.add('show');
}
function clearFormError(){
  formError.classList.remove('show');
}

function fillDateInputs(yearInp,monthSel,dayInp,hourInp,minInp, year,month,day,hour,minute){
  const prefix = (yearInp===fStartYear) ? 'start' : 'end';
  yearInp.value = year!=null ? Math.abs(year) : '';
  setEra(prefix, year!=null && year<0);
  monthSel.value = month!=null ? String(month) : '';
  dayInp.value = day!=null ? day : '';
  hourInp.value = hour!=null ? hour : '';
  minInp.value = minute!=null ? minute : '';

  document.getElementById(prefix+'-month-wrap').style.display = (year!=null) ? '' : 'none';
  document.getElementById(prefix+'-day-wrap').style.display = (month!=null) ? '' : 'none';
  document.getElementById(prefix+'-time-wrap').style.display = (day!=null) ? '' : 'none';
}

function openEditModal(item){
  editingItem = item || null;
  clearFormError();
  catNewForm.classList.remove('show');

  if(item){
    editModalTitle.textContent = T().modalEditTitle;
    editingType = item.isPeriod ? 'period' : 'event';
    fTitle.value = item.t || '';
    fDesc.value = item.d || '';
    fLink.value = item.link || '';
    fBibleRefs.value = item.bibleRefs || '';
    fNote.value = item.note || '';
    fLocationName.value = item.locationName || '';
    fLat.value = item.lat!=null ? item.lat : '';
    fLng.value = item.lng!=null ? item.lng : '';
    fApprox.checked = !!item.approx;
    selectedCatKeys = itemCats(item).slice();
    formImageValue = item.img || null;
    formImagePosition = item.imgPosition || 'center center';
    fImageUrl.value = (formImageValue && formImageValue.startsWith('http')) ? formImageValue : '';
    fImagePreview.innerHTML = formImageValue ? `<img src="${escapeHtml(formImageValue)}" alt="" style="object-position:${escapeHtml(formImagePosition)};">` : '';
    updateImagePositionUI();

    if(item.isPeriod){
      fillDateInputs(fStartYear,fStartMonth,fStartDay,fStartHour,fStartMinute,
        item.startYear!=null?item.startYear:Math.floor(item.start), item.startMonth, item.startDay, item.startHour, item.startMinute);
      fillDateInputs(fEndYear,fEndMonth,fEndDay,fEndHour,fEndMinute,
        item.endYear!=null?item.endYear:Math.floor(item.end), item.endMonth, item.endDay, item.endHour, item.endMinute);
    } else {
      fillDateInputs(fStartYear,fStartMonth,fStartDay,fStartHour,fStartMinute,
        item.year!=null?item.year:Math.floor(item.y), item.month, item.day, item.hour, item.minute);
      fillDateInputs(fEndYear,fEndMonth,fEndDay,fEndHour,fEndMinute, null,null,null,null,null);
    }
  } else {
    editModalTitle.textContent = T().modalAddTitle;
    editingType = 'event';
    fTitle.value=''; fDesc.value=''; fLink.value=''; fBibleRefs.value=''; fNote.value=''; fApprox.checked=false;
    fLocationName.value=''; fLat.value=''; fLng.value='';
    selectedCatKeys = [];
    formImageValue = null; formImagePosition = 'center center'; fImagePreview.innerHTML='';
    updateImagePositionUI();
    fillDateInputs(fStartYear,fStartMonth,fStartDay,fStartHour,fStartMinute, null,null,null,null,null);
    fillDateInputs(fEndYear,fEndMonth,fEndDay,fEndHour,fEndMinute, null,null,null,null,null);
  }

  typeSegment.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===editingType));
  const isPeriod = editingType==='period';
  endDateRow.style.display = isPeriod ? '' : 'none';
  startDateLabel.textContent = isPeriod ? 'Date de début *' : 'Date *';
  renderCatFormChips();
  setCategoryAccordion(false);
  setDescAccordion(!!(item && item.d));
  setImageAccordion(!!(item && item.img));
  setLinkAccordion(!!(item && item.link));
  setBibleAccordion(!!(item && item.bibleRefs));
  renderBibleRefs(fBiblePreview, fBibleRefs.value, true);
  setNoteAccordion(!!(item && item.note));
  renderNote(fNotePreview, fNote.value);
  setLocationAccordion(!!(item && item.locationName));
  document.getElementById('edit-delete').style.display = item ? 'inline-block' : 'none';

  editOverlay.classList.add('open');
}
function closeEditModal(){
  editOverlay.classList.remove('open');
}

document.getElementById('add-btn').addEventListener('click', ()=> openEditModal(null));
document.getElementById('edit-close').onclick = closeEditModal;
document.getElementById('edit-cancel').onclick = closeEditModal;
// Le clic sur le fond ne ferme volontairement pas cette modale, pour éviter de perdre une saisie par inadvertance
// (fermeture possible via le bouton ✕ ou "Annuler")

function parseDateFields(yearEl,monthEl,dayEl,hourEl,minuteEl){
  const prefix = (yearEl===fStartYear) ? 'start' : 'end';
  const yearStr = yearEl.value.trim();
  if(yearStr===''||isNaN(parseInt(yearStr,10))) return null;
  const year = Math.abs(parseInt(yearStr,10)) * (isBce(prefix) ? -1 : 1);
  let month=null, day=null, hour=null, minute=null, yf=year;
  const monthVal = monthEl.value;
  if(monthVal!==''){
    month = parseInt(monthVal,10);
    const dayStr = dayEl.value.trim();
    if(dayStr!==''){
      day = parseInt(dayStr,10);
      const maxD = daysInMonth(year, month-1);
      if(isNaN(day) || day<1 || day>maxD) return null;
      let hourFrac=0;
      const hourStr = hourEl.value.trim();
      if(hourStr!==''){
        hour = parseInt(hourStr,10);
        if(isNaN(hour)||hour<0||hour>23) return null;
        const minStr = minuteEl.value.trim();
        minute = minStr!=='' ? parseInt(minStr,10) : 0;
        if(isNaN(minute)||minute<0||minute>59) return null;
        hourFrac = hour + minute/60;
      }
      yf = ymdToYearFrac(year, month-1, day-1, hourFrac);
    } else {
      yf = ymdToYearFrac(year, month-1, 0);
    }
  }
  return {year,month,day,hour,minute,yf};
}

document.getElementById('edit-save').addEventListener('click', ()=>{
  clearFormError();
  const title = fTitle.value.trim();
  if(!title){ showFormError('Le titre est requis.'); return; }

  const parsedStart = parseDateFields(fStartYear,fStartMonth,fStartDay,fStartHour,fStartMinute);
  if(!parsedStart){ showFormError('La date de début est requise et doit être valide.'); return; }

  let parsedEnd = null;
  if(editingType==='period'){
    parsedEnd = parseDateFields(fEndYear,fEndMonth,fEndDay,fEndHour,fEndMinute);
    if(!parsedEnd){ showFormError('La date de fin est requise et doit être valide pour une période.'); return; }
    if(parsedEnd.yf <= parsedStart.yf){ showFormError('La date de fin doit être postérieure à la date de début.'); return; }
  }

  const approx = fApprox.checked;
  const cats = selectedCatKeys.length ? selectedCatKeys.slice() : ['sans_categorie'];
  const cat = cats[0];
  const desc = fDesc.value.trim();
  const link = fLink.value.trim() || null;
  const bibleRefs = fBibleRefs.value.trim() || null;
  const note = fNote.value.trim() || null;
  const img = formImageValue;
  const imgPosition = img ? formImagePosition : null;
  const editingId = editingItem ? editingItem.id : null;
  const wasPeriod = editingItem ? editingItem.isPeriod : null;

  const locationName = fLocationName.value.trim() || null;
  let lat = null, lng = null;
  if(fLat.value.trim()!=='' || fLng.value.trim()!==''){
    lat = parseFloat(fLat.value); lng = parseFloat(fLng.value);
    if(isNaN(lat) || isNaN(lng) || lat<-90 || lat>90 || lng<-180 || lng>180){
      showFormError('Les coordonnées du lieu sont invalides (latitude -90 à 90, longitude -180 à 180).');
      return;
    }
  }

  if(editingType==='event'){
    const obj = {
      id: editingId || genId('e'), isPeriod:false,
      year:parsedStart.year, month:parsedStart.month, day:parsedStart.day, hour:parsedStart.hour, minute:parsedStart.minute,
      approx, y:parsedStart.yf, t:title, cat, cats, d:desc, img, imgPosition, link, locationName, lat, lng, bibleRefs, note
    };
    normalizeItemCats(obj);
    if(editingItem && wasPeriod===false){
      const idx = EVENTS.findIndex(x=>x.id===obj.id);
      if(idx>=0) EVENTS[idx]=obj; else EVENTS.push(obj);
    } else if(editingItem && wasPeriod===true){
      const pidx = PERIOD_ITEMS.findIndex(x=>x.id===editingId);
      if(pidx>=0) PERIOD_ITEMS.splice(pidx,1);
      EVENTS.push(obj);
    } else {
      EVENTS.push(obj);
    }
    rebuildAllItems();
    updateEventCounterBadge();
    closeEditModal();
    render();
    const updated = EVENTS.find(x=>x.id===obj.id);
    if(updated) openDetail(updated);
  } else {
    const obj = {
      id: editingId || genId('p'), isPeriod:true,
      startYear:parsedStart.year, startMonth:parsedStart.month, startDay:parsedStart.day, startHour:parsedStart.hour, startMinute:parsedStart.minute,
      endYear:parsedEnd.year, endMonth:parsedEnd.month, endDay:parsedEnd.day, endHour:parsedEnd.hour, endMinute:parsedEnd.minute,
      approx, start:parsedStart.yf, end:parsedEnd.yf, t:title, cat, cats, d:desc, img, imgPosition, link, locationName, lat, lng, bibleRefs, note
    };
    normalizeItemCats(obj);
    if(editingItem && wasPeriod===true){
      const idx = PERIOD_ITEMS.findIndex(x=>x.id===obj.id);
      if(idx>=0) PERIOD_ITEMS[idx]=obj; else PERIOD_ITEMS.push(obj);
    } else if(editingItem && wasPeriod===false){
      const eidx = EVENTS.findIndex(x=>x.id===editingId);
      if(eidx>=0) EVENTS.splice(eidx,1);
      PERIOD_ITEMS.push(obj);
    } else {
      PERIOD_ITEMS.push(obj);
    }
    rebuildAllItems();
    updateEventCounterBadge();
    closeEditModal();
    render();
    const updated = PERIOD_ITEMS.find(x=>x.id===obj.id);
    if(updated) openDetail(updated);
  }
});

document.getElementById('edit-delete').addEventListener('click', ()=>{
  if(!editingItem) return;
  const confirmMsg = T().deleteItemConfirm ? T().deleteItemConfirm(editingItem.t) : `Supprimer définitivement « ${editingItem.t} » ?`;
  if(!confirm(confirmMsg)) return;
  if(editingItem.isPeriod){
    const idx = PERIOD_ITEMS.findIndex(x=>x.id===editingItem.id);
    if(idx>=0) PERIOD_ITEMS.splice(idx,1);
  } else {
    const idx = EVENTS.findIndex(x=>x.id===editingItem.id);
    if(idx>=0) EVENTS.splice(idx,1);
  }
  rebuildAllItems();
  updateEventCounterBadge();
  closeEditModal();
  // Ferme aussi l'affichage détail si l'élément supprimé y était présenté
  if(currentDetailItem && currentDetailItem.id===editingItem.id){
    detail.classList.remove('open');
    setLandscapeBarOpen(false);
    currentDetailItem = null;
  }
  render();
});

/* ---------- Volet gauche : listes et plan ---------- */
function highlightMatch(text, query){
  if(!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if(idx<0) return text;
  return text.slice(0,idx) + '<mark>' + text.slice(idx,idx+query.length) + '</mark>' + text.slice(idx+query.length);
}

function renderSideTable(container, items, query, onSelect){
  container.innerHTML='';
  if(items.length===0){
    container.innerHTML = `<div class="side-table-empty">Aucun élément ne correspond à cette recherche.</div>`;
    return;
  }
  items.forEach(it=>{
    const row=document.createElement('div');
    row.className='side-table-row';
    const dateLabel = it.isPeriod
      ? `${formatYear(it.startYear!=null?it.startYear:Math.floor(it.start))}–${formatYear(it.endYear!=null?it.endYear:Math.floor(it.end))}`
      : formatYear(it.year!=null?it.year:Math.floor(it.y));
    row.innerHTML = `<span class="dot" style="background:${catOf(it.cat).color}"></span>
      <span class="st-date">${dateLabel}</span>
      <span class="st-title">${highlightMatch(it.t, query)}</span>`;
    row.addEventListener('click', ()=> onSelect(it));
    container.appendChild(row);
  });
}

// Fabrique un contrôleur (recherche + filtre catégorie + tri) partagé par les deux listes du volet gauche
function setupListModal({searchInput, catFilterEl, sortEl, tableEl, countEl, getBaseItems, sortFns, defaultSort, onSelect, onCatsChange}){
  const state = {query:'', cats:new Set(), sort:defaultSort};

  // Les puces sont reconstruites à chaque ouverture : elles reflètent ainsi les catégories
  // chargées depuis le stockage local ou créées depuis (auparavant figées au démarrage)
  function buildCatChips(){
    if(!catFilterEl) return;
    [...state.cats].forEach(k=>{ if(!CATS[k]) state.cats.delete(k); });
    catFilterEl.innerHTML='';
    Object.entries(CATS).forEach(([key,c])=>{
      const chip=document.createElement('div');
      chip.className='chip small'+(state.cats.has(key)?' active':'');
      chip.innerHTML=`<span class="dot" style="background:${c.color}"></span>${escapeHtml(c.label)}`;
      chip.onclick=()=>{
        if(state.cats.has(key)) state.cats.delete(key); else state.cats.add(key);
        chip.classList.toggle('active', state.cats.has(key));
        if(onCatsChange) onCatsChange(state.cats);
        refresh(true);
      };
      catFilterEl.appendChild(chip);
    });
  }

  sortEl.querySelectorAll('.seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      sortEl.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b===btn));
      state.sort = btn.dataset.sort;
      refresh();
    });
  });

  searchInput.addEventListener('input', ()=>{ state.query = searchInput.value.trim(); refresh(true); });

  function refresh(keepChips){
    if(!keepChips) buildCatChips();
    const q = normalize(state.query);
    let items = getBaseItems().filter(it=>{
      if(state.cats.size>0 && !itemInCats(it, state.cats)) return false;
      if(q && !normalize(it.t).includes(q)) return false;
      return true;
    });
    items.sort(sortFns[state.sort]);
    renderSideTable(tableEl, items, state.query, onSelect);
    if(countEl) countEl.textContent = `${items.length} élément${items.length>1?'s':''} affiché${items.length>1?'s':''}`;
  }

  return {refresh, resetQuery(){ state.query=''; searchInput.value=''; }};
}

const characterOverlay = document.getElementById('characters-overlay');
const datesOverlay = document.getElementById('dateslist-overlay');

const charListCtrl = setupListModal({
  searchInput: document.getElementById('characters-search'),
  sortEl: document.getElementById('characters-sort'),
  tableEl: document.getElementById('characters-table'),
  countEl: document.getElementById('characters-count'),
  getBaseItems: ()=> ALL_ITEMS.filter(it=>itemHasCat(it,'personnage')),
  sortFns: {
    alpha:(a,b)=>a.t.localeCompare(b.t,'fr'),
    date_asc:(a,b)=>sortTimeOf(a)-sortTimeOf(b),
    date_desc:(a,b)=>sortTimeOf(b)-sortTimeOf(a),
  },
  defaultSort:'alpha',
  onSelect:(it)=>{ characterOverlay.classList.remove('open'); goToItem(it); }
});

const datesListCatToggle = document.getElementById('dateslist-cat-toggle');
const datesListCatFilter = document.getElementById('dateslist-cat-filter');
const datesListCatCount = document.getElementById('dateslist-cat-toggle-count');
const datesListCtrl = setupListModal({
  searchInput: document.getElementById('dateslist-search'),
  catFilterEl: datesListCatFilter,
  sortEl: document.getElementById('dateslist-sort'),
  countEl: document.getElementById('dateslist-count'),
  tableEl: document.getElementById('dateslist-table'),
  getBaseItems: ()=> ALL_ITEMS.slice(),
  sortFns: {
    date_asc:(a,b)=>sortTimeOf(a)-sortTimeOf(b),
    date_desc:(a,b)=>sortTimeOf(b)-sortTimeOf(a),
  },
  defaultSort:'date_asc',
  onSelect:(it)=>{ datesOverlay.classList.remove('open'); goToItem(it); },
  onCatsChange:(cats)=>{ datesListCatCount.textContent = cats.size>0 ? `(${cats.size})` : ''; }
});
datesListCatToggle.addEventListener('click', (ev)=>{
  ev.stopPropagation();
  const open = datesListCatFilter.classList.toggle('open');
  datesListCatToggle.classList.toggle('open', open);
});
document.addEventListener('click', e=>{
  if(!e.target.closest('.list-cat-dropdown')){
    datesListCatFilter.classList.remove('open');
    datesListCatToggle.classList.remove('open');
  }
});

document.getElementById('rail-characters').addEventListener('click', ()=>{
  charListCtrl.refresh();
  document.getElementById('family-tree-note').style.display = 'none';
  characterOverlay.classList.add('open');
});
// Emplacement réservé : la vue « arbre généalogique » arrivera dans une prochaine version
document.getElementById('family-tree-btn').addEventListener('click', ()=>{
  const note = document.getElementById('family-tree-note');
  note.style.display = note.style.display==='block' ? 'none' : 'block';
});
document.getElementById('characters-close').onclick = ()=> characterOverlay.classList.remove('open');
characterOverlay.addEventListener('click', e=>{ if(e.target===characterOverlay) characterOverlay.classList.remove('open'); });

document.getElementById('rail-dates').addEventListener('click', ()=>{
  datesListCtrl.refresh();
  datesOverlay.classList.add('open');
});
document.getElementById('dateslist-close').onclick = ()=> datesOverlay.classList.remove('open');
datesOverlay.addEventListener('click', e=>{ if(e.target===datesOverlay) datesOverlay.classList.remove('open'); });

/* ---------- Plan (carte Leaflet) ---------- */
const mapOverlay = document.getElementById('map-overlay');
let leafletMap = null, mapMarkersLayer = null, mapInitialFitDone = false;

// Interpolation entre deux couleurs (façon carte de densité photo : peu d'événements → ambre, beaucoup → rouge)
function lerpDensityColor(t){
  const c1=[250,204,110], c2=[178,45,45];
  const r = c1.map((v,i)=>Math.round(v+(c2[i]-v)*t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}

function renderMapMarkers(){
  if(!mapMarkersLayer) return;
  mapMarkersLayer.clearLayers();
  const located = ALL_ITEMS.filter(it=>it.lat!=null && it.lng!=null && itemInCats(it, activeCats));
  const emptyNote = document.getElementById('map-empty-note');
  if(located.length===0){
    emptyNote.textContent = "Aucun événement (parmi les catégories actives) ne possède de lieu indexé. Vérifiez les filtres de catégorie, ou ajoutez une latitude/longitude depuis le formulaire d'édition d'un événement.";
    emptyNote.style.display='block';
    return;
  }
  emptyNote.style.display='none';

  const zoom = leafletMap.getZoom();

  if(zoom <= 3){
    // Palier 1, vue très dézoomée : bulles de densité par zone, comme un nuage de points façon "photos"
    const gridDeg = 12;
    const bins = new Map();
    located.forEach(it=>{
      const key = Math.round(it.lat/gridDeg)+','+Math.round(it.lng/gridDeg);
      if(!bins.has(key)) bins.set(key, {lat:0,lng:0,count:0});
      const b = bins.get(key);
      b.lat+=it.lat; b.lng+=it.lng; b.count++;
    });
    const counts=[...bins.values()].map(b=>b.count);
    const maxCount=Math.max(...counts);
    bins.forEach(b=>{
      const t = maxCount>1 ? (b.count-1)/(maxCount-1) : 0;
      const centerLat=b.lat/b.count, centerLng=b.lng/b.count;
      const marker = L.circleMarker([centerLat, centerLng], {
        radius: 14+Math.sqrt(b.count)*7, color:'#fff', weight:1.5,
        fillColor: lerpDensityColor(t), fillOpacity:0.75
      }).addTo(mapMarkersLayer);
      marker.bindTooltip(`${b.count} événement${b.count>1?'s':''}`, {direction:'top'});
      marker.on('click', (ev)=>{ L.DomEvent.stopPropagation(ev); leafletMap.setView([centerLat,centerLng], 6); });
    });
  } else if(zoom <= 6){
    // Palier 2, vue intermédiaire : bulles colorées par catégorie, légèrement transparentes, sans texte
    located.forEach(it=>{
      const marker = L.circleMarker([it.lat, it.lng], {
        radius:7, color:'#fff', weight:1, fillColor:catOf(it.cat).color, fillOpacity:0.45
      }).addTo(mapMarkersLayer);
      marker.on('click', (ev)=>{ L.DomEvent.stopPropagation(ev); mapOverlay.classList.remove('open'); goToItem(it); });
    });
  } else {
    // Palier 3, vue rapprochée : la vraie photo si disponible (même cadrage que partout ailleurs), sinon une bulle pleine + libellé
    located.forEach(it=>{
      let marker;
      if(it.img){
        const icon = L.divIcon({
          className: 'map-photo-marker',
          html: `<div class="map-photo-frame" style="border-color:${catOf(it.cat).color}"><img src="${escapeHtml(it.img)}" alt="" referrerpolicy="no-referrer" style="object-position:${escapeHtml(it.imgPosition||'center center')};"></div>`,
          iconSize:[44,44], iconAnchor:[22,22]
        });
        marker = L.marker([it.lat, it.lng], {icon}).addTo(mapMarkersLayer);
      } else {
        marker = L.circleMarker([it.lat, it.lng], {
          radius:7, color:'#fff', weight:1.5, fillColor:catOf(it.cat).color, fillOpacity:0.92
        }).addTo(mapMarkersLayer);
      }
      marker.bindTooltip(it.t, {permanent:true, direction:'right', offset:[8,0], className:'map-label-tooltip'});
      marker.on('click', (ev)=>{ L.DomEvent.stopPropagation(ev); mapOverlay.classList.remove('open'); goToItem(it); });
    });
  }

  if(!mapInitialFitDone){
    const bounds = L.latLngBounds(located.map(it=>[it.lat,it.lng]));
    leafletMap.fitBounds(bounds.pad(0.3), {maxZoom:6});
    mapInitialFitDone = true;
  }
}
let mapAddMode = false;
function setMapAddMode(on){
  mapAddMode = on;
  document.getElementById('map-add-mode-toggle').classList.toggle('active', on);
  document.getElementById('map-add-hint').style.display = on ? 'block' : 'none';
  document.getElementById('map-canvas').classList.toggle('add-mode', on);
}

let mapPickForForm = false;
/* Ouverture du plan.
   opts.focus = [lat, lng] : le plan s'ouvre directement sur ce lieu.
   Correctif v0.9 : auparavant le cadrage automatique sur l'ensemble des lieux (fitBounds) était lancé
   juste avant le centrage sur l'événement ; son animation écrasait parfois ce centrage et le plan
   s'ouvrait sur le monde entier. Désormais, quand un lieu est demandé, aucun cadrage automatique n'est
   lancé, le centrage est immédiat (sans animation), et la taille réelle du conteneur est recalculée
   avant puis après l'apparition de la fenêtre — le conteneur n'ayant pas encore ses dimensions
   définitives à la toute première ouverture. */
function openMapModal(opts){
  const focus = (opts && opts.focus) || null;
  const focusZoom = (opts && opts.zoom) || 12;
  mapOverlay.classList.add('open');
  bringToFront(mapOverlay);
  setMapAddMode(false);
  requestAnimationFrame(()=>{
    if(!leafletMap){
      leafletMap = L.map('map-canvas', {worldCopyJump:true}).setView([20,10], 2);
      const planLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'&copy; OpenStreetMap contributors', maxZoom:19
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution:'Tiles &copy; Esri', maxZoom:19
      }).addTo(leafletMap); // vue satellite par défaut
      L.control.layers({'Satellite':satelliteLayer, 'Plan':planLayer}, null, {position:'topright'}).addTo(leafletMap);
      mapMarkersLayer = L.layerGroup().addTo(leafletMap);
      leafletMap.on('zoomend', renderMapMarkers);
      leafletMap.on('click', (ev)=>{
        if(mapPickForForm){
          // Choix d'un lieu depuis le formulaire déjà ouvert : on remplit ses champs et on referme
          // simplement la carte, sans toucher au reste de la saisie en cours.
          mapPickForForm = false;
          fLat.value = ev.latlng.lat.toFixed(5);
          fLng.value = ev.latlng.lng.toFixed(5);
          mapOverlay.classList.remove('open');
          return;
        }
        if(!mapAddMode) return; // il faut d'abord activer le mode "Ajouter un événement ici"
        setMapAddMode(false);
        // La carte reste ouverte et inchangée en arrière-plan : le formulaire s'affiche par-dessus,
        // et n'importe quel clic sur son fond ne le referme pas (pour ne pas perdre la saisie ni le zoom de la carte)
        openEditModal(null);
        bringToFront(editOverlay);
        fLat.value = ev.latlng.lat.toFixed(5);
        fLng.value = ev.latlng.lng.toFixed(5);
        setLocationAccordion(true);
      });
    }
    const applyView = ()=>{
      leafletMap.invalidateSize();
      if(focus) leafletMap.setView(focus, focusZoom, {animate:false});
    };
    mapInitialFitDone = !!focus; // un lieu demandé l'emporte sur le cadrage automatique
    applyView();
    renderMapMarkers();
    // Deuxième passe : à la toute première ouverture, la fenêtre vient d'apparaître et ses dimensions
    // finales ne sont connues qu'après le rendu ; sans cela le plan reste parfois cadré de travers.
    setTimeout(applyView, 180);
  });
}
document.getElementById('rail-map').addEventListener('click', ()=> openMapModal());
document.getElementById('map-close').onclick = ()=>{ mapOverlay.classList.remove('open'); setMapAddMode(false); };
mapOverlay.addEventListener('click', e=>{ if(e.target===mapOverlay){ mapOverlay.classList.remove('open'); setMapAddMode(false); } });
document.getElementById('map-add-mode-toggle').addEventListener('click', ()=> setMapAddMode(!mapAddMode));

/* ---------- Mini-carte de zoom (bargraphe, paysage uniquement) ---------- */
const minimapCanvas = document.getElementById('zoom-minimap');
const minimapCtx = minimapCanvas.getContext('2d');
let minimapW=0, minimapH=0;
function resizeMinimap(){
  const rect = minimapCanvas.getBoundingClientRect();
  minimapW = rect.width; minimapH = rect.height;
  if(minimapW<=0 || minimapH<=0) return;
  minimapCanvas.width = minimapW*dpr; minimapCanvas.height = minimapH*dpr;
  minimapCtx.setTransform(dpr,0,0,dpr,0,0);
}
function renderMinimap(){
  if(isVertical || minimapW<=0) return;
  minimapCtx.clearRect(0,0,minimapW,minimapH);
  const midY = minimapH/2;
  const total = MAX_YEAR-MIN_YEAR;
  const x1 = ((viewStart-MIN_YEAR)/total)*minimapW;
  const x2 = ((viewEnd-MIN_YEAR)/total)*minimapW;

  // Ligne fine représentant l'ensemble de la période (-6000 → aujourd'hui)
  minimapCtx.strokeStyle = brassA(0.35);
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, midY);
  minimapCtx.lineTo(minimapW, midY);
  minimapCtx.stroke();

  // Segment mis en évidence entre les deux crochets, pour repérer la portion visible
  minimapCtx.strokeStyle = brassA(0.8);
  minimapCtx.lineWidth = 2;
  minimapCtx.beginPath();
  minimapCtx.moveTo(Math.max(1,x1), midY);
  minimapCtx.lineTo(Math.min(minimapW-1,x2), midY);
  minimapCtx.stroke();

  // Crochets stylisés "[" et "]" aux deux extrémités de la zone zoomée
  const bracketH = Math.min(minimapH*0.85, 12);
  const tick = 4;
  minimapCtx.strokeStyle = COLORS.brass;
  minimapCtx.lineWidth = 2;
  minimapCtx.lineCap = 'round';

  minimapCtx.beginPath();
  minimapCtx.moveTo(x1+tick, midY-bracketH/2);
  minimapCtx.lineTo(x1, midY-bracketH/2);
  minimapCtx.lineTo(x1, midY+bracketH/2);
  minimapCtx.lineTo(x1+tick, midY+bracketH/2);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.moveTo(x2-tick, midY-bracketH/2);
  minimapCtx.lineTo(x2, midY-bracketH/2);
  minimapCtx.lineTo(x2, midY+bracketH/2);
  minimapCtx.lineTo(x2-tick, midY+bracketH/2);
  minimapCtx.stroke();
}
minimapCanvas.addEventListener('click', e=>{
  const rect = minimapCanvas.getBoundingClientRect();
  const ratio = (e.clientX-rect.left)/rect.width;
  const year = MIN_YEAR + ratio*(MAX_YEAR-MIN_YEAR);
  const span = viewEnd-viewStart;
  stopInertia();
  setView(year-span/2, year+span/2, true);
});

/* ---------- Stockage local (IndexedDB via Dexie) ---------- */
/* Les tableaux EVENTS / PERIOD_ITEMS / CATS déclarés plus haut ne servent
   désormais que de données de démonstration pour le tout premier lancement.
   Dès qu'une base locale existe sur l'appareil, elle prend le relais. */
/* Ne pas renommer : c'est le nom de la base locale de chaque appareil, créée dès la v0.6.
   Un autre nom = une autre base, vide : tous les événements saisis deviendraient invisibles
   (ils resteraient dans l'ancienne base, mais l'application ne les retrouverait plus).
   Le nom historique n'a aucune importance visible : personne ne le voit jamais. */
const db = new Dexie('FriseChronologiqueDB');
db.version(1).stores({
  events: 'id, cat, y',
  periods: 'id, cat, start',
  categories: 'key',
});

let persistTimer = null;
let persistReady = false; // reste à false tant que le chargement initial n'est pas terminé
function schedulePersist(){
  if(!persistReady) return;
  if(persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistAll, 400);
}
async function persistAll(){
  try{
    await db.transaction('rw', db.events, db.periods, db.categories, async ()=>{
      await db.events.clear();
      await db.periods.clear();
      await db.categories.clear();
      if(EVENTS.length) await db.events.bulkPut(EVENTS);
      if(PERIOD_ITEMS.length) await db.periods.bulkPut(PERIOD_ITEMS);
      const catRows = Object.entries(CATS).map(([key,c])=>(
        {key, label:c.label, color:c.color, locked: !!c.locked, protected: !!c.protected}
      ));
      if(catRows.length) await db.categories.bulkPut(catRows);
    });
  }catch(err){
    console.error('Bibline : échec de la sauvegarde locale', err);
  }
}

/* ---------- Contenu livré avec l'application (data.json) ----------
   Il n'est installé qu'au tout premier lancement sur un appareil, quand la base locale est vide.
   Ensuite, c'est la base locale qui fait foi : modifier data.json ne touche jamais aux événements
   déjà saisis sur l'appareil. Le fichier a le même format que les exports (« Envoyer »), donc il
   peut être régénéré depuis l'application elle-même. */
async function fetchInitialData(){
  try{
    const res = await fetch('data.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(err){
    // Fichier absent, illisible, ou page ouverte en file:// : on démarre simplement sur une frise vide
    console.warn('Bibline : data.json n\'a pas pu être lu, démarrage avec une frise vide', err);
    return null;
  }
}
function applyInitialData(data){
  if(!data) return;
  if(data.categories){
    Object.entries(data.categories).forEach(([key,c])=>{
      if(!CATS[key]) CATS[key] = {label:c.label, color:c.color};
    });
  }
  (data.events||[]).forEach((ev,i)=> EVENTS.push(normalizeItemCats({...ev, id:'e'+i, isPeriod:false})));
  (data.periods||[]).forEach((p,i)=> PERIOD_ITEMS.push(normalizeItemCats({...p, id:'p'+i, isPeriod:true})));
}

// Remise à jour de tout ce qui dépend des données : listes de catégories, compteurs, frise
function refreshAllViews(){
  rebuildAllItems();
  activeCats = new Set(Object.keys(CATS));
  renderFilterChips(); renderSearchCatChips(); renderCatFormChips();
  renderCatManageList(); renderOverviewCatsList(); renderOverviewFilterList(); renderExportCatsList();
  updateEventCounterBadge();
  render();
}

async function initStorage(){
  try{
    const [evCount, pCount] = await Promise.all([db.events.count(), db.periods.count()]);
    if(evCount===0 && pCount===0){
      // Premier lancement sur cet appareil : le contenu livré devient la base locale
      applyInitialData(await fetchInitialData());
      refreshAllViews();
      persistReady = true;
      await persistAll();
      openFromHash();
    } else {
      const [storedEvents, storedPeriods, storedCats] = await Promise.all([
        db.events.toArray(), db.periods.toArray(), db.categories.toArray()
      ]);
      EVENTS.length = 0; EVENTS.push(...storedEvents);
      PERIOD_ITEMS.length = 0; PERIOD_ITEMS.push(...storedPeriods);
      Object.keys(CATS).forEach(k=>delete CATS[k]);
      storedCats.forEach(c=>{
        CATS[c.key] = {label:c.label, color:c.color, locked:c.locked||undefined, protected:c.protected||undefined};
      });
      // Migration douce v0.6 → v0.7 : chaque élément reçoit son tableau de catégories
      EVENTS.forEach(normalizeItemCats);
      PERIOD_ITEMS.forEach(normalizeItemCats);
      refreshAllViews();
      persistReady = true;
      openFromHash();
    }
  }catch(err){
    console.error('Bibline : échec du chargement des données locales de cet appareil', err);
    persistReady = true;
  }
}

/* Adresse ouverte depuis l'extérieur (#e=…) : on se place sur l'événement une fois les données chargées */
function openFromHash(){
  const ref = parseEventHash(location.hash);
  if(!ref) return;
  const it = findEventByRef(ref);
  if(it) goToItem(it);
  else showToast(T().eventNotFound);
}
window.addEventListener('hashchange', openFromHash);

/* ---------- Init ---------- */
document.getElementById('app-version-label').textContent = APP_VERSION;
loadSettings();
uiReady = true;
resize();
updateEventCounterBadge();
initStorage();
})();

/* ---------- Service worker ----------
   Installe l'application (PWA) et permet un fonctionnement hors-ligne. Nécessite d'être servi en
   HTTPS (ou localhost) : rien ne se passe si la page est simplement ouverte en file://. */
  // Enregistrement du service worker : nécessite d'être servi en HTTPS (ou localhost),
  // ne fonctionne pas en ouvrant simplement le fichier via file:// dans le navigateur.
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(err=>{
        console.warn('Bibline : service worker non installé (normal en local sans serveur)', err);
      });
    });
  }
