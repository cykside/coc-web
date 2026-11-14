/* mobile-tidy.js - pendamping mobile-tidy.css: nav 5 tombol + lembar "Lainnya", sembunyikan pilih klan bila cuma satu. */
(function () {
  'use strict';
  var PRIMARY = ['overview', 'war', 'members', 'alat'];       /* tombol tetap di bilah bawah (ubah sesuai selera) */
  var MORE_INFO = {                                            /* isi lembar "Lainnya" */
    players: 'Cari profil pemain', capital: 'Capital Raid dan jam aktif', stats: 'Skor, strike, Clan Games'
  };
  var root = document.documentElement;
  if (window.AndroidBridge || /[?&]app=1/.test(location.search)) root.classList.add('app-mode');

  function init() {
    var nav = document.querySelector('.nav');
    if (!nav || nav.dataset.tidy) return;
    nav.dataset.tidy = '1';

    var sel = document.getElementById('clanSelect');
    var syncClans = function () { root.classList.toggle('multi-clan', !!sel && sel.options.length > 1); };
    syncClans();
    if (sel) new MutationObserver(syncClans).observe(sel, { childList: true });

    var links = [].slice.call(nav.querySelectorAll('a[data-view]'));
    var hidden = [];
    links.forEach(function (a) {
      if (PRIMARY.indexOf(a.dataset.view) < 0) { a.classList.add('nav-hide'); hidden.push(a); }
    });
    if (!hidden.length) return;

    var more = document.createElement('button');
    more.type = 'button'; more.className = 'nav-more'; more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-expanded', 'false');
    more.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>Lainnya';
    nav.appendChild(more);

    var back = document.createElement('div'); back.className = 'more-back';
    var sheet = document.createElement('div'); sheet.className = 'more-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Menu lainnya');
    hidden.forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button';
      var label = a.textContent.trim();
      b.innerHTML = a.querySelector('svg').outerHTML + '<span><b>' + label + '</b><small>' + (MORE_INFO[a.dataset.view] || '') + '</small></span>';
      b.addEventListener('click', function () { close(); a.click(); });
      sheet.appendChild(b);
    });
    document.body.appendChild(back); document.body.appendChild(sheet);

    function close() { root.classList.remove('more-open'); more.setAttribute('aria-expanded', 'false'); }
    more.addEventListener('click', function () {
      var open = !root.classList.contains('more-open');
      root.classList.toggle('more-open', open); more.setAttribute('aria-expanded', String(open));
    });
    back.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    var sync = function () {
      var on = hidden.some(function (a) { return a.getAttribute('aria-current') === 'page'; });
      var v = on ? 'page' : 'false';
      if (more.getAttribute('aria-current') !== v) more.setAttribute('aria-current', v);   /* cegah putaran tak berujung */
    };
    sync();
    var mo = new MutationObserver(sync);
    links.forEach(function (a) { mo.observe(a, { attributes: true, attributeFilter: ['aria-current'] }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ---- Tab Analisis: catatan "data terbatas" sekali saja, statistik jadi kartu, kartu kosong digabung, rumus skor dilipat ---- */
(function () {
  'use strict';
  var EMPTY_RE = /^(Belum ada|Pelacak Clan Games baru|Tidak ada riwayat)/i;
  var ORDER = ['perfBox', 'scoreBox', 'strikeBox', 'gamesBox', 'statBox', 'historyBox'];
  var busy = false, mo = null, pane = null;

  function $(id) { return document.getElementById(id); }
  function cardOf(id) { var e = $(id); return e && e.closest('.card'); }
  function isEmpty(id) {
    var e = $(id);
    if (!e) return false;
    var t = (e.textContent || '').trim();
    return !e.querySelector('table,canvas,svg,img') && t.length < 260 && EMPTY_RE.test(t);
  }

  /* 1. "(data terbatas)" di tiap baris -> satu catatan di atas tabel + tanda bintang */
  function tidyScore() {
    var box = $('scoreBox'); if (!box) return;
    var spans = [].slice.call(box.querySelectorAll('span.small[title="Komponen berdatanya sedikit"]'));
    spans.forEach(function (s) {
      var tr = s.closest('tr'); if (tr) tr.classList.add('lim');
      s.textContent = '*'; s.className = 'lim-mark'; s.removeAttribute('title');
    });
    if (box.querySelector('tr.lim') && !box.querySelector('.lim-note')) {
      var n = document.createElement('p'); n.className = 'small lim-note';
      n.textContent = '* Data terbatas: skor dihitung dari sedikit komponen (misalnya hanya donasi), jadi 100 belum berarti paling aktif.';
      var wrap = box.querySelector('.table-wrap') || box.firstChild; box.insertBefore(n, wrap);
    }
    /* 4. Penjelasan rumus skor -> lipatan */
    [].slice.call(box.children).forEach(function (el) {
      if (el.tagName !== 'DETAILS' && /^Skor 0\S*100 adalah/.test((el.textContent || '').trim())) {
        var d = document.createElement('details'); d.className = 'fold-mini';
        var sm = document.createElement('summary'); sm.textContent = 'Cara hitung skor';
        box.replaceChild(d, el); d.appendChild(sm); d.appendChild(el);
      }
    });
  }

  /* 2. Statistik anggota: tabel lebar -> kartu (CSS memilih mana yang tampil) */
  function tidyStats() {
    var box = $('statBox'); if (!box) return;
    var tb = box.querySelector('table:not([data-tidy])'); if (!tb) return;
    tb.setAttribute('data-tidy', '1');
    var heads = [].slice.call(tb.querySelectorAll('thead th')).map(function (th) { return th.textContent.trim(); });
    var old = box.querySelector('.stat-cards'); if (old) old.remove();
    var wrap = document.createElement('div'); wrap.className = 'stat-cards';
    [].slice.call(tb.querySelectorAll('tbody tr')).forEach(function (tr) {
      var td = [].slice.call(tr.children);
      var card = document.createElement('div'); card.className = 'stat-card';
      var top = document.createElement('div'); top.className = 'sc-top';
      var nm = document.createElement('span'); nm.className = 'sc-name';       /* bukan salinan <td>, agar tak membawa garis sel */
      nm.innerHTML = td[0].innerHTML; top.appendChild(nm);
      var advice = (td[td.length - 1].textContent || '').trim();
      if (advice && advice !== '-') { var b = document.createElement('span'); b.className = 'sc-advice'; b.textContent = advice; top.appendChild(b); }
      card.appendChild(top);
      var grid = document.createElement('div'); grid.className = 'sc-grid';
      for (var i = 1; i < td.length - 1; i++) {
        var v = (td[i].textContent || '').trim();
        if (!v || v === '-') continue;                      /* tampilkan hanya angka yang ada */
        var c = document.createElement('div');
        c.innerHTML = '<small></small><b></b>'; c.firstChild.textContent = heads[i]; c.lastChild.textContent = v;
        grid.appendChild(c);
      }
      var only = grid.children.length === 1 && /^Donasi/.test(grid.firstChild.firstChild.textContent);
      if (!grid.children.length || only) {                 /* belum ada data war: cukup satu baris ringkas */
        card.classList.add('sc-flat');
        if (only) { var iv = document.createElement('span'); iv.className = 'sc-inline'; iv.textContent = 'Donasi:Terima ' + grid.firstChild.lastChild.textContent; top.appendChild(iv); }
        wrap.appendChild(card);
      } else { card.appendChild(grid); wrap.appendChild(card); }
    });
    box.insertBefore(wrap, box.firstChild);          /* statBox sendiri adalah .table-wrap */
  }

  /* 3. Kartu yang hanya berisi "belum ada data" digabung dalam satu lipatan di bawah */
  function tidyEmpties() {
    if (!pane) return;
    var fold = $('emptyFold');
    if (!fold) {
      fold = document.createElement('details'); fold.id = 'emptyFold'; fold.className = 'card fold';
      fold.innerHTML = '<summary>Belum ada data</summary><div class="fold-body"></div>';
    }
    var body = fold.querySelector('.fold-body'), empties = 0;
    ORDER.forEach(function (id) {
      var c = cardOf(id); if (!c) return;
      if (isEmpty(id)) { empties++; if (c.parentNode !== body) { c.classList.add('in-empty'); if ('open' in c) c.open = true; body.appendChild(c); } }
      else { c.classList.remove('in-empty'); if (c.parentNode !== pane) pane.insertBefore(c, fold.parentNode === pane ? fold : null); }
    });
    /* urutan asli untuk kartu yang tampil */
    var shown = ORDER.map(cardOf).filter(function (c) { return c && c.parentNode === pane; });
    shown.forEach(function (c) { pane.insertBefore(c, fold.parentNode === pane ? fold : null); });
    if (empties) {
      if (fold.parentNode !== pane) pane.appendChild(fold);
      fold.querySelector('summary').textContent = 'Belum ada data (' + empties + ')';
      fold.hidden = false;
    } else fold.hidden = true;
  }

  function run() {
    if (busy) return; busy = true;
    try { tidyScore(); tidyStats(); tidyEmpties(); } catch (e) {}
    if (mo) mo.takeRecords();
    busy = false;
  }
  function init() {
    pane = document.querySelector('[data-pane=stats]'); if (!pane) return;
    mo = new MutationObserver(function () { if (!busy) setTimeout(run, 0); });
    ORDER.forEach(function (id) { var e = $(id); if (e) mo.observe(e, { childList: true }); });
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }); else setTimeout(init, 0);
  window.addEventListener('load', function () { setTimeout(run, 400); });
})();
