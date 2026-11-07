// ---------- Kunci domain: halaman ini hanya berjalan di situs/aplikasi resmi ----------
// Pencegah ringan terhadap salinan yang di-host di domain lain. Bukan proteksi mutlak: JavaScript di sisi klien selalu bisa dibaca dan diubah.
// Tambahkan domain sendiri (mis. domain kustom) ke OFFICIAL_HOSTS.
(function () {
  const OFFICIAL_HOSTS = ['cykside.github.io', 'appassets.androidplatform.net', 'localhost', '127.0.0.1'];
  try {
    if (typeof location === 'undefined' || !location.hostname) return;   // file:// atau pengujian: biarkan
    if (OFFICIAL_HOSTS.indexOf(location.hostname) !== -1) return;
    document.documentElement.innerHTML = '<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0e0c16;color:#eee;font-family:sans-serif;text-align:center;padding:24px"><div><h2>Salinan tidak resmi</h2><p>Halaman ini bukan dari situs resmi Cunyuk of War.<br>Buka <a style="color:#f2b93b" href="https://cykside.github.io/coc-web/">situs resmi</a>.</p></div></body>';
    throw new Error('domain tidak resmi');
  } catch (e) { if (e && e.message === 'domain tidak resmi') throw e; }
})();
// ---------- Panel log (untuk HP tanpa komputer): ketuk logo/judul klan 5x dengan cepat ----------
(function () {
  const LOG = [];
  const fa = x => { try { return typeof x === 'string' ? x : (x && x.stack) ? x.stack : JSON.stringify(x); } catch (e) { return String(x); } };
  const put = (lvl, args) => { try { LOG.push(new Date().toLocaleTimeString('id-ID') + ' ' + lvl + ' ' + Array.prototype.map.call(args, fa).join(' ').slice(0, 600)); if (LOG.length > 150) LOG.shift(); } catch (e) { /* abaikan */ } };
  ['log', 'info', 'warn', 'error'].forEach(k => { const o = console[k]; console[k] = function () { put(k.toUpperCase(), arguments); return o.apply(console, arguments); }; });
  window.addEventListener('error', e => put('ERROR', [(e.message || '') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno + ':' + e.colno]));
  window.addEventListener('unhandledrejection', e => put('REJECT', [e.reason]));

  let SNAP = '';
  const probe = css => { try { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;height:' + css; document.body.appendChild(d); const h = d.offsetHeight; d.remove(); return h; } catch (e) { return 'err'; } };
  function metrics() {
    const dlg = document.getElementById('playerDlg'), body = document.getElementById('playerBody'), L = [];
    L.push('UA: ' + navigator.userAgent);
    L.push('Layar: inner ' + innerWidth + 'x' + innerHeight + ', client ' + document.documentElement.clientHeight + ', screen ' + screen.width + 'x' + screen.height + ', dpr ' + devicePixelRatio);
    L.push('Satuan CSS: 100vh=' + probe('100vh') + 'px, 100dvh=' + probe('100dvh') + 'px, 100svh=' + probe('100svh') + 'px, dukung dvh=' + (window.CSS && window.CSS.supports ? window.CSS.supports('height', '100dvh') : '?'));
    if (dlg) {
      const r = dlg.getBoundingClientRect(), cs = getComputedStyle(dlg);
      L.push('Dialog profil: open=' + dlg.open + ', ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' @y=' + Math.round(r.top) + ', max-height=' + cs.maxHeight + ', inline=' + dlg.style.maxHeight + ', overflow=' + cs.overflow);
    }
    if (body) L.push('Isi profil: ' + body.innerHTML.length + ' karakter, tinggi ' + body.offsetHeight + 'px, awal: ' + body.textContent.trim().slice(0, 80));
    L.push('Berkas: ' + [].map.call(document.scripts, x => x.src).filter(Boolean).map(u => u.split('/').pop()).join(', '));
    return L.join('\n');
  }
  const msg = t => { const m = document.getElementById('cowDbgMsg'); if (m) m.textContent = t; };
  const fill = () => { const t = document.getElementById('cowDbgTxt'); if (t) t.value = '== Diagnostik ==\n' + metrics() + (SNAP ? '\n\n== Saat profil terbuka ==\n' + SNAP : '') + '\n\n== Log (' + LOG.length + ') ==\n' + LOG.join('\n'); };
  function show() {
    let p = document.getElementById('cowDbg');
    if (!p) {
      p = document.createElement('div'); p.id = 'cowDbg';
      p.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483646;background:#0b0b10;color:#e8e8ee;padding:12px;display:flex;flex-direction:column;gap:8px;font:12px/1.4 monospace';
      p.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-d="copy">Salin</button><button type="button" data-d="test">Tes buka profil</button><button type="button" data-d="refresh">Segarkan</button><button type="button" data-d="close">Tutup</button></div><div id="cowDbgMsg" style="min-height:1.4em"></div><textarea id="cowDbgTxt" readonly style="flex:1;width:100%;box-sizing:border-box;background:#14141c;color:inherit;border:1px solid #333;border-radius:8px;padding:8px;font:inherit"></textarea>';
      document.body.appendChild(p);
      p.addEventListener('click', e => {
        const a = e.target && e.target.getAttribute && e.target.getAttribute('data-d'); if (!a) return;
        if (a === 'close') p.style.display = 'none';
        else if (a === 'refresh') { fill(); msg('Disegarkan.'); }
        else if (a === 'copy') copy();
        else if (a === 'test') test();
      });
    }
    p.style.display = 'flex'; fill();
  }
  function copy() {
    const t = document.getElementById('cowDbgTxt'); fill();
    const ok = () => msg('Tersalin. Tempel ke chat.'), no = () => msg('Gagal menyalin otomatis: tekan lama di teks, pilih semua, lalu salin.');
    const legacy = () => { try { t.readOnly = false; t.focus(); t.select(); t.setSelectionRange(0, t.value.length); const r = document.execCommand('copy'); t.readOnly = true; r ? ok() : no(); } catch (e) { no(); } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t.value).then(ok, legacy); return; } } catch (e) { /* lanjut */ }
    legacy();
  }
  // Dialog berada di lapisan paling atas dan menutupi panel, jadi ukurannya diukur 2 detik setelah dibuka, lalu ditutup.
  async function test() {
    const p = document.getElementById('cowDbg'); p.style.display = 'none'; SNAP = '';
    try {
      await loadPlayers();
      const tag = Object.keys(PLAYERS || {})[0];
      if (!tag) throw new Error('data pemain kosong');
      const pr = openPlayer(tag);
      await new Promise(r => setTimeout(r, 2000));
      SNAP = metrics();
      const dlg = document.getElementById('playerDlg'); if (dlg && dlg.open) dlg.close();
      await pr;
    } catch (e) { SNAP += '\nGALAT: ' + fa(e); }
    show(); msg('Tes selesai. Tekan Salin.');
  }
  let taps = [];
  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('#title,.pf-name,#pfAv,.pf-av,.crest')) return;
    const n = Date.now(); taps = taps.filter(x => n - x < 2500); taps.push(n);
    if (taps.length >= 5) { taps = []; show(); }
  }, true);
  window.__cowDebug = show;
})();

let DATA = window.DASH || {};
let donationChartInstance = null;
const $ = id => document.getElementById(id);

function fmt(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return "-";
  return Number(n).toLocaleString("id-ID");
}

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// Terima ISO biasa atau format CoC "20261015T235125.000Z"; tampilkan dalam WIB.
function fmtTime(v) {
  if (!v) return "-";
  let s = String(v);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) s = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB";
}

function safe(v, fallback = "-") {
  return v == null || v === "" ? fallback : v;
}

// Normalize tag keys so we can match both "#ABC" and "ABC"
function normTagKey(t) {
  if (!t) return "";
  return String(t).replace(/^#/, "").toUpperCase();
}

// Resolve a tag to the actual key present in DATA.clans (if any)
function resolveClanKey(tag) {
  const clans = DATA.clans || {};
  const map = {};
  Object.keys(clans).forEach(k => { map[normTagKey(k)] = k; });
  return map[normTagKey(tag)] || tag;
}

function getClanObj(tag) {
  const key = resolveClanKey(tag);
  return { key, clan: (DATA.clans || {})[key] || null };
}

const cv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function syncChartTheme() {
  if (window.Chart) { Chart.defaults.color = cv('--mut'); Chart.defaults.borderColor = cv('--line'); Chart.defaults.font.family = 'inherit'; }
  const m = document.querySelector('meta[name=theme-color][data-dyn]'); if (m) m.content = cv('--bg');
}
const THEMES = ['mono', 'cunyuk', 'paper', 'dark', 'light'];
const THEME_LABEL = { mono: 'Tema: hitam putih (gelap)', cunyuk: 'Tema: teal dan emas', paper: 'Tema: hitam putih (terang)', dark: 'Tema: ungu gelap', light: 'Tema: ungu terang' };
const _svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const THEME_ICON = {
  mono: _svg('<circle cx="12" cy="12" r="5" fill="currentColor"/>'),
  cunyuk: _svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 8.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.3-2.3 1.3.5-2.5-1.8-1.7 2.5-.3z" fill="currentColor" stroke="none"/>'),
  paper: _svg('<circle cx="12" cy="12" r="5"/>'),
  dark: _svg('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'),
  light: _svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')
};
function applyTheme(t, rerender) {
  if (!THEMES.includes(t)) t = 'mono';
  document.documentElement.dataset.theme = t;
  const b = $('themeBtn'); if (b) { b.innerHTML = THEME_ICON[t]; b.title = b.ariaLabel = THEME_LABEL[t]; b.dataset.t = t; }
  syncChartTheme();
  if (rerender && window.__renderAll) window.__renderAll();
}
function initTheme() {
  let t = 'mono'; try { t = localStorage.getItem('theme') || 'mono'; } catch (e) {}
  applyTheme(t);
  $('themeBtn').addEventListener('click', () => {
    const n = THEMES[(THEMES.indexOf($('themeBtn').dataset.t) + 1) % THEMES.length];
    try { localStorage.setItem('theme', n); } catch (e) {}
    applyTheme(n, true);
  });
}

const VIEWS = ['overview', 'war', 'members', 'players', 'capital', 'stats', 'alat'];
function setView(v, keepScroll) {
  if (!VIEWS.includes(v)) v = 'overview';
  document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== v; });
  document.querySelectorAll('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.view === v ? 'page' : 'false'));
  try { history.replaceState(null, '', '#' + v); } catch (e) {}
  try { localStorage.setItem('view', v); } catch (e) {}
  if (!keepScroll) window.scrollTo(0, 0);
  window.dispatchEvent(new Event('resize'));
  if (v === 'players' && window.__renderPlayers) window.__renderPlayers();
  if (v === 'alat' && window.__renderTools) window.__renderTools();
}
document.addEventListener('click', e => {
  const a = e.target.closest('.nav a, [data-go]'); if (!a) return;
  e.preventDefault(); setView(a.dataset.view || a.dataset.go);
});

// Persentase dibulatkan 1 desimal: 3.2666667 -> 3.3, 100 -> 100
function pct1(v) { const n = Number(v); return isNaN(n) ? '0' : String(Math.round(n * 10) / 10); }

function scoreHtml(war) {
  const us = war.us || {}, th = war.them || {}, lead = Number(us.stars || 0) - Number(th.stars || 0);
  const team = (x, cls) => `<div class="team ${cls}"><div class="nm">${esc(safe(x.name))}</div><div class="stars">${esc(safe(x.stars, 0))}<small>★</small></div><div class="small">${esc(pct1(x.pct))}% · ${esc(safe(x.attacks, 0))} serangan</div></div>`;
  return `<div class="score">${team(us, lead > 0 ? 'lead' : '')}<div class="vs">vs</div>${team(th, lead < 0 ? 'lead' : '')}</div>`;
}
function warProgress(war) {
  const prep = war.state === 'preparation';
  const s = parseT(prep ? war.prepStart : war.start), e = parseT(prep ? war.start : war.end);
  if (!s || !e) return '';
  const p = Math.max(0, Math.min(100, (Date.now() - s) / (e - s) * 100));
  return `<div class="prog" role="progressbar" aria-label="Progres waktu war" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"><i style="width:${p.toFixed(1)}%"></i></div>`;
}
function renderHero(tag) {
  const key = resolveClanKey(tag), war = curWar(key), b = $('heroWar'), clan = getClanObj(key).clan || {};
  if (!war || war.state === 'notInWar') {
    b.innerHTML = `<div class="hero-row"><span class="pill">Tidak ada war</span></div><div class="time" style="margin-top:12px">${esc(clan.name || 'Klan ini')} sedang tidak berperang, atau war log private. Cek tab Capital untuk raid weekend.</div>`;
    return;
  }
  const per = war.perMember || 2, idle = ((war.us || {}).members || []).filter(m => (m.attacks || []).length < per);
  const s = parseT(war.start), e = parseT(war.end), n = Date.now();
  const label = warTitle(war) + ({ preparation: 'Masa persiapan', inWar: 'War berlangsung', warEnded: 'War selesai' }[war.state] || war.state);
  const t = war.state === 'preparation' && s ? `Mulai dalam ${dur(s - n)}`
    : war.state === 'inWar' && e ? (e > n ? `Sisa ${dur(e - n)} · selesai ${fmtTime(war.end)}` : 'Waktu war habis, menunggu hasil akhir')
    : `Selesai ${fmtTime(war.end)}`;
  b.innerHTML = `<div class="hero-row"><span class="pill ${war.state === 'inWar' ? 'live' : ''}">${esc(label)}</span><button type="button" class="btn-primary" data-go="war">Detail war</button></div>
    ${scoreHtml(war)}${warProgress(war)}<div class="time">${esc(t)}</div>`;
}

function setBadge(a, n) {
  if (!a) return;
  let b = a.querySelector('.nbadge');
  if (!n) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'nbadge'; a.appendChild(b); }
  b.textContent = n; b.setAttribute('aria-label', n + ' perlu perhatian');
}
function renderAttention(tag) {
  const key = resolveClanKey(tag), clan = getClanObj(key).clan || {}, war = curWar(key), raid = (DATA.raids || {})[key], rows = [];
  if (war && war.state === 'inWar') {
    const per = war.perMember || 2, e = parseT(war.end), idle = ((war.us || {}).members || []).filter(m => (m.attacks || []).length < per);
    if (idle.length) rows.push({ c: 'bad', t: `${idle.length} anggota belum menyerang tuntas${war.cwl ? ` (CWL ronde ${war.round})` : ''}`, d: idle.slice(0, 6).map(m => m.name).join(', ') + (idle.length > 6 ? ` dan ${idle.length - 6} lainnya` : '') + (e ? ` · sisa ${dur(e - Date.now())}` : ''), go: 'war' });
  }
  if (raid && raid.state === 'ongoing') {
    const left = (raid.members || []).filter(m => (m.limit || 0) > (m.attacks || 0));
    if (left.length) rows.push({ c: '', t: `${left.length} anggota belum selesai Capital Raid`, d: 'Raid berakhir ' + fmtTime(raid.end), go: 'capital' });
  }
  const joined = joinedSet(key), dead = (clan.memberList || []).filter(m => isInactive(m, joined));
  if (dead.length) rows.push({ c: '', t: `${dead.length} anggota tidak aktif musim ini`, d: 'Donasi dan terima masih 0 (anggota baru tidak dihitung)', go: 'members' });
  $('attnBox').innerHTML = rows.length
    ? rows.map(r => `<div class="att-row"><span class="att-dot ${r.c}"></span><div><b>${esc(r.t)}</b><div class="small">${esc(r.d)}</div></div><button type="button" data-go="${r.go}">Lihat</button></div>`).join('')
    : '<div class="att-row"><span class="att-dot ok"></span><div><b>Semua aman</b><div class="small">Tidak ada yang perlu ditindak sekarang.</div></div></div>';
  const nAtt = rows.length, ac = $('attnCount');
  setBadge(document.querySelector('.nav a[data-view=overview]'), nAtt);
  setBadge(document.querySelector('.nav a[data-view=war]'), rows.filter(r => r.go === 'war').length);
  if (ac) { ac.textContent = nAtt; ac.hidden = !nAtt; }
}

// Selisih nilai klan (anggota/poin) sejak titik riwayat pertama dalam 24 jam terakhir
function deltaOf(tag, field) {
  const nk = normTagKey(tag);
  const H = (DATA.history || []).filter(e => normTagKey(e.clanTag) === nk && e[field] != null).map(e => ({ t: parseT(e.ts), v: e[field] })).filter(p => p.t).sort((a, b) => a.t - b.t);
  if (H.length < 2) return null;
  const base = H.find(p => p.t >= Date.now() - 864e5) || H[0];
  return { d: H[H.length - 1].v - base.v, span: Date.now() - base.t };
}
function renderOverviewCards(clan, tag) {
  const grid = $('overviewGrid');
  grid.innerHTML = '';

  const items = [
    { label: "Anggota", value: clan && clan.memberCount },
    { label: "Poin", value: clan && clan.points },
    { label: "Rekor war", value: clan ? `${clan.warWins ?? 0}W / ${clan.warLosses ?? 0}L / ${clan.warTies ?? 0}T` : '-' },
    { label: "Capital Hall", value: clan && clan.capitalHall ? `Lv ${clan.capitalHall}` : "-" },
  ];

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card stat';
    card.innerHTML = `
      <div class="label">${item.label}</div>
      <div class="value">${esc(safe(typeof item.value === 'number' ? fmt(item.value) : item.value))}</div>
      <div class="sub">${item.label === "Anggota" ? "Total anggota" : item.label === "Poin" ? "Poin klan" : item.label === "Rekor war" ? "Menang / Kalah / Seri" : "Level Capital Hall"}</div>
    `;
    const f = item.label === 'Anggota' ? 'memberCount' : item.label === 'Poin' ? 'points' : null, x = f && tag ? deltaOf(tag, f) : null;
    if (x && x.d !== 0) card.querySelector('.sub').insertAdjacentHTML('beforeend', ` · <span class="delta">${x.d > 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(x.d))}</span> ${x.span >= 864e5 * .9 ? '24 jam' : dur(x.span)}`);
    grid.appendChild(card);
  });
}

function renderDonationChart(clanTag) {
  const key = resolveClanKey(clanTag);
  const weekly = (DATA.meta && DATA.meta[key] && DATA.meta[key].weekly_top) || [];
  let labels = weekly.map(x => x[0]), vals = weekly.map(x => x[1]), season = false;
  if (!labels.length) {
    // Cadangan: top donor musim ini bila riwayat 7 hari belum tersedia
    const top = ((getClanObj(key).clan || {}).memberList || []).filter(m => (m.donations || 0) > 0).sort((a, b) => b.donations - a.donations).slice(0, 8);
    labels = top.map(m => m.name); vals = top.map(m => m.donations); season = top.length > 0;
  }
  const dt = $('donTitle'); if (dt) dt.textContent = season ? 'Top donor musim ini' : 'Top donor 7 hari';

  const wrap = $('donationWrap'), note = $('donationEmpty');
  if (!labels.length) {
    if (donationChartInstance) { donationChartInstance.destroy(); donationChartInstance = null; }
    wrap.style.display = 'none';
    note.style.display = 'block';
    const sp = (DATA.historySpanHours || {})[key];
    note.textContent = (sp != null && sp < 24)
      ? `Riwayat donasi baru terkumpul ${Math.round(sp)} jam, jadi top donor 7 hari belum bisa dihitung. Total donasi musim ini ada di tabel anggota.`
      : 'Belum ada donasi baru dalam 7 hari terakhir. Total donasi musim ini ada di tabel anggota.';
    return;
  }
  wrap.style.display = '';
  note.style.display = season ? 'block' : 'none';
  if (season) note.textContent = 'Top donor 7 hari belum bisa dihitung, jadi grafik ini menampilkan total donasi musim ini.';
  if (typeof Chart === 'undefined') return;   // CDN gagal dimuat: lewati chart, bagian lain tetap tampil
  const ctx = $('donationChart').getContext('2d');

  if (donationChartInstance) {
    donationChartInstance.destroy();
  }

  donationChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: season ? 'Donasi musim ini' : 'Donasi 7 hari',
        data: vals,
        backgroundColor: cv('--accent'),
        maxBarThickness: 28, borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderWar(clanTag) {
  const box = $('warBox');
  const key = resolveClanKey(clanTag);
  const war = curWar(key);
  if (!war || war.state === 'notInWar') {
    box.innerHTML = '<div class="small">Tidak ada war aktif atau war log private.</div>';
    return;
  }

  const us = war.us || {};
  const them = war.them || {};
  const per = war.perMember || 2;
  const stateLabel = warTitle(war) + ({ preparation: 'Masa persiapan', inWar: 'War sedang berlangsung', warEnded: 'War selesai' }[war.state] || war.state);
  const timeLine = war.state === 'preparation'
    ? `War mulai ${fmtTime(war.start)} · selesai ${fmtTime(war.end)}`
    : `Mulai ${fmtTime(war.start)} · selesai ${fmtTime(war.end)}`;

  const rows = (us.members || []).map(m => {
    const used = (m.attacks || []).length;
    const stars = (m.attacks || []).reduce((a, x) => a + (x.stars || 0), 0);
    return `<tr><td>${esc(m.pos)}</td><td>${esc(m.name)}</td><td>TH${esc(m.th)}</td><td>${used}/${per}</td><td>${stars} ★</td></tr>`;
  }).join('');
  const idle = (us.members || []).filter(m => (m.attacks || []).length < per).map(m => esc(m.name));

  box.innerHTML = `
    <div class="war-state"><span class="pill ${war.state === 'inWar' ? 'live' : ''}">${esc(stateLabel)}</span></div>
    <div class="war-times">${esc(timeLine)}${cdown(war)}</div>
    ${scoreHtml(war)}
    ${warProgress(war)}
    ${needHtml(war)}
    <details class="subfold"><summary>Lihat semua anggota war (${(us.members || []).length})</summary><div class="lineup table-wrap">
      <table>
        <thead><tr><th>#</th><th>Anggota war</th><th>TH</th><th>Serang</th><th>Bintang</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></details>
    ${war.state === 'inWar' && idle.length ? `<div class="idle"><b>Belum menyerang tuntas</b>${idle.map(n => `<span class="badge warn">${n}</span>`).join('')}</div>` : ''}
    ${warExtra(war)}
  `;
}

function renderDiffs(clanTag) {
  const diffBox = $('diffBox');
  const key = resolveClanKey(clanTag);
  const meta = (DATA.meta && DATA.meta[key]) || {};
  const f = ($('diffFilter') || {}).value || '';
  const changes = (meta.changes || []).filter(c => !f || f.split(',').some(p => String(c.text).startsWith(p))).slice().reverse().slice(0, 20);
  if (!changes.length) {
    diffBox.innerHTML = '<div class="small">Belum ada perubahan tercatat. Join, keluar, ganti role, dan donasi akan muncul di sini.</div>';
    return;
  }
  diffBox.innerHTML = changes.map(c =>
    `<div class="change-row t-${esc(String(c.text).split(":")[0])}"><span class="when">${esc(fmtTime(c.ts))}</span>${esc(c.text)}</div>`
  ).join('');
}

function renderMembers(clanTag, filterText) {
  const tbody = $('memberTable').querySelector('tbody');
  tbody.innerHTML = '';
  const clan = getClanObj(clanTag).clan;
  if (!clan) {
    tbody.innerHTML = '<tr><td colspan="8">Klan tidak ditemukan.</td></tr>';
    return;
  }

  BADGES = buildBadges(clan, clanTag);
  const members = (clan.memberList || []).slice().sort((a,b)=>{ const x = mval(a, MS.k), y = mval(b, MS.k); return (x > y ? 1 : x < y ? -1 : 0) * (MS.d ? -1 : 1); });
  const ft = (filterText||'').toLowerCase().trim();
  const joined = joinedSet(clanTag);

  members.forEach((m, idx) => {
    const name = m.name || '';
    const role = m.role || '';
    const th = m.th || m.townHallLevel || '';
    const trophies = m.trophies || '';
    const donations = m.donations || 0;
    const received = m.received || 0;
    const capital = m.capitalContributions || 0;

    const rowText = `${name} ${role} ${th}`.toLowerCase();
    if (ft && !rowText.includes(ft)) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="c-rank">${esc(m.rank || idx + 1)}</td>
      <td class="c-name">${m.leagueIcon ? `<img class="lg" loading="lazy" alt="" src="${esc(m.leagueIcon)}">` : ''}<a class="plink" href="#" data-player="${esc(m.tag)}">${esc(name)}</a>${badgeOf(m)}${isInactive(m, joined) ? ' <span class="tag-warn" title="Donasi dan terima 0 musim ini">tidak aktif?</span>' : ''}</td>
      <td data-label="Role">${esc(ROLE[role] || role)}</td>
      <td data-label="TH">TH${esc(th)}</td>
      <td data-label="Trofi">${fmt(trophies)}</td>
      <td data-label="Donasi">${fmt(donations)}</td>
      <td data-label="Terima">${fmt(received)}</td>
      <td data-label="Capital">${fmt(capital)}</td>`;
    tbody.appendChild(tr);
  });

  const mm = $('memMore'), rowsAll = Array.from(tbody.children);
  if (mm) {
    const cut = !MEM_ALL && !ft && rowsAll.length > 10;
    rowsAll.forEach((r, i) => { r.hidden = cut && i >= 10; });
    mm.hidden = !(cut || (MEM_ALL && !ft && rowsAll.length > 10));
    mm.textContent = cut ? `Tampilkan semua ${rowsAll.length} anggota` : 'Tampilkan 10 teratas saja';
  }
  if (!tbody.children.length) {
    tbody.innerHTML = '<tr><td colspan="8">Tidak ada anggota sesuai filter.</td></tr>';
  }
}

function renderHistory(clanTag) {
  const hb = $('historyBox');
  const all = DATA.history || [];
  const nkey = normTagKey(clanTag);
  const items = all.filter(e=> normTagKey(e.clanTag) === nkey ).slice(-30).reverse();
  if (!items.length) {
    hb.innerHTML = '<div>Tidak ada riwayat.</div>';
    return;
  }
  hb.innerHTML = items.map(i=> `<div>${esc(fmtTime(i.ts))} — ${esc(i.memberCount)} anggota</div>`).join('');
}

let BADGES = {};
// Tag anggota yang bergabung dalam 7 hari terakhir (dari riwayat perubahan)
function joinedSet(tag) {
  const meta = (DATA.meta || {})[resolveClanKey(tag)] || {}, cut = Date.now() - 7 * 864e5, s = new Set();
  (meta.changes || []).forEach(c => { const x = /^JOIN: .*\(([A-Z0-9]+)\)$/.exec(c.text || ''); if (x && parseT(c.ts) >= cut) s.add(x[1]); });
  return s;
}
// Tidak aktif = donasi dan terima 0 musim ini, kecuali anggota yang baru bergabung
function isInactive(m, joined) {
  return (m.donations || 0) < R().minDonations && !(m.received || 0) && !joined.has(normTagKey(m.tag));
}
const MEDAL = ['🥇', '🥈', '🥉'];
function buildBadges(clan, tag) {
  const B = {}, ml = clan.memberList || [];
  ml.filter(m => (m.donations || 0) > 0).sort((a, b) => b.donations - a.donations).slice(0, 3)
    .forEach((m, i) => { B[m.tag] = { medal: MEDAL[i] }; });
  const joined = joinedSet(tag);
  ml.forEach(m => { if (joined.has(normTagKey(m.tag))) (B[m.tag] = B[m.tag] || {}).isNew = true; });
  return B;
}
function badgeOf(m) {
  const b = BADGES[m.tag]; if (!b) return '';
  return (b.medal ? ` <span title="Top donor musim ini">${b.medal}</span>` : '') + (b.isNew ? ' <span class="chip" title="Bergabung dalam 7 hari terakhir">baru</span>' : '');
}
function renderExtra(clan) {
  const ml = clan.memberList || [], sum = k => ml.reduce((a, m) => a + (m[k] || 0), 0);
  const don = sum('donations'), rec = sum('received'), ths = ml.map(m => m.th || m.townHallLevel || 0).filter(Boolean);
  const items = [
    ['Level klan', clan.level, 'Level saat ini'],
    ['Tipe', ({ open: 'Terbuka', inviteOnly: 'Undangan', closed: 'Tertutup' })[clan.type] || clan.type, 'Cara bergabung'],
    ['Menang beruntun', clan.warWinStreak, 'War menang berturut-turut'],
    ['Liga war', clan.warLeague, 'Liga CWL'],
    ['Liga Capital', clan.capitalLeague, 'Clan Capital'],
    ['Total donasi', fmt(don), 'Terima: ' + fmt(rec) + (rec ? ' (rasio ' + (don / rec).toFixed(2) + ')' : '')],
    ['Rata² TH', ths.length ? (ths.reduce((a, b) => a + b, 0) / ths.length).toFixed(1) : '-', ths.length ? 'TH ' + Math.min(...ths) + '–' + Math.max(...ths) : ''],
    ['Anggota aktif', ml.filter(m => (m.donations || 0) > 0 || (m.received || 0) > 0).length + '/' + ml.length, 'Punya donasi/terima musim ini'],
  ];
  $('extraGrid').innerHTML = items.map(([l, v, s]) => `<div class="card stat"><div class="label">${esc(l)}</div><div class="value">${esc(safe(v))}</div><div class="sub">${esc(s)}</div></div>`).join('');
  const c = {}; ths.forEach(t => c[t] = (c[t] || 0) + 1);
  const mx = Math.max(1, ...Object.values(c));
  $('compBox').innerHTML = Object.keys(c).sort((a, b) => b - a).map(t => `<div class="bar"><b>TH${t}</b><i style="width:${Math.round(c[t] / mx * 70)}%"></i><span>${c[t]}</span></div>`).join('') || '<div class="small">Belum ada data anggota.</div>';
}
const R = () => Object.assign({ minDonations: 1, warnMissed: 2, kickMissed: 3, minWarsPromote: 2 }, DATA.rules || {});
const live = w => w && ['preparation', 'inWar'].includes(w.state);

function renderOpp(war) {
  const b = $('oppBox');
  if (!live(war)) { b.innerHTML = 'Belum ada war aktif untuk dianalisis.'; return; }
  const us = (war.us || {}).members || [], th = (war.them || {}).members || [], o = war.themInfo || {};
  const info = [['Level', o.level], ['Poin', o.points != null ? fmt(o.points) : null], ['Rekor', o.warWins != null ? `${o.warWins}W/${o.warLosses}L/${o.warTies}T` : null], ['Menang beruntun', o.warWinStreak], ['Frekuensi war', o.warFrequency], ['Liga war', o.warLeague]].filter(x => x[1] != null && x[1] !== '');
  const byPos = {}; th.forEach(m => byPos[m.pos] = m);
  let win = 0, lose = 0;
  const rows = us.map(m => {
    const t = byPos[m.pos]; if (!t) return '';
    const d = Number(m.th) - Number(t.th); d > 0 ? win++ : d < 0 ? lose++ : 0;
    return `<tr><td>${esc(m.pos)}</td><td>TH${esc(m.th)}</td><td>TH${esc(t.th)}</td><td style="color:var(--${d > 0 ? 'green' : d < 0 ? 'red' : 'mut'})">${d > 0 ? 'unggul ' + d : d < 0 ? 'kalah ' + -d : 'sama'}</td></tr>`;
  }).join('');
  const avg = a => a.length ? (a.reduce((x, m) => x + Number(m.th), 0) / a.length).toFixed(1) : '-';
  const sc = th.filter(m => m.heroes), H = {}, SUP = {};
  sc.forEach(m => { (m.heroes || []).forEach(h => { const o = H[h.n] || (H[h.n] = { l: 0, m: 0, n: 0 }); o.l += h.l; o.m += h.m; o.n++; }); (m.superTroops || []).forEach(t => SUP[t] = (SUP[t] || 0) + 1); });
  const supN = sc.filter(m => (m.superTroops || []).length).length;
  const scoutBox = sc.length ? `<div style="margin:8px 0"><b>Hero lawan</b> (${sc.length} dari ${th.length} pemain terdata): ${Object.keys(H).map(n => `<span class="badge">${esc(n)} rata² ${(H[n].l / H[n].n).toFixed(0)}/${(H[n].m / H[n].n).toFixed(0)}</span>`).join(' ')}</div>
    <div style="margin:8px 0"><b>Super troop aktif</b>: ${supN ? `${supN} pemain · ` + Object.entries(SUP).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([t, n]) => `<span class="badge">${esc(t)} ×${n}</span>`).join(' ') : 'tidak ada yang terdeteksi'}</div>` : '';
  b.innerHTML = `${info.length ? `<div>${info.map(([l, v]) => `<span class="badge">${esc(l)}: ${esc(v)}</span>`).join(' ')}</div>` : '<div>Data klan lawan belum tersedia (diambil saat build berikutnya).</div>'}
    <div style="margin:8px 0">Rata² TH: kita ${avg(us)}, lawan ${avg(th)} · unggul di ${win} posisi, kalah di ${lose}.</div>${scoutBox}
    <div class="table-wrap"><table><thead><tr><th>Posisi</th><th>Kita</th><th>Lawan</th><th>Selisih</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderPlan(war, force) {
  const b = $('planBox');
  if (!live(war)) { b.innerHTML = 'Planner aktif saat masa persiapan atau war berlangsung.'; return; }
  if (!force && b.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;
  const key = 'plan:' + war.end, per = war.perMember || 2, us = (war.us || {}).members || [], th = (war.them || {}).members || [];
  let P = {}; try { P = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
  const cnt = {}; Object.values(P).forEach(n => { if (n) cnt[n] = (cnt[n] || 0) + 1; });
  const over = Object.keys(cnt).filter(n => cnt[n] > per);
  b.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Target</th><th>Penyerang</th></tr></thead><tbody>${th.map(t => `<tr><td>#${esc(t.pos)} TH${esc(t.th)} ${esc(t.name)}</td><td><select class="flt" style="float:none" aria-label="Penyerang target ${esc(t.pos)}" data-p="${esc(t.pos)}"><option value="">-</option>${us.map(m => `<option${P[t.pos] === m.name ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    ${over.length ? `<div class="tag-warn" style="display:inline-block;margin-top:6px">Melebihi jatah ${per} serangan: ${over.map(esc).join(', ')}</div>` : ''}
    <div style="margin-top:8px"><button type="button" id="planCopy">Salin rencana</button> Disimpan di perangkat ini saja.</div>`;
  b.querySelectorAll('select[data-p]').forEach(sel => sel.addEventListener('change', () => { P[sel.dataset.p] = sel.value; try { localStorage.setItem(key, JSON.stringify(P)); } catch (e) {} renderPlan(war, true); }));
  $('planCopy').onclick = async () => {
    const btn = $('planCopy'), t = 'Rencana war\n' + th.map(x => `#${x.pos} ${x.name}: ${P[x.pos] || '-'}`).join('\n');
    try { await navigator.clipboard.writeText(t); btn.textContent = 'Tersalin ✓'; } catch (e) { btn.textContent = 'Gagal menyalin'; }
  };
}

function renderActivity(key) {
  const a = (DATA.activity || {})[key] || [], b = $('actBox'), tot = a.reduce((x, y) => x + y, 0);
  if (tot < 5) { b.innerHTML = 'Belum cukup data donasi per jam. Muncul setelah beberapa hari riwayat terkumpul.'; return; }
  const mx = Math.max(...a), top = a.map((v, h) => [v, h]).sort((x, y) => y[0] - x[0]).slice(0, 3).map(x => x[1]);
  const hh = h => String(h).padStart(2, '0');
  b.innerHTML = `<div class="act">${a.map((v, h) => `<i class="${top.includes(h) ? 'top' : ''}" style="height:${Math.max(3, Math.round(v / mx * 100))}%" title="${hh(h)}.00 WIB: ${v} donasi"></i>`).join('')}</div>
    <div class="actx"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
    <div style="margin-top:6px">Paling ramai: ${top.slice().sort((x, y) => x - y).map(h => hh(h) + '.00').join(', ')} WIB. Dihitung dari donasi yang tercatat tiap jam.</div>`;
}

function renderJoin(key) {
  const c = getClanObj(key).clan || {}, url = 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=' + encodeURIComponent(c.tag || key);
  const req = [c.requiredTH ? 'TH minimum ' + c.requiredTH : '', c.requiredTrophies ? 'trofi minimum ' + fmt(c.requiredTrophies) : ''].filter(Boolean);
  const type = ({ open: 'Terbuka untuk semua', inviteOnly: 'Hanya undangan', closed: 'Tertutup' })[c.type] || c.type || '-';
  $('joinBox').innerHTML = `<div>${esc(c.name || '')} · ${esc(type)}${req.length ? ' · ' + esc(req.join(', ')) : ''}</div>
    <div style="margin-top:8px"><a class="plink" href="${esc(url)}" target="_blank" rel="noopener">Buka klan di game</a> <button type="button" id="joinCopy">Salin tautan</button></div>
    <div style="margin-top:8px"><a class="plink" href="jadwal.ics">Langganan kalender war dan raid (.ics)</a></div>`;
  $('joinCopy').onclick = async () => { const btn = $('joinCopy'); try { await navigator.clipboard.writeText(url); btn.textContent = 'Tersalin ✓'; } catch (e) { btn.textContent = 'Gagal menyalin'; } };
}

const ROLE = { leader: 'Leader', coLeader: 'Co-leader', admin: 'Elder', member: 'Member' };
let MEM_ALL = false, ERRMSG = '', MS = { k: 'donations', d: true }, memCh = null, ptsCh = null;
const MKEYS = ['rank', 'name', 'role', 'th', 'trophies', 'donations', 'received', 'capitalContributions'];
function mval(m, k) {
  if (k === 'role') return ['leader', 'coLeader', 'admin', 'member'].indexOf(m.role);
  if (k === 'name') return String(m.name || '').toLowerCase();
  return Number(m[k]) || 0;
}
function parseT(v) {
  if (!v) return null;
  let s = String(v);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) s = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}
function ago(t) {
  const s = (Date.now() - t) / 1000;
  return s < 90 ? 'baru saja' : s < 3600 ? Math.round(s / 60) + ' menit lalu' : s < 86400 ? Math.round(s / 3600) + ' jam lalu' : Math.round(s / 86400) + ' hari lalu';
}
function dur(ms) {
  if (ms <= 0) return 'selesai';
  const m = Math.floor(ms / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d}h ${h % 24}j` : h ? `${h}j ${m % 60}m` : `${m}m`;
}
function cdown(war) {
  const s = parseT(war.start), e = parseT(war.end), n = Date.now();
  if (war.state === 'preparation' && s) return ` · mulai dalam ${dur(s - n)}`;
  if (war.state === 'inWar' && e) return ` · sisa ${dur(e - n)}`;
  return '';
}
function showFresh() {
  const t = parseT(DATA.generated), a = t == null ? null : (Date.now() - t) / 6e4;
  const c = a == null || a > 30 ? 'dead' : a > 12 ? 'old' : '';
  $('meta').innerHTML = `<span class="dot ${c}"></span>Diperbarui ${t == null ? '-' : ago(t)} (${esc(fmtTime(DATA.generated))})${c === 'dead' ? ' — data mungkin macet, cek workflow' : ''}${ERRMSG ? ' · ' + esc(ERRMSG) : ''}`;
}
async function autoLoad() {
  try {
    const r = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DATA = await r.json(); ERRMSG = '';
  } catch (e) { ERRMSG = 'Gagal memuat data terbaru (' + e.message + '), menampilkan data yang ada.'; }
  showFresh();
  if (!ERRMSG && window.__renderAll) window.__renderAll();
}
function markSort() {
  const ss = $('sortSel'); if (ss) ss.value = MS.k;
  document.querySelectorAll('#memberTable thead th').forEach((th, i) => {
    th.classList.toggle('on', MKEYS[i] === MS.k);
    th.classList.toggle('desc', MKEYS[i] === MS.k && MS.d);
  });
}
function renderRaid(tag) {
  const key = resolveClanKey(tag), r = (DATA.raids || {})[key], b = $('raidBox');
  if (!r) { const ch = (getClanObj(tag).clan || {}).capitalHall; b.innerHTML = ch ? 'Belum ada data Capital Raid (mungkin belum ada raid weekend, atau API menolak permintaan).' : 'Klan ini belum membuka Clan Capital, jadi belum ada data raid.'; return; }
  const left = (r.members || []).map(m => ({ n: m.name, l: (m.limit || 0) - (m.attacks || 0) })).filter(x => x.l > 0);
  const st = r.state === 'ongoing' ? 'Sedang berlangsung' : r.state === 'ended' ? 'Selesai' : safe(r.state);
  const stats = [['Total loot', r.totalLoot], ['Raid selesai', r.raidsCompleted], ['Serangan', r.totalAttacks], ['Distrik hancur', r.districtsDestroyed]];
  b.innerHTML = `<div class="war-times">${esc(st)} · ${esc(fmtTime(r.start))} – ${esc(fmtTime(r.end))}</div>
    <div class="grid" style="margin-top:12px">${stats.map(([l, v]) => `<div class="card stat"><div class="label">${l}</div><div class="value">${fmt(v)}</div></div>`).join('')}</div>
    ${r.state === 'ongoing' && left.length ? `<div class="small" style="margin-top:8px">Serangan tersisa (${left.length}): ${left.map(x => `<span class="badge">${esc(x.n)} ×${x.l}</span>`).join(' ')}</div>` : ''}`;
}
function lineChart(old, canvasId, emptyId, pts, label, color) {
  if (old) old.destroy();
  const c = $(canvasId), e = $(emptyId), box = c.parentElement;
  if (pts.length < 2 || typeof Chart === 'undefined') {
    box.style.display = 'none'; e.style.display = 'block';
    e.textContent = pts.length < 2 ? 'Data historis belum cukup (butuh minimal 2 titik, tercatat tiap jam).' : 'Grafik tidak dapat dimuat.';
    return null;
  }
  box.style.display = ''; e.style.display = 'none';
  return new Chart(c.getContext('2d'), { type: 'line',
    data: { labels: pts.map(p => fmtTime(new Date(p.t).toISOString())), datasets: [{ label, data: pts.map(p => p.v), borderColor: color, tension: .3, pointRadius: 0, borderWidth: 2.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 4, maxRotation: 0 } }, y: { ticks: { precision: 0 } } } } });
}
function renderTrends(tag) {
  const nk = normTagKey(tag), H = (DATA.history || []).filter(e => normTagKey(e.clanTag) === nk);
  memCh = lineChart(memCh, 'memChart', 'memEmpty', H.filter(e => e.memberCount != null).map(e => ({ t: parseT(e.ts), v: e.memberCount })), 'Anggota', cv('--green'));
  ptsCh = lineChart(ptsCh, 'ptsChart', 'ptsEmpty', H.filter(e => e.points != null).map(e => ({ t: parseT(e.ts), v: e.points })), 'Poin', cv('--yellow'));
}

function profileUrl(tag) { return 'https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=' + encodeURIComponent(tag || ''); }
const warLog = key => ((DATA.warlog || {})[key] || []).slice();

function renderWarLog(tag) {
  const key = resolveClanKey(tag), L = warLog(key).reverse().slice(0, 10), b = $('warLogBox');
  if (!L.length) { b.innerHTML = '<div class="small">Belum ada war selesai yang tercatat. Hasil war dicatat otomatis begitu war berakhir.</div>'; return; }
  const col = r => r === 'menang' ? 'green' : r === 'kalah' ? 'red' : 'yellow';
  b.innerHTML = `<table style="min-width:520px"><thead><tr><th>Selesai</th><th>Lawan</th><th>Ukuran</th><th>Skor</th><th>Hasil</th></tr></thead><tbody>${L.map(x =>
    `<tr><td>${esc(fmtTime(x.end))}</td><td>${esc(x.opponent)}</td><td>${esc(x.size)}v${esc(x.size)}</td><td>${x.usStars}★ (${Number(x.usPct).toFixed(1)}%) – ${x.themStars}★ (${Number(x.themPct).toFixed(1)}%)</td><td><span class="badge" style="color:var(--${col(x.result)})">${esc(x.result)}</span></td></tr>`).join('')}</tbody></table>
    <div class="small" style="margin-top:6px">${L.filter(x => x.result === 'menang').length} menang dari ${L.length} war terakhir.</div>`;
}

function renderStats(tag) {
  const key = resolveClanKey(tag), c = getClanObj(key).clan || {}, b = $('statBox'), W = warLog(key), S = {};
  W.forEach(w => { const per = w.perMember || 2;
    (w.members || []).forEach(m => { const o = S[m.tag] || (S[m.tag] = { wars: 0, used: 0, poss: 0, stars: 0, pct: 0 });
      o.wars++; o.poss += per; o.used += (m.attacks || []).length;
      (m.attacks || []).forEach(a => { o.stars += a.stars || 0; o.pct += Number(a.pct) || 0; }); }); });
  const miss3 = {}; W.slice(-3).forEach(w => (w.members || []).forEach(m => { miss3[m.tag] = (miss3[m.tag] || 0) + (w.perMember || 2) - (m.attacks || []).length; }));
  let mvp = null, best = -1; const last = W[W.length - 1];
  if (last) (last.members || []).forEach(m => { const t = (m.attacks || []).reduce((a, x) => a + (x.stars || 0), 0); if (t > best) { best = t; mvp = m.tag; } });
  const rows = (c.memberList || []).map(m => {
    const s = S[m.tag], ms = miss3[m.tag] || 0, don = m.donations || 0, rec = m.received || 0;
    let tip = '-';
    if (!s) tip = (don < R().minDonations && rec === 0) ? 'Cek aktivitas' : '-';
    else if (ms >= R().kickMissed && don === 0) tip = 'Pertimbangkan kick';
    else if (ms >= R().warnMissed || (don === 0 && ms >= 1)) tip = 'Perhatikan';
    else if (s.wars >= R().minWarsPromote && ms === 0 && don > 0 && m.role === 'member') tip = 'Pertimbangkan promote';
    const att = s ? s.used || 1 : 0;
    return `<tr><td><a class="plink" href="#" data-player="${esc(m.tag)}">${esc(m.name)}</a>${m.tag === mvp ? ' <span class="badge">MVP war terakhir</span>' : ''}${rec > 0 && don === 0 ? ' <span class="tag-warn">hanya menerima</span>' : ''}</td>
      <td>${s ? s.wars : '-'}</td><td>${s ? s.used + '/' + s.poss : '-'}</td><td>${s ? (s.stars / att).toFixed(2) : '-'}</td><td>${s ? (s.pct / att).toFixed(0) + '%' : '-'}</td><td>${s ? ms : '-'}</td><td>${fmt(don)}:${fmt(rec)}</td><td>${esc(tip)}</td></tr>`;
  }).join('');
  b.innerHTML = `<table style="min-width:600px"><thead><tr><th>Nama</th><th>War</th><th>Serang</th><th>Rata² ★</th><th>Rata² %</th><th>Terlewat (3 war)</th><th>Donasi:Terima</th><th>Saran</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Tidak ada data.</td></tr>'}</tbody></table>`;
}

function warExtra(war) {
  window.__war = war;
  const us = war.us || {}, them = war.them || {};
  const thc = ms => { const o = {}; (ms || []).forEach(m => o[m.th] = (o[m.th] || 0) + 1); return Object.keys(o).sort((a, b) => b - a).map(t => `TH${t}×${o[t]}`).join(' ') || '-'; };
  const opos = {}, uname = {}; (them.members || []).forEach(m => opos[m.tag] = m.pos); (us.members || []).forEach(m => uname[m.tag] = m.name);
  const log = [];
  (us.members || []).forEach(m => (m.attacks || []).forEach(a => log.push({ o: a.order, t: `${m.name} → lawan #${opos[a.defender] ?? '?'}: ${a.stars}★ ${a.pct}%` })));
  (them.members || []).forEach(m => (m.attacks || []).forEach(a => log.push({ o: a.order, t: `Lawan #${m.pos} → ${uname[a.defender] || '?'}: ${a.stars}★ ${a.pct}%` })));
  log.sort((a, b) => b.o - a.o);
  return `<div class="small" style="margin-top:10px">Lineup kita: ${esc(thc(us.members))}<br>Lineup lawan: ${esc(thc(them.members))}</div>
    ${log.length ? `<div class="small" style="margin-top:8px"><b>Log serangan terbaru</b>${log.slice(0, 8).map(x => `<div class="change-row">${esc(x.t)}</div>`).join('')}</div>` : ''}
    <button type="button" style="margin-top:10px" onclick="copyWar(this)">Bagikan ringkasan war</button>`;
}
async function copyWar(btn) {
  const w = window.__war || {}, us = w.us || {}, them = w.them || {}, per = w.perMember || 2;
  const idle = (us.members || []).filter(m => (m.attacks || []).length < per).map(m => m.name);
  const txt = `War ${us.name} vs ${them.name}: ${us.stars}★ (${us.pct}%) – ${them.stars}★ (${them.pct}%)${cdown(w)}` + (idle.length ? `\nBelum menyerang: ${idle.join(', ')}` : '');
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({ text: txt }); btn.textContent = 'Terkirim ✓'; }
    else { await navigator.clipboard.writeText(txt); btn.textContent = 'Tersalin ✓'; }
  } catch (e) { btn.textContent = e && e.name === 'AbortError' ? 'Bagikan ringkasan war' : 'Gagal menyalin'; }
  setTimeout(() => { btn.textContent = 'Bagikan ringkasan war'; }, 2000);
}

/* =====================================================================
   Fitur tambahan ala War Report: syarat menang, peta war, ranking
   serangan/pertahanan, scout lawan, Clan War League, performa klan
   ===================================================================== */
// War yang ditampilkan: war reguler yang aktif, kalau tidak ada maka war CWL ronde berjalan, kalau tidak ada war reguler terakhir
function curWar(key) {
  const w = (DATA.wars || {})[key], c = ((DATA.cwl || {})[key] || {}).current;
  return live(w) ? w : live(c) ? c : w;
}
const STAR = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const starsEl = n => `<span class="stars-line" role="img" aria-label="${n} dari 3 bintang">${STAR(n)}</span>`;
const sgn = n => n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0';
const warTitle = w => (w && w.cwl ? `CWL ronde ${w.round} · ` : '');

// Serangan terbaik per basis yang diserang: { tagBertahan: { stars, pct, hits: [{n, s, p, o}] } }
function bestHits(attackers) {
  const m = {};
  (attackers || []).forEach(a => (a.attacks || []).forEach(x => {
    const o = m[x.defender] || (m[x.defender] = { stars: 0, pct: 0, hits: [] }), s = x.stars || 0, p = Number(x.pct) || 0;
    if (s > o.stars || (s === o.stars && p > o.pct)) { o.stars = s; o.pct = p; }
    o.hits.push({ n: a.name, s, p, o: x.order || 0 });
  }));
  Object.values(m).forEach(o => o.hits.sort((a, b) => a.o - b.o));
  return m;
}

// ---------- Syarat menang ----------
function warCalc(war) {
  const us = war.us || {}, th = war.them || {}, per = war.perMember || 2, U = us.members || [], T = th.members || [];
  const hitU = bestHits(U), hitT = bestHits(T), used = ms => ms.reduce((a, m) => a + (m.attacks || []).length, 0);
  const open = (def, hits) => def.reduce((a, m) => a + 3 - ((hits[m.tag] || {}).stars || 0), 0);
  const c = { remU: Math.max(0, U.length * per - used(U)), remT: Math.max(0, T.length * per - used(T)), openU: open(T, hitU), openT: open(U, hitT),
    sU: Number(us.stars) || 0, sT: Number(th.stars) || 0, pU: Number(us.pct) || 0, pT: Number(th.pct) || 0 };
  c.maxU = c.sU + Math.min(c.openU, 3 * c.remU); c.maxT = c.sT + Math.min(c.openT, 3 * c.remT);
  c.needU = c.sT - c.sU + 1; c.needT = c.sU - c.sT + 1;
  return c;
}
function needHtml(war) {
  if (!war || war.state !== 'inWar') return '';
  const c = warCalc(war), d = c.sU - c.sT;
  const notes = [];
  if (c.maxT < c.sU) notes.push('Lawan tidak bisa lagi menyalip bintang kita, bahkan jika semua serangan tersisa mereka berhasil.');
  else if (c.maxU < c.sT) notes.push('Bintang lawan sudah tidak terkejar. Serangan tersisa tinggal menambah persen.');
  else if (c.maxU === c.sT) notes.push('Kita hanya bisa menyamakan bintang. Hasil akhir ditentukan persen perusakan.');
  else if (c.sU === c.sT) notes.push(`Bintang sama. Pemenang ditentukan persen perusakan: kita ${pct1(c.pU)}% vs ${pct1(c.pT)}%.`);
  else notes.push('Bila bintang akhir sama, pemenang ditentukan persen perusakan.');
  if (c.needU > 0 && c.remU > 0 && c.maxU >= c.sT + 1) notes.push(`Untuk memimpin kita butuh rata-rata ±${(c.needU / c.remU).toFixed(1)}★ dari tiap serangan tersisa.`);
  const cards = [
    ['Selisih bintang', sgn(d) + '★', `Persen ${pct1(c.pU)}% vs ${pct1(c.pT)}%`],
    ['Kita butuh', c.needU > 0 ? '+' + c.needU + '★' : 'Unggul', (c.needU > 0 ? 'untuk memimpin · ' : '') + `sisa ${c.remU} serangan`],
    ['Lawan butuh', c.needT > 0 ? '+' + c.needT + '★' : 'Unggul', (c.needT > 0 ? 'untuk memimpin · ' : '') + `sisa ${c.remT} serangan`],
    ['Bintang tersedia', c.openU + ' / ' + c.openT, 'Di basis lawan / di basis kita'],
  ];
  return `<div class="need"><div class="grid">${cards.map(([l, v, s]) => `<div class="card stat"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="sub">${esc(s)}</div></div>`).join('')}</div>
    <div class="need-note">${notes.map(esc).join('<br>')}</div></div>`;
}

// ---------- Kontrol segmen ----------
const seg = (g, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${g}:${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join('')}</div>`;
let MAP = { side: 'them', open: false }, RANK = { v: 'off' }, CWLV = { v: 'klasemen', round: null }, cwlOpened = false;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-seg]'); if (!b) return;
  const [g, v] = b.dataset.seg.split(':');
  if (g === 'mapside') MAP.side = v; else if (g === 'mapopen') MAP.open = !MAP.open; else if (g === 'rank') RANK.v = v; else if (g === 'cwl') CWLV.v = v;
  renderWarExtras();
});
document.addEventListener('change', e => { if (e.target.id === 'cwlRound') { CWLV.round = Number(e.target.value); renderWarExtras(); } });

// ---------- Scout lawan ----------
const heroLine = m => (m.heroes || []).map(h => `${h.n} ${h.l}`).join(' · ');
function scoutHtml(m) {
  if (!m.heroes) return '';
  const sup = (m.superTroops || []).length ? ` · Super: ${m.superTroops.join(', ')}` : '';
  const line = heroLine(m);
  return line || sup ? `<div class="scout">${esc(line)}${esc(sup)}</div>` : '';
}

// ---------- Peta war ----------
function renderWarMap(war) {
  const b = $('mapBox');
  if (!war || war.state === 'notInWar') { b.innerHTML = '<div class="small">Peta war muncul saat ada war atau CWL berlangsung.</div>'; return; }
  const them = MAP.side === 'them', us = war.us || {}, th = war.them || {};
  const def = ((them ? th : us).members || []).slice().sort((a, c) => (a.pos || 0) - (c.pos || 0)), hits = bestHits((them ? us : th).members || []);
  const st = m => (hits[m.tag] || {}).stars || 0, done = def.filter(m => st(m) === 3).length;
  const rows = def.filter(m => !MAP.open || st(m) < 3);
  const body = rows.map(m => {
    const h = hits[m.tag], n = st(m);
    return `<tr><td>${esc(m.pos)}</td><td><b>TH${esc(m.th)}</b> ${esc(m.name)}${them ? scoutHtml(m) : ''}</td>
      <td>${h ? starsEl(n) + `<div class="hit">${esc(pct1(h.pct))}%</div>` : '<span class="small">belum diserang</span>'}</td>
      <td>${h ? h.hits.map(x => `<div class="hit">${esc(x.n)}: ${x.s}★ ${esc(pct1(x.p))}%</div>`).join('') : '-'}</td></tr>`;
  }).join('');
  const scouted = them ? th.members.filter(m => m.heroes).length : 0;
  b.innerHTML = `<div class="seg-row">${seg('mapside', MAP.side, [['them', 'Basis lawan'], ['us', 'Basis kita']])}
      <button type="button" class="seg-solo" data-seg="mapopen:1" aria-pressed="${MAP.open}">Hanya yang belum 3★ (${def.length - done})</button></div>
    <div class="small" style="margin-bottom:8px">${done} dari ${def.length} basis ${them ? 'lawan' : 'kita'} sudah ${them ? 'kita' : 'diambil lawan'} 3★.${them && war.state !== 'warEnded' ? (scouted ? ` Hero dan super troop lawan terdata untuk ${scouted} dari ${th.members.length} pemain.` : ' Data hero lawan belum tersedia (diambil saat build berikutnya).') : ''}</div>
    <div class="table-wrap"><table style="min-width:520px"><thead><tr><th>#</th><th>Basis</th><th>Hasil terbaik</th><th>Penyerang</th></tr></thead><tbody>${body || '<tr><td colspan="4">Semua basis sudah 3★.</td></tr>'}</tbody></table></div>`;
}

// ---------- Statistik serangan / pertahanan ----------
function offenseOf(U) {
  const all = [], R = {};
  (U || []).forEach(m => { R[m.tag] = { used: 0, stars: 0, nw: 0, pct: 0, three: 0 }; (m.attacks || []).forEach(a => all.push({ t: m.tag, a })); });
  all.sort((x, y) => (x.a.order || 0) - (y.a.order || 0));
  const best = {};
  all.forEach(({ t, a }) => {
    const s = a.stars || 0, prev = best[a.defender] || 0, r = R[t];
    r.used++; r.stars += s; r.pct += Number(a.pct) || 0; if (s === 3) r.three++;
    r.nw += Math.max(0, s - prev); best[a.defender] = Math.max(prev, s);
  });
  return R;
}
function defenseOf(U, T) {
  const hits = bestHits(T || []), R = {};
  (U || []).forEach(m => { const h = hits[m.tag]; R[m.tag] = { n: h ? h.hits.length : 0, stars: h ? h.stars : 0, pct: h ? h.pct : 0 }; });
  return R;
}
function renderWarRank(war) {
  const b = $('rankBox');
  if (!war || war.state === 'notInWar') { b.innerHTML = '<div class="small">Ranking muncul saat ada war atau CWL berlangsung.</div>'; return; }
  const per = war.perMember || 2, U = (war.us || {}).members || [], T = (war.them || {}).members || [];
  let table, note;
  if (RANK.v === 'off') {
    const R = offenseOf(U), rows = U.map(m => ({ m, r: R[m.tag] })).sort((x, y) => y.r.nw - x.r.nw || y.r.stars - x.r.stars || (y.r.used ? y.r.pct / y.r.used : -1) - (x.r.used ? x.r.pct / x.r.used : -1) || x.m.pos - y.m.pos);
    const top = rows[0] && rows[0].r.nw > 0 ? rows[0] : null;
    note = (top ? `Terbaik: ${esc(top.m.name)} dengan ${top.r.nw}★ baru. ` : '') + '★ baru = bintang yang benar-benar menambah skor klan, tidak termasuk bintang yang sudah diambil di basis yang sama.';
    table = `<table style="min-width:520px"><thead><tr><th>#</th><th>Nama</th><th>Serang</th><th>★ baru</th><th>★ total</th><th>Rata² %</th><th>3★</th></tr></thead><tbody>${rows.map(({ m, r }, i) =>
      `<tr><td>${i + 1}</td><td>${esc(m.name)} <span class="small">TH${esc(m.th)}</span></td><td>${r.used}/${per}</td><td>${r.nw}</td><td>${r.stars}</td><td>${r.used ? esc(pct1(r.pct / r.used)) + '%' : '-'}</td><td>${r.three}</td></tr>`).join('')}</tbody></table>`;
  } else {
    const R = defenseOf(U, T), rows = U.map(m => ({ m, r: R[m.tag] })).sort((x, y) => (!x.r.n - !y.r.n) || x.r.stars - y.r.stars || x.r.pct - y.r.pct || y.r.n - x.r.n);
    note = 'Pertahanan terbaik: paling sedikit bintang yang diambil lawan. Basis yang belum diserang ditaruh di bawah.';
    table = `<table style="min-width:480px"><thead><tr><th>#</th><th>Nama</th><th>Diserang</th><th>★ kebobolan</th><th>Persen terbaik lawan</th></tr></thead><tbody>${rows.map(({ m, r }, i) =>
      `<tr><td>${i + 1}</td><td>${esc(m.name)} <span class="small">TH${esc(m.th)}</span></td><td>${r.n}×</td><td>${r.n ? starsEl(r.stars) : '-'}</td><td>${r.n ? esc(pct1(r.pct)) + '%' : '-'}</td></tr>`).join('')}</tbody></table>`;
  }
  b.innerHTML = `<div class="seg-row">${seg('rank', RANK.v, [['off', 'Serangan'], ['def', 'Pertahanan']])}</div><div class="table-wrap">${table}</div><div class="small" style="margin-top:8px">${note}</div>`;
}

// ---------- Clan War League ----------
function cwlStandings(c) {
  const S = {}, mk = x => S[x.tag] || (S[x.tag] = { tag: x.tag, name: x.name, stars: 0, bonus: 0, pct: 0, w: 0, l: 0, t: 0 });
  (c.clans || []).forEach(mk);
  Object.values(c.wars || {}).forEach(w => {
    if (w.state !== 'warEnded' && w.state !== 'inWar') return;
    const a = mk(w.a), b = mk(w.b), sa = Number(w.a.stars) || 0, sb = Number(w.b.stars) || 0, pa = Number(w.a.pct) || 0, pb = Number(w.b.pct) || 0;
    a.stars += sa; b.stars += sb; a.pct += pa; b.pct += pb;
    if (w.state === 'warEnded') {
      const r = sa !== sb ? (sa > sb ? 1 : -1) : pa !== pb ? (pa > pb ? 1 : -1) : 0;
      if (r > 0) { a.bonus += 10; a.w++; b.l++; } else if (r < 0) { b.bonus += 10; b.w++; a.l++; } else { a.t++; b.t++; }
    }
  });
  return Object.values(S).map(x => ({ ...x, total: x.stars + x.bonus })).sort((x, y) => y.total - x.total || y.pct - x.pct);
}
function cwlPlayers(c, ours) {
  const P = {};
  Object.values(c.wars || {}).filter(w => w.ours && (w.state === 'warEnded' || w.state === 'inWar')).forEach(w => {
    const U = (w.a || {}).members || [], T = (w.b || {}).members || [], O = offenseOf(U), D = defenseOf(U, T);
    U.forEach(m => {
      const p = P[m.tag] || (P[m.tag] = { name: m.name, th: m.th, wars: 0, used: 0, stars: 0, nw: 0, pct: 0, three: 0, dn: 0, dstars: 0, dpct: 0 }), o = O[m.tag], d = D[m.tag];
      p.name = m.name; p.th = m.th; p.wars++; p.used += o.used; p.stars += o.stars; p.nw += o.nw; p.pct += o.pct; p.three += o.three;
      p.dn += d.n; p.dstars += d.stars; p.dpct += d.pct;
    });
  });
  return Object.values(P);
}
function renderCwl(key) {
  const card = $('cwlCard'), b = $('cwlBox'), c = (DATA.cwl || {})[key];
  if (!c || !(c.rounds || []).some(r => r.length)) { card.hidden = true; return; }
  card.hidden = false;
  if (!cwlOpened && c.state === 'inWar') { card.open = true; cwlOpened = true; }
  const ours = key, stand = cwlStandings(c), nowSeason = new Date().toISOString().slice(0, 7);
  const stLabel = { preparation: 'persiapan', inWar: 'berlangsung', ended: 'selesai' }[c.state] || c.state;
  const head = `<div class="small" style="margin-bottom:10px">Musim ${esc(c.season)} · ${esc(stLabel)}${c.season !== nowSeason && c.state === 'ended' ? ' (musim lalu)' : ''}. Menang war = bonus 10★. Peringkat: total bintang, lalu persen.</div>`;
  const rounds = (c.rounds || []).map((r, i) => ({ i, r })).filter(x => x.r.length);
  if (CWLV.round == null || !rounds.some(x => x.i === CWLV.round)) {
    const cur = c.current ? c.current.round - 1 : null;
    CWLV.round = cur != null && rounds.some(x => x.i === cur) ? cur : rounds[rounds.length - 1].i;
  }
  let body;
  if (CWLV.v === 'klasemen') {
    body = `<div class="table-wrap"><table style="min-width:460px"><thead><tr><th>#</th><th>Klan</th><th>M-K-S</th><th>Bintang</th><th>Bonus</th><th>Total</th><th>Persen</th></tr></thead><tbody>${stand.map((x, i) =>
      `<tr class="${x.tag === ours ? 'me' : ''}"><td>${i + 1}</td><td>${esc(x.name)}${x.tag === ours ? ' <span class="chip">kita</span>' : ''}</td><td style="white-space:nowrap">${x.w}-${x.l}-${x.t}</td><td>${x.stars}</td><td>${x.bonus}</td><td><b>${x.total}</b></td><td>${esc(pct1(x.pct))}%</td></tr>`).join('')}</tbody></table></div>
      <div class="small" style="margin-top:8px">War yang sedang berjalan dihitung sementara untuk bintang dan persen; bonus baru masuk saat war selesai.</div>`;
  } else if (CWLV.v === 'ronde') {
    const wars = (c.rounds[CWLV.round] || []).map(t => (c.wars || {})[t]).filter(Boolean), sl = { preparation: 'persiapan', inWar: 'berlangsung', warEnded: 'selesai' };
    const side = x => `${esc(x.name)}${x.tag === ours ? ' <span class="chip">kita</span>' : ''}`;
    body = `<select id="cwlRound" class="flt" style="margin-bottom:10px" aria-label="Pilih ronde">${rounds.map(x => `<option value="${x.i}"${x.i === CWLV.round ? ' selected' : ''}>Ronde ${x.i + 1}</option>`).join('')}</select>
      <div class="table-wrap"><table style="min-width:480px"><thead><tr><th>Klan</th><th>Skor</th><th>Klan</th><th>Status</th></tr></thead><tbody>${wars.map(w =>
        `<tr class="${w.ours ? 'me' : ''}"><td>${side(w.a)}</td><td>${w.a.stars}★ (${esc(pct1(w.a.pct))}%) – ${w.b.stars}★ (${esc(pct1(w.b.pct))}%)</td><td>${side(w.b)}</td><td>${esc(sl[w.state] || w.state)}</td></tr>`).join('') || '<tr><td colspan="4">Belum ada war di ronde ini.</td></tr>'}</tbody></table></div>`;
  } else {
    const P = cwlPlayers(c, ours).sort((x, y) => y.nw - x.nw || y.stars - x.stars || (y.used ? y.pct / y.used : -1) - (x.used ? x.pct / x.used : -1));
    const D = P.slice().sort((x, y) => (!x.dn - !y.dn) || (x.dn ? x.dstars / x.dn - y.dstars / y.dn : 0) || x.dpct / (x.dn || 1) - y.dpct / (y.dn || 1));
    body = P.length ? `<h3 class="sub-h" style="margin-top:0">Serangan</h3><div class="table-wrap"><table style="min-width:520px"><thead><tr><th>#</th><th>Nama</th><th>War</th><th>Serang</th><th>★ baru</th><th>★ total</th><th>Rata² %</th><th>3★</th></tr></thead><tbody>${P.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${esc(p.name)} <span class="small">TH${esc(p.th)}</span></td><td>${p.wars}</td><td>${p.used}/${p.wars}</td><td>${p.nw}</td><td>${p.stars}</td><td>${p.used ? esc(pct1(p.pct / p.used)) + '%' : '-'}</td><td>${p.three}</td></tr>`).join('')}</tbody></table></div>
      <h3 class="sub-h">Pertahanan</h3><div class="table-wrap"><table style="min-width:440px"><thead><tr><th>#</th><th>Nama</th><th>Diserang</th><th>Rata² ★ kebobolan</th><th>Rata² % lawan</th></tr></thead><tbody>${D.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${p.dn}×</td><td>${p.dn ? (p.dstars / p.dn).toFixed(2) : '-'}</td><td>${p.dn ? esc(pct1(p.dpct / p.dn)) + '%' : '-'}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="small">Belum ada war CWL klan ini yang berlangsung.</div>';
  }
  b.innerHTML = head + `<div class="seg-row">${seg('cwl', CWLV.v, [['klasemen', 'Klasemen'], ['ronde', 'Ronde'], ['pemain', 'Pemain']])}</div>` + body;
}

// ---------- Performa klan (dari riwayat war) ----------
function renderPerf(key) {
  const W = warLog(key), b = $('perfBox');
  if (!W.length) { b.innerHTML = '<div class="small">Belum ada war selesai yang tercatat. Ringkasan muncul setelah war pertama berakhir.</div>'; return; }
  let used = 0, poss = 0, stars = 0, pct = 0, three = 0, win = 0, lose = 0, tie = 0;
  W.forEach(w => {
    if (w.result === 'menang') win++; else if (w.result === 'kalah') lose++; else tie++;
    (w.members || []).forEach(m => { poss += w.perMember || 2; (m.attacks || []).forEach(a => { used++; stars += a.stars || 0; pct += Number(a.pct) || 0; if ((a.stars || 0) === 3) three++; }); });
  });
  const p = (a, c) => c ? Math.round(a / c * 100) + '%' : '-';
  const cards = [
    ['War tercatat', W.length, `${win} menang · ${lose} kalah · ${tie} seri`],
    ['Tingkat menang', p(win, W.length), 'Dari war yang tercatat'],
    ['Serangan terpakai', p(used, poss), `${used} dari ${poss} jatah`],
    ['Rata² ★ per serangan', used ? (stars / used).toFixed(2) : '-', `Rata² ${used ? pct1(pct / used) : '-'}% per serangan`],
    ['Serangan 3★', p(three, used), `${three} dari ${used} serangan`],
  ];
  b.innerHTML = `<div class="grid perf">${cards.map(([l, v, s]) => `<div class="card stat"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="sub">${esc(s)}</div></div>`).join('')}</div>`;
}

function renderWarExtras() {
  const sel = $('clanSelect'); if (!sel) return;
  const key = resolveClanKey(sel.value), w = curWar(key);
  [() => renderWarMap(w), () => renderWarRank(w), () => renderCwl(key)].forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}

function exportCsv(clanTag) {
  const clan = getClanObj(clanTag).clan;
  if (!clan) return;
  const rows = [['tag','name','role','th','trophies','donations','received','capital']];
  for (const m of (clan.memberList||[])) {
    rows.push([
      (m.tag||''),
      (m.name||''),
      (m.role||''),
      (m.th||m.townHallLevel||''),
      (m.trophies||0),
      (m.donations||0),
      (m.received||m.donationsReceived||0),
      (m.capitalContributions||m.clanCapitalContributions||0),
    ]);
  }
  const csv = rows.map(r=> r.map(c=> '"'+String(/^[=+\-@]/.test(String(c)) ? "'" + c : c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${((getClanObj(clanTag).clan && getClanObj(clanTag).clan.name) || clanTag).replace(/[^a-z0-9_-]/gi,'_')}_members.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function initUI() {
  const select = $('clanSelect');
  select.innerHTML = '';
  const keys = Object.keys(DATA.clans || {});
  if (!keys.length) {
    $('meta').textContent = 'Tidak ada data klan tersedia.';
    return;
  }
  keys.sort();
  keys.forEach(k=>{
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = `${(DATA.clans[k].name||k)} (${k})`;
    select.appendChild(opt);
  });

  const first = select.value || keys[0];
  const firstObj = getClanObj(first);
  $('title').textContent = (firstObj.clan && firstObj.clan.name) || 'Dashboard klan';
  showFresh();

  function renderAll() {
    const sel = select.value || keys[0];
    const { key: clanKey, clan } = getClanObj(sel);
    $('title').textContent = (clan && clan.name) || 'Dashboard klan';
    const steps = [
      () => renderHero(clanKey),
      () => renderAttention(clanKey),
      () => renderOverviewCards(clan || {}, clanKey),
      () => renderExtra(clan || {}),
      () => renderDonationChart(clanKey),
      () => renderRaid(clanKey),
      () => renderWarLog(clanKey),
      () => renderStats(clanKey),
      () => renderTrends(clanKey),
      () => renderWar(clanKey),
      () => renderOpp(curWar(clanKey)),
      () => renderPlan(curWar(clanKey)),
      () => renderWarExtras(),
      () => renderPerf(clanKey),
      () => renderActivity(clanKey),
      () => renderJoin(clanKey),
      () => renderDiffs(clanKey),
      () => renderMembers(clanKey, $('memberSearch').value),
      () => renderHistory(clanKey),
      () => renderPlayers(clanKey),
      () => window.__renderTools && window.__renderTools(),
    ];
    steps.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  select.addEventListener('change', ()=>{
    renderAll();
  });

  $('memberSearch').addEventListener('input', ()=>{
    renderMembers(select.value, $('memberSearch').value);
  });

  $('refreshBtn').addEventListener('click', async () => { const b = $('refreshBtn'); b.classList.add('busy'); b.disabled = true; await autoLoad(); setTimeout(() => { b.classList.remove('busy'); b.disabled = false; }, 400); });
  $('diffFilter').addEventListener('change', () => renderDiffs(select.value));
  $('exportCsv').addEventListener('click', ()=> exportCsv(select.value));

  document.querySelectorAll('#memberTable thead th').forEach((th, i) => {
    th.dataset.k = MKEYS[i]; th.tabIndex = 0;
    const go = () => { MS = { k: MKEYS[i], d: MS.k === MKEYS[i] ? !MS.d : true }; markSort(); renderMembers(select.value, $('memberSearch').value); };
    th.addEventListener('click', go);
    th.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });
  markSort();
  $('memMore').addEventListener('click', () => { MEM_ALL = !MEM_ALL; renderMembers(select.value, $('memberSearch').value); });
    document.querySelectorAll('details.fold').forEach(d => d.addEventListener('toggle', () => window.dispatchEvent(new Event('resize'))));
    $('sortSel').addEventListener('change', e => { const k = e.target.value; MS = { k, d: !['rank', 'name'].includes(k) }; markSort(); renderMembers(select.value, $('memberSearch').value); });
  initTheme();
  let v0 = location.hash.slice(1); if (!v0) { try { v0 = localStorage.getItem('view') || ''; } catch (e) {} }
  setView(v0, true);
  window.__renderAll = renderAll;
  renderAll();
  setInterval(autoLoad, 60000);
  setInterval(showFresh, 30000);
  // Resize chart on window resize to keep layout
  window.addEventListener('resize', ()=> { if (donationChartInstance) donationChartInstance.resize(); });
}

// Tombol "Pasang aplikasi": memasang langsung bila browser mengizinkan, selain itu menampilkan petunjuk manual
let deferredInstall = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (isStandalone()) { const ib = $('installBtn'); if (ib) ib.hidden = true; }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; const ib = $('installBtn'); if (ib) ib.hidden = true; });
document.addEventListener('click', async e => {
  if (!e.target.closest('#installBtn')) return;
  if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $('installSteps').textContent = ios
    ? 'Ketuk tombol Bagikan di Safari, lalu pilih "Tambah ke Layar Utama".'
    : 'Buka menu ⋮ di kanan atas browser, lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".';
  const dlg = $('installHelp'); if (dlg && dlg.showModal) dlg.showModal();
});

// ---------- Pemain: profil lengkap, pencarian, Legend League ----------
let PLAYERS = {}, PIDX = {}, UNI = {}, PLAYERS_AT = 0, PLAYERS_LOAD = null;
async function loadPlayers(force) {
  if (PLAYERS_LOAD) return PLAYERS_LOAD;
  if (!force && PLAYERS_AT && Date.now() - PLAYERS_AT < 6e5) return PLAYERS;
  PLAYERS_LOAD = (async () => {
    try {
      const r = await fetch('players.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const pj = await r.json(); PLAYERS = pj.players || {}; window.PMARKED = pj.marked || []; PLAYERS_AT = Date.now();
    } catch (e) { PLAYERS_AT = Date.now() - 5.4e5; }   // gagal: coba lagi sekitar 1 menit kemudian
    UNI = {}; PIDX = {}; Object.keys(PLAYERS).forEach(k => { PIDX[normTagKey(k)] = PLAYERS[k]; });
    PLAYERS_LOAD = null; return PLAYERS;
  })();
  return PLAYERS_LOAD;
}
const TAG_RE = /^#?[0289PYLQGRJCUV]{4,12}$/i;
function findMember(tag) {
  const n = normTagKey(tag);
  for (const [ck, c] of Object.entries(DATA.clans || {})) {
    const m = (c.memberList || []).find(x => normTagKey(x.tag) === n);
    if (m) return { m, clanKey: ck, clan: c };
  }
  return null;
}
function findLegend(tag) {
  const n = normTagKey(tag);
  for (const [ck, L] of Object.entries(DATA.legend || {})) {
    const k = Object.keys(L || {}).find(t => normTagKey(t) === n);
    if (k) return { e: L[k], clanKey: ck };
  }
  return null;
}
function findOpp(tag) {
  const n = normTagKey(tag);
  for (const ck of Object.keys(DATA.clans || {})) {
    const w = curWar(ck), m = w && live(w) ? ((w.them || {}).members || []).find(x => normTagKey(x.tag) === n) : null;
    if (m) return { m, war: w, name: (w.them || {}).name };
  }
  return null;
}

// Statistik war dari riwayat war yang tercatat (semua klan pantauan)
function playerWar(tag) {
  const n = normTagKey(tag); let o = null;
  Object.values(DATA.warlog || {}).forEach(L => (L || []).forEach(w => (w.members || []).forEach(m => {
    if (normTagKey(m.tag) !== n) return;
    o = o || { wars: 0, poss: 0, used: 0, stars: 0, three: 0, pct: 0, last: [] };
    const per = w.perMember || 2, at = m.attacks || [];
    o.wars++; o.poss += per; o.used += at.length;
    at.forEach(a => { o.stars += a.stars || 0; o.three += a.stars === 3 ? 1 : 0; o.pct += Number(a.pct) || 0; });
    o.last.push({ end: w.end, opp: w.opponent, res: w.result, at: at.map(a => a.stars || 0), per });
  })));
  if (o) o.last.sort((a, b) => String(a.end).localeCompare(String(b.end)));
  return o;
}

const lvBar = ([n, l, m]) => {
  const p = m ? Math.min(100, Math.round(l / m * 100)) : 0;
  return `<div class="lv${m && l >= m ? ' max' : ''}"><span class="lvn">${esc(n)}</span><span class="lvb"><i style="width:${p}%"></i></span><span class="lvv">${l}/${m || '?'}</span></div>`;
};
const lvFold = (title, rows, open) => rows && rows.length
  ? `<details class="pfold"${open ? ' open' : ''}><summary>${esc(title)} <span class="small">(${rows.length})</span></summary><div class="lvgrid">${rows.map(lvBar).join('')}</div></details>` : '';
const pstat = (l, v, s) => `<div class="card stat"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div>${s ? `<div class="sub">${esc(s)}</div>` : ''}</div>`;
const dayLabel = d => { const t = Date.parse(d + 'T12:00:00Z'); return isNaN(t) ? d : new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' }); };

function legendHtml(tag, p) {
  const f = findLegend(tag), lg = p && p.legend, out = [];
  if (f) {
    const c = f.e.cur || {}, net = (c.now || 0) - (c.start || 0), days = (f.e.days || []).slice(-7).reverse();
    out.push(`<h3 class="sub-h">Legend League hari ini</h3><div class="grid">${[
      pstat('Mulai hari ini', fmt(c.start)), pstat('Sekarang', fmt(c.now)),
      pstat('Selisih', sgn(net), `+${c.gain || 0} / −${c.loss || 0}`), pstat('Serang / bertahan', `~${c.atk || 0} / ~${c.def || 0}`, 'perkiraan'),
    ].join('')}</div>`);
    if (days.length) out.push(`<div class="table-wrap"><table style="min-width:420px"><thead><tr><th>Hari</th><th>Mulai</th><th>Akhir</th><th>Selisih</th><th>Serang~</th><th>Bertahan~</th></tr></thead><tbody>${days.map(d => `<tr><td>${esc(dayLabel(d.d))}</td><td>${fmt(d.start)}</td><td>${fmt(d.now)}</td><td>${sgn((d.now || 0) - (d.start || 0))}</td><td>${d.atk || 0}</td><td>${d.def || 0}</td></tr>`).join('')}</tbody></table></div>`);
    out.push('<div class="small">Perkiraan dari selisih trofi antar pembaruan data; beberapa kejadian di antara dua pembaruan bisa tergabung. Hari Legend berganti pukul 12.00 WIB.</div>');
  }
  if (lg) {
    const s = x => x ? `${fmt(x.trophies)}${x.rank ? ' · peringkat ' + fmt(x.rank) : ''}` : '-';
    out.push(`<h3 class="sub-h">Statistik musim Legend</h3><div class="grid">${[
      pstat('Total trofi Legend', fmt(lg.total)), pstat('Musim ini', s(lg.cur)), pstat('Musim lalu', s(lg.prev)), pstat('Terbaik', s(lg.best)),
    ].join('')}</div>`);
  }
  return out.join('');
}

function warHtml(tag) {
  const s = playerWar(tag);
  if (!s) return '<div class="small">Belum ada war klasik tercatat untuk pemain ini di dashboard.</div>';
  const att = s.used || 1;
  return `<div class="grid">${[
    pstat('War tercatat', s.wars), pstat('Serangan', `${s.used}/${s.poss}`, `${s.poss - s.used} terlewat`),
    pstat('Rata² bintang', (s.stars / att).toFixed(2), `${Math.round(s.three / att * 100)}% bintang 3`), pstat('Rata² perusakan', (s.pct / att).toFixed(0) + '%'),
  ].join('')}</div>
  <div class="table-wrap"><table style="min-width:420px"><thead><tr><th>Selesai</th><th>Lawan</th><th>Hasil</th><th>Serangan</th></tr></thead><tbody>${s.last.slice(-5).reverse().map(w =>
    `<tr><td>${esc(fmtTime(w.end))}</td><td>${esc(w.opp)}</td><td>${esc(w.res)}</td><td>${w.at.length ? w.at.map(n => n + '★').join(' · ') : 'tidak menyerang'}${w.at.length < w.per ? ` <span class="tag-warn">terlewat ${w.per - w.at.length}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Progres, tile level, penanda, achievement (gaya warreport) ----------
const HERO_CAP = {   // TH4-18, cocwarbase.com/hero-max-levels (diperiksa 4 Nov 2026)
  4: { 'Barbarian King': 1 },
  5: { 'Barbarian King': 1 },
  6: { 'Barbarian King': 1 },
  7: { 'Barbarian King': 10 },
  8: { 'Barbarian King': 20, 'Archer Queen': 10 },
  9: { 'Barbarian King': 30, 'Archer Queen': 30, 'Minion Prince': 10 },
  10: { 'Barbarian King': 40, 'Archer Queen': 40, 'Minion Prince': 20 },
  11: { 'Barbarian King': 50, 'Archer Queen': 50, 'Minion Prince': 30, 'Grand Warden': 20 },
  12: { 'Barbarian King': 65, 'Archer Queen': 65, 'Minion Prince': 40, 'Grand Warden': 40 },
  13: { 'Barbarian King': 75, 'Archer Queen': 75, 'Minion Prince': 50, 'Grand Warden': 50, 'Royal Champion': 25 },
  14: { 'Barbarian King': 85, 'Archer Queen': 85, 'Minion Prince': 60, 'Grand Warden': 60, 'Royal Champion': 30 },
  15: { 'Barbarian King': 90, 'Archer Queen': 90, 'Minion Prince': 70, 'Grand Warden': 65, 'Royal Champion': 40, 'Dragon Duke': 10 },
  16: { 'Barbarian King': 95, 'Archer Queen': 95, 'Minion Prince': 80, 'Grand Warden': 70, 'Royal Champion': 45, 'Dragon Duke': 15 },
  17: { 'Barbarian King': 100, 'Archer Queen': 100, 'Minion Prince': 90, 'Grand Warden': 75, 'Royal Champion': 50, 'Dragon Duke': 20 },
  18: { 'Barbarian King': 110, 'Archer Queen': 110, 'Minion Prince': 95, 'Grand Warden': 85, 'Royal Champion': 55, 'Dragon Duke': 25 },
};
const pctOf = (a, b) => b ? Math.round(a / b * 10000) / 100 : null;
const fp = v => v == null ? '-' : String(v).replace('.', ',') + '%';
let CAPS = null;   // assets/max_levels.json: {"items": {"Nama": {"15": 11}}}; opsional
async function loadCaps() {
  if (CAPS) return CAPS;
  try { const r = await fetch('assets/max_levels.json'); CAPS = r.ok ? ((await r.json()).items || {}) : {}; } catch (e) { CAPS = {}; }
  return CAPS;
}
const capOf = (n, th, hero) => (hero && (HERO_CAP[th] || {})[n]) || (((CAPS || {})[n] || {})[th]) || 0;
function progOf(rows, th, hero) {
  let l = 0, m = 0, cl = 0, cm = 0, ok = rows.length > 0;
  rows.forEach(([n, lv, mx]) => { l += lv; m += mx || lv; const c = capOf(n, th, hero); if (c) { cl += Math.min(lv, c); cm += c; } else if (!hero) ok = false; });
  return { all: pctOf(l, m), th: ok && cm ? pctOf(cl, cm) : null };
}
const ini = n => String(n || '?').replace(/[^A-Za-z0-9 .]/g, '').split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
// Ikon: ClashKing Assets (assets.clashk.ing). Pola troops/ dan spells/ ada di dokumentasi mereka;
// heroes/, pets/, equipment/ adalah dugaan. Bila gambar gagal dimuat, tile jatuh ke inisial. Ubah pola di sini bila perlu.
const ICON_BASE = 'https://assets.clashk.ing/';
const cleanN = s => String(s || '').toLowerCase().replace(/ /g, '_').replace(/\./g, '').replace(/\?/g, '').replace(/’/g, '');
const ICON_PATH = {
  troop: n => `troops/${cleanN(n)}/icon.webp`, siege: n => `troops/${cleanN(n)}/icon.webp`,
  spell: n => `spells/${cleanN(n)}.webp`, hero: n => `heroes/${cleanN(n)}/icon.webp`,
  pet: n => `pets/${cleanN(n)}/icon.webp`, equip: n => `equipment/${cleanN(n)}.webp`,
};
// Urutan seperti di UI game (sumber: data statis clashy.go / ClashKing). Item yang belum dimiliki tampil terkunci.
const ORDER = {
  hero: ['Barbarian King', 'Archer Queen', 'Minion Prince', 'Grand Warden', 'Royal Champion', 'Dragon Duke'],
  troop: ['Barbarian', 'Archer', 'Giant', 'Goblin', 'Wall Breaker', 'Balloon', 'Wizard', 'Healer', 'Dragon', 'P.E.K.K.A', 'Baby Dragon', 'Miner', 'Electro Dragon', 'Yeti', 'Dragon Rider', 'Electro Titan', 'Root Rider', 'Thrower', 'Meteor Golem',
    'Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch', 'Lava Hound', 'Bowler', 'Ice Golem', 'Headhunter', 'Apprentice Warden', 'Druid', 'Furnace', 'Ruin Witch'],
  spell: ['Lightning Spell', 'Healing Spell', 'Rage Spell', 'Jump Spell', 'Freeze Spell', 'Clone Spell', 'Invisibility Spell', 'Recall Spell', 'Revive Spell', 'Totem Spell',
    'Poison Spell', 'Earthquake Spell', 'Haste Spell', 'Skeleton Spell', 'Bat Spell', 'Overgrowth Spell', 'Ice Block Spell', 'Angry Spell'],
  siege: ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Troop Launcher', 'Sky Wagon'],
  pet: ['L.A.S.S.I', 'Mighty Yak', 'Electro Owl', 'Unicorn', 'Frosty', 'Diggy', 'Poison Lizard', 'Phoenix', 'Spirit Fox', 'Angry Jelly', 'Sneezy', 'Greedy Raven'],
  equip: ['Barbarian Puppet', 'Rage Vial', 'Archer Puppet', 'Invisibility Vial', 'Eternal Tome', 'Life Gem', 'Seeking Shield', 'Royal Gem', 'Earthquake Boots', 'Hog Rider Puppet', 'Giant Gauntlet', 'Vampstache', 'Haste Vial', 'Rocket Spear', 'Spiky Ball', 'Frozen Arrow', 'Monolith Arrow', 'Giant Arrow', 'Heroic Torch', 'Healer Puppet', 'Fireball', 'Rage Gem', 'Snake Bracelet', 'Healing Tome', 'Dark Crown', 'Magic Mirror', 'Electro Boots', 'Lavaloon Puppet', 'Henchmen Puppet', 'Dark Orb', 'Metal Pants', 'Noble Iron', 'Action Figure', 'Meteor Staff', 'Frost Flake', 'Stick Horse', 'Fire Heart', 'Rocket Backpack', 'Stun Blaster', 'Flame Blower', 'Electro Fangs', 'Revenge Deck'],
};
const lockRow = (n, m) => Object.assign([n, 0, m], { locked: true });
function universeOf(kind) {   // equipment: nama + level maks dari semua profil yang dimuat (menangkap item baru di luar ORDER)
  if (UNI[kind]) return UNI[kind];
  const map = new Map();
  Object.values(PLAYERS).forEach(q => (q.eqAll || []).forEach(r => { if (!map.has(r[0])) map.set(r[0], r[2] || 0); }));
  return (UNI[kind] = map);
}
function tile(row, kind, on) {
  const [n, l, m] = row, cls = [];
  if (row.locked) cls.push('lock'); else { if (m && l >= m) cls.push('max'); if (on) cls.push('eq'); }
  if (kind === 'equip') cls.push(m >= 27 ? 'epic' : 'common');
  const src = ICON_PATH[kind] ? ICON_BASE + ICON_PATH[kind](n) : '';
  if (!src) cls.push('noimg');
  return `<div class="tile ${cls.join(' ')}" title="${esc(n)}${row.locked ? '' : ` ${l}/${m || '?'}`}"><span class="ti">${esc(ini(n))}</span>${src ? `<img alt="" loading="lazy" src="${esc(src)}" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}${row.locked ? '' : `<b class="tl">${l}</b>`}</div>`;
}
function tileSec(title, rows, th, kind, equipped) {
  if (!rows || !rows.length) return '';
  const g = progOf(rows, th, kind === 'hero'), eq = equipped || new Set(), own = new Map(rows.map(r => [r[0], r])), ord = ORDER[kind];
  let list = rows;
  if (ord) {
    const uni = kind === 'equip' ? universeOf('equip') : new Map(), extra = rows.map(r => r[0]).filter(n => !ord.includes(n));
    uni.forEach((m, n) => { if (!ord.includes(n) && !extra.includes(n)) extra.push(n); });
    list = ord.concat(extra).filter(n => kind !== 'hero' || own.has(n)).map(n => own.get(n) || lockRow(n, uni.get(n) || 0));
  }
  return `<section class="pgsec"><div class="pgh"><h3 class="sub-h">${esc(title)}</h3><span class="small">Kemajuan: ${fp(g.all)}${g.th != null ? ` | Kemajuan untuk TH${th}: ${fp(g.th)}` : ''}</span></div><div class="ptiles">${list.map(r => tile(r, kind, eq.has(r[0]))).join('')}</div></section>`;
}
const VIL = { home: 'Desa Asal', builderBase: 'Basis Tukang', clanCapital: 'Clan Capital' };
function achHtml(p) {
  if (!(p.achAll || []).length) return '';
  const by = {}; p.achAll.forEach(a => { (by[a[4] || 'home'] = by[a[4] || 'home'] || []).push(a); });
  return Object.keys(by).map(v => {
    const rows = by[v].slice().sort((a, b) => (b[1] - a[1]) || (b[2] / (b[3] || 1) - a[2] / (a[3] || 1)));
    const stars = rows.reduce((s, a) => s + a[1], 0);
    return `<details class="pfold"><summary>Pencapaian · ${esc(VIL[v] || v)} <span class="small">(${stars}/${rows.length * 3} ★)</span></summary><div class="lvgrid">${rows.map(a => `<div class="lv${a[1] >= 3 ? ' max' : ''}"><span class="lvn">${esc(a[0])}</span><span class="lvb"><i style="width:${a[3] ? Math.min(100, Math.round(a[2] / a[3] * 100)) : 0}%"></i></span><span class="lvv">${fmt(a[2])}${a[3] ? ' / ' + fmt(a[3]) : ''} ${'★'.repeat(a[1])}${'☆'.repeat(Math.max(0, 3 - a[1]))}</span></div>`).join('')}</div></details>`;
  }).join('');
}
const BMK = 'coc_bm';
const bmGet = () => { try { return JSON.parse(localStorage.getItem(BMK) || '[]'); } catch (e) { return []; } };
const bmSet = a => {
  try { localStorage.setItem(BMK, JSON.stringify(a)); } catch (e) { /* mode privat: abaikan */ }
  try { if (window.__syncMarked) window.__syncMarked(); } catch (e) { /* abaikan */ }   // aplikasi Android: perbarui daftar pemain ditandai untuk notifikasi
};
const bmLabel = t => bmGet().includes(normTagKey(t)) ? '★ Ditandai' : '☆ Tandai';

// ---------- Tag lokal: disimpan di HP (localStorage), tanpa edit watchlist.json ----------
// Hanya penanda (nama + catatan). Profil lengkap baru ada setelah tag masuk watchlist.json,
// karena key API Clash of Clans terikat IP server dan tidak bisa dipanggil dari aplikasi.
const LTK = 'coc_ltags';
const ltGet = () => { try { const o = JSON.parse(localStorage.getItem(LTK) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
const ltSet = o => { try { localStorage.setItem(LTK, JSON.stringify(o)); return true; } catch (e) { return false; } };
function ltAdd(tag, name, note) {
  const k = normTagKey(tag); if (!k || !TAG_RE.test(k)) return false;
  const o = ltGet(); o[k] = { name: String(name || '').trim().slice(0, 40), note: String(note || '').trim().slice(0, 120), saved: Date.now() };
  const l = bmGet(); if (!l.includes(k)) { l.unshift(k); bmSet(l); }   // ikut tampil di Penanda pemain
  return ltSet(o);
}
function ltDel(tag) { const k = normTagKey(tag), o = ltGet(); delete o[k]; ltSet(o); bmSet(bmGet().filter(x => x !== k)); }
const lRow = (k, l) => `<button type="button" class="prow" data-player="#${esc(k)}"><span class="lg"></span><span class="pn"><b>${esc(l.name || '#' + k)}</b><span class="small">#${esc(k)} · tersimpan di HP${l.note ? ' · ' + esc(l.note) : ''}</span></span><span class="pv"><span class="badge">Lokal</span></span></button>`;

function profileHtml(tag) {
  const fm = findMember(tag), full = PIDX[normTagKey(tag)] || null, opp = findOpp(tag);
  const base = fm ? fm.m : {};
  const p = Object.assign({}, full || {}, fm ? { trophies: base.trophies, donations: base.donations, received: base.received, capital: base.capitalContributions, role: base.role, th: base.th, league: base.league || (full || {}).league, leagueIcon: base.leagueIcon || (full || {}).leagueIcon, name: base.name } : {});
  if (!full && !fm && opp) Object.assign(p, { name: opp.m.name, th: opp.m.th, trophies: opp.m.trophies, warStars: opp.m.warStars, tag: opp.m.tag });
  if (!p.name) {
    const k = normTagKey(tag), L = ltGet()[k], url = esc(profileUrl(tag)), fw = 'width:100%;box-sizing:border-box';
    if (L) return `<h2 class="label">${esc(L.name || '#' + k)}</h2><div class="small">#${esc(k)} · tersimpan di HP · belum ada data profil</div>
      <input id="ltEditName" value="${esc(L.name)}" placeholder="Nama" maxlength="40" aria-label="Nama" style="${fw};margin-top:12px">
      <input id="ltEditNote" value="${esc(L.note)}" placeholder="Catatan" maxlength="120" aria-label="Catatan" style="${fw};margin-top:8px">
      <div class="ph-act" style="margin-top:12px"><button type="button" data-lt-upd="#${esc(k)}">Simpan perubahan</button> <a class="plink" href="${url}" target="_blank" rel="noopener">Buka di game</a> <button type="button" data-copy="#${esc(k)}">Salin tag</button> <button type="button" data-lt-del="#${esc(k)}">Hapus dari HP</button></div>
      <p class="small">Profil lengkap baru tampil setelah tag masuk ke <code>watchlist.json</code>. Di halaman Pemain ada tombol untuk menyalin semua tag lokal.</p>`;
    return `<h2 class="label">Pemain tidak ditemukan</h2><p class="small">Tag ${esc(tag)} belum ada di data dashboard. Simpan di HP sebagai penanda, atau tambahkan ke <code>watchlist.json</code> agar profilnya ikut diambil.</p><div class="ph-act"><a class="plink" href="${url}" target="_blank" rel="noopener">Buka di game</a> <button type="button" data-lt-save="#${esc(k)}">Simpan di HP</button></div>`;
  }
  const clanName = (full && full.clan && full.clan.name) || (fm && fm.clan.name) || (opp && opp.name) || '';
  const fresh = full && full.fetched ? ` · profil diperbarui ${ago(parseT(full.fetched))}` : '';
  const heroes = (p.heroes && p.heroes.length ? p.heroes : (opp && opp.m.heroes) || []);
  const eqSet = new Set(heroes.flatMap(h => (h.eq || []).map(e => e[0])));
  const heroHtml = heroes.length && full ? tileSec('Pahlawan', heroes.map(h => [h.n, h.l, h.m]), p.th, 'hero') : heroes.length ? `<h3 class="sub-h">Hero</h3><div class="lvgrid">${heroes.map(h => `<div>${lvBar([h.n, h.l, h.m])}${(h.eq || []).length ? `<div class="eqs">${h.eq.map(e => `<span class="chip">${esc(e[0])} ${e[1]}/${e[2]}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>` : '';
  const sup = (p.super && p.super.length) ? p.super : (opp && opp.m.superTroops) || [];
  const ach = (p.ach || []).map(a => `<div class="lv"><span class="lvn">${esc(a.n)}</span><span class="lvb"><i style="width:${a.t ? Math.min(100, Math.round(a.v / a.t * 100)) : 0}%"></i></span><span class="lvv">${fmt(a.v)}${a.t ? ' / ' + fmt(a.t) : ''} ${'★'.repeat(a.s || 0)}</span></div>`).join('');
  return `<div class="ph">${p.leagueIcon ? `<img class="lg" alt="" src="${esc(p.leagueIcon)}">` : ''}<div><h2 class="label" style="margin:0">${esc(p.name)}</h2>
      <div class="small">${esc(p.tag || tag)} · TH${esc(p.th || '?')}${p.thWeapon ? ' (senjata ' + p.thWeapon + ')' : ''}${p.xp ? ' · XP ' + p.xp : ''}${p.role ? ' · ' + esc(ROLE[p.role] || p.role) : ''}${clanName ? ' · ' + esc(clanName) : ''}${p.warPref ? ' · war: ' + (p.warPref === 'in' ? 'ikut' : 'tidak ikut') : ''}</div>
      <div class="small">${esc(p.league || '')}${esc(fresh)}</div></div></div>
    <div class="ph-act"><a class="plink" href="${esc(profileUrl(p.tag || tag))}" target="_blank" rel="noopener">Buka di game</a> <button type="button" data-copy="${esc(p.tag || tag)}">Salin tag</button> <button type="button" data-bm="${esc(p.tag || tag)}">${bmLabel(p.tag || tag)}</button></div>
    <div class="grid">${[
      pstat('Trofi', fmt(p.trophies), p.best ? 'Terbaik ' + fmt(p.best) : ''), pstat('Bintang war', fmt(p.warStars)),
      pstat('Menang serang / bertahan', p.atkWins != null ? `${fmt(p.atkWins)} / ${fmt(p.defWins)}` : '-', 'musim ini'),
      pstat('Donasi / terima', `${fmt(p.donations)} / ${fmt(p.received)}`, 'musim ini'),
      pstat('Capital', fmt(p.capital)), pstat('Builder Base', p.bbTrophies ? fmt(p.bbTrophies) : '-', p.bbHall ? 'BH' + p.bbHall + (p.bbBest ? ' · terbaik ' + fmt(p.bbBest) : '') : ''),
    ].join('')}</div>
    ${heroHtml}
    ${sup.length ? `<div class="idle"><b>Super troop aktif:</b> ${sup.map(s => `<span class="chip">${esc(s)}</span>`).join(' ')}</div>` : ''}
    ${full ? tileSec('Peralatan Pahlawan', full.eqAll && full.eqAll.length ? full.eqAll : heroes.flatMap(h => h.eq || []), p.th, 'equip', eqSet) + tileSec('Hewan', full.pets, p.th, 'pet') + tileSec('Pasukan', full.troops, p.th, 'troop') + tileSec('Mantra', full.spells, p.th, 'spell') + tileSec('Mesin Pengepungan', full.siege, p.th, 'siege') + lvFold('Hero Builder Base', (full.bbHeroes || []).map(h => [h.n, h.l, h.m])) : '<div class="small" style="margin-top:12px">Detail pasukan dan spell belum tersedia. Profil lengkap diambil bertahap oleh coc_clan.py.</div>'}
    ${window.__ltmProfile ? window.__ltmProfile(p, full) : ''}
    ${full && (full.achAll || []).length ? achHtml(full) : ach ? `<details class="pfold"><summary>Achievement <span class="small">(${(p.ach || []).length})</span></summary><div class="lvgrid">${ach}</div></details>` : ''}
    ${(p.labels || []).length ? `<div class="idle"><b>Label:</b> ${p.labels.map(l => `<span class="chip">${esc(l)}</span>`).join(' ')}</div>` : ''}
    ${legendHtml(tag, p)}
    <div class="small" style="margin-top:14px">Ikon: <a href="https://assets.clashk.ing" target="_blank" rel="noopener">ClashKing Assets</a></div>
    <h3 class="sub-h">Performa war</h3>${warHtml(tag)}`;
}
async function openPlayer(tag) {
  const dlg = $('playerDlg'); if (!dlg) return;
  $('playerBody').innerHTML = '<div class="small">Memuat profil…</div>';
  if (dlg.showModal && !dlg.open) dlg.showModal();
  // Beberapa WebView Android menghitung 100dvh = 0 sehingga tinggi dialog runtuh (hanya tombol Tutup terlihat).
  // Tinggi maksimum dihitung dari innerHeight, tidak bergantung pada satuan CSS.
  try { dlg.style.maxHeight = Math.max(240, (window.innerHeight || document.documentElement.clientHeight || screen.height || 600) - 24) + 'px'; } catch (e) { /* abaikan */ }
  await Promise.all([loadPlayers(), loadCaps()]);
  try { $('playerBody').innerHTML = profileHtml(tag); } catch (e) { console.error(e); $('playerBody').innerHTML = '<div class="small">Gagal menampilkan profil.</div>'; }
}

// ---------- Pencarian ----------
function searchPool(scope, key) {
  const seen = new Map(), add = (tag, o) => { const k = normTagKey(tag); if (k && !seen.has(k)) seen.set(k, o); };
  const clans = scope === 'clan' ? [[key, getClanObj(key).clan]] : Object.entries(DATA.clans || {});
  clans.forEach(([ck, c]) => ((c || {}).memberList || []).forEach(m => add(m.tag, { tag: m.tag, name: m.name, th: m.th, trophies: m.trophies, icon: m.leagueIcon, clan: (c || {}).name })));
  if (scope === 'all') {
    Object.values(PLAYERS).forEach(p => add(p.tag, { tag: p.tag, name: p.name, th: p.th, trophies: p.trophies, icon: p.leagueIcon, clan: p.clan && p.clan.name }));
    Object.keys(DATA.clans || {}).forEach(ck => { const w = curWar(ck); if (w && live(w)) ((w.them || {}).members || []).forEach(m => add(m.tag, { tag: m.tag, name: m.name, th: m.th, trophies: m.trophies, clan: (w.them || {}).name + ' (lawan)' })); });
  }
  if (scope === 'all') {   // pemain yang ditambahkan otomatis lewat impor data desa / tersimpan di HP
    const LT = ltGet(); new Set([...bmGet(), ...Object.keys(LT)]).forEach(k => { if (k && !seen.has(k)) seen.set(k, { tag: '#' + k, name: (LT[k] && LT[k].name) || '#' + k, local: LT[k] || {} }); });
  }
  return [...seen.values()];
}
const pRow = p => p.local ? lRow(normTagKey(p.tag), p.local) : `<button type="button" class="prow" data-player="${esc(p.tag)}">${p.icon ? `<img class="lg" alt="" loading="lazy" src="${esc(p.icon)}">` : '<span class="lg"></span>'}<span class="pn"><b>${esc(p.name)}</b><span class="small">${esc(p.tag)}${p.clan ? ' · ' + esc(p.clan) : ''}</span></span><span class="pv">TH${esc(p.th || '?')}<br><span class="small">${fmt(p.trophies)} 🏆</span></span></button>`;
function renderPlayerResults() {
  const box = $('playerResults'); if (!box) return;
  const q = ($('playerSearch').value || '').trim(), scope = 'all', key = resolveClanKey($('clanSelect').value);   // pencarian selalu mencakup semua pemain
  const pool = searchPool(scope, key), qn = q.toLowerCase().replace(/^#/, '');
  // Tab Pemain hanya pencarian: tidak ada daftar saat kolom cari kosong, hasil baru muncul saat mengetik.
  const rows = q ? pool.filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()) || normTagKey(p.tag).toLowerCase().includes(qn)).slice(0, 40) : [];
  let html = q
    ? (rows.length ? `<div class="plist">${rows.map(pRow).join('')}</div>` : '<div class="small">Tidak ada pemain yang cocok.</div>')
    : '';
  if (q && TAG_RE.test(q) && !rows.some(p => normTagKey(p.tag) === normTagKey(q))) {
    const k = normTagKey(q), L = ltGet()[k], fw = 'width:100%;box-sizing:border-box';
    html += L
      ? `<div class="setcard" style="margin-top:10px"><div class="setrow"><div class="setl"><b>${esc(L.name || '#' + k)}</b><div class="small">#${esc(k)} sudah tersimpan di HP.</div></div><div class="setr"><button type="button" data-player="#${esc(k)}">Buka</button></div></div></div>`
      : `<div class="setcard" style="margin-top:10px"><div style="padding:12px 0"><b>#${esc(k)}</b> <span class="small">belum ada di data</span>
          <div class="small" style="margin:4px 0 10px">Simpan di HP sebagai penanda dengan nama dan catatan. Profil lengkap baru tampil setelah tag masuk ke <code>watchlist.json</code>.</div>
          <input id="ltName" placeholder="Nama (opsional)" maxlength="40" aria-label="Nama" style="${fw}">
          <input id="ltNote" placeholder="Catatan (opsional)" maxlength="120" aria-label="Catatan" style="${fw};margin-top:8px">
          <div class="setbtns"><button type="button" data-lt-save="#${esc(k)}">Simpan di HP</button><a class="plink" href="${esc(profileUrl('#' + k))}" target="_blank" rel="noopener">Buka di game</a></div></div></div>`;
  }
  box.innerHTML = html;
}

// ---------- Legend League + lawan ----------
function legendReset() {
  const n = new Date(), t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 5);
  return (t > n.getTime() ? t : t + 864e5) - n.getTime();
}
function renderLegend(key) {
  const b = $('legendBox'); if (!b) return;
  const L = (DATA.legend || {})[key] || {};
  const rows = Object.entries(L).map(([tag, e]) => ({ tag, e })).sort((a, b) => ((b.e.cur || {}).now || 0) - ((a.e.cur || {}).now || 0));
  if (!rows.length) { b.innerHTML = '<div class="small">Belum ada anggota di Legend League, atau data Legend belum terkumpul. Pelacak berjalan otomatis lewat coc_clan.py.</div>'; return; }
  b.innerHTML = `<div class="small" style="margin-bottom:8px">Hari Legend berganti dalam ${dur(legendReset())} (12.00 WIB). Angka serang dan bertahan adalah perkiraan dari selisih trofi.</div>
    <div class="table-wrap"><table style="min-width:520px"><thead><tr><th>#</th><th>Nama</th><th>Mulai</th><th>Sekarang</th><th>Selisih</th><th>Serang~</th><th>Bertahan~</th></tr></thead><tbody>${rows.map(({ tag, e }, i) => {
      const c = e.cur || {}, net = (c.now || 0) - (c.start || 0);
      return `<tr><td>${i + 1}</td><td><a class="plink" href="#" data-player="${esc(tag)}">${esc(e.name)}</a></td><td>${fmt(c.start)}</td><td>${fmt(c.now)}</td><td style="color:var(--${net > 0 ? 'green' : net < 0 ? 'red' : 'mut'})">${sgn(net)}</td><td>${c.atk || 0}</td><td>${c.def || 0}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}
function renderOppPlayers(key) {
  const b = $('oppPlayersBox'); if (!b) return;
  const w = curWar(key);
  if (!w || !live(w)) { b.innerHTML = '<div class="small">Belum ada war aktif.</div>'; return; }
  const M = ((w.them || {}).members || []).slice().sort((a, c) => (a.pos || 99) - (c.pos || 99));
  b.innerHTML = `<div class="small" style="margin-bottom:8px">${esc(warTitle(w))}${esc((w.them || {}).name || '')}${(w.themInfo || {}).warWins != null ? ` · ${w.themInfo.warWins} menang / ${w.themInfo.warLosses} kalah` : ''}${(w.themInfo || {}).warLeague ? ' · ' + esc(w.themInfo.warLeague) : ''}</div>
    <div class="plist mini">${M.map(m => `<button type="button" class="prow mini" data-player="${esc(m.tag)}" title="${esc(heroLine(m) || 'hero belum diambil')}"><span class="lg">${m.pos || ''}</span><span class="pn"><b>${esc(m.name)}</b></span><span class="th">TH${esc(m.th || '?')}</span><span class="st">${fmt(m.warStars)} ★</span></button>`).join('')}</div>`;
}
function renderPlayers(key) {
  const pane = document.querySelector('[data-pane=players]');
  if (!pane || pane.hidden) return;
  renderPlayerResults();
  loadPlayers().then(() => { if (!pane.hidden) renderPlayerResults(); });
}
window.__renderPlayers = () => renderPlayers(resolveClanKey($('clanSelect').value));
document.addEventListener('input', e => { if (e.target.id === 'playerSearch') renderPlayerResults(); });
document.addEventListener('click', async e => {
  const ls = e.target.closest('[data-lt-save],[data-lt-upd],[data-lt-del]');
  if (ls) {
    const inDlg = !!e.target.closest('#playerDlg'), val = id => { const el = $(id); return el ? el.value : ''; };
    if (ls.dataset.ltSave) { const t = ls.dataset.ltSave; ltAdd(t, val('ltName'), val('ltNote')); if (inDlg) openPlayer(t); renderPlayerResults(); }
    else if (ls.dataset.ltUpd) { const t = ls.dataset.ltUpd; ltAdd(t, val('ltEditName'), val('ltEditNote')); openPlayer(t); renderPlayerResults(); }
    else if (ls.dataset.ltDel) { ltDel(ls.dataset.ltDel); const d = $('playerDlg'); if (d && d.open) d.close(); renderPlayerResults(); }
    return;
  }
  const c = e.target.closest('[data-copy]');
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = 'Tersalin ✓'; } catch (x) { c.textContent = 'Gagal menyalin'; } return; }
  const b = e.target.closest('[data-bm]');
  if (b) { const k = normTagKey(b.dataset.bm), l = bmGet(), i = l.indexOf(k); if (i < 0) l.unshift(k); else l.splice(i, 1); bmSet(l); b.textContent = bmLabel(k); renderPlayerResults(); return; }
  const a = e.target.closest('[data-player]');
  if (a) { e.preventDefault(); openPlayer(a.dataset.player); return; }
  if (e.target.id === 'playerDlg') e.target.close();
});

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
/* Sidebar premium: submenu War, avatar klan, menu ⋮ */
(function () {
  const grp = $('navWar'), sb = document.querySelector('.side-bottom'), mb = $('moreBtn'), t = $('title'), av = $('pfAv');
  if (grp) {
    const link = grp.querySelector('a'), tog = grp.querySelector('.sub-toggle'), inner = grp.querySelector('.subnav-in'), subs = [...grp.querySelectorAll('[data-sub]')];
    const cardOf = b => { const el = $(b.dataset.sub); return el && (el.closest('details') || el); };
    const setOpen = o => { grp.toggleAttribute('data-open', o); tog.setAttribute('aria-expanded', o); inner.inert = !o; };
    const sync = () => subs.forEach(b => { const c = cardOf(b); b.hidden = !c || c.hidden; b.classList.toggle('on', !!c && c.open === true); });
    const onView = () => setOpen(link.getAttribute('aria-current') === 'page');
    new MutationObserver(onView).observe(link, { attributes: true, attributeFilter: ['aria-current'] });
    const cwl = $('cwlCard'); if (cwl) new MutationObserver(sync).observe(cwl, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('toggle', sync, true);
    grp.addEventListener('click', e => {
      if (e.target.closest('.sub-toggle')) { setOpen(!grp.hasAttribute('data-open')); return; }
      const b = e.target.closest('[data-sub]'), c = b && cardOf(b); if (!c) return;
      if (link.getAttribute('aria-current') !== 'page') setView('war', true);
      if ('open' in c) c.open = true;
      sync();
      requestAnimationFrame(() => c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    });
    onView(); sync();
  }
  if (t && av) {
    const ini = () => { av.textContent = (t.textContent.trim().replace(/^[^\p{L}\p{N}]+/u, '')[0] || 'C').toUpperCase(); };
    new MutationObserver(ini).observe(t, { childList: true, characterData: true, subtree: true }); ini();
  }
  if (sb && mb) {
    const setMenu = o => { sb.toggleAttribute('data-menu', o); mb.setAttribute('aria-expanded', o); };
    mb.addEventListener('click', () => setMenu(!sb.hasAttribute('data-menu')));
    document.addEventListener('click', e => { if (e.target.closest('#moreBtn')) return; if (!sb.contains(e.target) || e.target.closest('.side-foot button')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }
})();

// Khusus aplikasi Android: ikon pasang diganti ikon Pengaturan (dialog berisi pengaturan notifikasi)
if (window.AndroidBridge) {
  const ib = $('installBtn'), sb = $('settingsBtn');
  if (ib) ib.hidden = true;
  if (sb) sb.hidden = false;
  document.addEventListener('click', e => { if (e.target.closest('#settingsBtn') && window.__openSettings) window.__openSettings(); });
}
