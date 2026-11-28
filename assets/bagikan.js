/* bagikan.js - Kartu bagikan (gambar PNG) dan teks pengumuman siap salin untuk war, CWL, dan rekrutmen.
   Berdiri sendiri: menyuntikkan tombol "Kartu & pengumuman" di Ringkasan, tab War, dan Rekrutmen, lalu membuka dialog.
   Semua dibuat di perangkat (canvas), tidak ada data yang dikirim ke server. Tag pemain tidak pernah ditulis ke kartu. */
(function () {
  'use strict';

  const isEn = () => { try { return !!(window.cowLang && window.cowLang.eff && window.cowLang.eff() !== 'id'); } catch (e) { return false; } };
  const L = (id, en) => (isEn() ? en : id);              // teks antarmuka mengikuti bahasa aplikasi
  let GEN = null;                                        // bahasa isi kartu/teks: 'id' | 'en' (diatur di dialog)
  const gl = () => GEN || (isEn() ? 'en' : 'id');
  const G = (id, en) => (gl() === 'en' ? en : id);       // teks yang dibagikan mengikuti pilihan GEN
  const D = () => (typeof DATA !== 'undefined' && DATA) || window.DASH || {};
  const num = v => Number(v) || 0;
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p1 = v => { const s = String(Math.round(num(v) * 10) / 10); return gl() === 'en' ? s : s.replace('.', ','); };
  const fmtN = n => num(n).toLocaleString(gl() === 'en' ? 'en-US' : 'id-ID');
  const MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = () => { const d = new Date(); return d.getDate() + ' ' + (gl() === 'en' ? MONTH_EN : MONTH_ID)[d.getMonth()] + ' ' + d.getFullYear(); };

  // ---------- Data ----------
  function clanKey() {
    const sel = $('clanSelect'), clans = D().clans || {};
    let k = sel ? sel.value : '';
    try { if (typeof resolveClanKey === 'function') k = resolveClanKey(k); } catch (e) { /* abaikan */ }
    return clans[k] ? k : Object.keys(clans)[0] || k;
  }
  function currentWar(key) {
    try { if (typeof curWar === 'function') return curWar(key); } catch (e) { /* abaikan */ }
    const w = (D().wars || {})[key]; return w || null;
  }
  const hasWar = w => !!(w && w.state && w.state !== 'notInWar' && w.us && w.them);
  function parseT(v) {
    let s = String(v || ''); const m = s.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)/);
    if (m) s = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
    const t = Date.parse(s); return isNaN(t) ? null : t;
  }
  function durL(ms) {
    if (ms <= 0) return G('selesai', 'ended');
    const m = Math.floor(ms / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24), en = gl() === 'en';
    return d ? `${d}${en ? 'd' : 'h'} ${h % 24}${en ? 'h' : 'j'}` : h ? `${h}${en ? 'h' : 'j'} ${m % 60}m` : `${m}m`;
  }
  function outcome(war) {
    const us = war.us || {}, th = war.them || {};
    const d = num(us.stars) - num(th.stars), p = num(us.pct) - num(th.pct), r = d || (Math.abs(p) > 1e-9 ? p : 0);
    return { r: r > 0 ? 1 : r < 0 ? -1 : 0, ended: war.state === 'warEnded', prep: war.state === 'preparation' };
  }
  function verdict(war) {
    const o = outcome(war);
    if (o.prep) return G('SEGERA DIMULAI', 'STARTING SOON');
    if (o.ended) return o.r > 0 ? G('MENANG', 'VICTORY') : o.r < 0 ? G('KALAH', 'DEFEAT') : G('SERI', 'DRAW');
    return o.r > 0 ? G('UNGGUL', 'LEADING') : o.r < 0 ? G('TERTINGGAL', 'TRAILING') : G('IMBANG', 'TIED');
  }
  function memberStats(war) {
    return ((war.us || {}).members || []).map(m => {
      const at = m.attacks || [];
      return { name: m.name || '?', th: m.th, used: at.length, stars: at.reduce((a, x) => a + num(x.stars), 0), pct: at.length ? at.reduce((a, x) => a + num(x.pct), 0) / at.length : 0, three: at.filter(x => num(x.stars) === 3).length };
    });
  }
  const ranked = ms => ms.filter(m => m.used).sort((a, b) => b.stars - a.stars || b.pct - a.pct || a.used - b.used);
  const attacksLeft = (side, per) => Math.max(0, (side.members || []).length * per - (side.members || []).reduce((a, m) => a + (m.attacks || []).length, 0));
  const warLabel = war => (war.cwl ? G('CWL RONDE ', 'CWL ROUND ') + (war.round || '') : 'WAR');
  const resultLabel = war => (war.cwl ? (gl() === 'en' ? `CWL ROUND ${war.round || ''} RESULT` : `HASIL CWL RONDE ${war.round || ''}`) : G('HASIL WAR', 'WAR RESULT'));
  function cwlOf(key) { const c = (D().cwl || {})[key]; return c && (c.rounds || []).some(r => r.length) ? c : null; }
  function standings(c) {
    try { if (typeof cwlStandings === 'function') return cwlStandings(c); } catch (e) { /* abaikan */ }
    return [];
  }

  // ---------- Teks pengumuman ----------
  const FREQ = { always: ['Selalu war', 'Always'], moreThanOncePerWeek: ['Lebih dari sekali seminggu', 'More than once a week'], oncePerWeek: ['Seminggu sekali', 'Once a week'], lessThanOncePerWeek: ['Kurang dari sekali seminggu', 'Less than once a week'] };
  const CTYPE = { open: ['Terbuka untuk semua', 'Open to all'], inviteOnly: ['Hanya undangan', 'Invite only'], closed: ['Tertutup', 'Closed'] };

  function textWar(war) {
    if (!hasWar(war)) return G('Belum ada war yang bisa diumumkan.', 'There is no war to announce yet.');
    const us = war.us, th = war.them, per = war.perMember || (war.cwl ? 1 : 2), o = outcome(war), top = ranked(memberStats(war))[0];
    const head = o.prep ? `${warLabel(war)} ${G('SEGERA DIMULAI', 'STARTING SOON')}` : o.ended ? `${resultLabel(war)}: ${verdict(war)}` : `${warLabel(war)} ${G('BERLANGSUNG', 'IN PROGRESS')}: ${verdict(war)}`;
    const L1 = [head];
    if (o.prep) {
      const s = parseT(war.start);
      L1.push(`${us.name} vs ${th.name}`);
      if (s) L1.push(`${G('Mulai dalam', 'Starts in')} ${durL(s - Date.now())}`);
      L1.push(G('Pastikan basis war sudah siap.', 'Make sure your war base is ready.'));
      return L1.join('\n');
    }
    L1.push(`${us.name} ${num(us.stars)} ${G('bintang', 'stars')} (${p1(us.pct)}%)`, `${th.name} ${num(th.stars)} ${G('bintang', 'stars')} (${p1(th.pct)}%)`, '');
    if (top) L1.push(`MVP: ${top.name} (${top.stars} ${G('bintang', 'stars')})`);
    if (!o.ended) {
      const e = parseT(war.end);
      if (e) L1.push(`${G('Sisa waktu', 'Time left')}: ${durL(e - Date.now())}`);
      L1.push(`${G('Serangan tersisa', 'Attacks left')}: ${attacksLeft(us, per)}`);
    } else {
      L1.push(`${G('Serangan tidak terpakai', 'Unused attacks')}: ${attacksLeft(us, per)}`);
      L1.push('', o.r > 0 ? G('Terima kasih semua, GG!', 'Thanks everyone, GG!') : o.r < 0 ? G('Tidak apa-apa, kita bangkit di war berikutnya!', 'No worries, we come back stronger next war!') : G('Seri! Sampai jumpa di war berikutnya.', 'A draw! See you next war.'));
    }
    return L1.join('\n');
  }

  function textRemind(war) {
    if (!hasWar(war)) return G('Belum ada war yang berlangsung.', 'There is no war in progress.');
    const per = war.perMember || (war.cwl ? 1 : 2);
    if (war.state === 'preparation') {
      const s = parseT(war.start);
      return [`${G('PENGINGAT WAR', 'WAR REMINDER')}`, s ? `${G('War mulai dalam', 'War starts in')} ${durL(s - Date.now())}` : '', G('Pasang dan cek basis war sebelum mulai.', 'Set and check your war base before it starts.')].filter(Boolean).join('\n');
    }
    if (war.state === 'warEnded') return G('War sudah selesai. Tidak ada serangan yang perlu diingatkan.', 'The war has ended. No attacks to remind about.');
    const idle = ((war.us || {}).members || []).filter(m => (m.attacks || []).length < per);
    const e = parseT(war.end), L1 = [`${G('PENGINGAT ', 'REMINDER: ')}${warLabel(war)}`];
    if (e) L1.push(`${G('Sisa waktu', 'Time left')}: ${durL(e - Date.now())}`);
    if (!idle.length) { L1.push(G('Semua anggota sudah menyerang tuntas. Terima kasih!', 'Everyone has used all attacks. Thank you!')); return L1.join('\n'); }
    L1.push(`${G('Belum menyerang tuntas', 'Attacks still unused')} (${idle.length}): ` + idle.map(m => `${m.name} (${(m.attacks || []).length}/${per})`).join(', '));
    L1.push(G('Ayo serang sebelum war berakhir!', 'Attack before the war ends!'));
    return L1.join('\n');
  }

  function textCwl(key) {
    const c = cwlOf(key);
    if (!c) return G('Belum ada data CWL klan ini.', 'No CWL data for this clan yet.');
    const st = standings(c), idx = st.findIndex(x => x.tag === key), total = (c.rounds || []).filter(r => r.length).length;
    const cur = c.current && c.current.round ? c.current.round : total;
    const L1 = [`CLAN WAR LEAGUE ${c.season || ''}`.trim(), `${G('Ronde', 'Round')} ${cur}/${Math.max(total, cur)}`];
    if (idx >= 0) L1.push(`${G('Peringkat kita', 'Our rank')}: #${idx + 1} (${st[idx].total} ${G('poin', 'pts')})`);
    L1.push('');
    st.slice(0, 8).forEach((x, i) => L1.push(`${i + 1}. ${x.name} - ${x.total}${x.tag === key ? ' (' + G('kita', 'us') + ')' : ''}`));
    const w = c.current;
    if (hasWar(w) && w.state === 'inWar') {
      const per = w.perMember || 1, idle = (w.us.members || []).filter(m => (m.attacks || []).length < per), e = parseT(w.end);
      L1.push('');
      L1.push(`${G('Ronde berjalan', 'Current round')}: ${w.us.name} ${num(w.us.stars)}-${num(w.them.stars)} ${w.them.name}${e ? ' · ' + G('sisa', 'left') + ' ' + durL(e - Date.now()) : ''}`);
      if (idle.length) L1.push(`${G('Belum menyerang', 'Not attacked yet')} (${idle.length}): ${idle.map(m => m.name).join(', ')}`);
    }
    return L1.join('\n');
  }

  function textJoin(key, withTag) {
    const c = (D().clans || {})[key];
    if (!c) return G('Data klan belum tersedia.', 'Clan data is not available yet.');
    const ms = c.memberList || [], ths = ms.map(m => num(m.th)).filter(Boolean), sel = (map, k) => (map[k] ? map[k][gl() === 'en' ? 1 : 0] : '');
    const L1 = [`${G('KLAN ', 'CLAN ')}${c.name}${G(' MEMBUKA REKRUTMEN', ' IS RECRUITING')}`];
    L1.push([`${G('Level', 'Level')} ${num(c.level)}`, `${fmtN(c.points)} ${G('poin', 'points')}`, sel(CTYPE, c.type) || c.type || ''].filter(Boolean).join(' | '));
    L1.push(`${G('Anggota', 'Members')}: ${num(c.memberCount) || ms.length}/50${ths.length ? ` | TH ${Math.min(...ths)}-${Math.max(...ths)}` : ''}`);
    if (c.warWins != null || c.warLosses != null) L1.push(`War: ${num(c.warWins)} ${G('menang', 'won')}, ${num(c.warLosses)} ${G('kalah', 'lost')}, ${num(c.warTies)} ${G('seri', 'tied')}${num(c.warWinStreak) > 0 ? ` | ${G('Beruntun', 'Streak')}: ${num(c.warWinStreak)}` : ''}`);
    const fr = sel(FREQ, c.warFrequency); if (fr) L1.push(`${G('Frekuensi war', 'War frequency')}: ${fr}`);
    const req = [c.requiredTH ? `TH ${G('minimum', 'min')} ${c.requiredTH}` : '', c.requiredTrophies ? `${G('trofi minimum', 'min trophies')} ${fmtN(c.requiredTrophies)}` : ''].filter(Boolean);
    if (req.length) L1.push(`${G('Syarat', 'Requirements')}: ${req.join(', ')}`);
    if (withTag && (c.tag || key)) {
      const tag = c.tag || key;
      L1.push(`Tag: ${tag}`, `${G('Tautan', 'Link')}: https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`);
    }
    L1.push('', c.type === 'open' ? G('Tertarik? Langsung gabung!', 'Interested? Join now!') : G('Tertarik? Hubungi leader atau co-leader untuk undangan.', 'Interested? Contact a leader or co-leader for an invite.'));
    return L1.join('\n');
  }

  // ---------- Kartu gambar ----------
  const PAL = {
    teal: { name: ['Teal emas', 'Teal gold'], bg1: '#1a463f', bg2: '#0e2a26', surf: '#194340', raised: '#235751', text: '#fff3c4', mut: '#a9c6bd', a1: '#f2b632', a2: '#ffd877', ink: '#12342f', line: 'rgba(255,243,196,.22)' },
    dark: { name: ['Gelap ungu', 'Dark purple'], bg1: '#1b1730', bg2: '#0c0a14', surf: '#171424', raised: '#262040', text: '#f3f0fa', mut: '#a7a1bb', a1: '#b88cff', a2: '#d9c2ff', ink: '#1a0f33', line: 'rgba(255,255,255,.18)' },
  };
  const W = 1080, H = 1350, HEAD = '"Lilita One","Bricolage Grotesque",system-ui,sans-serif', BODY = 'Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); } }
  function star(c, cx, cy, r, fill) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r; c[i ? 'lineTo' : 'moveTo'](cx + q * Math.cos(a), cy + q * Math.sin(a)); } c.closePath(); c.fillStyle = fill; c.fill(); }
  function txt(c, s, x, y, font, fill, align, maxW) {
    c.font = font; c.fillStyle = fill; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic';
    let f = font;
    if (maxW) { let size = parseInt(font.match(/(\d+)px/)[1], 10); while (c.measureText(s).width > maxW && size > 14) { size -= 2; f = font.replace(/\d+px/, size + 'px'); c.font = f; } if (c.measureText(s).width > maxW) { while (s.length > 2 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); s += '…'; } }
    c.fillText(s, x, y);
  }
  const loadImg = src => new Promise(res => { const i = new Image(); const t = setTimeout(() => res(null), 2500); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); res(null); }; i.src = src; });
  async function fonts() { try { await Promise.all([document.fonts.load('48px "Lilita One"'), document.fonts.load('700 24px Figtree'), document.fonts.load('600 24px Figtree')]); } catch (e) { /* pakai font cadangan */ } }

  function frame(c, P, tagText, icon) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg1); g.addColorStop(1, P.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(W / 2, 640, 40, W / 2, 640, 620); rg.addColorStop(0, P.a1 + '33'); rg.addColorStop(1, P.a1 + '00'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
    if (icon) { c.save(); rr(c, 60, 52, 92, 92, 22); c.clip(); c.drawImage(icon, 60, 52, 92, 92); c.restore(); }
    else { rr(c, 60, 52, 92, 92, 22); c.fillStyle = P.a1; c.fill(); star(c, 106, 98, 30, P.ink); }
    txt(c, 'Dashboard Clan', 172, 98, `44px ${HEAD}`, P.a2);
    txt(c, 'Clash of Clans', 172, 134, `600 20px ${BODY}`, P.mut);
    txt(c, today(), W - 60, 98, `600 22px ${BODY}`, P.mut, 'right');
    c.font = `26px ${HEAD}`; const tw = Math.min(W - 120, c.measureText(tagText).width + 44);
    rr(c, 60, 180, tw, 50, 25); c.fillStyle = P.a1; c.fill();
    txt(c, tagText, 60 + 22, 214, `26px ${HEAD}`, P.ink);
  }
  function footer(c, P) {
    c.strokeStyle = P.line; c.lineWidth = 2; c.beginPath(); c.moveTo(60, 1268); c.lineTo(W - 60, 1268); c.stroke();
    txt(c, G('Dibuat dengan Dashboard Clan. Tidak resmi, tidak berafiliasi dengan Supercell.', 'Made with Dashboard Clan. Unofficial, not affiliated with Supercell.'), W / 2, 1306, `600 20px ${BODY}`, P.mut, 'center', W - 120);
  }
  function drawWar(c, P, war, icon) {
    const us = war.us, th = war.them, per = war.perMember || (war.cwl ? 1 : 2), o = outcome(war), V = verdict(war);
    frame(c, P, o.prep ? G('WAR SEGERA DIMULAI', 'WAR STARTING SOON') : o.ended ? (war.cwl ? resultLabel(war) : G('REKAP WAR', 'WAR RECAP')) : (war.cwl ? warLabel(war) + ' · ' : '') + G('WAR BERLANGSUNG', 'WAR IN PROGRESS'), icon);
    txt(c, V, W / 2, 400, `${V.length > 8 ? 112 : 150}px ${HEAD}`, o.r > 0 || o.prep ? P.a2 : o.r < 0 && o.ended ? P.mut : P.a2, 'center', W - 140);
    const side = (x, s, win) => {
      txt(c, s.name || '?', x, 520, `38px ${HEAD}`, P.text, 'center', 400);
      txt(c, String(num(s.stars)), x - 8, 620, `92px ${HEAD}`, win ? P.a2 : P.text, 'center');
      star(c, x + c.measureText(String(num(s.stars))).width / 2 + 24, 592, 20, win ? P.a1 : P.mut);
      txt(c, G('bintang', 'stars'), x, 656, `600 22px ${BODY}`, P.mut, 'center');
      txt(c, p1(s.pct) + '%', x, 726, `52px ${HEAD}`, win ? P.a2 : P.mut, 'center');
      rr(c, x - 150, 748, 300, 14, 7); c.fillStyle = P.line; c.fill();
      if (num(s.pct) > 0) { rr(c, x - 150, 748, Math.max(14, 300 * Math.min(100, num(s.pct)) / 100), 14, 7); c.fillStyle = win ? P.a1 : P.mut; c.fill(); }
      txt(c, `${num(s.attacks)} ${G('serangan', 'attacks')}`, x, 800, `600 22px ${BODY}`, P.mut, 'center');
    };
    const lead = o.r;
    side(300, us, lead > 0 && !o.prep); side(780, th, lead < 0 && !o.prep);
    txt(c, 'VS', W / 2, 620, `50px ${HEAD}`, P.mut, 'center');
    const ms = memberStats(war), rk = ranked(ms), mvp = rk[0], threes = ms.reduce((a, m) => a + m.three, 0);
    // chips info
    const chips = [`${G('Ukuran', 'Size')} ${(us.members || []).length}v${(th.members || []).length}`, `3★: ${threes}`, `${o.ended ? G('Serangan tak terpakai', 'Unused attacks') : G('Sisa serangan', 'Attacks left')}: ${attacksLeft(us, per)}`];
    let cx = 60; chips.forEach(s => { c.font = `700 22px ${BODY}`; const w = c.measureText(s).width + 40; rr(c, cx, 840, w, 44, 22); c.fillStyle = P.raised; c.fill(); txt(c, s, cx + 20, 870, `700 22px ${BODY}`, P.text); cx += w + 14; });
    // MVP
    if (mvp) {
      rr(c, 60, 912, W - 120, 120, 26); c.fillStyle = P.raised; c.fill(); star(c, 130, 972, 36, P.a1);
      txt(c, 'MVP', 192, 950, `700 20px ${BODY}`, P.mut);
      txt(c, mvp.name, 192, 1000, `42px ${HEAD}`, P.text, 'left', 560);
      txt(c, `${mvp.stars} ${G('bintang', 'stars')}`, W - 90, 958, `38px ${HEAD}`, P.a2, 'right');
      txt(c, `${mvp.used} ${G('serangan', 'attacks')} · ${p1(mvp.pct)}%`, W - 90, 1000, `600 20px ${BODY}`, P.mut, 'right');
    }
    // top 3
    const top = rk.slice(0, 3);
    if (top.length) {
      txt(c, G('PENYERANG TERBAIK', 'TOP ATTACKERS'), 60, 1076, `700 20px ${BODY}`, P.mut);
      top.forEach((m, i) => { const y = 1100 + i * 52; txt(c, String(i + 1), 74, y + 36, `30px ${HEAD}`, P.a1); txt(c, m.name, 120, y + 36, `600 26px ${BODY}`, P.text, 'left', 600); txt(c, `${m.stars}★  ${p1(m.pct)}%`, W - 74, y + 36, `700 26px ${BODY}`, P.a2, 'right'); });
    }
    footer(c, P);
  }
  function thDist(ms) { const m = {}; (ms || []).forEach(x => { const t = num(x.th); if (t > 0) m[t] = (m[t] || 0) + 1; }); return m; }
  function drawPrep(c, P, war, icon) {
    const us = war.us, th = war.them, A = us.members || [], B = th.members || [];
    frame(c, P, G('WAR SEGERA DIMULAI', 'WAR STARTING SOON'), icon);
    const st = parseT(war.start), left = st ? st - Date.now() : null;
    txt(c, G('MULAI DALAM', 'STARTS IN'), W / 2, 318, `700 24px ${BODY}`, P.mut, 'center');
    txt(c, left == null ? '-' : durL(left), W / 2, 450, `140px ${HEAD}`, P.a2, 'center', W - 140);
    const avg = ms => { const t = ms.map(x => num(x.th)).filter(Boolean); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0; };
    const side = (x, s, ms, win) => {
      const t = ms.map(m => num(m.th)).filter(Boolean);
      txt(c, s.name || '?', x, 548, `38px ${HEAD}`, P.text, 'center', 400);
      txt(c, avg(ms) ? p1(avg(ms)) : '-', x, 648, `84px ${HEAD}`, win ? P.a2 : P.text, 'center');
      txt(c, G('TH rata-rata', 'avg TH'), x, 686, `600 22px ${BODY}`, P.mut, 'center');
      txt(c, `${ms.length} ${G('pemain', 'players')}${t.length ? ' · TH ' + Math.min(...t) + '-' + Math.max(...t) : ''}`, x, 734, `600 22px ${BODY}`, P.mut, 'center', 420);
    };
    side(300, us, A, avg(A) > avg(B)); side(780, th, B, avg(B) > avg(A));
    txt(c, 'VS', W / 2, 640, `50px ${HEAD}`, P.mut, 'center');
    const da = thDist(A), db = thDist(B), levels = Array.from(new Set(Object.keys(da).concat(Object.keys(db)))).map(Number).sort((a, b) => b - a).slice(0, 6);
    if (levels.length) {
      txt(c, G('PERBANDINGAN TH', 'TH COMPARISON'), 60, 812, `700 20px ${BODY}`, P.mut);
      levels.forEach((lv, i) => {
        const pitch = Math.min(88, Math.floor(390 / levels.length)), h = pitch - 10, y = 832 + i * pitch, a = da[lv] || 0, b = db[lv] || 0, my = y + h / 2;
        rr(c, 60, y, W - 120, h, 18); c.fillStyle = P.raised; c.fill();
        txt(c, String(a), 300, my + 13, `40px ${HEAD}`, a > b ? P.a2 : P.text, 'center');
        txt(c, 'TH' + lv, W / 2, my + 9, `700 26px ${BODY}`, P.mut, 'center');
        txt(c, String(b), 780, my + 13, `40px ${HEAD}`, b > a ? P.a2 : P.text, 'center');
      });
    }
    footer(c, P);
  }
  function drawCwl(c, P, key, icon) {
    const cw = cwlOf(key), st = cw ? standings(cw) : [];
    frame(c, P, G('KLASEMEN CWL', 'CWL STANDINGS'), icon);
    const idx = st.findIndex(x => x.tag === key);
    txt(c, idx >= 0 ? `#${idx + 1}` : '-', W / 2, 400, `150px ${HEAD}`, P.a2, 'center');
    txt(c, G('PERINGKAT KITA', 'OUR RANK'), W / 2, 450, `700 24px ${BODY}`, P.mut, 'center');
    txt(c, `${cw.season || ''} · ${G('Ronde', 'Round')} ${(cw.current && cw.current.round) || (cw.rounds || []).filter(r => r.length).length}`, W / 2, 492, `600 24px ${BODY}`, P.text, 'center');
    st.slice(0, 8).forEach((x, i) => {
      const y = 530 + i * 82, me = x.tag === key;
      rr(c, 60, y, W - 120, 70, 20); c.fillStyle = me ? P.a1 : P.raised; c.fill();
      const f = me ? P.ink : P.text, f2 = me ? P.ink : P.mut;
      txt(c, String(i + 1), 100, y + 47, `34px ${HEAD}`, me ? P.ink : P.a1, 'center');
      txt(c, x.name, 150, y + 45, `34px ${HEAD}`, f, 'left', 480);
      txt(c, `${x.w}-${x.l}-${x.t}`, 720, y + 44, `700 24px ${BODY}`, f2, 'center');
      txt(c, String(x.total), W - 90, y + 47, `38px ${HEAD}`, me ? P.ink : P.a2, 'right');
    });
    txt(c, G('M-K-S dan total bintang (bonus 10 per war menang)', 'W-L-D and total stars (10 bonus per war won)'), W / 2, 1216, `600 20px ${BODY}`, P.mut, 'center', W - 120);
    footer(c, P);
  }

  // ---------- Dialog ----------
  const ST = { tab: 'card', kind: 'war', pal: 'teal', txt: 'war', tag: true, token: 0 };
  try { const p = localStorage.getItem('cow_share_pal'); if (p && PAL[p]) ST.pal = p; } catch (e) { /* abaikan */ }
  let dlg = null, canvas = null, iconImg;

  const CSS = `
.cow-share{width:min(94vw,540px);max-height:92dvh;padding:0;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);overflow:auto}
.cow-share::backdrop{background:rgba(0,0,0,.6)}
.cow-share .cs-in{padding:16px}
.cow-share .cs-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.cow-share .cs-top h3{margin:0;flex:1;font-size:1.05rem}
.cow-share .cs-x{min-height:36px;width:36px;padding:0}
.cow-share .seg{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.cow-share .seg button{flex:1 1 auto;min-height:34px;padding:0 10px;font-size:.82rem}
.cow-share .seg button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:transparent}
.cow-share canvas{display:block;width:100%;height:auto;border-radius:14px;border:1px solid var(--line);margin-bottom:12px;background:var(--raised)}
.cow-share textarea{width:100%;min-height:210px;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-size:.9rem;line-height:1.5;resize:vertical;box-sizing:border-box}
.cow-share .cs-act{display:flex;gap:8px;margin-top:12px}
.cow-share .cs-act button{flex:1;min-height:44px}
.cow-share .cs-msg{min-height:1.2em;margin-top:8px;font-size:.82rem;color:var(--mut);text-align:center}
.cow-share .cs-note{font-size:.82rem;color:var(--mut);margin:0 0 10px}
.cow-share label.cs-chk{display:flex;gap:8px;align-items:center;font-size:.85rem;margin:0 0 10px}
.cow-share-open{margin-top:10px}
`;
  function injectCss() { if (document.getElementById('cowShareCss')) return; const s = document.createElement('style'); s.id = 'cowShareCss'; s.textContent = CSS; document.head.appendChild(s); }

  const seg = (g, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-cs="${g}:${v}" aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</div>`;

  function build() {
    if (dlg) return dlg;
    injectCss();
    dlg = document.createElement('dialog'); dlg.id = 'cowShareDlg'; dlg.className = 'cow-share'; dlg.setAttribute('aria-label', L('Kartu & pengumuman', 'Cards & announcements'));
    dlg.addEventListener('click', e => {
      if (e.target === dlg) { dlg.close(); return; }
      const b = e.target.closest('button[data-cs]'); if (b) { const [g, v] = b.dataset.cs.split(':'); onSeg(g, v); return; }
      if (e.target.closest('.cs-x')) { dlg.close(); return; }
      const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act, a);
    });
    dlg.addEventListener('change', e => { if (e.target.id === 'csTag') { ST.tag = e.target.checked; fillText(); } });
    dlg.addEventListener('close', () => { ST.token++; });
    document.body.appendChild(dlg);
    return dlg;
  }
  function onSeg(g, v) {
    if (g === 'tab') ST.tab = v; else if (g === 'kind') ST.kind = v; else if (g === 'pal') { ST.pal = v; try { localStorage.setItem('cow_share_pal', v); } catch (e) { /* abaikan */ } }
    else if (g === 'txt') ST.txt = v; else if (g === 'lang') GEN = v;
    render();
  }
  function render() {
    const key = clanKey(), war = currentWar(key), cw = cwlOf(key), canWar = hasWar(war), canCwl = !!cw;
    if (ST.kind === 'war' && !canWar && canCwl) ST.kind = 'cwl';
    if (ST.kind === 'cwl' && !canCwl && canWar) ST.kind = 'war';
    const kinds = [['war', G('War', 'War')]]; if (canCwl) kinds.push(['cwl', 'CWL']);
    const body = ST.tab === 'card'
      ? ((canWar || canCwl)
        ? `${kinds.length > 1 ? seg('kind', ST.kind, kinds) : ''}${seg('pal', ST.pal, Object.keys(PAL).map(k => [k, PAL[k].name[gl() === 'en' ? 1 : 0]]))}<canvas id="csCanvas" width="${W}" height="${H}" role="img" aria-label="${esc(L('Pratinjau kartu bagikan', 'Share card preview'))}"></canvas>
          <div class="cs-act"><button type="button" class="btn-primary" data-act="share-img">${esc(L('Bagikan gambar', 'Share image'))}</button><button type="button" data-act="save-img">${esc(L('Simpan gambar', 'Save image'))}</button></div>`
        : `<p class="cs-note">${esc(L('Belum ada war atau CWL yang bisa dibuat kartunya. Pakai tab Teks untuk pengumuman dan rekrutmen.', 'There is no war or CWL to make a card for yet. Use the Text tab for announcements and recruiting.'))}</p>`)
      : `${seg('txt', ST.txt, [['war', L('Hasil war', 'War result')], ['remind', L('Pengingat war', 'War reminder')], ['cwl', 'CWL'], ['join', L('Rekrutmen', 'Recruiting')]])}
        ${ST.txt === 'join' ? `<label class="cs-chk"><input type="checkbox" id="csTag"${ST.tag ? ' checked' : ''}> ${esc(L('Sertakan tag dan tautan klan', 'Include clan tag and link'))}</label>` : ''}
        <textarea id="csText" aria-label="${esc(L('Teks pengumuman', 'Announcement text'))}"></textarea>
        <div class="cs-act"><button type="button" class="btn-primary" data-act="copy-txt">${esc(L('Salin teks', 'Copy text'))}</button><button type="button" data-act="share-txt">${esc(L('Bagikan', 'Share'))}</button></div>`;
    dlg.innerHTML = `<div class="cs-in"><div class="cs-top"><h3>${esc(L('Kartu & pengumuman', 'Cards & announcements'))}</h3><button type="button" class="cs-x" aria-label="${esc(L('Tutup', 'Close'))}">✕</button></div>
      ${seg('tab', ST.tab, [['card', L('Kartu gambar', 'Image card')], ['text', L('Teks', 'Text')]])}
      ${seg('lang', gl(), [['id', 'Bahasa Indonesia'], ['en', 'English']])}
      ${body}<div class="cs-msg" id="csMsg" role="status" aria-live="polite"></div></div>`;
    if (ST.tab === 'card') draw(); else fillText();
  }
  function fillText() {
    const t = $('csText'); if (!t) return; const key = clanKey(), war = currentWar(key);
    t.value = ST.txt === 'war' ? textWar(war) : ST.txt === 'remind' ? textRemind(war) : ST.txt === 'cwl' ? textCwl(key) : textJoin(key, ST.tag);
  }
  async function draw() {
    const my = ++ST.token, cv = $('csCanvas'); if (!cv) return;
    const key = clanKey(), war = currentWar(key), P = PAL[ST.pal] || PAL.teal;
    await fonts(); if (iconImg === undefined) iconImg = (await loadImg('assets/icon-brand.png')) || (await loadImg('assets/icon-512.png'));
    if (my !== ST.token || !$('csCanvas')) return;
    const c = cv.getContext('2d');
    try { if (ST.kind === 'cwl' && cwlOf(key)) drawCwl(c, P, key, iconImg); else if (hasWar(war)) { if (outcome(war).prep) drawPrep(c, P, war, iconImg); else drawWar(c, P, war, iconImg); } canvas = cv; } catch (e) { msg(L('Gagal membuat kartu.', 'Could not make the card.')); }
  }
  function msg(s) { const m = $('csMsg'); if (m) { m.textContent = s; clearTimeout(msg.t); msg.t = setTimeout(() => { if (m) m.textContent = ''; }, 2600); } }

  // ---------- Aksi ----------
  const fileName = () => `dashboard-clan-${ST.kind}-${new Date().toISOString().slice(0, 10)}.png`;
  const toBlob = () => new Promise(r => { try { canvas.toBlob(r, 'image/png'); } catch (e) { r(null); } });
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  async function saveImg() {
    if (!canvas) return false;
    const name = fileName(), b = window.AndroidBridge;
    if (b && typeof b.saveImage === 'function') { try { b.saveImage(name, canvas.toDataURL('image/png').split(',')[1]); return true; } catch (e) { /* lanjut */ } }
    const blob = await toBlob(); if (!blob) return false; download(blob, name); return true;
  }
  async function act(what, btn) {
    try {
      if (what === 'save-img') { msg(await saveImg() ? L('Gambar disimpan ✓', 'Image saved ✓') : L('Gagal menyimpan gambar.', 'Could not save the image.')); return; }
      if (what === 'share-img') {
        const blob = canvas && await toBlob(); if (!blob) { msg(L('Kartu belum siap.', 'The card is not ready yet.')); return; }
        const f = new File([blob], fileName(), { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); msg(L('Terkirim ✓', 'Sent ✓')); return; }
        msg(await saveImg() ? L('Gambar disimpan. Unggah dari galeri ke Facebook.', 'Image saved. Upload it from your gallery to Facebook.') : L('Gagal menyimpan gambar.', 'Could not save the image.')); return;
      }
      const t = $('csText') ? $('csText').value : '';
      if (what === 'copy-txt') { await copy(t); msg(L('Tersalin ✓', 'Copied ✓')); return; }
      if (what === 'share-txt') {
        if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({ text: t }); msg(L('Terkirim ✓', 'Sent ✓')); } else { await copy(t); msg(L('Tersalin ✓', 'Copied ✓')); }
      }
    } catch (e) { if (!(e && e.name === 'AbortError')) msg(L('Gagal. Coba lagi.', 'Failed. Try again.')); }
  }
  async function copy(t) {
    try { await navigator.clipboard.writeText(t); return; } catch (e) { /* cadangan */ }
    const ta = $('csText'); if (!ta) throw new Error('copy'); ta.focus(); ta.select(); if (!document.execCommand('copy')) throw new Error('copy');
  }

  function open(mode) {
    build();
    GEN = GEN || (isEn() ? 'en' : 'id');
    if (mode === 'join') { ST.tab = 'text'; ST.txt = 'join'; } else if (mode === 'text') ST.tab = 'text'; else if (mode === 'war' || mode === 'card') ST.tab = 'card';
    if (ST.tab === 'card' && !(hasWar(currentWar(clanKey())) || cwlOf(clanKey()))) ST.tab = 'text';   // tanpa war/CWL, langsung ke tab Teks
    render();
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  }

  // ---------- Tombol masuk ----------
  const btnHtml = mode => `<button type="button" class="cow-share-open" data-cow-share="${mode}">${esc(mode === 'join' ? L('Teks rekrutmen', 'Recruiting text') : L('Kartu & pengumuman', 'Cards & announcements'))}</button>`;
  function inject() {
    injectCss();
    const wb = $('warBox'); if (wb && wb.children.length && !wb.querySelector('[data-cow-share]')) wb.insertAdjacentHTML('beforeend', btnHtml('war'));
    const hw = $('heroWar'); if (hw && hw.querySelector('.hero-row') && !hw.querySelector('[data-cow-share]') && hasWar(currentWar(clanKey()))) hw.insertAdjacentHTML('beforeend', btnHtml('war'));
    const jb = $('joinBox'); if (jb && jb.children.length && !jb.querySelector('[data-cow-share]')) jb.insertAdjacentHTML('beforeend', `<div style="margin-top:8px">${btnHtml('join')}</div>`);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-cow-share]'); if (b) { e.preventDefault(); open(b.dataset.cowShare); } });
  ['warBox', 'heroWar', 'joinBox'].forEach(id => { const el = $(id); if (el) new MutationObserver(inject).observe(el, { childList: true }); });
  const sel = $('clanSelect'); if (sel) sel.addEventListener('change', () => { if (dlg && dlg.open) render(); });
  inject();

  window.cowShare = { open, textWar, textRemind, textCwl, textJoin, verdict, outcome, memberStats, ranked, setLang: l => { GEN = l; } };
})();
