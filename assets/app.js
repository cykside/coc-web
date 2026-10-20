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
const THEMES = ['mono', 'paper', 'dark', 'light'];
const THEME_LABEL = { mono: 'Tema: hitam putih (gelap)', paper: 'Tema: hitam putih (terang)', dark: 'Tema: ungu gelap', light: 'Tema: ungu terang' };
const THEME_ICON = { mono: '●', paper: '○', dark: '☾', light: '☀' };
function applyTheme(t, rerender) {
  if (!THEMES.includes(t)) t = 'mono';
  document.documentElement.dataset.theme = t;
  const b = $('themeBtn'); if (b) { b.textContent = THEME_ICON[t]; b.title = b.ariaLabel = THEME_LABEL[t]; b.dataset.t = t; }
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

const VIEWS = ['overview', 'war', 'members', 'capital', 'stats'];
function setView(v, keepScroll) {
  if (!VIEWS.includes(v)) v = 'overview';
  document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== v; });
  document.querySelectorAll('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.view === v ? 'page' : 'false'));
  try { history.replaceState(null, '', '#' + v); } catch (e) {}
  if (!keepScroll) window.scrollTo(0, 0);
  window.dispatchEvent(new Event('resize'));
}
document.addEventListener('click', e => {
  const a = e.target.closest('.nav a, [data-go]'); if (!a) return;
  e.preventDefault(); setView(a.dataset.view || a.dataset.go);
});

function scoreHtml(war) {
  const us = war.us || {}, th = war.them || {}, lead = Number(us.stars || 0) - Number(th.stars || 0);
  const team = (x, cls) => `<div class="team ${cls}"><div class="nm">${esc(safe(x.name))}</div><div class="stars">${esc(safe(x.stars, 0))}<small>★</small></div><div class="small">${esc(safe(x.pct, 0))}% · ${esc(safe(x.attacks, 0))} serangan</div></div>`;
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
  const key = resolveClanKey(tag), war = (DATA.wars || {})[key], b = $('heroWar'), clan = getClanObj(key).clan || {};
  if (!war || war.state === 'notInWar') {
    b.innerHTML = `<div class="hero-row"><span class="pill">Tidak ada war</span></div><div class="time" style="margin-top:12px">${esc(clan.name || 'Klan ini')} sedang tidak berperang, atau war log private. Cek tab Capital untuk raid weekend.</div>`;
    return;
  }
  const per = war.perMember || 2, idle = ((war.us || {}).members || []).filter(m => (m.attacks || []).length < per);
  const s = parseT(war.start), e = parseT(war.end), n = Date.now();
  const label = { preparation: 'Masa persiapan', inWar: 'War berlangsung', warEnded: 'War selesai' }[war.state] || war.state;
  const t = war.state === 'preparation' && s ? `Mulai dalam ${dur(s - n)}`
    : war.state === 'inWar' && e ? (e > n ? `Sisa ${dur(e - n)} · selesai ${fmtTime(war.end)}` : 'Waktu war habis, menunggu hasil akhir')
    : `Selesai ${fmtTime(war.end)}`;
  b.innerHTML = `<div class="hero-row"><span class="pill ${war.state === 'inWar' ? 'live' : ''}">${esc(label)}</span><button type="button" class="btn-primary" data-go="war">Detail war</button></div>
    ${scoreHtml(war)}${warProgress(war)}<div class="time">${esc(t)}</div>`;
}

function renderAttention(tag) {
  const key = resolveClanKey(tag), clan = getClanObj(key).clan || {}, war = (DATA.wars || {})[key], raid = (DATA.raids || {})[key], rows = [];
  if (war && war.state === 'inWar') {
    const per = war.perMember || 2, e = parseT(war.end), idle = ((war.us || {}).members || []).filter(m => (m.attacks || []).length < per);
    if (idle.length) rows.push({ c: 'bad', t: `${idle.length} anggota belum menyerang tuntas`, d: idle.slice(0, 6).map(m => m.name).join(', ') + (idle.length > 6 ? ` dan ${idle.length - 6} lainnya` : '') + (e ? ` · sisa ${dur(e - Date.now())}` : ''), go: 'war' });
  }
  if (raid && raid.state === 'ongoing') {
    const left = (raid.members || []).filter(m => (m.limit || 0) > (m.attacks || 0));
    if (left.length) rows.push({ c: '', t: `${left.length} anggota belum selesai Capital Raid`, d: 'Raid berakhir ' + fmtTime(raid.end), go: 'capital' });
  }
  const dead = (clan.memberList || []).filter(m => (m.donations || 0) < R().minDonations && !(m.received || 0));
  if (dead.length) rows.push({ c: '', t: `${dead.length} anggota tidak aktif musim ini`, d: 'Donasi dan terima masih 0', go: 'members' });
  $('attnBox').innerHTML = rows.length
    ? rows.map(r => `<div class="att-row"><span class="att-dot ${r.c}"></span><div><b>${esc(r.t)}</b><div class="small">${esc(r.d)}</div></div><button type="button" data-go="${r.go}">Lihat</button></div>`).join('')
    : '<div class="att-row"><span class="att-dot ok"></span><div><b>Semua aman</b><div class="small">Tidak ada yang perlu ditindak sekarang.</div></div></div>';
}

function renderOverviewCards(clan) {
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
      <div class="value">${esc(safe(item.value))}</div>
      <div class="sub">${item.label === "Anggota" ? "Total member" : item.label === "Poin" ? "Clan points" : item.label === "Rekor war" ? "W/L/T" : "Capital hall level"}</div>
    `;
    grid.appendChild(card);
  });
}

function renderDonationChart(clanTag) {
  const key = resolveClanKey(clanTag);
  const weekly = (DATA.meta && DATA.meta[key] && DATA.meta[key].weekly_top) || [];
  const labels = weekly.map(x => x[0]);
  const vals = weekly.map(x => x[1]);

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
  note.style.display = 'none';
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
        label: 'Donasi 7 hari',
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
  const war = (DATA.wars || {})[key];
  if (!war || war.state === 'notInWar') {
    box.innerHTML = '<div class="small">Tidak ada war aktif atau war log private.</div>';
    return;
  }

  const us = war.us || {};
  const them = war.them || {};
  const per = war.perMember || 2;
  const stateLabel = { preparation: 'Masa persiapan', inWar: 'War sedang berlangsung', warEnded: 'War selesai' }[war.state] || war.state;
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
    tr.innerHTML = `<td class="c-rank">${idx+1}</td>
      <td class="c-name">${m.leagueIcon ? `<img class="lg" loading="lazy" alt="" src="${esc(m.leagueIcon)}">` : ''}<a class="plink" href="${esc(profileUrl(m.tag))}" target="_blank" rel="noopener">${esc(name)}</a>${badgeOf(m)}${(donations < R().minDonations && received === 0) ? ' <span class="tag-warn" title="Donasi dan terima 0 musim ini">tidak aktif?</span>' : ''}</td>
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
const MEDAL = ['🥇', '🥈', '🥉'];
function buildBadges(clan, tag) {
  const B = {}, ml = clan.memberList || [];
  ml.filter(m => (m.donations || 0) > 0).sort((a, b) => b.donations - a.donations).slice(0, 3)
    .forEach((m, i) => { B[m.tag] = { medal: MEDAL[i] }; });
  const meta = (DATA.meta || {})[resolveClanKey(tag)] || {}, cut = Date.now() - 7 * 864e5, joined = new Set();
  (meta.changes || []).forEach(c => { const x = /^JOIN: .*\(([A-Z0-9]+)\)$/.exec(c.text || ''); if (x && parseT(c.ts) >= cut) joined.add(x[1]); });
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
    ['Win streak', clan.warWinStreak, 'Menang beruntun'],
    ['War league', clan.warLeague, 'Liga CWL'],
    ['Capital league', clan.capitalLeague, 'Liga Capital'],
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
  const info = [['Level', o.level], ['Poin', o.points != null ? fmt(o.points) : null], ['Rekor', o.warWins != null ? `${o.warWins}W/${o.warLosses}L/${o.warTies}T` : null], ['Win streak', o.warWinStreak], ['Frekuensi war', o.warFrequency], ['Liga war', o.warLeague]].filter(x => x[1] != null && x[1] !== '');
  const byPos = {}; th.forEach(m => byPos[m.pos] = m);
  let win = 0, lose = 0;
  const rows = us.map(m => {
    const t = byPos[m.pos]; if (!t) return '';
    const d = Number(m.th) - Number(t.th); d > 0 ? win++ : d < 0 ? lose++ : 0;
    return `<tr><td>${esc(m.pos)}</td><td>TH${esc(m.th)}</td><td>TH${esc(t.th)}</td><td style="color:var(--${d > 0 ? 'green' : d < 0 ? 'red' : 'mut'})">${d > 0 ? 'unggul ' + d : d < 0 ? 'kalah ' + -d : 'sama'}</td></tr>`;
  }).join('');
  const avg = a => a.length ? (a.reduce((x, m) => x + Number(m.th), 0) / a.length).toFixed(1) : '-';
  b.innerHTML = `${info.length ? `<div>${info.map(([l, v]) => `<span class="badge">${esc(l)}: ${esc(v)}</span>`).join(' ')}</div>` : '<div>Data klan lawan belum tersedia (diambil saat build berikutnya).</div>'}
    <div style="margin:8px 0">Rata² TH: kita ${avg(us)}, lawan ${avg(th)} · unggul di ${win} posisi, kalah di ${lose}.</div>
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
    return `<tr><td><a class="plink" href="${esc(profileUrl(m.tag))}" target="_blank" rel="noopener">${esc(m.name)}</a>${m.tag === mvp ? ' <span class="badge">MVP war terakhir</span>' : ''}${rec > 0 && don === 0 ? ' <span class="tag-warn">hanya menerima</span>' : ''}</td>
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
    <button type="button" style="margin-top:10px" onclick="copyWar(this)">Salin ringkasan war</button>`;
}
async function copyWar(btn) {
  const w = window.__war || {}, us = w.us || {}, them = w.them || {}, per = w.perMember || 2;
  const idle = (us.members || []).filter(m => (m.attacks || []).length < per).map(m => m.name);
  const txt = `War ${us.name} vs ${them.name}: ${us.stars}★ (${us.pct}%) – ${them.stars}★ (${them.pct}%)${cdown(w)}` + (idle.length ? `\nBelum menyerang: ${idle.join(', ')}` : '');
  try { await navigator.clipboard.writeText(txt); btn.textContent = 'Tersalin ✓'; } catch (e) { btn.textContent = 'Gagal menyalin'; }
  setTimeout(() => { btn.textContent = 'Salin ringkasan war'; }, 2000);
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
      () => renderOverviewCards(clan || {}),
      () => renderExtra(clan || {}),
      () => renderDonationChart(clanKey),
      () => renderRaid(clanKey),
      () => renderWarLog(clanKey),
      () => renderStats(clanKey),
      () => renderTrends(clanKey),
      () => renderWar(clanKey),
      () => renderOpp((DATA.wars || {})[clanKey]),
      () => renderPlan((DATA.wars || {})[clanKey]),
      () => renderActivity(clanKey),
      () => renderJoin(clanKey),
      () => renderDiffs(clanKey),
      () => renderMembers(clanKey, $('memberSearch').value),
      () => renderHistory(clanKey),
    ];
    steps.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  select.addEventListener('change', ()=>{
    renderAll();
  });

  $('memberSearch').addEventListener('input', ()=>{
    renderMembers(select.value, $('memberSearch').value);
  });

  $('refreshBtn').addEventListener('click', autoLoad);
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
  setView(location.hash.slice(1), true);
  window.__renderAll = renderAll;
  renderAll();
  setInterval(autoLoad, 60000);
  setInterval(showFresh, 30000);
  // Resize chart on window resize to keep layout
  window.addEventListener('resize', ()=> { if (donationChartInstance) donationChartInstance.resize(); });
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
  