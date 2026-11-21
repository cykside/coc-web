// Perhitungan progres desa dari Ekspor Data Desa + assets/data/progress.json (dibangun tools/build_progress.py).
// Murni (tanpa DOM) supaya bisa dites di Node. Dipakai tab Ke Max, Antrean, Cek rush, dan Tembok di tools.js.
(function (root) {
  'use strict';
  const SECTIONS = ['buildings', 'traps', 'guardians', 'heroes', 'units', 'spells', 'siege_machines', 'pets'];
  const LANE = { b: 'bld', h: 'bld', t: 'lab', s: 'lab', g: 'lab', p: 'pet' };
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const TH_ID = 1000001, WALL_ID = 1000010;

  function thOf(json) {
    const b = ((json && json.buildings) || []).find(x => x && x.data === TH_ID);
    return b ? num(b.lvl) : 0;
  }
  // Level tertinggi yang boleh di TH tertentu (0 = belum tersedia).
  function maxLevel(item, th) {
    let m = 0;
    (item.l || []).forEach((x, i) => { if (num(x[2]) <= th) m = i + 1; });
    return m;
  }
  const resOf = (item, lvl) => (item.rs && item.rs[lvl - 1]) || item.r;
  const addCost = (a, b) => { Object.keys(b).forEach(k => { a[k] = (a[k] || 0) + b[k]; }); return a; };
  // Biaya dan waktu naik dari level `from` ke `to`.
  function span(item, from, to) {
    const out = { cost: {}, sec: 0 };
    for (let l = from + 1; l <= to; l++) {
      const x = item.l[l - 1]; if (!x) continue;
      const r = resOf(item, l);
      out.cost[r] = (out.cost[r] || 0) + num(x[0]); out.sec += num(x[1]);
    }
    return out;
  }
  // Semua instance item dari ekspor, per ID. Timer > 0 berarti sedang naik level.
  function collect(json, P) {
    const by = {}, running = { bld: [], lab: [], pet: [] };
    SECTIONS.forEach(sec => (json[sec] || []).forEach(e => {
      const it = e && P.items[e.data]; if (!it) return;
      const n = Math.max(1, Math.floor(num(e.cnt) || 1)), timer = num(e.timer);
      const g = by[e.data] || (by[e.data] = { id: e.data, item: it, inst: [] });
      for (let i = 0; i < n; i++) {
        g.inst.push({ lvl: num(e.lvl), up: timer > 0 });
        if (timer > 0) running[LANE[it.k]].push(timer);
      }
    }));
    return { by: by, running: running };
  }

  // Sisa biaya dan waktu sampai maks di TH `capTh` (bawaan = TH sendiri). Upgrade yang sedang berjalan dianggap selesai (level + 1).
  // Bangunan yang belum dibangun ikut dihitung dari level 1; pasukan, mantra, siege, hewan, dan pahlawan hanya yang sudah dimiliki.
  function toMax(json, P, opts) {
    opts = opts || {};
    json = json || {};
    const th = opts.th || thOf(json), capTh = opts.capTh || th, c = collect(json, P);
    const rows = [], jobs = [], insts = [], tot = { cost: {}, sec: { bld: 0, lab: 0, pet: 0 } };
    Object.keys(c.by).forEach(id => {
      if (+id === WALL_ID) return;
      const g = c.by[id], it = g.item, mx = maxLevel(it, capTh), cap = it.c ? num(it.c[capTh]) : 0;
      if (!mx) return;
      const row = { id: +id, n: it.n, k: it.k, g: it.g || '', max: mx, cost: {}, sec: 0, have: [], missing: 0 };
      const push = (have, isNew) => {
        const s = span(it, have, mx);
        row.have.push(have); insts.push({ id: +id, n: it.n, k: it.k, g: it.g || '', have: have, cap: mx });
        if (s.sec > 0 || Object.keys(s.cost).length) {
          addCost(row.cost, s.cost); row.sec += s.sec;
          jobs.push({ id: +id, n: it.n, k: it.k, lane: LANE[it.k], sec: s.sec, from: have, to: mx, isNew: !!isNew });
        }
      };
      g.inst.forEach(x => push(Math.min(x.lvl + (x.up ? 1 : 0), Math.max(mx, x.lvl)), false));
      if (it.k === 'b' && cap > g.inst.length) { row.missing = cap - g.inst.length; for (let i = 0; i < row.missing; i++) push(0, true); }
      if (row.sec > 0 || Object.keys(row.cost).length) { rows.push(row); addCost(tot.cost, row.cost); tot.sec[LANE[it.k]] += row.sec; }
    });
    rows.sort((a, b) => b.sec - a.sec);
    return { th: th, capTh: capTh, rows: rows, jobs: jobs, insts: insts, tot: tot, running: c.running };
  }

  // Jadwal sederhana: tiap pekerja (builder, lab, pet house) mengerjakan satu upgrade sekaligus; upgrade terpanjang dulu
  // supaya semua pekerja selesai hampir bersamaan. Tiap bangunan dihitung satu rantai (level berurutan, tidak paralel).
  function schedule(jobs, running, workers) {
    const n = Math.max(1, Math.floor(num(workers) || 1)), ws = [];
    const busy = (running || []).slice().sort((a, b) => b - a);
    for (let i = 0; i < n; i++) ws.push({ free: num(busy[i]), items: [] });
    jobs.slice().sort((a, b) => b.sec - a.sec).forEach(j => {
      const w = ws.reduce((m, x) => x.free < m.free ? x : m, ws[0]);
      w.items.push({ n: j.n, from: j.from, to: j.to, start: w.free, end: w.free + j.sec, isNew: !!j.isNew });
      w.free += j.sec;
    });
    return { makespan: ws.reduce((m, w) => Math.max(m, w.free), 0), workers: ws };
  }

  // Cek rush: bandingkan level dengan maks TH sebelumnya. Persen = jumlah level yang dimiliki (maks sama dengan batas) per jumlah batas.
  const GROUPS = [['Pertahanan', i => i.k === 'b' && /^(defenses|traps|guardians|crafted-defenses)$/.test(i.g)], ['Bangunan lain', i => i.k === 'b'], ['Pahlawan', i => i.k === 'h'], ['Army (lab)', i => i.k === 't' || i.k === 's' || i.k === 'g'], ['Hewan', i => i.k === 'p']];
  function rush(json, P) {
    const th = thOf(json), r = toMax(json, P, { th: th, capTh: Math.max(1, th - 1) }), groups = [];
    const left = r.insts.slice();
    GROUPS.forEach(([name, test]) => {
      const mine = left.filter(test); mine.forEach(i => left.splice(left.indexOf(i), 1));
      const have = mine.reduce((a, i) => a + Math.min(i.have, i.cap), 0), cap = mine.reduce((a, i) => a + i.cap, 0);
      if (cap) groups.push({ name: name, pct: Math.round(have / cap * 100), have: have, cap: cap, gaps: mine.filter(i => i.cap > i.have).length });
    });
    const worst = {};
    r.insts.filter(i => i.cap > i.have).forEach(i => { const w = worst[i.id] || (worst[i.id] = { n: i.n, k: i.k, gap: 0, count: 0, cap: i.cap }); w.gap += i.cap - i.have; w.count++; });
    const top = Object.keys(worst).map(k => worst[k]).sort((a, b) => b.gap - a.gap).slice(0, 10);
    const sh = groups.reduce((a, g) => a + g.have, 0), sc = groups.reduce((a, g) => a + g.cap, 0);
    return { th: th, ref: Math.max(1, th - 1), groups: groups, top: top, pct: sc ? Math.round(sh / sc * 100) : null };
  }

  // Tembok: jumlah per level dari ekspor, biaya sampai level target (Gold atau Elixir), dan tembok yang belum dibangun.
  function wallInfo(json, P, W, target) {
    const th = thOf(json), by = {};
    ((json && json.buildings) || []).forEach(b => { if (b && b.data === WALL_ID) by[b.lvl] = (by[b.lvl] || 0) + Math.max(1, Math.floor(num(b.cnt) || 1)); });
    const total = Object.keys(by).reduce((a, k) => a + by[k], 0);
    const maxCount = num(((P.walls || {}).c || {})[th]), costs = (W && W.costs) || {};
    const t = num(target) > 0 ? num(target) : num(((W && W.maxByTh) || {})[th]);
    const upTo = (from, to) => { let s = 0, miss = []; for (let l = from + 1; l <= to; l++) { if (costs[l] == null) miss.push(l); else s += num(costs[l]); } return { s: s, miss: miss }; };
    let cost = 0, below = 0; const miss = new Set();
    Object.keys(by).forEach(l => { if (+l < t) { const u = upTo(+l, t); cost += u.s * by[l]; below += by[l]; u.miss.forEach(m => miss.add(m)); } });
    const lack = Math.max(0, maxCount - total), uN = upTo(1, t);
    return { th: th, by: by, total: total, maxCount: maxCount, lack: lack, target: t, cost: cost, below: below, costNew: lack ? uN.s * lack : 0, missing: Array.from(miss).sort((a, b) => a - b) };
  }

  root.COW_PROGRESS = { maxLevel: maxLevel, span: span, toMax: toMax, schedule: schedule, rush: rush, wallInfo: wallInfo, thOf: thOf, SECTIONS: SECTIONS };
  if (typeof module !== 'undefined') module.exports = root.COW_PROGRESS;
})(typeof window !== 'undefined' ? window : globalThis);
