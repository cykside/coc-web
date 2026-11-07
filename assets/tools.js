/* tools.js - tab "Alat" (Ringkasan, Planner, Hero, Hewan, Bandingkan, Peringkat, Kembali, Jadwal): fitur ala ClashVault yang bisa jalan di halaman statis.
 * Memakai data yang sudah dikumpulkan coc_clan.py (players.json + data klan), tanpa API tambahan.
 * Bergantung pada global dari app.js: $, esc, fmt, PIDX, loadPlayers, loadCaps, capOf, ORDER, findMember,
 * normTagKey, resolveClanKey, getClanObj, pstat, lvBar, ROLE, DATA. */
(function () {
  'use strict';

  const KINDS = ['hero', 'equip', 'pet', 'troop', 'spell', 'siege'];
  const KIND_LABEL = { hero: 'Pahlawan', equip: 'Peralatan', pet: 'Hewan', troop: 'Pasukan', spell: 'Mantra', siege: 'Mesin Pengepungan' };
  // Jalur upgrade seperti di game: pahlawan lewat Tukang, pasukan/mantra/siege lewat Laboratorium, dst.
  const LANES = [
    { id: 'hero', label: 'Pahlawan (Tukang)', short: 'Pahlawan', kinds: ['hero'] },
    { id: 'lab', label: 'Laboratorium', short: 'Lab', kinds: ['troop', 'spell', 'siege'] },
    { id: 'pet', label: 'Pet House', short: 'Hewan', kinds: ['pet'] },
    { id: 'equip', label: 'Blacksmith', short: 'Equip', kinds: ['equip'] },
  ];
  // Urutan prioritas saran upgrade (heuristik sederhana, lihat catatan di UI).
  const PRIORITY = ['hero', 'pet', 'equip', 'troop', 'spell', 'siege'];

  const pc = v => v == null ? '-' : (Math.round(v * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '%';
  const tone = v => v == null ? '' : v >= 99.95 ? 't-ok' : v >= 70 ? '' : v >= 40 ? 't-warn' : 't-bad';
  const num = v => Number(v) || 0;

  // ---------- Perhitungan murni (bisa dites di Node) ----------
  function rowsOf(p, kind) {
    if (!p) return [];
    if (kind === 'hero') return (p.heroes || []).map(h => [h.n, h.l, h.m]);
    if (kind === 'equip') return (p.eqAll && p.eqAll.length) ? p.eqAll : (p.heroes || []).flatMap(h => h.eq || []);
    if (kind === 'pet') return p.pets || [];
    if (kind === 'troop') return p.troops || [];
    if (kind === 'spell') return p.spells || [];
    if (kind === 'siege') return p.siege || [];
    return [];
  }
  // Batas level: tabel TH (HERO_CAP / max_levels.json) bila ada, jika tidak batas dari API (exact=false, ditandai ~).
  function capFor(name, th, kind, apiMax) {
    const c = capOf(name, th, kind === 'hero');
    return c ? { cap: c, exact: true } : { cap: num(apiMax), exact: false };
  }
  function analyze(p) {
    const th = num(p && p.th), kinds = {}, items = [];
    KINDS.forEach(kind => {
      let have = 0, cap = 0, approx = false, n = 0;
      rowsOf(p, kind).forEach(r => {
        const lv = num(r[1]), c = capFor(r[0], th, kind, r[2]);
        if (!c.cap) return;
        n++; have += Math.min(lv, c.cap); cap += c.cap; if (!c.exact) approx = true;
        items.push({ kind, n: r[0], l: lv, cap: c.cap, rem: Math.max(0, c.cap - lv), exact: c.exact });
      });
      kinds[kind] = { have, cap, rem: cap - have, pct: cap ? have / cap * 100 : null, n, approx };
    });
    const lanes = {}, total = { have: 0, cap: 0, approx: false };
    LANES.forEach(L => {
      const o = { have: 0, cap: 0, approx: false };
      L.kinds.forEach(k => { o.have += kinds[k].have; o.cap += kinds[k].cap; o.approx = o.approx || kinds[k].approx; });
      o.rem = o.cap - o.have; o.pct = o.cap ? o.have / o.cap * 100 : null; lanes[L.id] = o;
      total.have += o.have; total.cap += o.cap; total.approx = total.approx || o.approx;
    });
    total.rem = total.cap - total.have; total.pct = total.cap ? total.have / total.cap * 100 : null;
    let weakest = null;
    LANES.forEach(L => { const x = lanes[L.id]; if (x.cap && x.rem > 0 && (weakest == null || x.pct < lanes[weakest].pct)) weakest = L.id; });
    return { th, kinds, lanes, total, items, weakest };
  }
  // Urutan "mulai dari sini": kategori menurut PRIORITY, lalu jarak ke batas (rasio) terbesar. Tanpa waktu/biaya.
  function plan(a, limit) {
    return a.items.filter(i => i.rem > 0).sort((x, y) =>
      (PRIORITY.indexOf(x.kind) - PRIORITY.indexOf(y.kind)) || (y.rem / y.cap - x.rem / x.cap) || (y.rem - x.rem) || String(x.n).localeCompare(String(y.n))
    ).slice(0, limit || 12);
  }
  function heroTotal(p) { return (p.heroes || []).reduce((s, h) => s + num(h.l), 0); }

  // Hero Catch-Up: level tiap hero vs batas Town Hall pemain. Prioritas = sisa level terbanyak (tanpa waktu/biaya).
  function heroCatchup(p) {
    const th = num(p && p.th), rows = [];
    ((p && p.heroes) || []).forEach(h => {
      const c = capFor(h.n, th, 'hero', h.m); if (!c.cap) return;
      const l = num(h.l);
      rows.push({ n: h.n, l, cap: c.cap, rem: Math.max(0, c.cap - l), exact: c.exact, pct: Math.min(100, l / c.cap * 100) });
    });
    const ord = n => { const i = ((typeof ORDER !== 'undefined' && ORDER.hero) || []).indexOf(n); return i < 0 ? 99 : i; };
    rows.sort((a, b) => ord(a.n) - ord(b.n) || String(a.n).localeCompare(String(b.n)));
    const have = rows.reduce((s, r) => s + Math.min(r.l, r.cap), 0), cap = rows.reduce((s, r) => s + r.cap, 0);
    const priority = rows.filter(r => r.rem > 0).sort((a, b) => (b.rem - a.rem) || (b.rem / b.cap - a.rem / a.cap) || String(a.n).localeCompare(String(b.n)));
    return { th, rows, have, cap, rem: cap - have, pct: cap ? have / cap * 100 : null, approx: rows.some(r => !r.exact), priority };
  }
  // Pet Catch-Up: level tiap hewan vs batasnya. Prioritas = sisa level terbanyak (tanpa waktu/biaya).
  function petCatchup(p) {
    const rows = analyze(p || {}).items.filter(i => i.kind === 'pet' && i.cap > 0)
      .map(i => ({ n: i.n, l: i.l, cap: i.cap, rem: Math.max(0, i.cap - i.l), exact: i.exact, pct: Math.min(100, i.l / i.cap * 100) }))
      .sort((a, b) => String(a.n).localeCompare(String(b.n)));
    const have = rows.reduce((s, r) => s + Math.min(r.l, r.cap), 0), cap = rows.reduce((s, r) => s + r.cap, 0);
    const priority = rows.filter(r => r.rem > 0).sort((a, b) => (b.rem - a.rem) || (b.rem / b.cap - a.rem / a.cap) || String(a.n).localeCompare(String(b.n)));
    return { rows, have, cap, rem: cap - have, pct: cap ? have / cap * 100 : null, approx: rows.some(r => !r.exact), priority };
  }
  // Tab Kembali: checklist minggu pertama dari data pemain sendiri (tanpa klaim tentang isi game).
  function returnChecklist(p) {
    const a = analyze(p), hc = heroCatchup(p), out = [];
    hc.priority.slice(0, 3).forEach(r => out.push(`Pahlawan: naikkan ${r.n} (L${r.l} → L${r.cap}${r.exact ? '' : '~'}, sisa ${r.rem} level)`));
    const pets = a.items.filter(i => i.kind === 'pet' && i.rem > 0);
    if (pets.length) out.push(`Hewan: ${pets.length} hewan belum di batas (${pets.slice(0, 3).map(i => i.n).join(', ')}${pets.length > 3 ? ', …' : ''})`);
    const eq = a.items.filter(i => i.kind === 'equip' && i.rem > 0);
    if (eq.length) out.push(`Peralatan: ${eq.length} item belum di batas`);
    const weak = a.weakest ? LANES.find(L => L.id === a.weakest) : null;
    if (weak) out.push(`Jalur paling tertinggal: ${weak.label} (${pc(a.lanes[weak.id].pct)}${a.lanes[weak.id].approx ? '~' : ''})`);
    out.push('Cek tab War dan Capital untuk war atau raid klan yang sedang berjalan');
    out.push('Cek tab Alat > Jadwal untuk pola Capital Raid, Clan Games, dan CWL');
    return out;
  }
  // Catatan perubahan dari assets/returning.json, disaring: tanggal (YYYY-MM) sejak bulan terakhir main, dan rentang TH.
  function returnChanges(entries, th, month) {
    return (entries || []).filter(e => e && e.title
      && (!month || !e.date || String(e.date) >= month)
      && (e.thMin == null || th >= e.thMin) && (e.thMax == null || th <= e.thMax))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  // ---------- Data anggota + profil ----------
  function merged(tag) {
    const fm = findMember(tag), full = PIDX[normTagKey(tag)] || null;
    if (!fm && !full) return null;
    const b = fm ? fm.m : {}, p = Object.assign({}, full || {});
    if (fm) Object.assign(p, { tag: b.tag, name: b.name, th: b.th || p.th, trophies: b.trophies, donations: b.donations, received: b.received, capital: b.capitalContributions, role: b.role });
    p.hasFull = !!full;
    return p;
  }
  // Nama pemain untuk ditampilkan. Urutan: profil klan > nama lokal (tag lokal/impor) > nama di berkas impor. Kosong bila tidak ada.
  const NAME_FIELDS = ['name', 'playerName', 'player_name', 'pname', 'nama'];
  const nameFromJson = j => { if (j && typeof j === 'object') for (const f of NAME_FIELDS) if (typeof j[f] === 'string' && j[f].trim()) return j[f].trim().slice(0, 40); return ''; };
  function pname(k, src) {
    const kk = normTagKey(k), m = merged('#' + kk);
    if (m && m.name) return String(m.name);
    try { const L = typeof ltGet === 'function' ? ltGet()[kk] : null; if (L && L.name) return String(L.name); } catch (e) { /* abaikan */ }
    let j = src; if (!j) { try { j = (vAll()[kk] || {}).json; } catch (e) { j = null; } }
    return nameFromJson(j);
  }
  const pshow = k => { const t = '#' + normTagKey(k), n = pname(k); return n ? `${n} ${t}` : t; };
  // Simpan nama di HP (tag lokal) agar tampil di semua tempat. Nama resmi dari klan tidak pernah ditimpa; catatan lama dipertahankan.
  function setLocalName(k, name, force) {
    const n = String(name || '').trim().slice(0, 40); if (!n || typeof ltGet !== 'function' || typeof ltSet !== 'function') return false;
    const m = merged('#' + k); if (m && m.name && !force) return false;
    const o = ltGet(), cur = o[k] || {}; o[k] = { name: n, note: cur.note || '', saved: cur.saved || Date.now() };
    return ltSet(o);
  }

  // ---------- Tampilan ----------
  const laneBars = a => `<div class="lvgrid">${LANES.map(L => {
    const x = a.lanes[L.id]; if (!x.cap) return '';
    return `<div class="lv${x.rem <= 0 ? ' max' : ''}"><span class="lvn">${esc(L.short)}</span><span class="lvb"><i style="width:${Math.min(100, x.pct).toFixed(1)}%"></i></span><span class="lvv">${pc(x.pct)}${x.approx ? '~' : ''}</span></div>`;
  }).join('')}</div>`;
  const approxNote = '<div class="small note-s">~ = batas level dari API (batas absolut game, bukan batas Town Hall), jadi persen bisa lebih rendah dari kenyataan. Isi <code>assets/max_levels.json</code> agar akurat. Persen dihitung dari jumlah level, bukan waktu atau biaya.</div>';

  function planList(a, limit) {
    const rows = plan(a, limit);
    if (!rows.length) return '<div class="small">Semua item yang tercatat sudah di batas levelnya.</div>';
    return `<ol class="planlist">${rows.map(i => `<li><b>${esc(i.n)}</b> <span class="badge">${esc(KIND_LABEL[i.kind])}</span><span class="small"> L${i.l} → L${i.cap}${i.exact ? '' : '~'} · sisa ${i.rem} level</span></li>`).join('')}</ol>`;
  }
  // Dipakai app.js di dalam dialog profil pemain
  window.__ltmProfile = function (p, full) {
    if (!full || !p) return '';
    const a = analyze(p);
    if (!a.total.cap) return '';
    const weak = a.weakest ? LANES.find(L => L.id === a.weakest).label : null;
    return `<details class="pfold" open><summary>Left to Max <span class="small">(${pc(a.total.pct)}${a.total.approx ? '~' : ''} · sisa ${fmt(a.total.rem)} level)</span></summary>
      ${laneBars(a)}${weak ? `<div class="small" style="margin-top:8px">Jalur paling tertinggal: <b>${esc(weak)}</b>.</div>` : ''}
      <h3 class="sub-h">Mulai dari sini</h3>${planList(a, 8)}${approxNote}</details>`;
  };

  // ---------- Pemain yang ditandai ----------
  // "Ditandai" = tombol ☆ Tandai di profil (disimpan di browser) + tag dari secret PLAYER_TAGS (players.json -> marked).
  const markedKeys = () => {
    const s = new Set(((typeof bmGet === 'function' ? bmGet() : []) || []).map(normTagKey));
    (window.PMARKED || []).forEach(t => s.add(normTagKey(t)));
    return [...s].filter(Boolean);
  };
  const markedList = () => markedKeys().map(k => ({ k, p: merged('#' + k) }));
  const markedFull = () => markedList().map(x => x.p).filter(p => p && p.hasFull && analyze(p).total.cap);
  // Tab Desa tanpa pemain: tampilkan panduan dan kotak impor (impor otomatis menandai pemain). Tab lain: hanya arahan menandai pemain.
  const empty = () => TAB === 'vil' ? `${freeBox()}${guideVillage(true)}${restoreHtml()}`
    : `<div class="empty"><b>Impor data desa dulu</b><p class="small">Pemain ditambahkan otomatis, lengkap dengan tag dan namanya, saat kamu mengimpor data desa di tab Desa.</p><button type="button" data-opentab="vil">Buka tab Desa (gratis)</button></div>`;
  const ABBR = { 'Barbarian King': 'BK', 'Archer Queen': 'AQ', 'Minion Prince': 'MP', 'Grand Warden': 'GW', 'Royal Champion': 'RC', 'Dragon Duke': 'DD' };
  const tile = (label, l, cap, rem, exact, bad, full) => `<div class="ctile ${rem <= 0 ? 't-ok' : rem >= bad ? 't-bad' : 't-warn'}" title="${esc(full || label)}"><b>${esc(label)}</b><span>${l}/${cap}${exact ? '' : '~'}</span></div>`;

  let TAB = '',   // '' = menu Alat; selain itu satu alat dibuka sebagai halaman sendiri (seperti Pengaturan)
     PLAN = '', CMP = { a: '', b: '' }, RK = 'progress', TOKEN = 0, READY = false;
  let HERO = '', PET = '', RETP = '', RETM = '', RETDATA = null;

  function tabSummary() {
    const list = markedList();
    if (!list.length) return empty();
    return `<div class="pcards">${list.map(({ k, p }) => {
      if (!p) return `<div class="pcard"><div class="pc-head"><b>#${esc(k)}</b></div><div class="small">Belum ada data pemain ini. Pemain harus anggota klan pantauan atau ada di watchlist.json.</div></div>`;
      const head = pct => `<div class="pc-head"><span><a class="plink pc-name" href="#" data-player="${esc(p.tag)}">${esc(p.name)}</a> <span class="small">TH${esc(p.th || '?')}</span></span>${pct}</div>`;
      const a = p.hasFull ? analyze(p) : null;
      if (!a || !a.total.cap) return `<div class="pcard">${head('')}<div class="small">Profil lengkap belum diambil. Diambil bertahap oleh coc_clan.py.</div></div>`;
      const weak = a.weakest ? LANES.find(L => L.id === a.weakest).label : null;
      const heroes = (p.heroes || []).map(h => { const c = capFor(h.n, a.th, 'hero', h.m); return c.cap ? tile(ABBR[h.n] || h.n, num(h.l), c.cap, Math.max(0, c.cap - num(h.l)), c.exact, 10, h.n) : ''; }).join('');
      const pets = a.items.filter(i => i.kind === 'pet' && i.rem > 0);
      return `<div class="pcard">${head(`<span class="pc-pct ${tone(a.total.pct)}">${pc(a.total.pct)}${a.total.approx ? '~' : ''}</span>`)}
        ${laneBars(a)}
        <div class="small">Sisa ${fmt(a.total.rem)} level${weak ? ` · jalur terlemah: <b>${esc(weak)}</b>` : ' · semua di batas'}</div>
        ${heroes ? `<div class="ctiles">${heroes}</div>` : ''}
        ${pets.length ? `<details class="pfold"><summary>Hewan tertinggal (${pets.length})</summary><div class="ctiles">${pets.map(i => tile(i.n, i.l, i.cap, i.rem, i.exact, 3, i.n)).join('')}</div></details>` : ''}
      </div>`;
    }).join('')}</div>${approxNote}`;
  }

  function pickOptions(pool, cur) { return pool.map(p => `<option value="${esc(p.tag)}"${normTagKey(p.tag) === normTagKey(cur) ? ' selected' : ''}>${esc(p.name)} (TH${esc(p.th || '?')})</option>`).join(''); }

  function tabPlan() {
    const pool = markedFull().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!pool.length) return markedKeys().length ? '<div class="small">Pemain yang ditandai belum punya profil lengkap.</div>' : empty();
    if (!pool.some(p => normTagKey(p.tag) === normTagKey(PLAN))) PLAN = pool[0].tag;
    const p = pool.find(x => normTagKey(x.tag) === normTagKey(PLAN)), a = analyze(p);
    const weak = a.weakest ? LANES.find(L => L.id === a.weakest).label : null;
    const flags = [];
    if (a.lanes.hero.cap && a.lanes.hero.pct < 90) flags.push('Pahlawan masih tertinggal: untuk war dan raid, utamakan hero sebelum pasukan.');
    if (a.lanes.lab.cap && a.lanes.hero.cap && a.lanes.lab.pct + 15 < a.lanes.hero.pct) flags.push('Lab jauh tertinggal dari pahlawan: satu pasukan andalan lebih berguna daripada banyak pasukan setengah jadi.');
    return `<div class="toolbar"><select data-f="plan" aria-label="Pilih pemain">${pickOptions(pool, PLAN)}</select></div>
      <div class="pcard">
        <div class="pc-head"><span><b class="pc-name">${esc(p.name)}</b> <span class="small">TH${esc(p.th || '?')}</span></span><span class="pc-pct ${tone(a.total.pct)}">${pc(a.total.pct)}${a.total.approx ? '~' : ''}</span></div>
        ${laneBars(a)}<div class="small">Sisa ${fmt(a.total.rem)} level${weak ? ` · jalur terlemah: <b>${esc(weak)}</b>` : ''}</div>
      </div>
      ${flags.length ? `<div class="note">${flags.map(esc).join('<br>')}</div>` : ''}
      <h3 class="sub-h">Mulai dari sini</h3>${planList(a, 12)}
      <div class="small">Urutan: pahlawan, hewan, peralatan, pasukan, mantra, lalu mesin pengepungan; dalam tiap kategori yang paling jauh dari batas duluan. Saran kasar dari jarak level, belum menghitung waktu, biaya, atau jumlah tukang.</div>`;
  }

  function tabCompare() {
    const pool = markedFull().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (pool.length < 2) return `<div class="empty"><b>Butuh minimal dua pemain</b><p class="small">Pemain harus sudah punya profil lengkap. Pemain sekarang: ${pool.length}. Tambahkan pemain dengan mengimpor data desa di tab Desa.</p><button type="button" data-opentab="vil">Buka tab Desa (gratis)</button></div>`;
    const same = (x, y) => normTagKey(x) === normTagKey(y), has = t => pool.some(p => same(p.tag, t));
    if (!has(CMP.a)) CMP.a = pool[0].tag;
    if (!has(CMP.b) || same(CMP.b, CMP.a)) CMP.b = pool.find(x => !same(x.tag, CMP.a)).tag;
    const A = merged(CMP.a), B = merged(CMP.b), aa = analyze(A), ab = analyze(B);
    const heroes = [...new Set([...(ORDER.hero || []), ...(A.heroes || []).map(h => h.n), ...(B.heroes || []).map(h => h.n)])].filter(n => [A, B].some(p => (p.heroes || []).some(h => h.n === n)));
    const hv = (p, n) => { const h = (p.heroes || []).find(x => x.n === n); return h ? num(h.l) : null; };
    const R = [
      ['Town Hall', num(A.th), num(B.th)], ['Trofi', num(A.trophies), num(B.trophies)], ['Bintang war', num(A.warStars), num(B.warStars)],
      ['Menang serang', num(A.atkWins), num(B.atkWins)], ['Donasi', num(A.donations), num(B.donations)], ['Capital', num(A.capital), num(B.capital)],
      ['Progres total', aa.total.pct, ab.total.pct, pc], ['Pahlawan', aa.lanes.hero.pct, ab.lanes.hero.pct, pc], ['Lab', aa.lanes.lab.pct, ab.lanes.lab.pct, pc], ['Hewan', aa.lanes.pet.pct, ab.lanes.pet.pct, pc],
      ['Level pahlawan', heroTotal(A), heroTotal(B)],
      ...heroes.map(n => [ABBR[n] || n, hv(A, n), hv(B, n)]),
    ];
    const cell = (v, o, f) => { const w = v != null && o != null && v > o; return `<td class="pcv${w ? ' win' : ''}">${v == null ? '–' : (f || fmt)(v)}</td>`; };
    return `<div class="toolbar"><select data-f="cmpa" aria-label="Pemain pertama">${pickOptions(pool, CMP.a)}</select><select data-f="cmpb" aria-label="Pemain kedua">${pickOptions(pool, CMP.b)}</select></div>
      <div class="table-wrap"><table class="cmp"><thead><tr><th></th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody>${R.map(([l, x, y, f]) => `<tr><td>${esc(l)}</td>${cell(x, y, f)}${cell(y, x, f)}</tr>`).join('')}</tbody></table></div>
      <div class="small">Tebal = lebih tinggi.</div>`;
  }

  const METRICS = {
    progress: { l: 'Progres menuju maks', v: p => analyze(p).total.pct, f: v => pc(v) },
    heroes: { l: 'Total level pahlawan', v: p => heroTotal(p), f: v => fmt(v) },
    trophies: { l: 'Trofi', v: p => num(p.trophies), f: v => fmt(v) },
    donations: { l: 'Donasi', v: p => num(p.donations), f: v => fmt(v) },
    capital: { l: 'Kontribusi Capital', v: p => num(p.capital), f: v => fmt(v) },
    warStars: { l: 'Bintang war', v: p => num(p.warStars), f: v => fmt(v) },
    atkWins: { l: 'Menang serang', v: p => num(p.atkWins), f: v => fmt(v) },
  };
  function tabRank() {
    const pool = markedFull();
    if (!pool.length) return markedKeys().length ? '<div class="small">Pemain yang ditandai belum punya profil lengkap.</div>' : empty();
    const M = METRICS[RK] || METRICS.progress, rows = pool.map(p => ({ p, v: M.v(p) })).filter(r => r.v != null).sort((a, b) => b.v - a.v), top = Math.max(rows[0].v, 1e-9);
    return `<div class="toolbar"><select data-f="rk" aria-label="Metrik peringkat">${Object.keys(METRICS).map(k => `<option value="${k}"${k === RK ? ' selected' : ''}>${esc(METRICS[k].l)}</option>`).join('')}</select></div>
      <div class="rk">${rows.map((r, i) => `<div class="rk-row"><span class="small">${i + 1}</span><div><a class="plink" href="#" data-player="${esc(r.p.tag)}">${esc(r.p.name)}</a> <span class="small">TH${esc(r.p.th || '?')}</span><div class="rk-bar"><i style="width:${Math.max(2, r.v / top * 100).toFixed(1)}%"></i></div></div><b class="pcv">${M.f(r.v)}</b></div>`).join('')}</div>`;
  }

  // Pola jadwal rutin; bukan jadwal resmi. Raid Weekend: Jumat 07.00 UTC sampai Senin 07.00 UTC (cocok dengan data raid klan).
  function nextRaid(now) {
    const d = new Date(now), day = d.getUTCDay(), base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 7);
    let start = base + ((5 - day + 7) % 7) * 864e5;
    const endOf = s => s + 3 * 864e5;
    if (endOf(start) <= now) start += 7 * 864e5;
    if (endOf(start - 7 * 864e5) > now) start -= 7 * 864e5;   // sedang berlangsung
    return { start, end: endOf(start) };
  }
  function nextMonthly(now, dom, days) {   // awal event bulanan: yang sedang berlangsung, atau yang berikutnya
    const d = new Date(now); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dom);
    if (t + days * 864e5 <= now) t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, dom);
    return t;
  }
  // Kalender resmi: events.json dibuat workflow dari blog Supercell (update_events.py). Tanpa itu, jatuh ke pola tanggal.
  let EVDATA = null;
  async function loadEvents() {
    if (EVDATA) return;
    try { const r = await fetch('events.json', { cache: 'no-store' }); EVDATA = r.ok ? await r.json() : {}; } catch (e) { EVDATA = {}; }
  }
  const wibDay = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);       // tanggal WIB (YYYY-MM-DD)
  const dayN = ymd => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 864e5;
  // Status per hari (WIB): berlangsung bila mulai <= hari ini <= selesai. Jam mulai/selesai tidak diketahui dari sumber, jadi hanya tanggal.
  function eventsView(events, nowMs) {
    const t = wibDay(nowMs), today = dayN(t), live = [], soon = [];
    (events || []).forEach(e => {
      if (!e || !e.nama || !/^\d{4}-\d\d-\d\d$/.test(e.mulai || '') || !/^\d{4}-\d\d-\d\d$/.test(e.selesai || '')) return;
      const s = dayN(e.mulai), f = dayN(e.selesai);
      if (f < today) return;
      if (s <= today) live.push(Object.assign({ sisa: f - today + 1 }, e)); else soon.push(Object.assign({ dalam: s - today }, e));
    });
    const byEnd = (a, b) => dayN(a.selesai) - dayN(b.selesai) || String(a.nama).localeCompare(b.nama);
    return { live: live.sort(byEnd), soon: soon.sort((a, b) => dayN(a.mulai) - dayN(b.mulai) || String(a.nama).localeCompare(b.nama)) };
  }
  function tabEvent() {
    const now = Date.now(), r = nextRaid(now), v = eventsView(EVDATA && EVDATA.events, now), official = !!(EVDATA && EVDATA.events && EVDATA.events.length);
    const wib = t => new Date(t).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
    const d1 = t => new Date(t).toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'long' });
    const rng = e => { const f = x => new Date(x + 'T00:00:00Z').toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short' }); return e.mulai === e.selesai ? f(e.mulai) : `${f(e.mulai)} – ${f(e.selesai)}`; };
    const find = rx => v.live.find(e => rx.test(e.nama)) || v.soon.find(e => rx.test(e.nama));
    const tile = (label, rx, cg) => {
      const e = official && find(rx);
      if (e) return pstat(label, e.sisa != null ? `Berlangsung · sisa ${e.sisa} hari` : `Mulai ${e.dalam} hari lagi`, rng(e));
      return cg;
    };
    const live = r.start <= now && now < r.end, cg = nextMonthly(now, 22, 7), cwl = nextMonthly(now, 1, 11);
    const patCG = pstat('Clan Games', now >= cg && now < cg + 7 * 864e5 ? 'Berlangsung' : 'Sekitar ' + dur(cg - now), `pola tgl 22–28 · ${d1(cg)}`);
    const patCWL = pstat('Clan War League', now >= cwl && now < cwl + 11 * 864e5 ? 'Musim CWL' : 'Sekitar ' + dur(cwl - now), `pola awal bulan · ${d1(cwl)}`);
    const row = (e, st) => `<li><b>${esc(e.nama)}</b> <span class="small">${esc(rng(e))} · ${st}</span></li>`;
    const upd = official && EVDATA.diperbarui ? new Date(EVDATA.diperbarui) : null, stale = upd && now - upd.getTime() > 3 * 864e5;
    const link = official && (EVDATA.sumber || []).find(u => /^https:\/\/supercell\.com\//.test(u));
    return `<div class="grid">${[
      pstat('Capital Raid', live ? 'Berlangsung' : 'Mulai ' + dur(r.start - now), live ? `selesai ${wib(r.end)}` : wib(r.start)),
      tile('Clan Games', /clan games/i, patCG),
      tile('Clan War League', /clan war league/i, patCWL),
    ].join('')}</div>
    ${official ? `${v.live.length ? `<h3 class="sub-h">Sedang berlangsung</h3><ul class="planlist">${v.live.map(e => row(e, `sisa ${e.sisa} hari`)).join('')}</ul>` : ''}
    ${v.soon.length ? `<h3 class="sub-h">Akan datang</h3><ul class="planlist">${v.soon.slice(0, 12).map(e => row(e, `${e.dalam} hari lagi`)).join('')}</ul>` : ''}
    <div class="small note-s">Sumber: blog resmi Supercell${link ? ` (<a class="plink" href="${esc(link)}" target="_blank" rel="noopener noreferrer">post musim</a>)` : ''}, diperbarui ${esc(upd.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }))} WIB. Hanya tanggal, jam mulai dan selesai tidak ada di sumber (event biasanya berganti sekitar 08.00 UTC). ${stale ? '<b>Data sudah lebih dari 3 hari, kemungkinan pembaruan otomatis macet.</b> ' : ''}Capital Raid tetap dari pola Jumat sampai Senin. Jadwal war dan raid klan yang sebenarnya ada di tab War dan Capital (kalender .ics di tab Capital).</div>`
    : `<div class="small" style="margin-top:10px">Kalender resmi belum tersedia (events.json belum dibuat oleh workflow), jadi yang tampil hanya pola jadwal rutin yang dihitung dari tanggal. Event spesial, diskon, dan perubahan jadwal dari Supercell tidak tercakup, jadi cek di game. Jadwal war dan raid klan yang sebenarnya ada di tab War dan Capital, juga bisa diunduh sebagai kalender (.ics) di tab Capital.</div>`}`;
  }

  const same = (x, y) => normTagKey(x) === normTagKey(y);
  const byName = (a, b) => String(a.name).localeCompare(String(b.name));
  const noFull = () => markedKeys().length ? '<div class="small">Pemain yang ditandai belum punya profil lengkap.</div>' : empty();

  function tabHero() {
    const pool = markedFull().sort(byName);
    if (!pool.length) return noFull();
    if (!pool.some(p => same(p.tag, HERO))) HERO = pool[0].tag;
    const p = pool.find(x => same(x.tag, HERO)), h = heroCatchup(p);
    const bar = `<div class="toolbar"><select data-f="hero" aria-label="Pilih pemain">${pickOptions(pool, HERO)}</select></div>`;
    if (!h.rows.length) return bar + '<div class="small">Level pahlawan pemain ini belum tercatat, atau batas levelnya belum diketahui.</div>';
    const top = h.priority[0];
    return `${bar}<div class="pcard">
      <div class="pc-head"><span><b class="pc-name">${esc(p.name)}</b> <span class="small">TH${esc(p.th || '?')}</span></span><span class="pc-pct ${tone(h.pct)}">${pc(h.pct)}${h.approx ? '~' : ''}</span></div>
      <div class="lvgrid">${h.rows.map(r => `<div class="lv${r.rem <= 0 ? ' max' : ''}" title="${esc(r.n)}"><span class="lvn">${esc(ABBR[r.n] || r.n)}</span><span class="lvb"><i style="width:${r.pct.toFixed(1)}%"></i></span><span class="lvv">${r.l}/${r.cap}${r.exact ? '' : '~'}</span></div>`).join('')}</div>
      <div class="small">Sisa ${fmt(h.rem)} level dari ${fmt(h.cap)}${top ? ` · terjauh: <b>${esc(top.n)}</b> (sisa ${top.rem})` : ' · semua pahlawan di batas'}</div>
    </div>
    <h3 class="sub-h">Prioritas</h3>
    ${h.priority.length ? `<ol class="planlist">${h.priority.map(r => `<li><b>${esc(r.n)}</b> <span class="small">L${r.l} → L${r.cap}${r.exact ? '' : '~'} · sisa ${r.rem} level</span></li>`).join('')}</ol>` : '<div class="small">Semua pahlawan yang tercatat sudah di batas levelnya.</div>'}
    <div class="small note-s">Urutan dari sisa level terbanyak. Estimasi waktu dan biaya belum ada karena butuh tabel durasi dan biaya yang terverifikasi. Pahlawan yang belum dibuka tidak tercatat.${h.approx ? ' ~ = batas dari API, bukan batas Town Hall (isi <code>assets/max_levels.json</code>).' : ''}</div>`;
  }

  function tabPet() {
    const pool = markedFull().sort(byName);
    if (!pool.length) return noFull();
    if (!pool.some(p => same(p.tag, PET))) PET = pool[0].tag;
    const p = pool.find(x => same(x.tag, PET)), h = petCatchup(p);
    const bar = `<div class="toolbar"><select data-f="pet" aria-label="Pilih pemain">${pickOptions(pool, PET)}</select></div>`;
    if (!h.rows.length) return bar + '<div class="small">Belum ada hewan yang tercatat untuk pemain ini (belum dibuka, atau profil belum memuatnya).</div>';
    return `${bar}<div class="pcard">
      <div class="pc-head"><span><b class="pc-name">${esc(p.name)}</b> <span class="small">TH${esc(p.th || '?')}</span></span><span class="pc-pct ${tone(h.pct)}">${pc(h.pct)}${h.approx ? '~' : ''}</span></div>
      <div class="ctiles">${h.rows.map(r => tile(r.n, r.l, r.cap, r.rem, r.exact, 3, r.n)).join('')}</div>
      <div class="small">Sisa ${fmt(h.rem)} level dari ${fmt(h.cap)} · ${h.priority.length ? `${h.priority.length} hewan belum di batas` : 'semua hewan di batas'}</div>
    </div>
    <h3 class="sub-h">Prioritas</h3>
    ${h.priority.length ? `<ol class="planlist">${h.priority.map(r => `<li><b>${esc(r.n)}</b> <span class="small">L${r.l} → L${r.cap}${r.exact ? '' : '~'} · sisa ${r.rem} level</span></li>`).join('')}</ol>` : '<div class="small">Semua hewan yang tercatat sudah di batas levelnya.</div>'}
    <div class="small note-s">Urutan dari sisa level terbanyak. Estimasi waktu dan biaya belum ada. Hewan yang belum dibuka tidak tercatat.${h.approx ? ' ~ = batas dari API, bukan batas Town Hall (isi <code>assets/max_levels.json</code>).' : ''}</div>`;
  }

  async function loadReturning() {
    if (RETDATA) return;
    try { const r = await fetch('assets/returning.json'); RETDATA = r.ok ? ((await r.json()).entries || []) : []; } catch (e) { RETDATA = []; }
  }
  function tabReturn() {
    const pool = markedFull().sort(byName);
    if (!pool.length) return noFull();
    if (!pool.some(p => same(p.tag, RETP))) RETP = pool[0].tag;
    const p = pool.find(x => same(x.tag, RETP)), a = analyze(p), th = num(p.th);
    const ch = returnChanges(RETDATA, th, RETM), list = returnChecklist(p);
    const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? esc(u) : '';
    return `<div class="toolbar"><select data-f="ret" aria-label="Pilih pemain">${pickOptions(pool, RETP)}</select>
      <input type="month" data-f="retm" value="${esc(RETM)}" aria-label="Bulan terakhir main"></div>
      <div class="pcard"><div class="pc-head"><span><b class="pc-name">${esc(p.name)}</b> <span class="small">TH${esc(p.th || '?')}</span></span><span class="pc-pct ${tone(a.total.pct)}">${pc(a.total.pct)}${a.total.approx ? '~' : ''}</span></div>${laneBars(a)}</div>
      <h3 class="sub-h">Perubahan${RETM ? ' sejak ' + esc(RETM) : ''}</h3>
      ${ch.length ? `<ul class="planlist">${ch.map(e => `<li><b>${esc(e.title)}</b>${e.date ? ` <span class="small">${esc(e.date)}</span>` : ''}${e.verified === true ? '' : ' <span class="badge">belum diverifikasi</span>'}${e.detail ? `<div class="small">${esc(e.detail)}</div>` : ''}${safeUrl(e.src) ? `<div class="small"><a class="plink" href="${safeUrl(e.src)}" target="_blank" rel="noopener noreferrer">sumber</a></div>` : ''}</li>`).join('')}</ul>`
        : '<div class="small">Belum ada catatan perubahan yang cocok. Isi <code>assets/returning.json</code> dengan perubahan yang sudah kamu verifikasi (format ada di file itu).</div>'}
      <h3 class="sub-h">Checklist minggu pertama</h3>
      <ol class="planlist">${list.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <div class="small note-s">Checklist dibuat dari data pemain ini saja. Pilih bulan terakhir main untuk menyaring catatan perubahan.</div>`;
  }

  // ---------- Desa: impor "Ekspor Data Desa" dari game, hanya untuk pemain yang ditandai ----------
  // Data disimpan di browser ini saja (localStorage), tidak diunggah ke mana pun.
  const VKEY = 'cow_village_v1';
  const vAll = () => { try { return JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { return {}; } };
  const vStore = o => { try { localStorage.setItem(VKEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
  // Hanya daftar yang berisi upgrade; obstacles/decos dsb. sengaja dikecualikan (timernya bukan upgrade).
  const SEC = { buildings: 'Bangunan', buildings2: 'Bangunan Builder Base', heroes: 'Pahlawan', heroes2: 'Pahlawan Builder Base', guardians: 'Penjaga', units: 'Pasukan', units2: 'Pasukan Builder Base', spells: 'Mantra', siege_machines: 'Mesin pengepungan', pets: 'Hewan', equipment: 'Peralatan', traps: 'Jebakan', traps2: 'Jebakan Builder Base' };
  // ID data game -> nama. Sumber: NightOwlEyes/COC_Timer (Dictionary/Mapping.txt, bagian "en"); semua nama di profil pemain tercakup.
  // Item yang tidak ada di tabel (mis. peralatan hero 90000000+, bangunan baru) dicoba ditebak dari profil, atau tampil sebagai #ID.
  const ID_NAME = {
    1000000: "Army Camp",
    1000001: "Town Hall",
    1000002: "Elixir Collector",
    1000003: "Elixir Storage",
    1000004: "Gold Mine",
    1000005: "Gold Storage",
    1000006: "Barracks",
    1000007: "Laboratory",
    1000008: "Cannon",
    1000009: "Archer Tower",
    1000010: "Tembok",
    1000011: "Wizard Tower",
    1000012: "Air Defense",
    1000013: "Mortar",
    1000014: "Clan Castle",
    1000015: "Builder's Hut",
    1000019: "Hidden Tesla",
    1000020: "Spell Factory",
    1000021: "X-Bow",
    1000023: "Dark Elixir Drill",
    1000024: "Dark Elixir Storage",
    1000026: "Dark Barracks",
    1000027: "Inferno Tower",
    1000028: "Air Sweeper",
    1000029: "Dark Spell Factory",
    1000031: "Eagle Artillery",
    1000032: "Bomb Tower",
    1000033: "Tembok",
    1000034: "Builder Hall",
    1000035: "Elixir Collector",
    1000036: "Elixir Storage",
    1000037: "Gold Mine",
    1000038: "Gold Storage",
    1000039: "Clock Tower",
    1000040: "Builder Barracks",
    1000041: "Double Cannon",
    1000042: "Army Camp",
    1000043: "Hidden Tesla",
    1000044: "Cannon",
    1000045: "Multi Mortar",
    1000046: "Star Laboratory",
    1000047: "B.O.T.O's Shack",
    1000048: "Archer Tower",
    1000049: "Reinforcement Camp",
    1000050: "Firecrackers",
    1000051: "Guard Post",
    1000052: "Mega Tesla",
    1000053: "Battle Machine Altar",
    1000054: "Air Bombs",
    1000055: "Crusher",
    1000056: "Roaster",
    1000057: "Giant Cannon",
    1000058: "Gem Mine",
    1000059: "Workshop",
    1000063: "Lava Launcher",
    1000064: "B.O.B's Hut",
    1000065: "B.O.B Control",
    1000067: "Scattershot",
    1000068: "Pet House",
    1000070: "Blacksmith",
    1000071: "Hero Hall",
    1000072: "Spell Tower",
    1000077: "Monolith",
    1000078: "O.T.T.O's Outpost",
    1000079: "Multi-Gear Tower",
    1000080: "Battle Copter Altar",
    1000081: "X-Bow",
    1000082: "Healing Hut",
    1000084: "Multi-Archer Tower",
    1000085: "Ricochet Cannon",
    1000086: "Revenge Tower",
    1000089: "Firespitter",
    1000093: "Helper Hut",
    1000097: "Crafting Station",
    1000102: "Super Wizard Tower",
    4000000: "Barbarian",
    4000001: "Archer",
    4000002: "Goblin",
    4000003: "Giant",
    4000004: "Wall Breaker",
    4000005: "Balloon",
    4000006: "Wizard",
    4000007: "Healer",
    4000008: "Dragon",
    4000009: "P.E.K.K.A",
    4000010: "Minion",
    4000011: "Hog Rider",
    4000012: "Valkyrie",
    4000013: "Golem",
    4000015: "Witch",
    4000017: "Lava Hound",
    4000022: "Bowler",
    4000023: "Baby Dragon",
    4000024: "Miner",
    4000031: "Raged Barbarian",
    4000032: "Sneaky Archer",
    4000033: "Beta Minion",
    4000034: "Boxer Giant",
    4000035: "Bomber",
    4000036: "Power P.E.K.K.A",
    4000037: "Cannon Cart",
    4000038: "Drop Ship",
    4000041: "Baby Dragon",
    4000042: "Night Witch",
    4000051: "Wall Wrecker",
    4000052: "Battle Blimp",
    4000053: "Yeti",
    4000058: "Ice Golem",
    4000059: "Electro Dragon",
    4000062: "Stone Slammer",
    4000065: "Dragon Rider",
    4000070: "Hog Glider",
    4000075: "Siege Barracks",
    4000082: "Headhunter",
    4000087: "Log Launcher",
    4000091: "Flame Flinger",
    4000092: "Battle Drill",
    4000095: "Electro Titan",
    4000097: "Apprentice Warden",
    4000106: "Electrofire Wizard",
    4000109: "Ruin Witch",
    4000110: "Root Rider",
    4000123: "Druid",
    4000132: "Thrower",
    4000135: "Troop Launcher",
    4000150: "Furnace",
    4000177: "Meteor Golem",
    4000188: "Sky Wagon",
    12000000: "Bomb",
    12000001: "Spring Trap",
    12000002: "Giant Bomb",
    12000005: "Air Bomb",
    12000006: "Seeking Air Mine",
    12000008: "Skeleton Trap",
    12000010: "Spring Trap",
    12000011: "Push Trap",
    12000013: "Mine",
    12000014: "Mega Mine",
    12000016: "Tornado Trap",
    12000020: "Giga Bomb",
    26000000: "Lightning Spell",
    26000001: "Healing Spell",
    26000002: "Rage Spell",
    26000003: "Jump Spell",
    26000005: "Freeze Spell",
    26000009: "Poison Spell",
    26000010: "Earthquake Spell",
    26000011: "Haste Spell",
    26000016: "Clone Spell",
    26000017: "Skeleton Spell",
    26000028: "Bat Spell",
    26000035: "Invisibility Spell",
    26000053: "Recall Spell",
    26000070: "Overgrowth Spell",
    26000098: "Revive Spell",
    26000109: "Ice Block Spell",
    26000120: "Totem Spell",
    26000123: "Angry Spell",
    28000000: "Barbarian King",
    28000001: "Archer Queen",
    28000002: "Grand Warden",
    28000003: "Battle Machine",
    28000004: "Royal Champion",
    28000005: "Battle Copter",
    28000006: "Minion Prince",
    28000007: "Dragon Duke",
    73000000: "L.A.S.S.I",
    73000001: "Mighty Yak",
    73000002: "Electro Owl",
    73000003: "Unicorn",
    73000004: "Phoenix",
    73000007: "Poison Lizard",
    73000008: "Diggy",
    73000009: "Frosty",
    73000010: "Spirit Fox",
    73000011: "Angry Jelly",
    73000016: "Sneezy",
    73000017: "Greedy Raven",
    93000000: "Builder's Apprentice",
    93000001: "Lab Assistant",
    93000002: "Prospector",
    102000034: "Hot Candle - DPS",
    102000035: "Hot Candle - TSA",
    102000036: "Hero Hunter HP",
    102000037: "Hero Hunter DPS",
    102000038: "Hero Hunter PSL",
    102000039: "Cake-A-Pult HP",
    102000040: "Cake-A-Pult DPH",
    102000041: "Cake-A-Pult ED",
    103000011: "Hot Candle",
    103000012: "Hero Hunter",
    103000013: "Cake-A-Pult",
    103000033: "Hot Candle - HP",
    107000000: "Longshot",
    107000001: "Smasher",
    107000008: "Logger"
  };
  const WALL_ID = 1000010;

  function parseVillage(text) {
    let o; try { o = JSON.parse(String(text || '').trim()); } catch (e) { return { ok: false, err: 'Bukan JSON yang valid. Salin seluruh teks hasil Ekspor Data Desa dari game.' }; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, err: 'Format tidak dikenali: harus berupa objek JSON dari ekspor desa.' };
    if (!Array.isArray(o.buildings) && !Array.isArray(o.heroes)) return { ok: false, err: 'Tidak ada daftar bangunan atau pahlawan, ini sepertinya bukan ekspor desa.' };
    return { ok: true, obj: o, tag: o.tag ? '#' + normTagKey(o.tag) : '' };
  }
  function findTimers(o) {
    const out = [];
    Object.keys(SEC).forEach(sec => {
      if (!o || !Array.isArray(o[sec])) return;
      const add = (it, extra) => { if (it && typeof it === 'object' && !Array.isArray(it) && num(it.timer) > 0) out.push(Object.assign({ sec, data: it.data, lvl: it.lvl, timer: num(it.timer), goblin: it.extra === true, helper: it.helper_recurrent === true }, extra)); };
      o[sec].forEach(it => {
        add(it);
        // Modul crafted defense bersarang di buildings[].types[].modules[].
        if (sec === 'buildings' && it && Array.isArray(it.types)) it.types.forEach(ty => { if (ty && Array.isArray(ty.modules)) ty.modules.forEach(m => add(m, { parent: it.data, type: ty.data })); });
      });
    });
    return out;
  }
  // Bila ID belum ada di tabel ID_NAME, cari di profil pemain: item satu kategori yang levelnya sama dengan level upgrade.
  // Hanya dipakai bila kecocokannya tepat satu (diberi tanda ~ karena perkiraan); bila ada beberapa kandidat tetap #ID.
  const SEC_KIND = { heroes: 'hero', units: 'troop', spells: 'spell', siege_machines: 'siege', pets: 'pet', equipment: 'equip' };
  function guessName(p, sec, lvl) {
    const kind = SEC_KIND[sec]; if (!p || !kind || lvl == null || isNaN(Number(lvl))) return null;
    const c = rowsOf(p, kind).filter(r => num(r[1]) === num(lvl));
    return c.length === 1 ? c[0][0] : null;
  }
  const upLabel = (t, p) => {
    const nm = id => ID_NAME[id] || (NAMES && NAMES[id]) || null;
    let known = nm(t.data);
    if (known && t.type != null) known = `${nm(t.type) || nm(t.parent) || 'Crafted defense'} ${known}`;
    const g = known ? null : guessName(p, t.sec, t.lvl);
    return `${SEC[t.sec]}: ${known || (g ? g + '~' : '#' + t.data)}${t.lvl != null && !isNaN(Number(t.lvl)) ? ` L${num(t.lvl)} → L${num(t.lvl) + 1}` : ''}`;
  };
  // Waktu selesai = waktu ekspor (timestamp, detik) + sisa timer. Bila timestamp tidak ada, pakai waktu simpan.
  function finishTimes(rec, p) {
    const o = (rec && rec.json) || {}, base = num(o.timestamp) > 0 ? num(o.timestamp) * 1000 : num(rec && rec.saved);
    return findTimers(o).map(t => Object.assign({ at: base + t.timer * 1000, label: upLabel(t, p) }, t)).sort((a, b) => a.at - b.at);
  }
  function upcoming(now) {
    const all = vAll(), out = [];
    markedKeys().forEach(k => {
      const rec = all[k]; if (!rec) return;
      const m = merged('#' + k), who = pname(k);
      finishTimes(rec, m).forEach(t => { if (t.at > now) out.push({ k, who, label: t.label, at: t.at, key: [k, t.sec, t.data, t.at].join('|') }); });
    });
    return out.sort((a, b) => a.at - b.at);
  }
  function wallStats(o) {
    const by = {}; let total = 0;
    (Array.isArray(o && o.buildings) ? o.buildings : []).forEach(b => {
      if (b && b.data === WALL_ID) { const c = b.cnt == null ? 1 : num(b.cnt), l = num(b.lvl); by[l] = (by[l] || 0) + c; total += c; }
    });
    return { by, total };
  }
  // costs[n] = biaya satu tembok dari level n-1 ke n. Level yang belum diisi dicatat di missing (tidak ditebak).
  function wallCost(by, target, costs) {
    const t = num(target); let total = 0, below = 0; const missing = new Set();
    Object.keys(by || {}).map(Number).forEach(l => {
      if (l >= t) return; below += by[l];
      for (let n = l + 1; n <= t; n++) { const c = costs && costs[n]; if (c == null || c === '' || isNaN(Number(c))) missing.add(n); else total += Number(c) * by[l]; }
    });
    return { total, below, missing: [...missing].sort((a, b) => a - b) };
  }
  // Ekspor offline: hanya dari penyimpanan di HP (penanda lokal, tag lokal, data desa). Tidak membaca players.json atau
  // watchlist.json dan tidak ada permintaan jaringan, jadi tetap jalan tanpa internet. Hanya pemain yang ditandai.
  const exportKeys = () => {
    const all = vAll(), s = new Set(((typeof bmGet === 'function' ? bmGet() : []) || []).map(normTagKey));
    markedKeys().forEach(k => { if (all[k]) s.add(k); });   // pemain ditandai dari server ikut bila data desanya tersimpan di HP
    return [...s].filter(Boolean);
  };
  function buildExport() {
    const all = vAll(), out = {}, keys = exportKeys();
    keys.forEach(k => {
      const rec = all[k];
      out['#' + k] = { tag: '#' + k, nama: pname(k) || null, desa: rec ? rec.json : null, desaDisimpan: rec ? new Date(rec.saved).toISOString() : null };
    });
    return {
      versi: 3, offline: true, dibuat: new Date().toISOString(), catatan: 'Cadangan offline pemain yang ditandai: penanda, nama dan tag lokal, dan data desa. Tidak memakai watchlist.json.',
      penanda: keys, tagLokal: typeof ltGet === 'function' ? ltGet() : {}, pemain: out
    };
  }
  const okTag = k => /^[0289PYLQGRJCUV]{4,12}$/.test(k);
  const markKey = k => { if (typeof bmGet !== 'function' || typeof bmSet !== 'function') return false; const l = bmGet(); if (l.includes(k)) return false; l.push(k); bmSet(l); return true; };
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  // Ekspor Data Desa mentah dari game: tag diambil dari isinya, nama dari kolom "Nama pemain" / profil klan / isi ekspor. Pemain otomatis ditandai.
  function importRawVillage(o, typedName) {
    const k = normTagKey(o.tag);
    if (!okTag(k)) return 'Ekspor desa ini tidak memuat tag pemain yang valid. Pastikan yang ditempel adalah hasil Ekspor Data Desa dari game, utuh dari awal sampai akhir.';
    const newMark = markKey(k);
    const all = vAll(); all[k] = { json: o, saved: Date.now() };
    if (!vStore(all)) return 'Gagal menyimpan: penyimpanan browser penuh atau diblokir.';
    const typed = String(typedName || '').trim();
    if (typed) setLocalName(k, typed); else { const en = nameFromJson(o), L = typeof ltGet === 'function' ? ltGet()[k] : null; if (en && !(L && L.name)) setLocalName(k, en); }
    { const known = pname(k, o), L0 = typeof ltGet === 'function' ? ltGet()[k] : null; if (known && !(L0 && L0.name)) setLocalName(k, known, true); }   // nama dari data klan ikut tersimpan di HP
    VSEL = k; scheduleNotifs();
    if (typeof window.__renderPlayers === 'function') window.__renderPlayers();
    const who = pname(k), n = findTimers(o).length;
    return `Berhasil: ekspor desa dari game disimpan untuk ${who ? who + ' ' : ''}#${k}${newMark ? ' (pemain otomatis ditandai)' : ''}: ${n} upgrade berjalan.${who ? '' : ' Nama pemain belum diketahui. Isi kolom Nama pemain lalu Impor lagi agar namanya tampil.'}`;
  }
  // Cadangan aplikasi (hasil tombol Ekspor data desa): nama dan tag tiap pemain dipulihkan persis seperti saat dicadangkan.
  function importAppBackup(o) {
    const P = isObj(o.pemain) ? o.pemain : {}, all = vAll(), got = []; let skipped = 0, desa = 0;
    Object.keys(P).forEach(key => {
      const k = normTagKey(key), e = P[key];
      if (!okTag(k) || !isObj(e)) { skipped++; return; }
      markKey(k);
      const nm = String(e.nama || (isObj(e.profil) && e.profil.name) || '').trim();
      if (nm) setLocalName(k, nm);
      const d = e.desa;
      if (isObj(d) && (Array.isArray(d.buildings) || Array.isArray(d.heroes))) {
        if (d.tag && normTagKey(d.tag) !== k) skipped++;   // tag di data tidak cocok dengan kuncinya: jangan dicampur
        else { const t = Date.parse(e.desaDisimpan), at = isNaN(t) ? Date.now() : t; if (!all[k] || num(all[k].saved) <= at) { all[k] = { json: d, saved: at }; desa++; } }
      }
      got.push(k);
    });
    if (Array.isArray(o.penanda)) o.penanda.forEach(t => { const k = normTagKey(t); if (okTag(k)) markKey(k); });
    if (isObj(o.tagLokal) && typeof ltGet === 'function' && typeof ltSet === 'function') {
      const cur = ltGet(); let ch = false;
      Object.keys(o.tagLokal).forEach(key => { const k = normTagKey(key), l = o.tagLokal[key]; if (!okTag(k) || !isObj(l) || cur[k]) return; cur[k] = { name: String(l.name || '').slice(0, 40), note: String(l.note || '').slice(0, 120), saved: Date.now() }; markKey(k); ch = true; });
      if (ch) ltSet(cur);
    }
    if (!vStore(all)) return 'Gagal menyimpan: penyimpanan browser penuh atau diblokir.';
    if (got.length) VSEL = got[0];
    scheduleNotifs();
    if (typeof window.__renderPlayers === 'function') window.__renderPlayers();
    if (!got.length) return 'Cadangan ini tidak berisi pemain yang bisa dipulihkan.';
    const list = got.slice(0, 5).map(pshow).join(', ') + (got.length > 5 ? `, +${got.length - 5} lainnya` : '');
    return `Berhasil: cadangan dipulihkan untuk ${got.length} pemain (${list}), ${desa} data desa.${skipped ? ` ${skipped} entri dilewati karena tag tidak valid.` : ''}`;
  }
  // Satu pintu impor: ekspor desa dari game atau cadangan aplikasi, dikenali otomatis.
  function importBackup(text, typedName) {
    let o; try { o = JSON.parse(String(text || '').trim()); } catch (e) { return 'Bukan JSON yang valid. Salin seluruh teks hasil Ekspor Data Desa dari game.'; }
    if (isObj(o) && isObj(o.pemain)) return importAppBackup(o);
    const v = parseVillage(text);
    return v.ok ? importRawVillage(v.obj, typedName) : v.err;
  }
  let BKMSG = '', BKTXT = '', BKNAME = '';
  function restoreHtml() {
    return `<h3 class="sub-h">Impor data desa</h3><div class="small">Tempel hasil <b>Ekspor Data Desa</b> dari game, atau berkas cadangan dari aplikasi ini. Tag dan nama pemain dibaca otomatis dari isinya, dan pemain langsung ditandai.</div>
      <textarea id="bkTxt" rows="4" style="width:100%;margin-top:8px" placeholder="Tempel di sini (teks panjang yang diawali tanda {)" aria-label="Data desa atau cadangan">${esc(BKTXT)}</textarea>
      <input id="bkName" type="text" maxlength="40" value="${esc(BKNAME)}" placeholder="Nama pemain (opsional)" aria-label="Nama pemain" style="width:100%;box-sizing:border-box;margin-top:8px">
      <div class="setbtns"><button type="button" data-act="bkpaste">Impor</button><button type="button" data-act="bkfile">Buka berkas (.json)</button></div>
      ${BKMSG ? `<div class="note">${esc(BKMSG)}</div>` : ''}`;
  }
  const backupHtml = () => `<h3 class="sub-h">Ekspor data desa</h3>
    <div class="small">Simpan semua pemain yang kamu tandai (nama, tag, dan data desanya) jadi satu berkas di HP, berguna saat ganti HP atau pasang ulang. Tidak butuh internet. Untuk memulihkan, ketuk <b>Buka berkas (.json)</b> di kotak Impor di atas.</div>
    <div class="setbtns"><button type="button" data-act="vexp">Ekspor data desa</button></div>`;
  // Dashboard Clan berbayar dijual lewat chat Facebook (belum dirilis di Play Store).
  const FB_URL = 'https://www.facebook.com/share/1HRtGsSXst/';
  const fbBtn = '<a class="fbbtn" href="' + FB_URL + '" target="_blank" rel="noopener noreferrer">Pesan lewat chat Facebook</a>';
  const freeBox = () => `<div class="freebox"><b>Gratis</b><span>Tab Desa (pantau upgrade yang berjalan, offline di HP) gratis. Dashboard Clan lengkap, yaitu war, anggota, dan semua alat lainnya, berbayar dan dipesan lewat chat Facebook.</span>${fbBtn}</div>`;
  const guideVillage = open => `<details class="pfold"${open ? ' open' : ''}><summary>Cara pakai (3 langkah)</summary>
    <ol class="planlist">
      <li><b>Di game:</b> buka Pengaturan, lalu Pengaturan lainnya, lalu <b>Ekspor data desa</b>. Salin teks hasilnya.</li>
      <li><b>Di sini:</b> tempel teks itu di kotak <b>Impor data desa</b> (di bawah), lalu tekan <b>Impor</b>. Nama dan tag pemain terbaca otomatis.</li>
      <li><b>Selesai:</b> timer upgrade muncul, dan kamu dapat notifikasi saat upgrade selesai. Untuk memperbarui, ulangi langkah 1 dan 2 (atau ketuk tombol <b>Sync</b>).</li>
    </ol>
    <div class="small">Data desa hanya disimpan di HP ini dan tidak dikirim ke server. Mengimpor ulang pemain yang sama menggantikan data lamanya.</div></details>`;
  const homeGuide = () => `<div class="plans">
      <div class="plan plan-free"><b>Gratis</b><span>Pantau upgrade desa yang berjalan (tab <b>Desa</b>): impor data desa, timer, notifikasi saat selesai, dan ekspor. Semuanya jalan offline di HP.</span></div>
      <div class="plan plan-paid"><b>Berbayar</b><span>Dashboard Clan lengkap: war, CWL, donasi, anggota, Capital Raid, notifikasi klan, dan semua alat lain di daftar ini. Dipesan lewat chat Facebook, belum ada di Play Store.</span>${fbBtn}</div>
    </div>
    <details class="pfold" open><summary>Baru pakai Alat? Mulai dari sini</summary>
    <ol class="planlist">
      <li><b>Tambahkan pemain.</b> Impor data desa di tab Desa, pemain (tag dan nama) ditambahkan otomatis.${markedKeys().length ? ` Sekarang ada ${markedKeys().length} pemain.` : ''}</li>
      <li><b>Pilih alat sesuai kebutuhan</b> dari daftar di atas. Contoh: sisa upgrade pemain di <b>Ringkasan</b> atau <b>Planner</b>; timer upgrade dan notifikasi di <b>Desa</b>; dua pemain berdampingan di <b>Bandingkan</b>; event dan raid di <b>Jadwal</b>.</li>
      <li><b>Khusus Desa:</b> tempel hasil Ekspor Data Desa dari game. Panduan langkahnya ada di dalam tab Desa.</li>
    </ol></details>`;
  function buildIcs(list) {
    const z = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ic = x => String(x).replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cunyuk-of-war//upgrade//ID', 'CALSCALE:GREGORIAN'];
    list.forEach(u => L.push('BEGIN:VEVENT', 'UID:' + u.key.replace(/[^A-Za-z0-9|]/g, '') + '@cunyuk-of-war', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(u.at), 'DTEND:' + z(u.at + 600000),
      'SUMMARY:' + ic('Upgrade selesai: ' + u.who + ' - ' + u.label), 'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:' + ic(u.label), 'END:VALARM', 'END:VEVENT'));
    L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
  }
  // Notifikasi lokal (tanpa server push): hanya berbunyi selama PWA/peramban masih hidup. Android Chrome melarang
  // `new Notification()`, jadi notifikasi dikirim lewat service worker (sw.js). Bunyi dan getar dibuat dua lapis:
  // (1) opsi `vibrate` pada notifikasi sistem (bunyinya mengikuti pengaturan kanal notifikasi di Android), dan
  // (2) bunyi bip + getar dari halaman sendiri saat halaman sedang terbuka.
  const SCHED = new Map();
  const NKEY = 'cow_notif_v1';
  const nGet = () => { try { const o = JSON.parse(localStorage.getItem(NKEY) || '{}') || {}; return { sound: true, vibrate: true, seen: o.seen || {}, done: o.done || {} }; } catch (e) { return { sound: true, vibrate: true, seen: {}, done: {} }; } };
  const nSet = o => { try { localStorage.setItem(NKEY, JSON.stringify(o)); } catch (e) { /* abaikan */ } };
  const VIB = [400, 200, 400, 200, 800];
  let ACTX = null;
  // AudioContext baru boleh bunyi setelah ada sentuhan pengguna; dibuka saat tombol notifikasi/tes diketuk.
  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!ACTX) ACTX = new AC();
      if (ACTX.state === 'suspended') ACTX.resume();
    } catch (e) { /* abaikan */ }
  }
  function beep() {
    try {
      if (!ACTX) return; if (ACTX.state === 'suspended') ACTX.resume();
      const t0 = ACTX.currentTime;
      [0, 0.35, 0.7].forEach((d, i) => {
        const o = ACTX.createOscillator(), g = ACTX.createGain();
        o.type = 'sine'; o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.28);
        o.connect(g); g.connect(ACTX.destination); o.start(t0 + d); o.stop(t0 + d + 0.3);
      });
    } catch (e) { /* abaikan */ }
  }
  function alertLocal() {
    const o = nGet();
    if (o.sound) beep();
    if (o.vibrate) { try { if (navigator.vibrate) navigator.vibrate(VIB); } catch (e) { /* abaikan */ } }
  }
  let SWREG = null;
  function registerSW() {
    if (SWREG) return SWREG;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    SWREG = navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch(() => null);
    return SWREG;
  }
  async function notify(title, body, tag) {
    const o = nGet();
    const opts = { body, tag: tag || 'cow-upgrade', renotify: true, requireInteraction: true, silent: false, icon: 'assets/icon-192.png', data: { url: './#alat' } };
    if (o.vibrate) opts.vibrate = VIB;
    try {
      const reg = await registerSW();
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
    } catch (e) { /* lanjut ke cara lama */ }
    try { new Notification(title, opts); return true; } catch (e) { return false; }
  }
  // Di aplikasi Android, alarm dipasang di sisi native (AlarmManager) sehingga tetap berbunyi tepat waktu
  // walau aplikasi ditutup atau HP tidur. Timer JS di bawah hanya dipakai di peramban/PWA biasa.
  const NB = () => (typeof window !== 'undefined' && window.AndroidBridge && window.AndroidBridge.syncSchedule) ? window.AndroidBridge : null;
  // Kirim daftar pemain yang ditandai (☆ Tandai + PLAYER_TAGS) ke sisi native. Notifikasi upgrade hero dari feed hanya
  // ditampilkan untuk mereka. Baru dikirim setelah players.json termuat (window.PMARKED terisi) agar daftar tidak
  // sementara terpangkas; bila gagal dimuat, daftar lama di native dipertahankan.
  let LASTMARK = '';
  function syncMarked() {
    const nb = NB(); if (!nb || typeof nb.syncMarked !== 'function' || !Array.isArray(window.PMARKED)) return false;
    try {
      const j = JSON.stringify(markedKeys().sort());
      if (j === LASTMARK) return false;
      nb.syncMarked(j); LASTMARK = j; return true;
    } catch (e) { return false; }
  }
  window.__syncMarked = syncMarked;
  // Nama dicari saat notifikasi dikirim (data pemain sudah termuat); tag '#...' tidak pernah ditampilkan.
  function upBody(u) {
    let nm = ''; try { const tg = u.k || (u.who && u.who[0] === '#' ? u.who.slice(1) : ''); nm = tg ? pname(tg) : ''; } catch (e) { /* abaikan */ }
    if (!nm && u.who && u.who[0] !== '#') nm = u.who;
    return nm ? `${nm}: ${u.label}` : u.label;
  }
  function fire(u) {
    const o = nGet(); if (o.done[u.key]) return;
    o.done[u.key] = Date.now(); nSet(o);
    alertLocal();
    notify('Upgrade selesai', upBody(u), u.key);
  }
  // Timer panjang bisa tertunda/dibekukan saat layar mati, jadi tiap kali halaman hidup lagi kita periksa
  // upgrade yang selesai selagi halaman tidur (hanya yang pernah tercatat akan datang, agar yang lama tidak berbunyi).
  function checkDue() {
    if (NB()) return 0;   // alarm native sudah menangani yang terlewat
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const o = nGet(), now = Date.now(); let n = 0;
    Object.keys(o.seen).forEach(k => {
      const u = o.seen[k];
      if (u.at <= now && now - u.at < 6 * 36e5 && !o.done[k]) { fire({ key: k, k: u.k, who: u.who, label: u.label }); n++; }
    });
    return n;
  }
  function scheduleNotifs() {
    syncMarked();   // tidak bergantung pada izin notifikasi
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0;
    const now = Date.now(), live = new Set(), o = nGet(), nb = NB(), nlist = [];
    upcoming(now).forEach(u => {
      live.add(u.key); const ms = u.at - now;
      if (!o.seen[u.key]) o.seen[u.key] = { at: u.at, k: u.k, who: u.who, label: u.label };
      if (nb) { if (ms > 0) nlist.push({ key: u.key, at: u.at, title: 'Upgrade selesai', body: upBody(u) }); return; }
      if (SCHED.has(u.key) || ms <= 0 || ms > 2147483647) return;
      SCHED.set(u.key, setTimeout(() => { SCHED.delete(u.key); fire(u); }, ms));
    });
    [...SCHED.keys()].forEach(k => { if (!live.has(k)) { clearTimeout(SCHED.get(k)); SCHED.delete(k); } });
    // buang catatan lama (> 3 hari) supaya penyimpanan tidak membengkak
    ['seen', 'done'].forEach(f => Object.keys(o[f]).forEach(k => { const t = f === 'seen' ? o.seen[k].at : o.done[k]; if (now - t > 3 * 864e5) delete o[f][k]; }));
    nSet(o);
    if (nb) { try { nb.syncSchedule(JSON.stringify(nlist)); } catch (e) { /* abaikan */ } return nlist.length; }
    return SCHED.size;
  }
  // Status mode latar belakang (hanya ada di aplikasi Android): alarm tepat waktu + pemantauan klan.
  function bgStatus() { try { const b = window.AndroidBridge; return b && b.backgroundStatus ? JSON.parse(b.backgroundStatus()) : null; } catch (e) { return null; } }
  // ---------- Pengaturan notifikasi: satu kartu rapi (izin, latar belakang, jenis notifikasi) ----------
  const FEEDVIEWS = [['war', 'War & CWL', 'Awal, akhir, pengingat serangan, liga'], ['capital', 'Capital Raid', 'Pengingat dan hasil raid'],
    ['members', 'Anggota', 'Masuk, keluar, tidak aktif'], ['players', 'Pemain', 'Legend, upgrade hero (hanya pemain ditandai), daftar pantauan'],
    ['alat', 'Event & jadwal', 'Event resmi mulai dan hampir berakhir']];
  function settingsHtml(perm) {
    const st = bgStatus();
    const badge = (ok, y, n) => `<span class="badge ${ok ? 'good' : 'warn'}">${ok ? y : n}</span>`;
    const row = (title, sub, right, cls) => `<div class="setrow${cls ? ' ' + cls : ''}"><div class="setl"><b>${title}</b>${sub ? `<div class="small">${sub}</div>` : ''}</div><div class="setr">${right}</div></div>`;
    const sw = (act, on, extra, dis) => `<input type="checkbox" class="sw" role="switch" data-act="${act}" ${extra || ''} ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>`;
    const notifOk = st ? st.notif : perm === 'granted';
    let h = row('Izin notifikasi', perm === 'denied' && !st ? 'Diblokir di peramban. Ubah lewat setelan situs.' : '',
      notifOk ? badge(true, 'Aktif', '') : perm === 'tidak didukung' ? badge(false, '', 'Tidak didukung') : '<button type="button" data-act="vnotif">Izinkan</button>');
    if (st) {
      h += row('Alarm tepat waktu', 'Upgrade berbunyi tepat waktu walau aplikasi ditutup', badge(st.exact, 'Aktif', 'Belum'));
      h += row('Bebas penghemat baterai', 'Mencegah sistem menghentikan pemantauan', badge(st.battery, 'Aktif', 'Belum'));
      h += row('Pemantauan klan', 'Notifikasi war, CWL, raid, dan anggota di latar belakang', sw('vbgtoggle', st.enabled));
      FEEDVIEWS.forEach(([v, t, d]) => { h += row(t, d, sw('vview', st.views ? st.views[v] !== false : true, `data-v="${v}"`, !st.enabled), 'sub'); });
      const clans = typeof DATA !== 'undefined' && DATA && DATA.clans ? Object.entries(DATA.clans) : [];
      if (clans.length > 1 && window.AndroidBridge && window.AndroidBridge.feedClanOn) {
        h += row('Klan yang diberi notifikasi', 'Pilih klan yang boleh memunculkan notifikasi', '', '');
        clans.forEach(([tag, c]) => {
          let on = true; try { on = !!window.AndroidBridge.feedClanOn(tag); } catch (e) { /* abaikan */ }
          h += row(esc((c && c.name) || tag), esc(tag), sw('vclan', on, `data-c="${esc(tag)}"`, !st.enabled), 'sub');
        });
      }
    }
    const missing = st && (!st.exact || !st.battery || !st.notif);
    return `<h3 class="sub-h">Pengaturan notifikasi</h3><div class="setcard">${h}</div>` +
      `<div class="setbtns">${missing ? '<button type="button" data-act="vbg">Perbaiki izin</button>' : ''}<button type="button" data-act="vtest">Tes notifikasi</button></div>`;
  }
  async function testNotif() {
    unlockAudio(); alertLocal();
    const ok = await notify('Tes notifikasi', 'Bila kamu melihat ini, notifikasi upgrade akan muncul.', 'cow-test');
    return ok ? 'Tes terkirim. Cek bilah notifikasi; bila tidak ada, buka Setelan Android > Aplikasi > Chrome/Dashboard Klan > Notifikasi dan nyalakan, termasuk bunyi dan getar.' : 'Peramban menolak menampilkan notifikasi.';
  }

  let VSEL = '', VMSG = '', WALLT = '', WALLC = null, WALLMAX = {};
  // Durasi penuh upgrade (detik ke level N) dan nama ID dari paket clash-of-clans-data (lewat Kuswaa/clash-timers).
  let UTIMES = null, NAMES = null;
  async function loadUT() {
    if (UTIMES) return;
    const g = async f => { try { const r = await fetch('assets/data/' + f); return r.ok ? await r.json() : {}; } catch (e) { return {}; } };
    const [u, n] = await Promise.all([g('upgrade_times.json'), g('names.json')]);
    UTIMES = u.times || u || {}; NAMES = n.names || n || {};
  }
  async function loadWalls() {
    if (WALLC) return;
    try { const r = await fetch('assets/data/walls.json'); const j = r.ok ? await r.json() : {}; WALLC = j.costs || {}; WALLMAX = j.maxByTh || {}; } catch (e) { WALLC = {}; }
  }
  // Daftar "Upgrade berjalan" bergaya panel Bangunan dan Pahlawan di game COC:
  // baris hijau dengan bar, ikon + lencana level, nama, dan sisa waktu di kanan.
  // Total durasi upgrade tidak ada di ekspor game (hanya sisa timer), jadi bar menunjukkan kemajuan relatif terhadap upgrade terlama:
  // sisa waktu kecil (hampir selesai) -> bar hampir penuh, sisa waktu besar (baru mulai) -> bar hampir kosong.
  const UP_ICON = { 'Barbarian King': '👑', 'Archer Queen': '🏹', 'Grand Warden': '📖', 'Royal Champion': '🛡️', 'Minion Prince': '😈' };
  const SEC_ICON = { buildings: '🏗️', buildings2: '🔧', heroes: '⚔️', heroes2: '🤖', units: '🪖', units2: '🪖', spells: '🧪', siege_machines: '🚀', pets: '🐾', equipment: '🔨', traps: '💣', traps2: '💣' };
  // Ikon asli COC. Utama: berkas lokal assets/icons/<data-id>.webp (dari clash-of-clans-data, 64x64; lihat assets/icons/NOTICE.txt),
  // dicocokkan lewat ID game. Cadangan: ClashKing Assets (pola URL pahlawan/pet/equipment masih dugaan). Bila semua gagal: emoji.
  const UP_DIR = { heroes: 'heroes', units: 'troops', siege_machines: 'troops', pets: 'pets', spells: 'spells', equipment: 'equipment' };
  function coIcon(sec, name, fallback, data) {
    const c = [];
    [].concat(data == null ? [] : data).forEach(d => { const id = String(d == null ? '' : d); if (/^\d{7,9}$/.test(id)) c.push(`assets/icons/${id}.webp`); });
    const dir = UP_DIR[sec], base = typeof ICON_BASE === 'string' ? ICON_BASE : 'https://assets.clashk.ing/';
    const n = String(name || '').replace(/~$/, '').toLowerCase().replace(/[.?’']/g, '').trim();
    if (dir && n && n.charAt(0) !== '#') {
      const u = n.replace(/ /g, '_'), h = n.replace(/ /g, '-');
      [u, h].forEach(k => { c.push(base + `${dir}/${k}/icon.webp`, base + `${dir}/${k}/icon.png`); if (sec === 'spells' || sec === 'equipment') c.push(base + `${dir}/${k}.webp`, base + `${dir}/${k}.png`); });
    }
    if (!c.length) return `<span class="upc-emo">${fallback}</span>`;
    return `<img class="upc-img" alt="" loading="lazy" src="${esc(c[0])}" data-s="${esc(c.join('|'))}" data-i="0" data-f="${esc(fallback)}" onerror="var a=this.dataset.s.split('|'),i=+this.dataset.i+1;if(i<a.length){this.dataset.i=i;this.src=a[i]}else{var e=document.createElement('span');e.className='upc-emo';e.textContent=this.dataset.f;this.replaceWith(e)}">`;
  }
  // Panel upgrade bergaya game (port dari widget Kuswaa/clash-timers): kepala pemain, Builders / Lab / Pets / dst.
  // Tiap baris: ikon, tag GOBLIN, nama, level tujuan, jam + hitung mundur (tickUp tiap detik), dan tombol di kanan.
  const UP_LANES = [
    { id: 'builders', label: 'Builders', secs: ['buildings', 'heroes', 'traps', 'guardians'] },
    { id: 'lab', label: 'Lab', secs: ['units', 'spells', 'siege_machines'], idle: ['Laboratory', 1000007] },
    { id: 'pets', label: 'Pets', secs: ['pets'], idle: ['Pet House', 1000068] },
    { id: 'equip', label: 'Blacksmith', secs: ['equipment'] },
    { id: 'bb', label: 'Builder Base', secs: ['buildings2', 'heroes2', 'units2', 'traps2'] },
  ];
  const GRACE = 2000;   // seperti widget: sisa 2 detik atau kurang dianggap sudah selesai
  const isDone = (at, now) => at - now <= GRACE;
  const pad2 = n => String(n).padStart(2, '0');
  // 1d 01:27:47 bila lebih dari sehari, selain itu 23:57:50 (jam tanpa nol di depan).
  function cdText(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return d ? `${d}d ${pad2(h)}:${pad2(m)}:${pad2(x)}` : `${h}:${pad2(m)}:${pad2(x)}`;
  }
  // Pil potion: 42m, 1h 50m, 2h (menit dibulatkan ke atas).
  function pillText(ms) {
    const mi = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(mi / 60), m = mi % 60;
    return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  // Durasi penuh upgrade ke level lvl+1 dari tabel; null bila tidak ada (lalu bar dibuat relatif).
  function fullTime(t) {
    const lv = Number(t.lvl); if (!UTIMES || isNaN(lv)) return null;
    const v = (UTIMES[t.data] || {})[lv + 1]; return v > 0 ? v * 1000 : null;
  }
  // Bar = bagian upgrade yang sudah lewat (1 - sisa/durasi penuh). Tanpa durasi penuh: relatif terhadap upgrade terlama.
  function fillOf(at, full, now, maxAt) {
    const left = at - now; if (left <= GRACE) return 100;
    if (full && full >= left) return Math.max(3, Math.min(100, (1 - left / full) * 100));
    return maxAt - now <= 0 ? 100 : Math.max(6, Math.min(100, (maxAt - at) / (maxAt - now) * 100));
  }
  const upFill = (t, now, maxAt) => fillOf(t.at, fullTime(t) || 0, now, maxAt);
  // Info desa dari ekspor: total builder (gubuk + B.O.B), potion builder aktif, helper yang sedang bekerja.
  function villageInfo(rec, tm, now) {
    const o = (rec && rec.json) || {}, bl = Array.isArray(o.buildings) ? o.buildings.filter(b => b && typeof b === 'object') : [];
    const huts = bl.filter(b => b.data === 1000015).reduce((a, b) => a + (b.cnt == null ? 1 : num(b.cnt)), 0), bob = bl.some(b => b.data === 1000064);
    const base = num(o.timestamp) > 0 ? num(o.timestamp) * 1000 : num(rec && rec.saved), bb = num(o.boosts && o.boosts.builder_boost);
    const potionAt = bb > 0 ? base + bb * 1000 : 0;
    const run = (secs) => (tm || []).find(t => secs.includes(t.sec) && t.helper && !isDone(t.at, now));
    const short = t => { const n = (t.label.split(': ')[1] || '').replace(/ L\d+ → L\d+$/, '').replace(/~$/, ''); return t.sec === 'heroes' ? n.split(' ').pop() : n; };
    const ap = run(UP_LANES[0].secs), as = run(UP_LANES[1].secs);
    return { total: huts > 0 ? huts + (bob ? 1 : 0) : null, potionAt: potionAt > now ? potionAt : 0, apprentice: ap || null, assistant: as || null, apName: ap ? short(ap) : '', asName: as ? short(as) : '' };
  }
  const CLK = '<svg class="upr-clk" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.5" fill="#B68A22" stroke="#6B4A10"/><circle cx="6" cy="6" r="4.1" fill="#E8C56A"/><circle cx="6" cy="6" r="3.3" fill="#fff"/><path d="M6 3.8V6l1.6.9" fill="none" stroke="#6B4A10" stroke-linecap="round"/></svg>';
  const ARW = '<svg class="upr-arw" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.2 5h7.2M5.6 2.2 8.4 5 5.6 7.8" fill="none" stroke="#E9DCC8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SYNC = '<svg class="upp-syn" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5A3500" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>';
  const hIcon = f => `<img class="upr-h" alt="" src="assets/icons/${f}.webp">`;
  function upgradeCards(tm, now, wib, ctx) {
    if (!tm || !tm.length) return '';
    ctx = ctx || {};
    const vis = tm.map((t, i) => ({ t, i })).filter(x => !(x.t.goblin && isDone(x.t.at, now)));   // baris Goblin hilang setelah selesai
    const maxAt = Math.max.apply(null, tm.map(t => t.at));
    const row = ({ t, i }) => {
      const done = isDone(t.at, now), left = t.at - now;
      const m = /^(.*?): (.*?)(?: L(\d+) → L(\d+))?$/.exec(t.label) || [], name = m[2] || t.label, to = m[4], isNew = m[3] === '0';
      const emo = UP_ICON[String(name).replace(/~$/, '')] || SEC_ICON[t.sec] || '🔨', icon = coIcon(t.sec, name, emo, [t.data, t.type, t.parent]);
      const ap = ctx.apprentice === t, as = ctx.assistant === t;
      const btn = done || t.sec === 'pets' ? '<span class="upr-sp"></span>'
        : ap ? `<span class="upr-hb" title="Builder's Apprentice bekerja di sini">${hIcon('apprentice')}</span>`
        : as ? `<span class="upr-hb" title="Lab Assistant bekerja di sini">${hIcon('lab_assistant')}</span>`
        : `<button type="button" class="upr-plus" data-act="vics1" data-i="${i}" title="Tambah ke kalender" aria-label="Tambah ${esc(name)} ke kalender">+</button>`;
      return `<div class="upr${done ? ' upr-done' : ''}" data-i="${i}" data-at="${t.at}" data-full="${fullTime(t) || 0}" style="--fill:${upFill(t, now, maxAt).toFixed(1)}%" title="${esc((m[1] ? m[1] + ' · ' : '') + 'selesai ' + wib(t.at))}">
        <span class="upr-ico" aria-hidden="true">${icon}</span>
        <span class="upr-main">${t.goblin ? '<em class="upr-gob">GOBLIN</em>' : ''}<b class="upr-name">${esc(name)}</b>${to ? (isNew ? '<i class="upr-lv">(new)</i>' : `<i class="upr-lv">${ARW}${esc(to)}</i>`) : ''}</span>
        <span class="upr-time">${CLK}<b data-cd>${done ? 'Selesai' : esc(cdText(left))}</b></span>
        ${btn}
      </div>`;
    };
    const idleRow = ([n, id]) => `<div class="upr upr-idle"><span class="upr-ico" aria-hidden="true">${coIcon('buildings', n, '🏛️', id)}</span><span class="upr-main"><b class="upr-name">${esc(n)}</b></span><span class="upr-time"><b>Idle</b></span><span class="upr-sp"></span></div>`;
    const sections = UP_LANES.map(L => {
      const rows = vis.filter(x => L.secs.includes(x.t.sec));
      if (!rows.length && !L.idle) return '';
      let head = esc(L.label), pill = '';
      if (L.id === 'builders') {
        const busy = rows.filter(x => !x.t.goblin && !isDone(x.t.at, now)).length, gob = rows.some(x => x.t.goblin);
        head = `Builders ${busy}${ctx.total ? '/' + ctx.total : ''}${gob ? ' <em class="upp-gob">+ Goblin</em>' : ''}`;
        if (ctx.potionAt) pill = `<span class="upp-pill" data-pill="${ctx.potionAt}" title="Builder Potion aktif">${hIcon('builder_potion')}<b>${esc(pillText(ctx.potionAt - now))}</b></span>`;
      }
      return `<div class="upp-sec"><span>${head}</span>${pill}</div>${rows.length ? rows.map(row).join('') : idleRow(L.idle)}`;
    }).join('');
    const others = vis.filter(x => !UP_LANES.some(L => L.secs.includes(x.t.sec)));
    const rest = others.length ? `<div class="upp-sec"><span>Lainnya</span></div>${others.map(row).join('')}` : '';
    const base = num(ctx.at), synced = base > 0 && typeof ago === 'function' ? `sinkron ${esc(ago(base))}` : '';
    const idl = t => `<span class="upp-idle">${t}</span>`;
    const helpers = ctx.apprentice && ctx.assistant ? `Helpers: ${esc(ctx.apName)} · ${esc(ctx.asName)}`
      : `${ctx.apprentice ? 'Apprentice: ' + esc(ctx.apName) : idl('Apprentice idle')} · ${ctx.assistant ? 'Assistant: ' + esc(ctx.asName) : idl('Assistant idle')}`;
    return `<div class="upp" data-max="${maxAt}">
      <div class="upp-h"><span class="upp-who"><b>${esc(ctx.name || 'Pemain')}</b>${ctx.tag ? ` <small class="upp-tag">${esc(ctx.tag)}</small>` : ''}${ctx.th ? ` <i>TH${esc(ctx.th)}</i>` : ''}</span><button type="button" class="upp-sync" data-act="vsync" title="Tempel ekspor desa terbaru">${SYNC}Sync</button></div>
      ${sections}${rest}
      <div class="upp-f"><span>${helpers}</span><span>${synced}</span></div>
    </div>
    <div class="small note-s">Bar hijau = bagian upgrade yang sudah lewat, dihitung dari durasi penuh upgrade (bila tidak ada di tabel, perkiraan relatif terhadap upgrade terlama). Tombol + menambahkan waktu selesai upgrade itu ke kalender. Ikon: milik Supercell, tidak resmi dan tidak didukung Supercell.</div>`;
  }

  function tabVillage() {
    const keys = markedKeys();
    if (!keys.length) return empty();
    if (!keys.some(k => same(k, VSEL))) VSEL = keys[0];
    const all = vAll(), k = normTagKey(VSEL), rec = all[k], now = Date.now();
    const wib = t => new Date(t).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
    const perm = typeof Notification === 'undefined' ? 'tidak didukung' : Notification.permission;
    const tm = rec ? finishTimes(rec, merged('#' + k)) : [];
    const ws = rec ? wallStats(rec.json) : null;
    let wallHtml = '';
    if (ws && ws.total) {
      const lv = Object.keys(ws.by).map(Number).sort((a, b) => b - a), vth = num(((rec.json.buildings || []).find(b => b && b.data === 1000001) || {}).lvl), t = num(WALLT) > 0 ? num(WALLT) : num(WALLMAX[vth]);
      const wc = t > 0 ? wallCost(ws.by, t, WALLC || {}) : null;
      wallHtml = `<h3 class="sub-h">Tembok</h3><div class="small">Total ${fmt(ws.total)} tembok · ${lv.map(l => `L${l}: ${fmt(ws.by[l])}`).join(' · ')}</div>
        <div class="toolbar"><input type="number" min="1" data-f="wallt" value="${num(WALLT) > 0 ? num(WALLT) : ''}" placeholder="Target level (kosong = maks TH)" aria-label="Target level tembok"></div>
        ${wc ? `<div class="small">${fmt(wc.below)} tembok di bawah L${t}. ${wc.missing.length ? `Biaya belum bisa dihitung: level ${wc.missing.join(', ')} belum diisi di <code>assets/data/walls.json</code>.` : `Total biaya: <b>${fmt(wc.total)}</b> Gold atau Elixir.`}</div>` : '<div class="small">Isi target level untuk menghitung biaya.</div>'}`;
    } else if (rec) wallHtml = '<div class="small">Tidak ada tembok di data ini.</div>';
    return `${freeBox()}${guideVillage(!rec)}
      <div class="toolbar"><select data-f="vsel" aria-label="Pilih pemain">${keys.map(x => `<option value="${esc(x)}"${same(x, VSEL) ? ' selected' : ''}>${esc(pshow(x))}${all[x] ? ' ✓' : ''}</option>`).join('')}</select>${rec ? '<button type="button" data-act="vdel">Hapus data desa ini</button>' : ''}</div>
      ${VMSG ? `<div class="note">${esc(VMSG)}</div>` : ''}
      ${rec ? `<div class="small">Tersimpan ${esc(new Date(rec.saved).toLocaleString('id-ID'))}${num(rec.json.timestamp) > 0 ? ` · ekspor game ${esc(new Date(num(rec.json.timestamp) * 1000).toLocaleString('id-ID'))}` : ''}</div>` : ''}
      <h3 class="sub-h">Upgrade berjalan</h3>
      ${tm.length ? upgradeCards(tm, now, wib, Object.assign({ name: pname(k) || 'Pemain', tag: '#' + k, th: num((merged('#' + k) || {}).th) || num(((rec.json.buildings || []).find(b => b && b.data === 1000001) || {}).lvl) || '', at: num(rec.json.timestamp) > 0 ? num(rec.json.timestamp) * 1000 : rec.saved }, villageInfo(rec, tm, now))) : `<div class="small">${rec ? 'Tidak ada upgrade berjalan di data ini.' : 'Belum ada data desa untuk pemain ini.'}</div>`}
      ${window.AndroidBridge ? '' : settingsHtml(perm)}
      ${restoreHtml()}
      ${backupHtml()}
      ${wallHtml}`;
  }

  // ---------- Ore, Magic Items, B.O.B, Syarat TH ----------
  let ORE = null, BOB = null, THREQ = null, MAGIC = null;
  let OREP = '', OREST = { s: '', g: '', t: '' }, MAGP = '', CHKP = '';
  async function loadAux() {
    if (ORE) return;
    const g = async f => { try { const r = await fetch('assets/data/' + f); return r.ok ? await r.json() : {}; } catch (e) { return {}; } };
    [ORE, BOB, THREQ, MAGIC] = await Promise.all([g('ore.json'), g('bob.json'), g('th_requirements.json'), g('magic_items.json')]);
  }
  // Ore: biaya dari level sekarang ke maks. Common maks 18, epic maks 27 (dari batas API). Level tanpa data dicatat di missing.
  function oreCost(l, max, ore) {
    const t = (ore && ore[num(max) > 18 ? 'epic' : 'common']) || {}, out = { shiny: 0, glowy: 0, starry: 0, missing: [] };
    for (let n = num(l) + 1; n <= num(max); n++) {
      const sh = t.shiny && t.shiny[n];
      if (sh == null) { out.missing.push(n); continue; }
      out.shiny += Number(sh); out.glowy += Number((t.glowy && t.glowy[n]) || 0); out.starry += Number((t.starry && t.starry[n]) || 0);
    }
    return out;
  }
  function oreSummary(p, ore) {
    const rows = analyze(p || {}).items.filter(i => i.kind === 'equip' && i.cap > 0)
      .map(i => Object.assign({ n: i.n, l: i.l, cap: i.cap, rar: i.cap > 18 ? 'epic' : 'common' }, oreCost(i.l, i.cap, ore)))
      .sort((a, b) => (b.shiny - a.shiny) || String(a.n).localeCompare(String(b.n)));
    const tot = rows.reduce((a, r) => ({ shiny: a.shiny + r.shiny, glowy: a.glowy + r.glowy, starry: a.starry + r.starry }), { shiny: 0, glowy: 0, starry: 0 });
    return { rows, tot, missing: rows.some(r => r.missing.length) };
  }
  function tabOre() {
    const pool = markedFull().sort(byName);
    if (!pool.length) return noFull();
    if (!pool.some(p => same(p.tag, OREP))) OREP = pool[0].tag;
    const p = pool.find(x => same(x.tag, OREP)), o = oreSummary(p, ORE), bar = `<div class="toolbar"><select data-f="orep" aria-label="Pilih pemain">${pickOptions(pool, OREP)}</select></div>`;
    if (!o.rows.length) return bar + '<div class="small">Belum ada peralatan hero yang tercatat untuk pemain ini.</div>';
    const st = { s: num(OREST.s), g: num(OREST.g), t: num(OREST.t) }, lack = (need, have) => Math.max(0, need - have);
    return `${bar}<div class="pcard"><div class="pc-head"><span><b class="pc-name">${esc(p.name)}</b> <span class="small">TH${esc(p.th || '?')}</span></span></div>
      <div class="small">Sisa ke maks: <b>${fmt(o.tot.shiny)}</b> Shiny · <b>${fmt(o.tot.glowy)}</b> Glowy · <b>${fmt(o.tot.starry)}</b> Starry</div>
      <div class="toolbar"><input type="number" min="0" data-f="ores" value="${esc(OREST.s)}" placeholder="Shiny kamu" aria-label="Shiny Ore yang dimiliki"><input type="number" min="0" data-f="oreg" value="${esc(OREST.g)}" placeholder="Glowy kamu" aria-label="Glowy Ore yang dimiliki"><input type="number" min="0" data-f="oret" value="${esc(OREST.t)}" placeholder="Starry kamu" aria-label="Starry Ore yang dimiliki"></div>
      ${(OREST.s !== '' || OREST.g !== '' || OREST.t !== '') ? `<div class="small">Kurang: <b>${fmt(lack(o.tot.shiny, st.s))}</b> Shiny · <b>${fmt(lack(o.tot.glowy, st.g))}</b> Glowy · <b>${fmt(lack(o.tot.starry, st.t))}</b> Starry</div>` : ''}</div>
      <div class="card tbl"><div class="table-wrap"><table><thead><tr><th>Peralatan</th><th>Level</th><th>Shiny</th><th>Glowy</th><th>Starry</th></tr></thead><tbody>${o.rows.map(r => `<tr><td>${esc(r.n)} <span class="small">${r.rar === 'epic' ? 'epic' : 'common'}</span></td><td>${r.l}/${r.cap}</td><td>${fmt(r.shiny)}</td><td>${fmt(r.glowy)}</td><td>${r.rar === 'epic' ? fmt(r.starry) : '–'}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="small note-s">Common maks level 18, epic maks level 27 (dari batas di profil). ${o.missing ? 'Ada level tanpa data di <code>assets/data/ore.json</code>, jadi total bisa kurang. ' : ''}Beberapa angka epic level 18 sampai 27 diturunkan dari total resmi, bukan tabel per level (lihat <code>ore.json</code>). Perangkat tidak tahu berapa ore yang kamu punya, isi sendiri di atas.</div>`;
  }

  // Magic Items: dari timer upgrade pada data desa. Buku hanya untuk upgrade yang sudah berjalan, jadi dipilih yang tersisa paling lama.
  function magicPlan(rec, now, p) {
    const t = finishTimes(rec, p).filter(x => x.at > now).map(x => Object.assign({ left: x.at - now }, x));
    const longest = f => t.filter(f).sort((a, b) => b.left - a.left)[0] || null;
    const busy = t.filter(x => (x.sec === 'buildings' || x.sec === 'heroes') && x.left >= 10 * 3600e3);
    return { bookBuilding: longest(x => x.sec === 'buildings'), bookHeroes: longest(x => x.sec === 'heroes' || x.sec === 'pets'), potion: { count: busy.length, saveMs: busy.length * 9 * 3600e3 } };
  }
  function tabMagic() {
    const keys = markedKeys(), all = vAll(), now = Date.now();
    if (!keys.length) return empty();
    if (!keys.some(k => same(k, MAGP))) MAGP = keys[0];
    const nameOf = x => { const m = merged('#' + x); return m && m.name ? m.name : 'Pemain'; }, rec = all[normTagKey(MAGP)];
    const mp = rec ? magicPlan(rec, now, merged('#' + normTagKey(MAGP))) : null, one = (u, label) => u ? `<li><b>${label}</b>: ${esc(u.label)} <span class="small">sisa ${esc(dur(u.left))}, menghemat waktu itu</span></li>` : `<li><b>${label}</b>: <span class="small">tidak ada upgrade yang cocok sedang berjalan</span></li>`;
    const items = (MAGIC && MAGIC.items) || [];
    return `<div class="toolbar"><select data-f="magp" aria-label="Pilih pemain">${keys.map(x => `<option value="${esc(x)}"${same(x, MAGP) ? ' selected' : ''}>${esc(nameOf(x))}${all[x] ? ' ✓' : ''}</option>`).join('')}</select></div>
      <h3 class="sub-h">Pakai di mana?</h3>
      ${mp ? `<ul class="planlist">${one(mp.bookBuilding, 'Book of Building')}${one(mp.bookHeroes, 'Book of Heroes')}<li><b>Builder Potion</b>: ${mp.potion.count ? `${mp.potion.count} upgrade punya sisa 10 jam atau lebih, hemat sekitar ${esc(dur(mp.potion.saveMs))} bila dipakai sekarang` : '<span class="small">belum ada upgrade dengan sisa 10 jam atau lebih</span>'}</li></ul>` : '<div class="small">Tempel data desa pemain ini di tab Desa untuk melihat saran pemakaian.</div>'}
      <h3 class="sub-h">Daftar efek</h3>
      ${items.length ? `<ul class="planlist">${items.map(i => `<li><b>${esc(i.nama)}</b> <span class="small">${esc(i.jenis || '')}</span><div class="small">${esc(i.efek)}</div></li>`).join('')}</ul>` : '<div class="small">Data item belum termuat (assets/data/magic_items.json).</div>'}
      <div class="small note-s">Saran memakai waktu selesai dari data desa terakhir yang kamu tempel. Palu bisa dipakai hanya saat memulai upgrade, jadi tidak ada di saran untuk upgrade yang sedang berjalan. Hemat Builder Potion dihitung 9 jam per upgrade (10 jam kerja dalam 1 jam).</div>`;
  }

  // Checklist manual (B.O.B dan syarat Town Hall); disimpan di browser per pemain.
  const CHKK = 'cow_chk_v1';
  const chkAll = () => { try { return JSON.parse(localStorage.getItem(CHKK) || '{}') || {}; } catch (e) { return {}; } };
  function chkModel(kind, p, saved) {
    const th = num(p && p.th), done = (s, auto) => !!auto || !!(saved && saved[s.id]);
    if (kind === 'bob') {
      const items = ((BOB && BOB.syarat) || []).map(s => { const auto = !!(s.autoTh && th >= s.autoTh); return { id: s.id, teks: s.teks, auto, done: done(s, auto) }; });
      return { title: 'Syarat tukang ke-6 (B.O.B)', info: [], items, note: (BOB && BOB.catatan) || '' };
    }
    const e = THREQ && THREQ.from && THREQ.from[th];
    if (!e) return { title: `Naik dari TH${th}`, info: [], items: [], none: th >= 18 ? 'TH18 adalah Town Hall tertinggi saat ini.' : `Belum ada data syarat untuk TH${th}. Isi di assets/data/th_requirements.json.` };
    return { title: `TH${th} → TH${e.to}`, info: [`Biaya: ${fmt(e.gold)} Gold`, `Waktu: ${e.waktu}`], items: (e.syarat || []).map(s => ({ id: s.id, teks: s.teks, auto: false, done: done(s, false) })), note: '' };
  }
  function tabChecklist(kind) {
    const pool = markedFull().sort(byName);
    if (!pool.length) return noFull();
    if (!pool.some(p => same(p.tag, CHKP))) CHKP = pool[0].tag;
    const p = pool.find(x => same(x.tag, CHKP)), m = chkModel(kind, p, chkAll()[kind + ':' + normTagKey(CHKP)]);
    const bar = `<div class="toolbar"><select data-f="chkp" aria-label="Pilih pemain">${pickOptions(pool, CHKP)}</select></div>`;
    if (m.none) return `${bar}<h3 class="sub-h">${esc(m.title)}</h3><div class="small">${esc(m.none)}</div>`;
    const dn = m.items.filter(i => i.done).length;
    return `${bar}<h3 class="sub-h">${esc(m.title)}${m.items.length ? ` <span class="small">${dn}/${m.items.length}</span>` : ''}</h3>
      ${m.info.length ? `<div class="small">${m.info.map(esc).join(' · ')}</div>` : ''}
      <ul class="planlist" style="list-style:none;padding-left:0">${m.items.map(i => `<li><button type="button" data-act="chk" data-kind="${esc(kind)}" data-id="${esc(i.id)}" aria-pressed="${i.done}"${i.auto ? ' disabled' : ''}>${i.done ? '☑' : '☐'}</button> ${esc(i.teks)}</li>`).join('')}</ul>
      ${m.note ? `<div class="small note-s">${esc(m.note)}</div>` : ''}<div class="small note-s">Centang manual, karena data Builder Base dan bangunan tidak ada di profil pemain. Disimpan di browser ini.</div>`;
  }

  const TABS = [['sum', 'Ringkasan', 'Progres pemain'], ['plan', 'Planner', 'Urutan upgrade'], ['hero', 'Hero', 'Catch-up pahlawan'], ['pet', 'Hewan', 'Catch-up hewan'], ['cmp', 'Bandingkan', 'Dua pemain'], ['rk', 'Peringkat', 'Urutan progres'], ['ret', 'Kembali', 'Pemain kembali main'], ['ore', 'Ore', 'Biaya peralatan'], ['mag', 'Item', 'Item sihir'], ['bob', 'B.O.B', 'Checklist'], ['thr', 'Syarat TH', 'Checklist'], ['vil', 'Desa', 'Timer upgrade'], ['ev', 'Jadwal', 'Event dan raid'], ['gift', 'Hadiah Gratis', 'Store dan voucher']];
  // Hadiah Gratis: tombol ke Supercell Store (hadiah gratis harian/mingguan, login Supercell ID di sana) + link voucher.
  // Voucher bisa kedaluwarsa atau sekali pakai per akun; tambah/hapus baris di GIFTS sesuai kebutuhan.
  const STORE_URL = 'https://store.supercell.com/id/clashofclans';
  const VOUCHER = c => 'https://link.clashofclans.com/en/?action=voucher&code=' + c;
  const GIFTS = [
    ['1 Builder Bite', 'HJ2026_GUTS'],
    ['100K Dark Elixir', 'HJ2026_RufflesCat'],
    ['1M Elixir', 'HJ2026_ZestyBestie'],
    ['1 Study Soup', 'HJ2026_VIDEOKILLED'],
    ['1 Study Soup', 'HJ2026_Trymacs'],
    ['1 Builder Bite', 'HJ2026_Papaplatte'],
    ['1 Study Soup', 'HJ2026_GoatR2'],
  ];
  function tabGift() {
    const ext = 'target="_blank" rel="noopener noreferrer"';
    return `<a class="giftbtn" href="${STORE_URL}" ${ext}><b>Buka Supercell Store</b><small>Hadiah gratis di Store COC (login Supercell ID) ↗</small></a>
      <h3 class="sub-h">Link voucher <span class="small">(${GIFTS.length})</span></h3>
      <ul class="planlist giftlist" style="list-style:none;padding-left:0">${GIFTS.map(([n, c]) => `<li><a class="plink" href="${esc(VOUCHER(c))}" ${ext}><b>${esc(n)}</b></a> <span class="small">${esc(c)}</span></li>`).join('')}</ul>
      <div class="small note-s">Ketuk link untuk membuka game dan menebus hadiahnya. Voucher bisa sudah kedaluwarsa atau hanya sekali pakai per akun, jadi kalau gagal, itu bukan error aplikasi. Hadiah masuk ke akun Supercell ID yang sedang dipakai di game.</div>`;
  }
  async function render() {
    const pane = document.querySelector('[data-pane=alat]'); if (!pane || pane.hidden) return;
    const tok = ++TOKEN, body = $('alatBody'), tabs = $('alatTabs'); if (!body || !tabs) return;
    if (!tabs.children.length) tabs.innerHTML = TABS.map(([k, l, d]) => `<button type="button" data-tab="${k}"><b>${esc(l)}</b>${k === 'vil' ? '<em class="freebadge">Gratis</em>' : ''}<small>${esc(d)}</small></button>`).join('');
    if (!READY) body.innerHTML = '<div class="small">Memuat data pemain…</div>';
    try { await Promise.all([loadPlayers(), loadCaps(), loadReturning(), loadWalls(), loadUT(), loadAux(), loadEvents()]); READY = true; } catch (e) { /* pakai data yang ada */ }
    if (tok !== TOKEN) return;
    const isSub = TAB !== '', ttl = document.querySelector('[data-pane=alat] h2.label'), cur = TABS.find(x => x[0] === TAB);
    tabs.style.display = isSub ? 'none' : ''; if (ttl) ttl.textContent = TAB === 'set' ? 'Pengaturan' : cur ? cur[1] : 'Alat';
    const sub = $('alatSub');
    if (sub && isSub) sub.innerHTML = '<button type="button" class="linkbtn" data-back><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Kembali ke Alat</button>';
    else if (sub) sub.innerHTML = '';
    try { body.innerHTML = !TAB ? homeGuide() : { set: tabSettings, sum: tabSummary, plan: tabPlan, hero: tabHero, pet: tabPet, cmp: tabCompare, rk: tabRank, ret: tabReturn, ore: tabOre, mag: tabMagic, bob: () => tabChecklist('bob'), thr: () => tabChecklist('th'), vil: tabVillage, ev: tabEvent, gift: tabGift }[TAB](); }
    catch (e) { console.error(e); body.innerHTML = '<div class="small">Gagal menampilkan bagian ini.</div>'; }
    scheduleNotifs();
  }

  // ---------- Pengujian di Node ----------
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { importBackup, eventsView, setEvents: v => { EVDATA = v; }, analyze, plan, rowsOf, capFor, nextRaid, nextMonthly, heroTotal, heroCatchup, petCatchup, tabPet, returnChecklist, returnChanges, setReturning: v => { RETDATA = v; }, oreCost, oreSummary, tabOre, magicPlan, tabMagic, chkModel, tabChecklist, setAux: v => { ORE = v.ore; BOB = v.bob; THREQ = v.th; MAGIC = v.magic; }, setWallMax: v => { WALLMAX = v; }, parseVillage, findTimers, finishTimes, upcoming, wallStats, wallCost, buildExport, buildIcs, tabVillage, upgradeCards, villageInfo, cdText, pillText, fillOf, setUT: v => { UTIMES = v; }, setWalls: v => { WALLC = v; }, LANES, tabSummary, tabPlan, tabHero, tabReturn, tabCompare, tabRank, tabEvent, markedKeys, syncMarked, __ltm: () => window.__ltmProfile };
    return;
  }

  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  window.__renderTools = render;
  // Impor dari berkas: pemilih berkas Android (lewat AndroidBridge) atau pemilih berkas peramban.
  function applyImport(tx, nm) {
    BKMSG = importBackup(tx, nm); const ok = BKMSG.startsWith('Berhasil');
    BKTXT = ok ? '' : String(tx || ''); BKNAME = ok ? '' : String(nm || '');
    if (ok && TAB === '') TAB = 'vil';
  }
  window.__cowFilePicked = text => { applyImport(String(text || ''), ($('bkName') || {}).value || ''); render(); };
  function pickImportFile() {
    try { if (window.AndroidBridge && typeof window.AndroidBridge.pickFile === 'function') { window.AndroidBridge.pickFile(); return; } } catch (e) { /* pakai pemilih peramban */ }
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json,text/plain';
    i.onchange = () => {
      const f = i.files && i.files[0]; if (!f) return;
      if (f.size > 5e6) { BKMSG = 'Berkas terlalu besar (maksimal 5 MB).'; render(); return; }
      const r = new FileReader(); r.onload = () => window.__cowFilePicked(String(r.result || '')); r.onerror = () => { BKMSG = 'Berkas tidak bisa dibaca.'; render(); }; r.readAsText(f);
    };
    i.click();
  }
  // ---------- Pencegahan screenshot (web) ----------
  // Peramban tidak bisa memblokir screenshot sungguhan. Yang dilakukan di sini: isi disembunyikan saat halaman tidak aktif
  // (pratinjau app-switcher), saat tombol PrintScreen ditekan, dan saat dicetak; pilih-teks dan tekan-lama dimatikan di tab Alat.
  // Pemblokiran penuh hanya ada di aplikasi Android (FLAG_SECURE di MainActivity), jadi di sana pencegahan web ini dilewati.
  (function shield() {
    const root = document.documentElement, set = on => { if (!window.AndroidBridge) root.classList.toggle('cow-shield', !!on); };
    document.addEventListener('visibilitychange', () => set(document.hidden));
    window.addEventListener('pagehide', () => set(true));
    window.addEventListener('pageshow', () => set(false));
    document.addEventListener('pointerdown', () => { if (!document.hidden) set(false); }, true);
    document.addEventListener('keyup', e => {
      if (e.key !== 'PrintScreen') return;
      set(true); try { navigator.clipboard.writeText(' '); } catch (er) { /* abaikan */ }
      setTimeout(() => set(false), 1500);
    });
    document.addEventListener('contextmenu', e => { const t = e.target; if (t && t.closest && t.closest('[data-pane=alat]') && !t.closest('textarea,input')) e.preventDefault(); });
  })();
  // ---------- Halaman Pengaturan (dibuka dari ikon gir di header, hanya di aplikasi Android) ----------
  // Dirender di dalam tab Alat (bukan dialog/panel melayang: WebView Android menyusutkan tinggi keduanya).
  function tabSettings() {
    const perm = typeof Notification === 'undefined' ? 'tidak didukung' : Notification.permission;
    const st = bgStatus();
    const msg = VMSG ? `<div class="note">${esc(VMSG)}</div>` : '';
    if (!st) return settingsHtml(perm) + msg;
    const chip = (label, ok, act) => ok ? `<div class="schip ok"><span>${label}</span><b>Aktif</b></div>` : `<button type="button" class="schip no" data-act="${act}"><span>${label}</span><b>Aktifkan</b></button>`;
    const sw = (act, on, extra, dis) => `<input type="checkbox" class="sw" role="switch" data-act="${act}" ${extra || ''} ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>`;
    let h = `<div class="schips">${chip('Izin', st.notif, 'vnotif')}${chip('Alarm', st.exact, 'vbg')}${chip('Baterai', st.battery, 'vbg')}</div>`;
    h += `<label class="strow"><span><b>Pemantauan klan</b><small>Notifikasi di latar belakang</small></span>${sw('vbgtoggle', st.enabled)}</label>`;
    h += '<h3 class="sub-h">Jenis notifikasi</h3><div class="sgrid">' +
      FEEDVIEWS.map(([v, t]) => `<label class="stog"><span>${esc(t)}</span>${sw('vview', st.views ? st.views[v] !== false : true, `data-v="${v}"`, !st.enabled)}</label>`).join('') + '</div>' +
      '<p class="shint">Kategori Pemain: upgrade hero hanya untuk pemain yang sudah kamu impor data desanya.</p>';
    const clans = typeof DATA !== 'undefined' && DATA && DATA.clans ? Object.entries(DATA.clans) : [];
    if (clans.length > 1 && window.AndroidBridge && window.AndroidBridge.feedClanOn) {
      h += '<h3 class="sub-h">Klan yang diberi notifikasi</h3><div class="sgrid one">' + clans.map(([tag, c]) => {
        let on = true; try { on = !!window.AndroidBridge.feedClanOn(tag); } catch (e) { /* abaikan */ }
        return `<label class="stog"><span>${esc((c && c.name) || tag)}<small>${esc(tag)}</small></span>${sw('vclan', on, `data-c="${esc(tag)}"`, !st.enabled)}</label>`;
      }).join('') + '</div>';
    }
    h += '<div class="setbtns"><button type="button" data-act="vtest">Tes notifikasi</button><button type="button" data-act="vupdate">Cek update</button></div>';
    return `<div class="setpage">${h}${msg}</div>`;
  }
  window.__openSettings = function () { TAB = 'set'; VMSG = ''; try { setView('alat'); } catch (e) { /* abaikan */ } render(); try { window.scrollTo(0, 0); } catch (e) { /* abaikan */ } };
  document.addEventListener('click', async e => {
    const t = e.target.closest('#alatTabs [data-tab]');
    if (t) { TAB = t.dataset.tab; VMSG = ''; render(); try { window.scrollTo(0, 0); } catch (er) { /* abaikan */ } return; }
    const ot = e.target.closest('[data-opentab]');
    if (ot) { TAB = ot.dataset.opentab; VMSG = ''; render(); try { window.scrollTo(0, 0); } catch (er) { /* abaikan */ } return; }
    if (e.target.closest('[data-back]')) { TAB = ''; VMSG = ''; render(); try { window.scrollTo(0, 0); } catch (er) { /* abaikan */ } return; }
    const g = e.target.closest('[data-goto]');
    if (g && e.target.closest('[data-pane=alat]')) { setView(g.dataset.goto); return; }
    const act = e.target.closest('#alatBody [data-act]');
    if (act) {
      const a = act.dataset.act, k = normTagKey(VSEL);
      if (a === 'chk') {
        const ck = chkAll(), kk = act.dataset.kind + ':' + normTagKey(CHKP); ck[kk] = ck[kk] || {};
        if (ck[kk][act.dataset.id]) delete ck[kk][act.dataset.id]; else ck[kk][act.dataset.id] = true;
        try { localStorage.setItem(CHKK, JSON.stringify(ck)); } catch (er) { /* abaikan */ }
        render(); return;
      }
      if (a === 'vdel') { const all = vAll(); delete all[k]; vStore(all); VMSG = 'Data desa dihapus.'; scheduleNotifs(); }
      else if (a === 'vsync') { const ta = $('bkTxt'); if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); } return; }
      else if (a === 'vics1') {
        const rec1 = vAll()[k], t1 = rec1 ? finishTimes(rec1, merged('#' + k))[Number(act.dataset.i)] : null, m1 = merged('#' + k);
        if (t1) download(`upgrade-${k}-${Math.round(t1.at / 1000)}.ics`, buildIcs([{ key: [k, t1.sec, t1.data, t1.at].join('|'), who: pname(k) || 'Pemain', label: t1.label, at: t1.at }]), 'text/calendar');
        return;
      }
      else if (a === 'vbg') { try { window.AndroidBridge.setupBackground(); } catch (er) { /* abaikan */ } return; }
      else if (a === 'vbgtoggle') { try { const st = bgStatus(); window.AndroidBridge.setBackground(!(st && st.enabled)); } catch (er) { /* abaikan */ } render(); return; }
      else if (a === 'vclan') { try { window.AndroidBridge.setFeedClan(act.dataset.c, !!act.checked); } catch (er) { /* abaikan */ } render(); return; }
      else if (a === 'vview') { try { window.AndroidBridge.setFeedView(act.dataset.v, !!act.checked); } catch (er) { /* abaikan */ } render(); return; }
      else if (a === 'vtest') { testNotif().then(m => { VMSG = m; render(); }); return; }
      else if (a === 'vupdate') { try { window.AndroidBridge.checkUpdateNow(); } catch (er) { /* abaikan: hanya ada di aplikasi Android */ } return; }
      else if (a === 'vnotif') { unlockAudio(); registerSW(); if (typeof Notification !== 'undefined') Notification.requestPermission().then(p => { scheduleNotifs(); if (p === 'granted') testNotif().then(m => { VMSG = m; render(); }); else render(); }); return; }
      else if (a === 'vexp') { download(`cadangan-cunyuk-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(buildExport(), null, 2), 'application/json'); const nn = exportKeys().filter(x => !pname(x)); VMSG = nn.length ? `Berkas diekspor. Nama belum ada untuk ${nn.map(x => '#' + x).join(', ')}. Isi kolom Nama pemain saat impor agar ikut tersimpan di berkas.` : ''; }
      else if (a === 'bkpaste') { applyImport(($('bkTxt') || {}).value || '', ($('bkName') || {}).value || ''); }
      else if (a === 'bkfile') { pickImportFile(); return; }
      render(); return;
    }
    if (e.target.closest('[data-bm]')) setTimeout(render, 40);   // penanda berubah di dialog profil
  });
  document.addEventListener('change', e => {
    const f = e.target.dataset && e.target.dataset.f; if (!f || !e.target.closest('#alatBody')) return;
    if (f === 'plan') PLAN = e.target.value; else if (f === 'hero') HERO = e.target.value; else if (f === 'pet') PET = e.target.value; else if (f === 'ret') RETP = e.target.value; else if (f === 'retm') RETM = e.target.value; else if (f === 'vsel') { VSEL = e.target.value; VMSG = ''; } else if (f === 'orep') OREP = e.target.value; else if (f === 'ores') OREST.s = e.target.value; else if (f === 'oreg') OREST.g = e.target.value; else if (f === 'oret') OREST.t = e.target.value; else if (f === 'magp') MAGP = e.target.value; else if (f === 'chkp') CHKP = e.target.value; else if (f === 'wallt') WALLT = e.target.value; else if (f === 'cmpa') CMP.a = e.target.value; else if (f === 'cmpb') CMP.b = e.target.value; else if (f === 'rk') RK = e.target.value;
    render();
  });
  render();   // bila halaman dibuka langsung di tab Alat
  try { Promise.resolve(loadPlayers()).then(scheduleNotifs).catch(() => {}); } catch (e) { /* abaikan */ }
  // Daftarkan service worker sejak awal (bila izin sudah diberikan) dan periksa upgrade yang selesai saat layar mati.
  try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted') registerSW(); } catch (e) { /* abaikan */ }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDue(); scheduleNotifs(); } });
  window.addEventListener('pageshow', () => { checkDue(); scheduleNotifs(); });
  window.addEventListener('focus', checkDue);
  setInterval(checkDue, 15000);
  // Hitung mundur panel upgrade: hanya mengubah teks timer dan lebar bar, tanpa render ulang.
  function tickUp() {
    const rows = document.querySelectorAll('.upr[data-at]'); if (!rows.length) return;
    const now = Date.now();
    rows.forEach(r => {
      const at = Number(r.dataset.at), pn = r.closest('.upp'), mx = pn ? Number(pn.dataset.max) : at, b = r.querySelector('[data-cd]');
      if (isDone(at, now)) {
        if (!r.classList.contains('upr-done')) { r.classList.add('upr-done'); const x = r.querySelector('.upr-plus,.upr-hb'); if (x) x.replaceWith(Object.assign(document.createElement('span'), { className: 'upr-sp' })); }
        if (b) b.textContent = 'Selesai';
      } else if (b) b.textContent = cdText(at - now);
      r.style.setProperty('--fill', fillOf(at, Number(r.dataset.full) || 0, now, mx).toFixed(1) + '%');
    });
    document.querySelectorAll('[data-pill]').forEach(p => { const left = Number(p.dataset.pill) - now, b = p.querySelector('b'); if (b) b.textContent = left > 0 ? pillText(left) : '+1'; });
  }
  setInterval(tickUp, 1000);
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  // Aktif otomatis: peramban hanya mengizinkan permintaan izin dari sentuhan pengguna, jadi izin diminta sekali
  // pada ketukan pertama di halaman. Bunyi dan getar sudah aktif secara bawaan (bisa dimatikan lewat centang).
  // Bila ditolak, tidak ditanya lagi otomatis; tombol "Aktifkan notifikasi" tetap bisa dipakai.
  document.addEventListener('click', function autoNotif() {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
      if (localStorage.getItem('cow_notif_asked') === '1') return;
      localStorage.setItem('cow_notif_asked', '1');
      unlockAudio(); registerSW();
      Notification.requestPermission().then(p => { if (p === 'granted') { scheduleNotifs(); render(); } }).catch(() => {});
    } catch (e) { /* abaikan */ }
  }, { once: true, capture: true });
})();
