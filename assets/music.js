/* music.js - musik latar saat war berlangsung.
   Aturan putar: musik hanya menyala bila SEMUA benar:
     1) tab Ringkasan sedang terbuka,
     2) war klan yang dipilih berstatus "inWar" (bukan persiapan / selesai) dan waktunya belum habis,
     3) halaman/aplikasi sedang terlihat (tidak di latar belakang),
     4) pengguna tidak mematikannya lewat tombol musik di kartu war (pilihan disimpan di HP).
   Berhenti otomatis (dengan fade-out) begitu salah satu syarat tidak terpenuhi. */
(function () {
  'use strict';
  const SRC = 'assets/combat_music.ogg', KEY = 'cow_music', VOL = 0.5, FADE_MS = 700;
  let audio = null, fadeTimer = 0, blocked = false, wantPlay = false;

  const enabled = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };
  const setEnabled = on => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* mode privat: abaikan */ } };

  function warLive() {
    try {
      const sel = document.getElementById('clanSelect');
      if (!sel || !sel.value || typeof curWar !== 'function') return false;
      const war = curWar(resolveClanKey(sel.value));
      if (!war || war.state !== 'inWar') return false;
      const e = typeof parseT === 'function' ? parseT(war.end) : 0;
      return !e || e > Date.now();     // waktu war habis (menunggu hasil akhir): musik berhenti
    } catch (err) { return false; }
  }
  function overviewOpen() {
    const p = document.querySelector('[data-pane="overview"]');
    return !!p && !p.hidden;
  }
  const shouldPlay = () => enabled() && !document.hidden && overviewOpen() && warLive();

  function ensure() {
    if (audio) return audio;
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    // Cadangan bila pemuat aset tidak mendukung seek (mode offline): ulang dari awal secara manual.
    // Audio baru siap dimuat: bila sebelumnya gagal/tertunda, coba putar lagi otomatis.
    audio.addEventListener('canplay', () => { if (wantPlay && audio.paused) start(); });
    audio.addEventListener('ended', () => {
      if (!wantPlay) return;
      try { audio.currentTime = 0; } catch (e) { /* abaikan */ }
      audio.play().catch(() => { try { audio.load(); audio.play().catch(() => {}); } catch (e) { /* abaikan */ } });
    });
    return audio;
  }

  function fadeTo(target, done) {
    clearInterval(fadeTimer);
    if (!audio) return;
    const from = audio.volume, steps = Math.max(1, Math.round(FADE_MS / 50)); let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      try { audio.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps))); } catch (e) { /* abaikan */ }
      if (i >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, 50);
  }

  function start() {
    const a = ensure();
    wantPlay = true;
    if (!a.paused) { fadeTo(VOL); return; }
    const p = a.play();
    if (p && p.then) p.then(() => { blocked = false; fadeTo(VOL); }).catch(() => { blocked = true; });   // peramban butuh sentuhan dulu
    else fadeTo(VOL);
  }
  function stop() {
    wantPlay = false;
    if (!audio || audio.paused) return;
    fadeTo(0, () => { if (!wantPlay) { try { audio.pause(); } catch (e) { /* abaikan */ } } });
  }

  function paintBtn() {
    const b = document.getElementById('musicBtn'); if (!b) return;
    const on = enabled(), t = on ? 'Matikan musik war' : 'Nyalakan musik war';
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', t); b.title = t;
    b.classList.toggle('off', !on);
  }

  function sync() {
    paintBtn();
    if (shouldPlay()) start(); else stop();
  }

  // Tombol musik (dirender ulang oleh renderHero, jadi pakai delegasi klik).
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#musicBtn');
    if (b) { setEnabled(!enabled()); sync(); return; }
    if (blocked && shouldPlay()) sync();      // sentuhan pertama membuka izin putar otomatis di peramban
  }, true);
  document.addEventListener('keydown', () => { if (blocked && shouldPlay()) sync(); }, true);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('hashchange', sync);

  // Dipanggil app.js setelah pindah tab / render ulang kartu war; dan oleh MainActivity saat aplikasi masuk/keluar latar belakang.
  window.__cowMusicSync = sync;
  window.__cowMusicPause = () => { wantPlay = false; if (audio) { clearInterval(fadeTimer); try { audio.pause(); } catch (e) { /* abaikan */ } } };
  setInterval(sync, 2000);    // coba ulang otomatis bila audio tertunda; war bisa pindah status (persiapan > berlangsung > habis) tanpa interaksi
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
