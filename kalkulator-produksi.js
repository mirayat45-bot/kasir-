/* ════════════════════════════════════════════════════════════════
   KALKULATOR PRODUKSI — BUGFIX SCRIPT
   File ini dimuat SETELAH script.js dan HANYA menangani halaman
   #pg-kalkulator (Tab Konveksi/HPP & Tab Banner/Spanduk).
   Semua ID/class di sini disinkronkan dengan index.html & style.css
   (.hpp-row, .sim-box/.sim-lbl/.sim-val, .bnr-rekap-row, #hpp-total,
   #sim-result, #bnr-preview, #bnr-rekap-body, #bnr-rekap-foot, dst).
   ════════════════════════════════════════════════════════════════ */

(function () {

  /* ── State ─────────────────────────────────────────────────── */
  const KALK_STORAGE_KEY = 'kalkulatorProduksiData';
  let hppRowCounter   = 0;
  let bannerRekapList = [];
  let simModalManual  = false; // true jika user mengetik manual di #sim-modal

  /* ── Template HPP siap pakai ──────────────────────────────────
     value <select id="hpp-template"> : jas | toga | kaos | polo   */
  const HPP_TEMPLATES = {
    jas: [
      { nama: 'Kain Drill (meter)',     harga: 35000, qty: 2 },
      { nama: 'Furing',                 harga: 15000, qty: 1.5 },
      { nama: 'Resleting',              harga: 5000,  qty: 1 },
      { nama: 'Bordir Logo',            harga: 15000, qty: 1 },
      { nama: 'Jasa Jahit',             harga: 40000, qty: 1 }
    ],
    toga: [
      { nama: 'Kain Satin (meter)',     harga: 30000, qty: 2.5 },
      { nama: 'Topi Toga',              harga: 20000, qty: 1 },
      { nama: 'Kalung Wisuda',          harga: 12000, qty: 1 },
      { nama: 'Jasa Jahit',             harga: 35000, qty: 1 }
    ],
    kaos: [
      { nama: 'Kain Cotton Combed (m)', harga: 45000, qty: 1.2 },
      { nama: 'Sablon / DTF',           harga: 15000, qty: 1 },
      { nama: 'Jasa Jahit',             harga: 12000, qty: 1 }
    ],
    polo: [
      { nama: 'Kain Lacoste (meter)',   harga: 50000, qty: 1.3 },
      { nama: 'Kerah & Manset',         harga: 8000,  qty: 1 },
      { nama: 'Kancing',                harga: 1000,  qty: 3 },
      { nama: 'Bordir Logo',            harga: 15000, qty: 1 },
      { nama: 'Jasa Jahit',             harga: 18000, qty: 1 }
    ]
  };

  /* ── Helper umum (guard: jangan timpa fungsi global yang sudah ada) ── */

  // "Rp 35.000" / "35.000" / "" / null -> 35000 (integer, anti-NaN)
  function parseRupiah(val) {
    if (val === null || val === undefined) return 0;
    const digits = String(val).replace(/[^0-9]/g, '');
    if (!digits) return 0;
    const n = parseInt(digits, 10);
    return isNaN(n) ? 0 : n;
  }

  // 35000 -> "Rp 35.000"
  function formatRupiah(num) {
    num = Number(num);
    if (!isFinite(num)) num = 0;
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  }

  // Fallback formatRibuan/formatInputRibuan kalau belum ada di script.js
  if (typeof window.formatRibuan !== 'function') {
    window.formatRibuan = function (value) {
      const digits = String(value == null ? '' : value).replace(/[^0-9]/g, '');
      if (!digits) return '';
      return parseInt(digits, 10).toLocaleString('id-ID');
    };
  }
  if (typeof window.formatInputRibuan !== 'function') {
    window.formatInputRibuan = function (el) {
      if (!el) return;
      el.value = window.formatRibuan(el.value);
    };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ════════════════════════════════════════════════════════════
     TAB SWITCH (Konveksi/HPP <-> Banner/Spanduk)
     ════════════════════════════════════════════════════════════ */
  window.switchKalkTab = function (tab) {
    const tabKonveksi  = document.getElementById('tab-konveksi');
    const tabBanner    = document.getElementById('tab-banner');
    const kalkKonveksi = document.getElementById('kalk-konveksi');
    const kalkBanner   = document.getElementById('kalk-banner');
    if (!tabKonveksi || !tabBanner || !kalkKonveksi || !kalkBanner) return;

    if (tab === 'banner') {
      kalkKonveksi.style.display = 'none';
      kalkBanner.style.display   = '';
      tabBanner.classList.add('btn-blue');
      tabBanner.classList.remove('btn-ghost');
      tabKonveksi.classList.add('btn-ghost');
      tabKonveksi.classList.remove('btn-blue');
    } else {
      tab = 'konveksi';
      kalkKonveksi.style.display = '';
      kalkBanner.style.display   = 'none';
      tabKonveksi.classList.add('btn-blue');
      tabKonveksi.classList.remove('btn-ghost');
      tabBanner.classList.add('btn-ghost');
      tabBanner.classList.remove('btn-blue');
    }

    try { localStorage.setItem('kalkActiveTab', tab); } catch (e) {}
  };

  /* ════════════════════════════════════════════════════════════
     TAB KONVEKSI / HPP
     ════════════════════════════════════════════════════════════ */

  // + Tambah Komponen
  window.tambahHPPRow = function (data) {
    const tbody = document.getElementById('hpp-tbody');
    if (!tbody) return;

    data = data || { nama: '', harga: 0, qty: 1 };
    hppRowCounter++;

    const tr = document.createElement('tr');
    tr.className = 'hpp-row';
    tr.dataset.id = 'hpp-' + Date.now() + '-' + hppRowCounter;

    const hargaVal = data.harga ? window.formatRibuan(String(Math.round(data.harga))) : '';
    const qtyVal   = (data.qty === null || data.qty === undefined || data.qty === '') ? 1 : data.qty;

    tr.innerHTML =
      '<td><label>Komponen Biaya</label>' +
        '<input type="text" class="hpp-nama" placeholder="Nama komponen" value="' + escapeHtml(data.nama || '') + '" oninput="hitungHPP()"></td>' +
      '<td><label>Harga Satuan (Rp)</label>' +
        '<input type="text" inputmode="numeric" class="hpp-harga" placeholder="0" value="' + escapeHtml(hargaVal) + '" oninput="formatInputRibuan(this);hitungHPP()"></td>' +
      '<td><label>Qty</label>' +
        '<input type="number" min="0" step="any" class="hpp-qty" placeholder="0" value="' + escapeHtml(String(qtyVal)) + '" oninput="hitungHPP()"></td>' +
      '<td><label>Subtotal (Rp)</label>' +
        '<span class="hpp-subtotal" style="font-weight:800;font-family:var(--mono);">Rp 0</span></td>' +
      '<td style="text-align:center;">' +
        '<button type="button" class="btn btn-ghost btn-xs" onclick="hapusHPPRow(this)" title="Hapus komponen"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>';

    tbody.appendChild(tr);
    hitungHPP();
  };

  // Hapus Komponen
  window.hapusHPPRow = function (btn) {
    const row = btn && btn.closest ? btn.closest('tr.hpp-row') : null;
    if (row) row.remove();
    hitungHPP();
  };

  // Pilih Template HPP (jas / toga / kaos / polo)
  window.loadHPPTemplate = function (value) {
    const tbody = document.getElementById('hpp-tbody');
    if (!tbody || !value || !HPP_TEMPLATES[value]) return;

    tbody.innerHTML = '';
    HPP_TEMPLATES[value].forEach(function (item) { window.tambahHPPRow(item); });
    hitungHPP();

    const select = document.getElementById('hpp-template');
    if (select) select.value = '';
  };

  // Hitung subtotal per baris + TOTAL MODAL/PCS + sinkron ke Simulasi Profit
  window.hitungHPP = function () {
    const tbody  = document.getElementById('hpp-tbody');
    const totalEl = document.getElementById('hpp-total');
    if (!tbody) return;

    let total = 0;
    tbody.querySelectorAll('tr.hpp-row').forEach(function (row) {
      const hargaEl    = row.querySelector('.hpp-harga');
      const qtyEl      = row.querySelector('.hpp-qty');
      const subtotalEl = row.querySelector('.hpp-subtotal');

      const harga = parseRupiah(hargaEl ? hargaEl.value : 0);
      const qty   = parseFloat(qtyEl ? qtyEl.value : 0) || 0;
      const subtotal = harga * qty;

      if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
      total += subtotal;
    });

    if (totalEl) totalEl.textContent = formatRupiah(total);

    // Sinkron otomatis ke "Modal/Pcs" simulasi, kecuali user sudah edit manual
    const simModalEl = document.getElementById('sim-modal');
    if (simModalEl && !simModalManual) {
      simModalEl.value = window.formatRibuan(String(Math.round(total)));
    }

    window.hitungSimulasi();
    saveKalkulatorState();
  };

  /* ════════════════════════════════════════════════════════════
     SIMULASI PROFIT
     ════════════════════════════════════════════════════════════ */
  window.hitungSimulasi = function () {
    const resultEl = document.getElementById('sim-result');
    if (!resultEl) return;

    const jualEl  = document.getElementById('sim-jual');
    const qtyEl   = document.getElementById('sim-qty');
    const modalEl = document.getElementById('sim-modal');

    const hargaJual    = parseRupiah(jualEl  ? jualEl.value  : 0);
    const qtyProduksi  = parseFloat(qtyEl ? qtyEl.value : 0) || 0;
    const modalPerPcs  = parseRupiah(modalEl ? modalEl.value : 0);

    const totalModal   = modalPerPcs * qtyProduksi;
    const totalOmzet   = hargaJual * qtyProduksi;
    const profitPerPcs = hargaJual - modalPerPcs;
    const totalProfit  = profitPerPcs * qtyProduksi;
    const margin       = totalOmzet > 0 ? (totalProfit / totalOmzet) * 100 : 0;

    const profitColor = profitPerPcs >= 0 ? 'var(--green-d)' : 'var(--red)';
    const totalProfitColor = totalProfit >= 0 ? 'var(--green-d)' : 'var(--red)';
    const marginColor = margin >= 0 ? 'var(--green-d)' : 'var(--red)';

    const boxes = [
      { lbl: 'Modal / Pcs',   val: formatRupiah(modalPerPcs),  color: 'var(--blue-d)' },
      { lbl: 'Profit / Pcs',  val: formatRupiah(profitPerPcs), color: profitColor },
      { lbl: 'Total Modal',   val: formatRupiah(totalModal),   color: 'var(--blue-d)' },
      { lbl: 'Total Omzet',   val: formatRupiah(totalOmzet),   color: 'var(--tx)' },
      { lbl: 'Total Profit',  val: formatRupiah(totalProfit),  color: totalProfitColor },
      { lbl: 'Margin',        val: margin.toFixed(1) + ' %',   color: marginColor }
    ];

    resultEl.innerHTML = boxes.map(function (b) {
      return '<div class="sim-box"><div class="sim-lbl">' + b.lbl + '</div>' +
             '<div class="sim-val" style="color:' + b.color + ';">' + b.val + '</div></div>';
    }).join('');

    saveKalkulatorState();
  };

  /* ════════════════════════════════════════════════════════════
     TAB BANNER / SPANDUK
     ════════════════════════════════════════════════════════════ */
  window.hitungBanner = function () {
    const lebarEl  = document.getElementById('bnr-lebar');
    const tinggiEl = document.getElementById('bnr-tinggi');
    const hargaEl  = document.getElementById('bnr-harga');
    const qtyEl    = document.getElementById('bnr-qty');
    const preview  = document.getElementById('bnr-preview');
    if (!lebarEl || !tinggiEl || !hargaEl || !qtyEl || !preview) return;

    const lebarCm  = parseFloat(lebarEl.value) || 0;
    const tinggiCm = parseFloat(tinggiEl.value) || 0;
    const harga    = parseRupiah(hargaEl.value);
    const qty      = parseFloat(qtyEl.value) || 0;

    if (lebarCm <= 0 || tinggiCm <= 0) {
      preview.style.display = 'none';
      saveKalkulatorState();
      return;
    }

    const lebarM   = lebarCm / 100;
    const tinggiM  = tinggiCm / 100;
    const luas     = lebarM * tinggiM;
    const totalPcs = luas * harga;
    const totalAll = totalPcs * qty;

    const elUkuran  = document.getElementById('bnr-ukuran-txt');
    const elLuas    = document.getElementById('bnr-luas-txt');
    const elTotPcs  = document.getElementById('bnr-total-pcs');
    const elTotAll  = document.getElementById('bnr-total-all');

    if (elUkuran) elUkuran.textContent = lebarM.toFixed(2) + ' x ' + tinggiM.toFixed(2) + ' m';
    if (elLuas)   elLuas.textContent   = luas.toFixed(2) + ' m²';
    if (elTotPcs) elTotPcs.textContent = formatRupiah(totalPcs);
    if (elTotAll) elTotAll.textContent = formatRupiah(totalAll);

    preview.style.display = '';
    // Simpan hasil hitung di dataset supaya bisa dipakai tombol "+ Tambah ke Rekap"
    preview.dataset.lebarM   = lebarM;
    preview.dataset.tinggiM  = tinggiM;
    preview.dataset.luas     = luas;
    preview.dataset.harga    = harga;
    preview.dataset.qty      = qty;
    preview.dataset.totalPcs = totalPcs;
    preview.dataset.totalAll = totalAll;

    saveKalkulatorState();
  };

  // + Tambah ke Rekap
  window.tambahKeBannerRekap = function () {
    const preview = document.getElementById('bnr-preview');
    if (!preview || preview.style.display === 'none' || !preview.dataset.luas) return;

    bannerRekapList.push({
      id:       'bnr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      lebarM:   parseFloat(preview.dataset.lebarM)   || 0,
      tinggiM:  parseFloat(preview.dataset.tinggiM)  || 0,
      luas:     parseFloat(preview.dataset.luas)     || 0,
      harga:    parseFloat(preview.dataset.harga)    || 0,
      qty:      parseFloat(preview.dataset.qty)      || 0,
      totalPcs: parseFloat(preview.dataset.totalPcs) || 0,
      totalAll: parseFloat(preview.dataset.totalAll) || 0
    });

    renderBannerRekap();
    saveKalkulatorState();
  };

  // Hapus 1 item rekap
  window.hapusBannerRekap = function (id) {
    bannerRekapList = bannerRekapList.filter(function (it) { return it.id !== id; });
    renderBannerRekap();
    saveKalkulatorState();
  };

  // Kosongkan semua rekap banner
  window.clearBannerRekap = function () {
    if (bannerRekapList.length === 0) return;
    if (!confirm('Kosongkan semua data rekap banner?')) return;
    bannerRekapList = [];
    renderBannerRekap();
    saveKalkulatorState();
  };

  // Render isi <tbody id="bnr-rekap-body"> + <tfoot id="bnr-rekap-foot">
  function renderBannerRekap() {
    const body = document.getElementById('bnr-rekap-body');
    const foot = document.getElementById('bnr-rekap-foot');
    if (!body) return;

    if (!bannerRekapList.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--tx3);font-size:12px;">Belum ada item. Tambahkan dari form di atas.</td></tr>';
      if (foot) foot.innerHTML = '';
      return;
    }

    let grandTotal = 0;
    body.innerHTML = bannerRekapList.map(function (item) {
      grandTotal += item.totalAll;
      return '<tr class="bnr-rekap-row" data-id="' + item.id + '">' +
        '<td data-label="Ukuran: ">' + item.lebarM.toFixed(2) + ' x ' + item.tinggiM.toFixed(2) + ' m</td>' +
        '<td data-label="Luas: " style="text-align:center;">' + item.luas.toFixed(2) + ' m²</td>' +
        '<td data-label="Qty: " style="text-align:center;">' + item.qty + '</td>' +
        '<td data-label="Harga/m²: " style="text-align:right;">' + formatRupiah(item.harga) + '</td>' +
        '<td data-label="Total/Pcs: " style="text-align:right;">' + formatRupiah(item.totalPcs) + '</td>' +
        '<td data-label="Total: " style="text-align:right;font-weight:800;">' + formatRupiah(item.totalAll) + '</td>' +
        '<td style="text-align:center;"><button type="button" class="btn btn-ghost btn-xs" onclick="hapusBannerRekap(\'' + item.id + '\')" title="Hapus"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>' +
      '</tr>';
    }).join('');

    if (foot) {
      foot.innerHTML = '<tr>' +
        '<td colspan="5" style="text-align:right;">GRAND TOTAL</td>' +
        '<td style="text-align:right;">' + formatRupiah(grandTotal) + '</td>' +
        '<td></td>' +
      '</tr>';
    }
  }

  /* ════════════════════════════════════════════════════════════
     LOCALSTORAGE — simpan & muat semua state kalkulator
     ════════════════════════════════════════════════════════════ */
  function saveKalkulatorState() {
    try {
      const tbody = document.getElementById('hpp-tbody');
      const hppRows = [];
      if (tbody) {
        tbody.querySelectorAll('tr.hpp-row').forEach(function (row) {
          const namaEl  = row.querySelector('.hpp-nama');
          const hargaEl = row.querySelector('.hpp-harga');
          const qtyEl   = row.querySelector('.hpp-qty');
          hppRows.push({
            nama:  namaEl  ? namaEl.value  : '',
            harga: parseRupiah(hargaEl ? hargaEl.value : 0),
            qty:   parseFloat(qtyEl ? qtyEl.value : 0) || 0
          });
        });
      }

      const simJualEl  = document.getElementById('sim-jual');
      const simQtyEl   = document.getElementById('sim-qty');
      const simModalEl = document.getElementById('sim-modal');

      const bnrLebarEl  = document.getElementById('bnr-lebar');
      const bnrTinggiEl = document.getElementById('bnr-tinggi');
      const bnrHargaEl  = document.getElementById('bnr-harga');
      const bnrQtyEl    = document.getElementById('bnr-qty');

      const data = {
        hppRows: hppRows,
        sim: {
          jual:   simJualEl  ? simJualEl.value  : '',
          qty:    simQtyEl   ? simQtyEl.value   : '1',
          modal:  simModalEl ? simModalEl.value : '',
          manual: simModalManual
        },
        banner: {
          lebar:  bnrLebarEl  ? bnrLebarEl.value  : '',
          tinggi: bnrTinggiEl ? bnrTinggiEl.value : '',
          harga:  bnrHargaEl  ? bnrHargaEl.value  : '18.000',
          qty:    bnrQtyEl    ? bnrQtyEl.value    : '1',
          rekap:  bannerRekapList
        }
      };

      localStorage.setItem(KALK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Gagal menyimpan data Kalkulator Produksi:', e);
    }
  }

  function loadKalkulatorState() {
    let data = null;
    try {
      const raw = localStorage.getItem(KALK_STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) {
      console.error('Gagal membaca data Kalkulator Produksi:', e);
      data = null;
    }

    // -- Simulasi: pulihkan dulu flag manual & nilai sim-jual/sim-qty/sim-modal
    const simJualEl  = document.getElementById('sim-jual');
    const simQtyEl   = document.getElementById('sim-qty');
    const simModalEl = document.getElementById('sim-modal');

    if (data && data.sim) {
      simModalManual = !!data.sim.manual;
      if (simJualEl) simJualEl.value = data.sim.jual || '';
      if (simQtyEl)  simQtyEl.value  = data.sim.qty  || '1';
      if (simModalEl && simModalManual) simModalEl.value = data.sim.modal || '';
    } else {
      simModalManual = false;
    }

    // -- HPP table
    const tbody = document.getElementById('hpp-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      const rows = (data && Array.isArray(data.hppRows) && data.hppRows.length)
        ? data.hppRows
        : [{ nama: '', harga: 0, qty: 1 }];
      rows.forEach(function (r) { window.tambahHPPRow(r); });
    }

    // -- Banner form & rekap
    if (data && data.banner) {
      const b = data.banner;
      const elLebar  = document.getElementById('bnr-lebar');
      const elTinggi = document.getElementById('bnr-tinggi');
      const elHarga  = document.getElementById('bnr-harga');
      const elQty    = document.getElementById('bnr-qty');
      if (elLebar)  elLebar.value  = b.lebar  || '';
      if (elTinggi) elTinggi.value = b.tinggi || '';
      if (elHarga)  elHarga.value  = b.harga  || '18.000';
      if (elQty)    elQty.value    = b.qty    || '1';
      bannerRekapList = Array.isArray(b.rekap) ? b.rekap : [];
    } else {
      bannerRekapList = [];
    }

    window.hitungHPP();     // recalc total HPP, sync modal, hitung simulasi, render
    window.hitungBanner();  // recalc preview banner (jika ada input tersimpan)
    renderBannerRekap();

    // -- Pulihkan tab aktif
    let savedTab = 'konveksi';
    try { savedTab = localStorage.getItem('kalkActiveTab') || 'konveksi'; } catch (e) {}
    window.switchKalkTab(savedTab === 'banner' ? 'banner' : 'konveksi');
  }

  /* ════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════ */
  function initKalkulatorProduksi() {
    if (!document.getElementById('pg-kalkulator')) return; // halaman tidak ada -> skip

    loadKalkulatorState();

    // Field "Modal/Pcs" bisa diedit manual (data-manually-editable="true")
    const simModalEl = document.getElementById('sim-modal');
    if (simModalEl) {
      simModalEl.addEventListener('input', function () {
        if (simModalEl.value.trim() === '') {
          // dikosongkan -> kembali ke mode sinkron otomatis dari tabel HPP
          simModalManual = false;
          window.hitungHPP();
        } else {
          simModalManual = true;
          window.hitungSimulasi();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKalkulatorProduksi);
  } else {
    initKalkulatorProduksi();
  }

})();
