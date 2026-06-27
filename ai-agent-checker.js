(function(){
  if(window.__AI_AGENT_CHECKER__) return;
  window.__AI_AGENT_CHECKER__ = true;

  window.__AI_AGENT_ERRORS__ = window.__AI_AGENT_ERRORS__ || [];

  function simpanError(tipe, pesan, sumber){
    window.__AI_AGENT_ERRORS__.push({
      waktu: new Date().toLocaleTimeString(),
      tipe: tipe,
      pesan: String(pesan || ''),
      sumber: sumber || ''
    });
    if(window.__AI_AGENT_ERRORS__.length > 30){
      window.__AI_AGENT_ERRORS__.shift();
    }
  }

  window.addEventListener('error', function(e){
    simpanError('JS Error', e.message, (e.filename || '') + ':' + (e.lineno || ''));
  });

  window.addEventListener('unhandledrejection', function(e){
    simpanError('Promise Error', e.reason && (e.reason.message || e.reason) || 'Unhandled promise rejection', '');
  });

  const asliConsoleError = console.error;
  console.error = function(){
    simpanError('Console Error', Array.from(arguments).join(' '), 'console.error');
    asliConsoleError.apply(console, arguments);
  };

  function ada(selector){
    return !!document.querySelector(selector);
  }

  function teksAda(teks){
    return Array.from(document.querySelectorAll('button,a,input,[onclick]'))
      .some(el => (el.innerText || el.value || el.title || el.getAttribute('onclick') || '')
      .toLowerCase().includes(teks.toLowerCase()));
  }

  function fungsiAda(nama){
    return typeof window[nama] === 'function';
  }

  function tambah(hasil, grup, nama, kondisi, catatan){
    hasil.push({
      grup,
      nama,
      status: kondisi ? 'ok' : 'bad',
      catatan: catatan || (kondisi ? 'Aman' : 'Tidak ditemukan')
    });
  }

  function tambahWarn(hasil, grup, nama, kondisi, catatan){
    hasil.push({
      grup,
      nama,
      status: kondisi ? 'ok' : 'warn',
      catatan: catatan || (kondisi ? 'Aman' : 'Perlu dicek')
    });
  }

  function statusIcon(status){
    if(status === 'ok') return '✅';
    if(status === 'warn') return '⚠️';
    return '❌';
  }

  function warnaStatus(status){
    if(status === 'ok') return '#16a34a';
    if(status === 'warn') return '#d97706';
    return '#dc2626';
  }

  function isDevOnlyError(err){
    const pesan = String((err && err.pesan) || '').toLowerCase();
    return pesan.includes('[vite] failed to connect to websocket') ||
           (pesan.includes('failed to connect to websocket') && pesan.includes('vite')) ||
           (pesan.includes('websocket') && pesan.includes('hmr'));
  }


  function jalankanSimulasiTransaksiAman(hasil){
    const userAktif = Array.isArray(window.USERS) && window.USERS.some(u => u && u.u && u.p && u.aktif !== false);

    tambahWarn(hasil, 'Simulasi Aman', 'Login dry-run', userAktif, userAktif ? 'Ada akun aktif, dicek tanpa klik login' : 'Belum ada akun aktif untuk dry-run');

    const syarat = ada('#fi-nama') && ada('#fi-wa') && ada('#fi-kode') && ada('#fi-qty') && ada('#fi-harga') && Array.isArray(window.CART) && fungsiAda('tambahKeKeranjang');

    if(!syarat){
      hasil.push({grup:'Simulasi Aman', nama:'Tambah item dummy ke keranjang', status:'bad', catatan:'Form/CART/tambahKeKeranjang belum lengkap'});
      return;
    }

    const selectors = ['#fi-nama','#fi-wa','#fi-kode','#fi-qty','#fi-harga'];
    const nilaiLama = {};
    selectors.forEach(sel => { const el = document.querySelector(sel); nilaiLama[sel] = el ? el.value : ''; });

    const cartLama = window.CART.slice();
    const panjangAwal = window.CART.length;
    let berhasilTambah = false;
    let berhasilRestore = false;
    let catatanTambah = '';

    try {
      document.querySelector('#fi-nama').value = 'AI TEST PELANGGAN';
      document.querySelector('#fi-wa').value = '080000000000';
      document.querySelector('#fi-kode').value = 'AI TEST ITEM';
      document.querySelector('#fi-qty').value = '2';
      document.querySelector('#fi-harga').value = '1234';

      window.tambahKeKeranjang();

      const itemBaru = window.CART[panjangAwal];
      berhasilTambah = window.CART.length === panjangAwal + 1 && itemBaru && itemBaru.barang === 'AI TEST ITEM' && itemBaru.qty === 2 && itemBaru.total === 2468;
      catatanTambah = berhasilTambah ? 'Item dummy berhasil masuk lalu dikembalikan, tanpa simpan transaksi' : 'CART tidak bertambah sesuai harapan';
    } catch(e) {
      berhasilTambah = false;
      catatanTambah = 'Simulasi gagal: ' + (e && e.message ? e.message : e);
    } finally {
      try {
        window.CART.length = 0;
        cartLama.forEach(item => window.CART.push(item));
        selectors.forEach(sel => { const el = document.querySelector(sel); if(el) el.value = nilaiLama[sel]; });
        if(fungsiAda('renderCart')) window.renderCart();
        berhasilRestore = window.CART.length === cartLama.length;
      } catch(e) {
        berhasilRestore = false;
      }
    }

    hasil.push({grup:'Simulasi Aman', nama:'Tambah item dummy ke keranjang', status:berhasilTambah ? 'ok' : 'bad', catatan:catatanTambah});
    hasil.push({grup:'Simulasi Aman', nama:'Restore keranjang setelah simulasi', status:berhasilRestore ? 'ok' : 'bad', catatan:berhasilRestore ? 'CART dikembalikan seperti semula' : 'CART gagal dikembalikan'});
    hasil.push({grup:'Simulasi Aman', nama:'Simpan transaksi tidak dipanggil', status:'ok', catatan:'Level 4 tahap 1 tidak memanggil simpanTrxPage()'});
  }


  function jalankanSimulasiSimpanAman(hasil){
    if(!fungsiAda('simpanTrxPage') || !Array.isArray(window.TRX) || !Array.isArray(window.CART)){
      hasil.push({grup:'Simulasi Simpan Aman',nama:'Simpan transaksi dummy',status:'bad',catatan:'simpanTrxPage/TRX/CART belum siap'});
      return;
    }

    if(!(window.curUser && window.curUser.nama)){
      hasil.push({grup:'Simulasi Simpan Aman',nama:'Simpan transaksi dummy',status:'warn',catatan:'Login dulu untuk tes simpan dummy'});
      return;
    }

    const dummy = 'AI TEST SAVE RESTORE';
    const trx0 = JSON.parse(JSON.stringify(window.TRX));
    const cart0 = JSON.parse(JSON.stringify(window.CART));
    const pel0 = JSON.parse(JSON.stringify(window.PELANGGAN || []));
    const brg0 = JSON.parse(JSON.stringify(window.BARANG || []));
    const ls0 = {};
    Object.keys(localStorage).forEach(k => ls0[k] = localStorage.getItem(k));

    const oldAuto = window.autoSyncToSheets;
    const oldSync = window.syncToSheets;
    const oldToast = window.toast;
    const oldConfirm = window.confirm;
    const oldEdit = window.currentEditTrxId;

    let okSimpan = false;
    let okRestore = false;
    let catatan = '';

    try{
      window.autoSyncToSheets = function(){};
      window.syncToSheets = function(){};
      window.toast = function(){};
      window.confirm = function(){return true;};
      window.currentEditTrxId = null;

      document.querySelector('#fi-nama').value = dummy;
      document.querySelector('#fi-wa').value = '080000000000';
      const lunas = document.querySelector('input[name="fi_bayar"][value="Lunas"]');
      if(lunas) lunas.checked = true;

      window.CART.length = 0;
      window.CART.push({kode:'CSTM',barang:'AI TEST SAVE ITEM',qty:1,harga:4321,total:4321,modal:0});

      const awal = window.TRX.length;
      window.simpanTrxPage('simpan');

      okSimpan = window.TRX.length === awal + 1 && window.TRX[0] && window.TRX[0].pelanggan === dummy;
      catatan = okSimpan ? 'Dummy sempat tersimpan lalu direstore' : 'Dummy tidak masuk sesuai harapan';
    }catch(e){
      catatan = 'Gagal simulasi: ' + (e && e.message ? e.message : e);
    }finally{
      try{
        window.autoSyncToSheets = oldAuto;
        window.syncToSheets = oldSync;
        window.toast = oldToast;
        window.confirm = oldConfirm;
        window.currentEditTrxId = oldEdit;

        window.TRX.length = 0; trx0.forEach(x => window.TRX.push(x));
        window.CART.length = 0; cart0.forEach(x => window.CART.push(x));

        if(Array.isArray(window.PELANGGAN)){ window.PELANGGAN.length = 0; pel0.forEach(x => window.PELANGGAN.push(x)); }
        if(Array.isArray(window.BARANG)){ window.BARANG.length = 0; brg0.forEach(x => window.BARANG.push(x)); }

        Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
        Object.keys(ls0).forEach(k => localStorage.setItem(k, ls0[k]));

        if(fungsiAda('renderCart')) window.renderCart();

        const teksTrx = localStorage.getItem('abunawas_trx') || '';
        okRestore = !window.TRX.some(t => t && t.pelanggan === dummy) && !teksTrx.includes(dummy);
      }catch(e){
        okRestore = false;
      }
    }

    hasil.push({grup:'Simulasi Simpan Aman',nama:'Simpan transaksi dummy',status:okSimpan?'ok':'bad',catatan:catatan});
    hasil.push({grup:'Simulasi Simpan Aman',nama:'Restore data setelah simpan dummy',status:okRestore?'ok':'bad',catatan:okRestore?'Data dummy bersih lagi':'Data dummy masih terdeteksi'});
    hasil.push({grup:'Simulasi Simpan Aman',nama:'Sync Google Sheet dicegah saat simulasi',status:'ok',catatan:'Sync dimatikan sementara lalu dikembalikan'});
  }

  function runCheck(){
    const hasil = [];

    tambah(hasil, 'Login', 'Input Username', ada('#inp-u'), '#inp-u');
    tambah(hasil, 'Login', 'Input Password', ada('#inp-p'), '#inp-p');
    tambahWarn(hasil, 'Login', 'Tombol Login', teksAda('login') || teksAda('masuk'), 'Cari tombol login/masuk');

    tambah(hasil, 'Form Transaksi', 'Input Nama Pelanggan', ada('#fi-nama'), '#fi-nama');
    tambah(hasil, 'Form Transaksi', 'Input WhatsApp', ada('#fi-wa'), '#fi-wa');
    tambah(hasil, 'Form Transaksi', 'Input Barang/Kode', ada('#fi-kode'), '#fi-kode');
    tambah(hasil, 'Form Transaksi', 'Input Qty', ada('#fi-qty'), '#fi-qty');
    tambah(hasil, 'Form Transaksi', 'Input Harga', ada('#fi-harga'), '#fi-harga');

    tambahWarn(hasil, 'Tombol/Fitur', 'Fitur Nota', fungsiAda('showNota') || fungsiAda('kirimNotaGambar') || fungsiAda('bagikanGambarNota'), 'showNota/kirimNotaGambar');
    tambahWarn(hasil, 'Tombol/Fitur', 'Fitur Backup JSON', fungsiAda('backupJSON'), 'backupJSON()');
    tambahWarn(hasil, 'Tombol/Fitur', 'Fitur Backup CSV', fungsiAda('backupCSV'), 'backupCSV()');
    tambahWarn(hasil, 'Tombol/Fitur', 'Fitur Install PWA', fungsiAda('installApp') || 'serviceWorker' in navigator, 'installApp/serviceWorker');

    jalankanSimulasiTransaksiAman(hasil);
    jalankanSimulasiSimpanAman(hasil);

    tambahWarn(hasil, 'Storage', 'LocalStorage aktif', (function(){
      try {
        localStorage.setItem('__cek_ai_agent__','ok');
        localStorage.removeItem('__cek_ai_agent__');
        return true;
      } catch(e) {
        return false;
      }
    })(), 'Browser mengizinkan localStorage');

    tambahWarn(hasil, 'Script', 'script.js terpanggil', Array.from(document.scripts).some(s => (s.src || '').includes('script.js') || (s.getAttribute('src') || '') === 'script.js'), 'script.js');
    tambahWarn(hasil, 'Script', 'ai-agent-checker.js terpanggil', Array.from(document.scripts).some(s => (s.src || '').includes('ai-agent-checker.js')), 'ai-agent-checker.js');

    tambahWarn(hasil, 'Responsive', 'Lebar layar terdeteksi', window.innerWidth > 0, window.innerWidth + ' x ' + window.innerHeight);
    tambahWarn(hasil, 'Responsive', 'Mode HP/Tablet/Desktop', true, window.innerWidth < 768 ? 'HP' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop');

    const devOnlyErrors = window.__AI_AGENT_ERRORS__.filter(isDevOnlyError);
    const fatalErrors = window.__AI_AGENT_ERRORS__.filter(e => !isDevOnlyError(e));
    const errorCount = fatalErrors.length;
    const devOnlyCount = devOnlyErrors.length;

    hasil.push({
      grup: 'Console',
      nama: 'Error JavaScript tertangkap',
      status: errorCount === 0 ? (devOnlyCount ? 'warn' : 'ok') : 'bad',
      catatan: errorCount === 0
        ? (devOnlyCount ? devOnlyCount + ' error dev server/HMR, bukan fitur kasir' : 'Tidak ada error tertangkap')
        : errorCount + ' error fatal tertangkap'
    });

    const ringkasan = {
      ok: hasil.filter(x => x.status === 'ok').length,
      warn: hasil.filter(x => x.status === 'warn').length,
      bad: hasil.filter(x => x.status === 'bad').length
    };

    let storageKeys = [];
    try {
      storageKeys = Object.keys(localStorage).slice(0, 100);
    } catch(e) {
      storageKeys = [];
    }

    window.__AI_AGENT_LAST_REPORT__ = {
      nama: 'AI Agent Checker Level 6',
      versi: '6.0-json-download',
      waktuISO: new Date().toISOString(),
      halaman: {
        url: location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: navigator.userAgent
      },
      ringkasan: ringkasan,
      hasil: hasil,
      errors: fatalErrors.slice(),
      devOnlyErrors: devOnlyErrors.slice(),
      scripts: Array.from(document.scripts).map(sc => sc.getAttribute('src') || '[inline]').filter(Boolean),
      storageKeys: storageKeys,
      safety: {
        mode: 'safe-audit',
        dummyTransactionRestore: hasil.some(x => x.grup === 'Simulasi Simpan Aman' && x.nama === 'Restore data setelah simpan dummy' && x.status === 'ok'),
        syncPreventedDuringSimulation: hasil.some(x => x.grup === 'Simulasi Simpan Aman' && x.nama === 'Sync Google Sheet dicegah saat simulasi' && x.status === 'ok'),
        fatalErrorCount: fatalErrors.length,
        devOnlyErrorCount: devOnlyErrors.length
      }
    };

    try {
      const key = 'ai_agent_audit_history_v6';
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.unshift({
        waktuISO: window.__AI_AGENT_LAST_REPORT__.waktuISO,
        versi: window.__AI_AGENT_LAST_REPORT__.versi,
        ringkasan: window.__AI_AGENT_LAST_REPORT__.ringkasan,
        safety: window.__AI_AGENT_LAST_REPORT__.safety
      });
      localStorage.setItem(key, JSON.stringify(history.slice(0, 3)));
      window.__AI_AGENT_LAST_REPORT__.auditHistory = history.slice(0, 3);
    } catch(e) {
      window.__AI_AGENT_LAST_REPORT__.auditHistory = [];
    }

    tampilkanLaporan(hasil);
    console.log('HASIL DIAGNOSTIK LEVEL 6');
    console.table(hasil);
    if(window.__AI_AGENT_ERRORS__.length){
      console.warn('ERROR TERTANGKAP AI CHECKER');
      console.table(window.__AI_AGENT_ERRORS__);
    }
  }

  function tampilkanLaporan(hasil){
    const lama = document.getElementById('ai-agent-report');
    if(lama) lama.remove();

    const ok = hasil.filter(x => x.status === 'ok').length;
    const warn = hasil.filter(x => x.status === 'warn').length;
    const bad = hasil.filter(x => x.status === 'bad').length;

    const grup = {};
    hasil.forEach(item => {
      if(!grup[item.grup]) grup[item.grup] = [];
      grup[item.grup].push(item);
    });

    const box = document.createElement('div');
    box.id = 'ai-agent-report';
    box.innerHTML = `
      <div class="ai-head">
        <div>
          <b>🤖 AI Agent Checker Level 6</b>
          <small>Audit aman + download laporan JSON</small>
        </div>
        <div class="ai-actions">
          <button id="ai-copy-report">Copy JSON</button>
          <button id="ai-download-report">Download JSON</button>
          <button id="ai-close-report">×</button>
        </div>
      </div>
      <div class="ai-score">
        <span class="ok">✅ ${ok} Aman</span>
        <span class="warn">⚠️ ${warn} Perlu cek</span>
        <span class="bad">❌ ${bad} Error</span>
      </div>
      <div class="ai-extra-actions">
        <button id="ai-copy-prompt">Copy Prompt AI</button>
      </div>
      ${Object.keys(grup).map(g => `
        <div class="ai-group">
          <h4>${g}</h4>
          ${grup[g].map(i => `
            <div class="ai-row">
              <span>${statusIcon(i.status)} ${i.nama}</span>
              <small style="color:${warnaStatus(i.status)}">${i.catatan}</small>
            </div>
          `).join('')}
        </div>
      `).join('')}
      ${window.__AI_AGENT_ERRORS__.length ? `
        <div class="ai-group">
          <h4>Error Detail</h4>
          ${window.__AI_AGENT_ERRORS__.map(e => `
            <div class="ai-error">
              <b>${e.tipe}</b><br>
              <small>${e.waktu} ${e.sumber}</small><br>
              <span>${e.pesan}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    const style = document.createElement('style');
    style.textContent = `
      #ai-agent-report{
        position:fixed; right:12px; bottom:145px; z-index:999999;
        width:min(420px, calc(100vw - 24px)); max-height:70vh; overflow:auto;
        background:#0f172a; color:#e5e7eb; border:1px solid rgba(255,255,255,.12);
        border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.45);
        font-family:Arial, sans-serif; font-size:13px;
      }
      #ai-agent-report .ai-head{
        display:flex; justify-content:space-between; align-items:center;
        padding:14px; border-bottom:1px solid rgba(255,255,255,.1);
        position:sticky; top:0; background:#0f172a;
      }
      #ai-agent-report .ai-head small{display:block;color:#94a3b8;margin-top:4px}
      #ai-agent-report .ai-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      #ai-agent-report #ai-copy-report,
      #ai-agent-report #ai-download-report,
      #ai-agent-report #ai-copy-prompt,
      #ai-agent-report #ai-close-report{
        background:#1f2937;color:#fff;border:0;border-radius:10px;
        height:34px;
      }
      #ai-agent-report #ai-copy-report,
      #ai-agent-report #ai-download-report,
      #ai-agent-report #ai-copy-prompt{
        width:auto;padding:0 10px;font-size:12px;font-weight:800;
      }
      #ai-agent-report #ai-close-report{
        width:34px;font-size:22px;
      }
      #ai-agent-report .ai-score{
        display:flex; gap:8px; flex-wrap:wrap; padding:12px 14px;
      }
      #ai-agent-report .ai-extra-actions{
        padding:0 14px 12px; display:flex; gap:8px; flex-wrap:wrap;
      }
      #ai-agent-report .ai-extra-actions button{
        background:#1f2937;color:#fff;border:0;border-radius:10px;
        min-height:36px;padding:0 12px;font-size:12px;font-weight:900;
      }
      #ai-agent-report .ai-score span{
        padding:6px 9px; border-radius:999px; background:#111827; font-weight:700;
      }
      #ai-agent-report .ai-score .ok{color:#22c55e}
      #ai-agent-report .ai-score .warn{color:#f59e0b}
      #ai-agent-report .ai-score .bad{color:#ef4444}
      #ai-agent-report .ai-group{padding:10px 14px; border-top:1px solid rgba(255,255,255,.08)}
      #ai-agent-report h4{margin:0 0 8px;color:#93c5fd}
      #ai-agent-report .ai-row{
        display:flex; justify-content:space-between; gap:10px;
        padding:7px 0; border-bottom:1px dashed rgba(255,255,255,.08);
      }
      #ai-agent-report .ai-row small{text-align:right}
      #ai-agent-report .ai-error{
        background:#1f2937; border-left:4px solid #ef4444;
        padding:8px; border-radius:8px; margin:7px 0;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(box);

    async function salinLaporanAI(){
      const btn = document.getElementById('ai-copy-report');
      const data = window.__AI_AGENT_LAST_REPORT__ || {error:'Belum ada laporan AI'};
      const text = JSON.stringify(data, null, 2);

      try {
        if(navigator.clipboard && window.isSecureContext){
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        btn.textContent = 'Copied ✅';
        setTimeout(() => btn.textContent = 'Copy JSON', 1800);
      } catch(err) {
        console.error('Gagal copy laporan AI', err);
        btn.textContent = 'Gagal Copy';
        alert('Gagal copy otomatis. Cek Console untuk detail laporan.');
        setTimeout(() => btn.textContent = 'Copy JSON', 1800);
      }
    }


    function downloadLaporanAI(){
      const btn = document.getElementById('ai-download-report');
      const data = window.__AI_AGENT_LAST_REPORT__ || {error:'Belum ada laporan AI'};
      const text = JSON.stringify(data, null, 2);

      try {
        const waktu = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const namaFile = 'audit-ai-checker-level6-' + waktu + '.json';
        const blob = new Blob([text], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = namaFile;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);

        btn.textContent = 'Downloaded ✅';
        setTimeout(() => btn.textContent = 'Download JSON', 1800);
      } catch(err) {
        console.error('Gagal download laporan AI', err);
        btn.textContent = 'Gagal Download';
        alert('Gagal download JSON. Coba pakai Copy JSON.');
        setTimeout(() => btn.textContent = 'Download JSON', 1800);
      }
    }


    async function copyPromptAI(){
      const btn = document.getElementById('ai-copy-prompt');
      const data = window.__AI_AGENT_LAST_REPORT__ || {error:'Belum ada laporan AI'};
      const text =
        'Baca laporan audit AI Agent Checker Level 6 berikut.\n\n' +
        'Tugas:\n' +
        '1. Jangan ubah file apa pun dulu.\n' +
        '2. Jangan install package.\n' +
        '3. Analisis kondisi web kasir berdasarkan audit.\n' +
        '4. Jelaskan fitur yang aman.\n' +
        '5. Jelaskan warning/error jika ada.\n' +
        '6. Jelaskan apakah data dummy berhasil direstore.\n' +
        '7. Beri saran update web kasir berikutnya dengan prioritas.\n' +
        '8. Jawab ringkas dan jelas dalam bahasa Indonesia.\n\n' +
        'LAPORAN JSON:\n' +
        JSON.stringify(data, null, 2);

      try {
        if(navigator.clipboard && window.isSecureContext){
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        btn.textContent = 'Prompt Copied ✅';
        setTimeout(() => btn.textContent = 'Copy Prompt AI', 1800);
      } catch(err) {
        console.error('Gagal copy prompt AI', err);
        btn.textContent = 'Gagal';
        alert('Gagal copy prompt AI.');
        setTimeout(() => btn.textContent = 'Copy Prompt AI', 1800);
      }
    }

    document.getElementById('ai-copy-report').onclick = salinLaporanAI;
    document.getElementById('ai-copy-prompt').onclick = copyPromptAI;
    document.getElementById('ai-download-report').onclick = downloadLaporanAI;
    document.getElementById('ai-close-report').onclick = () => box.remove();
  }

  window.addEventListener("load", () => {
    const btn = document.createElement("button");
    btn.innerHTML = "🤖";
    btn.title = "Cek Sistem Level 2";
    btn.onclick = runCheck;

    btn.style.position = "fixed";
    btn.style.right = "15px";
    btn.style.bottom = "80px";
    btn.style.zIndex = "999999";
    btn.style.width = "55px";
    btn.style.height = "55px";
    btn.style.borderRadius = "50%";
    btn.style.border = "none";
    btn.style.background = "#111827";
    btn.style.color = "#fff";
    btn.style.fontSize = "24px";
    btn.style.boxShadow = "0 5px 20px rgba(0,0,0,.3)";

    document.body.appendChild(btn);
  });
})();
