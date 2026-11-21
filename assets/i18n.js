/* Bahasa antarmuka: Sistem (bawaan), Indonesia, English. Sumber teks aplikasi berbahasa Indonesia; mode English
   menerjemahkan teks yang cocok persis dengan kamus di bawah (juga untuk isi yang dirender belakangan), sisanya tetap Indonesia.
   Ganti bahasa = simpan pilihan lalu muat ulang halaman. Tambah terjemahan: tambahkan pasangan "Indonesia": "English" di EN. */
(function () {
  const KEY = 'cow_lang';
  const pref = () => { try { const v = localStorage.getItem(KEY); return v === 'id' || v === 'en' ? v : 'auto'; } catch (e) { return 'auto'; } };
  const sys = () => { const l = String((navigator.languages && navigator.languages[0]) || navigator.language || 'id').toLowerCase(); return /^(id|in)(-|_|$)/.test(l) ? 'id' : 'en'; };
  const eff = () => { const p = pref(); return p === 'auto' ? sys() : p; };
  const EN = Object.assign({}, window.COW_EN || {}, {
    // Navigasi dan judul
    'Dashboard Clan': 'Clan Dashboard', 'Dashboard klan': 'Clan dashboard', 'Ringkasan': 'Overview', 'Peta war': 'War map', 'Ranking': 'Ranking',
    'Ranking serangan dan pertahanan': 'Attack and defense ranking', 'Analisis lawan': 'Opponent analysis', 'War planner': 'War planner', 'Riwayat war': 'War history',
    'Anggota': 'Members', 'Pemain': 'Players', 'Analisis': 'Analysis', 'Alat': 'Tools', 'Memuat…': 'Loading…', 'Muat ulang': 'Reload', 'Perlu perhatian': 'Needs attention',
    'Detail klan': 'Clan details', 'Komposisi Town Hall': 'Town Hall composition', 'Donasi dan tren': 'Donations and trends', 'Top donor 7 hari': 'Top donors (7 days)',
    'Tren anggota': 'Member trend', 'Tren poin klan': 'Clan points trend', 'Perubahan terbaru': 'Recent changes', 'Semua': 'All', 'Masuk': 'Joined', 'Keluar': 'Left',
    'Naik level': 'Level up', 'Donasi': 'Donations', 'Terima': 'Received', 'Trofi': 'Trophies', 'Nama': 'Name', 'Peringkat': 'Rank', 'Ekspor CSV': 'Export CSV',
    'Cari pemain': 'Search player', 'Jam aktif klan (WIB)': 'Clan active hours (WIB)', 'Rekrutmen dan kalender': 'Recruiting and calendar', 'Performa war klan': 'Clan war performance',
    'Skor kontribusi': 'Contribution score', 'Peringatan serangan (strike)': 'Attack warnings (strikes)', 'Statistik anggota': 'Member stats', 'Riwayat pembaruan': 'Update history',
    'Dihitung dari riwayat war. Saran bersifat otomatis.': 'Calculated from war history. Suggestions are automatic.', 'Tutup': 'Close', 'Profil Facebook': 'Facebook profile',
    'Dashboard membutuhkan JavaScript.': 'The dashboard requires JavaScript.', 'Pilih klan': 'Choose clan', 'Bagian dashboard': 'Dashboard sections', 'Buka submenu war': 'Open war submenu',
    'Menu lainnya': 'More menu', 'Pengaturan': 'Settings', 'Ganti tema': 'Change theme', 'Muat ulang data': 'Reload data', 'Filter perubahan': 'Filter changes',
    'Cari nama, role, atau TH': 'Search name, role, or TH', 'Cari anggota': 'Search members', 'Urutkan anggota': 'Sort members', 'Nama atau tag (#ABC123)': 'Name or tag (#ABC123)',
    'Pilih alat': 'Choose tool', 'Profil pemain': 'Player profile', 'Belum ada donasi baru dalam 7 hari terakhir. Total donasi musim ini ada di tab Anggota.': 'No new donations in the last 7 days. Season total is in the Members tab.',
    // Alat
    'Progres pemain': 'Player progress', 'Hero': 'Heroes', 'Catch-up pahlawan': 'Hero catch-up', 'Hewan': 'Pets', 'Catch-up hewan': 'Pet catch-up', 'Bandingkan': 'Compare', 'Dua pemain': 'Two players',
    'Urutan progres': 'Progress order', 'Biaya peralatan': 'Equipment cost', 'Hadiah jalur': 'Track rewards', 'Item': 'Items', 'Item sihir': 'Magic items',
    'Checklist': 'Checklist', 'Ke Max': 'To Max', 'Biaya dan waktu': 'Cost and time', 'Antrean': 'Queue', 'Urutan upgrade': 'Upgrade order', 'Cek rush': 'Rush check', 'Vs TH sebelumnya': 'Vs previous TH',
    'Tembok': 'Walls', 'Biaya dan jumlah': 'Cost and count', 'Desa': 'Village', 'Timer upgrade': 'Upgrade timers', 'Harian': 'Daily', 'Tugas dan pengingat': 'Tasks and reminders', 'Jadwal': 'Schedule',
    'Event dan raid': 'Events and raids', 'Hadiah Gratis': 'Free Gifts', 'Store dan voucher': 'Store and vouchers', 'Catch-up': 'Catch-up', 'Hitung dan syarat': 'Calculators and requirements',
    'Matikan musik war': 'Turn off war music', 'Nyalakan musik war': 'Turn on war music', 'Progres desa': 'Village progress', 'Info': 'Info', 'Gratis': 'Free', 'Kembali': 'Back',
    // Pengaturan
    'Bahasa': 'Language', 'Sistem': 'System', 'Indonesia': 'Indonesian', 'English': 'English', 'Ikuti bahasa HP, atau pilih sendiri': 'Follow the phone language, or choose your own',
    'Pengaturan notifikasi': 'Notification settings', 'Izin notifikasi': 'Notification permission', 'Izinkan': 'Allow', 'Aktif': 'On', 'Aktifkan': 'Enable', 'Belum': 'Not yet', 'Tidak didukung': 'Not supported',
    'Diblokir di peramban. Ubah lewat setelan situs.': 'Blocked in the browser. Change it in site settings.', 'Alarm tepat waktu': 'Exact alarms', 'Upgrade berbunyi tepat waktu walau aplikasi ditutup': 'Upgrades ring on time even when the app is closed',
    'Bebas penghemat baterai': 'Battery unrestricted', 'Mencegah sistem menghentikan pemantauan': 'Stops the system from halting monitoring', 'Pemantauan klan': 'Clan monitoring',
    'Notifikasi war, CWL, raid, dan anggota di latar belakang': 'War, CWL, raid, and member notifications in the background', 'Notifikasi di latar belakang': 'Background notifications',
    'Jenis notifikasi': 'Notification types', 'Awal, akhir, pengingat serangan, liga': 'Start, end, attack reminders, league', 'Pengingat dan hasil raid': 'Reminders and raid results',
    'Masuk, keluar, tidak aktif': 'Joined, left, inactive', 'Legend, upgrade hero (hanya pemain ditandai), daftar pantauan': 'Legend, hero upgrades (marked players only), watchlist',
    'Event & jadwal': 'Events & schedule', 'Event resmi mulai dan hampir berakhir': 'Official events starting and ending soon', 'Klan yang diberi notifikasi': 'Clans with notifications',
    'Pilih klan yang boleh memunculkan notifikasi': 'Choose which clans may show notifications', 'Perbaiki izin': 'Fix permissions', 'Tes notifikasi': 'Test notification', 'Izin': 'Permission', 'Alarm': 'Alarm', 'Baterai': 'Battery',
    'Kategori Pemain: upgrade hero hanya untuk pemain yang sudah kamu impor data desanya.': 'Players category: hero upgrades only for players whose village data you imported.',
    'Bila kamu melihat ini, notifikasi upgrade akan muncul.': 'If you can see this, upgrade notifications will work.', 'Peramban menolak menampilkan notifikasi.': 'The browser refused to show notifications.',
    // Panel upgrade berjalan
    'Tukang': 'Builders', 'Lab': 'Lab', 'Pandai Besi': 'Blacksmith', 'Markas Tukang': 'Builder Base', 'Laboratorium': 'Laboratory', 'Rumah Hewan': 'Pet House', 'Menganggur': 'Idle',
    'Magang': 'Apprentice', 'Asisten': 'Assistant', 'Magang menganggur': 'Apprentice idle', 'Asisten menganggur': 'Assistant idle', 'Selesai': 'Done', 'Sinkron': 'Sync', '1 · Buka game': '1 · Open game',
    '2 · Sinkron': '2 · Sync', 'Buka game': 'Open game', 'Baca hasil Ekspor Data Desa dari clipboard': 'Read the Export Village Data result from the clipboard',
    'Clash of Clans tidak ditemukan di HP ini.': 'Clash of Clans was not found on this phone.', 'Clipboard tidak berisi data desa. Ekspor dulu di game, lalu ketuk Sinkron lagi.': 'The clipboard has no village data. Export in the game first, then tap Sync again.',
    'Upgrade selesai': 'Upgrade finished', 'Tukang Nganggur Nih': 'Builder Is Idle', 'Tungku Tempa selesai': 'Forge finished', 'Tugas harian belum selesai': 'Daily tasks not finished',
    'Upgrade berjalan': 'Upgrades in progress', 'Tungku Tempa: produksi selesai': 'Forge: production finished',
    'Tes terkirim. Cek bilah notifikasi; bila tidak ada, buka Setelan Android > Aplikasi > Chrome/Dashboard Klan > Notifikasi dan nyalakan, termasuk bunyi dan getar.': 'Test sent. Check the notification bar; if nothing shows, open Android Settings > Apps > Chrome/Clan Dashboard > Notifications and turn them on, including sound and vibration.',
    'Pembantu': 'Helpers'
  });
  // Kunci kamus yang memuat § = bagian angka/nama yang berubah-ubah; tiap § jadi (.+?) dan kembali sebagai § berurutan di terjemahannya.
  const PAT = [];
  Object.keys(EN).forEach(k => {
    if (k.indexOf('\u00a7') < 0) return;
    const parts = k.split('\u00a7').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    PAT.push([new RegExp('^' + parts.map((x, i) => (i && i === parts.length - 1 && !x ? '(.*)' : (i ? '(.+?)' : '')) + x).join('') + '$'), EN[k]]);
    delete EN[k];
  });
  function pat(t) {
    for (let i = 0; i < PAT.length; i++) {
      const m = PAT[i][0].exec(t); if (!m) continue;
      let n = 0; return PAT[i][1].replace(/\u00a7/g, () => tr1(m[++n]));
    }
    return undefined;
  }
  const tr1 = v => trEn(String(v));
  const RULES = [
    [/^Tukang (\d+(?:\/\d+)?)(.*)$/, (m, a, b) => 'Builders ' + a + fr(b)], [/^Markas Tukang (\d+\/\d+)$/, (m, a) => 'Builder Base ' + a],
    [/^(Magang|Asisten)( L\d+)?: (.*)$/, (m, h, l, r) => (h === 'Magang' ? 'Apprentice' : 'Assistant') + (l || '') + ': ' + r],
    [/^(Magang|Asisten)( L\d+)? menganggur(.*)$/, (m, h, l, r) => (h === 'Magang' ? 'Apprentice' : 'Assistant') + (l || '') + ' idle' + fr(r)],
    [/^(Magang|Asisten)( L\d+)? istirahat(.*)$/, (m, h, l, r) => (h === 'Magang' ? 'Apprentice' : 'Assistant') + (l || '') + ' resting' + fr(r)],
    [/^Pembantu: (.*)$/, (m, a) => 'Helpers: ' + a], [/^(.+) siap bekerja$/, (m, a) => a + ' ready to work'],
    [/^(\d+) anggota tidak aktif musim ini$/, (m, a) => a + ' members inactive this season'], [/^(\d+) anggota belum selesai Capital Raid$/, (m, a) => a + ' members haven\'t finished Capital Raid'],
    [/^(\d+) anggota kena peringatan serangan \(strike\)$/, (m, a) => a + ' members have attack warnings (strikes)'], [/^Clan Games berjalan: (\d+) anggota belum mencapai (.+) poin$/, (m, a, b) => 'Clan Games in progress: ' + a + ' members haven\'t reached ' + b + ' points'],
    [/^(\d+) anggota belum menyerang tuntas(.*)$/, (m, a, b) => a + ' members haven\'t finished attacking' + b.replace('ronde', 'round')], [/^(\d+) dari 3 bintang$/, (m, a) => a + ' of 3 stars'],
    [/^(\d+) tugas belum dicentang$/, (m, a) => a + ' tasks not checked'], [/^(.+) selesai$/, (m, a) => EN[a] ? EN[a] + ' finished' : null]
  ];
  // Potongan kalimat di dalam teks gabungan (waktu, sisa, helper) yang dibuat dari angka.
  const FRAG = [[/\bsiap\b/g, 'ready'], [/ · sisa /g, ' · left '], [/ dan (\d+) lainnya/g, ' and $1 more'], [/helper memotong ±(\S+?)\/sesi/g, 'helper cuts ±$1/session'],
    [/(^| · )selesai (\d)/g, '$1ends $2'], [/\bsisa (\d+) level\b/g, '$1 levels left'], [/\bmaks (\d+)/g, 'max $1'], [/hero belum diambil/g, 'hero not taken yet'], [/\bekspor desa\b/g, 'village export'], [/\bekspor\b/g, 'export'],
    [/\b(\d+) hari\b/g, '$1 d'], [/\b(\d+) jam\b/g, '$1 h'], [/\b(\d+) menit\b/g, '$1 min'], [/\b(\d+) detik\b/g, '$1 s']];
  function fr(x) { FRAG.forEach(f => { x = x.replace(f[0], f[1]); }); return x; }
  function trEn(s) {
    if (typeof s !== 'string' || !s) return s;
    const t = s.trim(); if (!t) return s;
    let r = EN[t];
    if (r === undefined) for (let i = 0; i < RULES.length; i++) { const m = RULES[i][0].exec(t); if (m) { const v = RULES[i][1].apply(null, m); if (v) { r = v; break; } } }
    if (r === undefined) r = pat(t);
    if (r === undefined) { let f = t; FRAG.forEach(x => { f = f.replace(x[0], x[1]); }); if (f !== t) r = f; }
    if (r === undefined || r === t) return s;
    const a = s.indexOf(t); return s.slice(0, a) + r + s.slice(a + t.length);
  }
  const L = eff();

  const api = { pref, eff, sys, t: s => L === 'id' ? s : trEn(s), en: s => L === 'id' ? s : trEn(s), set(v) { try { localStorage.setItem(KEY, v === 'id' || v === 'en' ? v : 'auto'); } catch (e) { /* abaikan */ } try { if (window.AndroidBridge && AndroidBridge.setLang) AndroidBridge.setLang(eff()); } catch (e) { /* abaikan */ } try { location.reload(); } catch (e) { /* abaikan */ } } };
  window.cowLang = api; window.cowT = api.t; window.cowTEn = api.en;
  try { document.documentElement.lang = L; if (window.AndroidBridge && AndroidBridge.setLang) AndroidBridge.setLang(L); } catch (e) { /* abaikan */ }
  if (L === 'id' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const ATTR = ['title', 'placeholder', 'aria-label', 'alt'], SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
  function node(n) {
    if (n.nodeType === 3) { const p = n.parentNode; if (p && !SKIP.test(p.nodeName)) { const v = trEn(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } return; }
    if (n.nodeType !== 1 || SKIP.test(n.nodeName)) return;
    ATTR.forEach(a => { if (n.hasAttribute(a)) { const v = trEn(n.getAttribute(a)); if (v !== n.getAttribute(a)) n.setAttribute(a, v); } });
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  let q = new Set(), raf = 0;
  const flush = () => { raf = 0; const b = q; q = new Set(); b.forEach(n => { try { node(n); } catch (e) { /* abaikan */ } }); };
  const mo = new MutationObserver(ms => {
    ms.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(n => q.add(n)); else q.add(m.target); });
    if (!raf) raf = (window.requestAnimationFrame || setTimeout)(flush);
  });
  const start = () => { node(document.body); mo.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTR }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
