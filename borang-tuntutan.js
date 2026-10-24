/* STAFF HRMS - MODUL TUNTUTAN CREW GANTIAN (UI TEMPATAN SAHAJA) */
(() => {
  'use strict';

  const monthNames = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];

  function initReplacementClaims() {
    const dashboard = document.getElementById('view-dashboard');
    if (!dashboard || document.getElementById('replacement-claim-module')) return;

    const statsGrid = dashboard.querySelector('.stats-grid');
    if (!statsGrid) return;

    const monthOptions = monthNames.map((name, i) =>
      `<option value="${i + 1}">${name}</option>`
    ).join('');

    // This markup is static. User input is added with DOM textContent/value only.
    statsGrid.insertAdjacentHTML('afterend', `
      <!-- MODUL BARU: BORANG TUNTUTAN CREW GANTIAN -->
      <section id="replacement-claim-module" aria-label="Borang Tuntutan Crew Gantian">
        <div class="rc-head">
          <div class="rc-head-title">
            <div class="rc-head-icon"><i data-lucide="clipboard-list" style="width:24px;height:24px"></i></div>
            <div>
              <h3>BORANG TUNTUTAN PEMANDU GANTI / CREW FIRST AID RESPONDER GANTIAN</h3>
              <div class="rc-subtitle">HOTSPOT 999 SJAM KOTA BHARU</div>
            </div>
          </div>
          <span class="rc-pill">DRAF TEMPATAN</span>
        </div>
        <div class="rc-inner">
          <div class="rc-controls">
            <div class="rc-field">
              <label for="rc-month">Bulan</label>
              <select id="rc-month">${monthOptions}</select>
            </div>
            <div class="rc-field">
              <label for="rc-year">Tahun</label>
              <input id="rc-year" type="number" min="2020" max="2100" step="1" inputmode="numeric">
            </div>
            <div class="rc-control-actions">
              <button type="button" id="rc-add-row" class="rc-btn rc-btn-add">+ Tambah Crew</button>
            </div>
          </div>
          <div class="rc-table-scroll" role="region" aria-label="Jadual tarikh 1 hingga 31, boleh tatal ke kanan" tabindex="0">
            <table class="rc-table" aria-label="Jadual Tuntutan Crew Gantian">
              <thead id="rc-table-head"></thead>
              <tbody id="rc-table-body"></tbody>
              <tfoot id="rc-table-foot"></tfoot>
            </table>
          </div>
          <p class="rc-help">Masukkan nama crew, kemudian tekan petak tarikh untuk mencatat siapa yang diganti. Tatal jadual ke kanan untuk melihat semua tarikh.</p>
          <p id="rc-feedback" class="rc-feedback" role="status" aria-live="polite">Rekod ini belum disimpan ke Firebase. Memuat semula halaman akan mengosongkan draf.</p>
          <div class="rc-total-box"><span>Jumlah Keseluruhan Tuntutan</span><strong id="rc-grand-total">0</strong></div>
          <div class="rc-approval">
            <h4>Pengesahan Penyelia</h4>
            <div class="rc-approval-grid">
              <div class="rc-approval-item"><label>Disahkan oleh</label><span>Belum disahkan</span></div>
              <div class="rc-approval-item"><label>Tarikh Pengesahan</label><span>-</span></div>
            </div>
          </div>
        </div>
        <dialog id="rc-entry-dialog" class="rc-edit-dialog">
          <form id="rc-entry-form">
            <h4>Catatan Crew Gantian</h4>
            <p id="rc-entry-context"></p>
            <label for="rc-entry-name">Nama anggota yang diganti</label>
            <input id="rc-entry-name" type="text" maxlength="80" placeholder="Contoh: Halim" required>
            <div class="rc-dialog-actions">
              <button type="button" id="rc-entry-delete" class="rc-btn" style="color:#b91c1c">Padam</button>
              <button type="button" id="rc-entry-cancel" class="rc-btn">Batal</button>
              <button type="submit" class="rc-btn rc-btn-blue">Simpan Catatan</button>
            </div>
          </form>
        </dialog>
      </section>
      <!-- TAMAT MODUL TUNTUTAN GANTIAN -->
    `);

    const root = document.getElementById('replacement-claim-module');
    const q = id => root.querySelector('#' + id);
    const monthSelect = q('rc-month');
    const yearInput = q('rc-year');
    const head = q('rc-table-head');
    const body = q('rc-table-body');
    const foot = q('rc-table-foot');
    const totalEl = q('rc-grand-total');
    const feedback = q('rc-feedback');
    const dialog = q('rc-entry-dialog');
    const entryForm = q('rc-entry-form');
    const entryName = q('rc-entry-name');
    const entryContext = q('rc-entry-context');
    const entryDelete = q('rc-entry-delete');

    const mytParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric'
    }).formatToParts(new Date());
    const monthNow = Number(mytParts.find(p => p.type === 'month').value);
    const yearNow = Number(mytParts.find(p => p.type === 'year').value);

    const state = {
      month: monthNow,
      year: yearNow,
      rows: Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, name: '', entries: {}
      })),
      nextRowId: 8,
      editing: null
    };

    monthSelect.value = String(state.month);
    yearInput.value = String(state.year);

    function setFeedback(message) { feedback.textContent = message; }
    function dayCount() {
      return new Date(Date.UTC(state.year, state.month, 0)).getUTCDate();
    }
    function cell(tag, text, className) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      el.textContent = String(text);
      return el;
    }
    function countRow(row) {
      return Object.values(row.entries).filter(v => typeof v === 'string' && v.trim()).length;
    }

    function openEditor(row, day, nameInput) {
      if (!row.name.trim()) {
        setFeedback('Isi nama crew terlebih dahulu sebelum mencatat penggantian.');
        nameInput.focus();
        return;
      }
      state.editing = { rowId: row.id, day };
      entryContext.textContent = row.name.trim() + ' | ' + day + ' ' +
        monthNames[state.month - 1] + ' ' + state.year;
      entryName.value = row.entries[day] || '';
      entryDelete.hidden = !row.entries[day];
      dialog.showModal();
      entryName.focus();
    }

    function render() {
      const days = dayCount();
      const titleRow = document.createElement('tr');
      titleRow.append(cell('th', 'Bil'), cell('th', 'Nama Crew'));
      for (let d = 1; d <= days; d++) {
        titleRow.append(cell('th', d, 'rc-day-head'));
      }
      titleRow.append(cell('th', 'Jum', 'rc-sum-col'));
      head.replaceChildren(titleRow);

      const rowsFragment = document.createDocumentFragment();
      state.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.appendChild(cell('td', rowIndex + 1));

        const nameTd = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'rc-name-wrap';
        const nameInput = document.createElement('input');
        nameInput.className = 'rc-name-input';
        nameInput.type = 'text';
        nameInput.maxLength = 80;
        nameInput.placeholder = 'Nama crew';
        nameInput.value = row.name;
        nameInput.setAttribute('aria-label', 'Nama crew baris ' + (rowIndex + 1));
        nameInput.addEventListener('input', () => {
          row.name = nameInput.value;
          setFeedback('Perubahan masih draf sementara; belum disimpan ke Firebase.');
        });

        const removeRow = document.createElement('button');
        removeRow.type = 'button';
        removeRow.className = 'rc-row-delete';
        removeRow.textContent = 'x';
        removeRow.title = 'Buang baris crew ini';
        removeRow.setAttribute('aria-label', 'Buang baris crew ' + (rowIndex + 1));
        removeRow.addEventListener('click', () => {
          if (state.rows.length === 1) {
            setFeedback('Mesti ada sekurang-kurangnya satu baris crew.');
            return;
          }
          if ((row.name.trim() || countRow(row)) &&
            !window.confirm('Buang baris crew ini beserta semua catatannya?')) return;
          state.rows = state.rows.filter(r => r.id !== row.id);
          render();
          setFeedback('Baris crew telah dibuang daripada draf sementara.');
        });
        wrap.append(nameInput, removeRow);
        nameTd.appendChild(wrap);
        tr.appendChild(nameTd);

        for (let d = 1; d <= days; d++) {
          const td = document.createElement('td');
          const btn = document.createElement('button');
          const value = row.entries[d] || '';
          btn.type = 'button';
          btn.className = 'rc-cell-btn' + (value ? ' has-value' : '');
          btn.textContent = value ? (value.length > 5 ? value.slice(0, 5) + '.' : value) : '+';
          btn.title = value ? 'Ganti: ' + value : 'Isi catatan tarikh ' + d;
          btn.setAttribute('aria-label', row.name + ', tarikh ' + d + ': ' + (value || 'tiada catatan'));
          btn.addEventListener('click', () => openEditor(row, d, nameInput));
          td.appendChild(btn);
          tr.appendChild(td);
        }
        tr.appendChild(cell('td', countRow(row), 'rc-total'));
        rowsFragment.appendChild(tr);
      });
      body.replaceChildren(rowsFragment);

      const totalsRow = document.createElement('tr');
      const label = cell('th', 'Jumlah Harian', 'rc-footer-label');
      label.colSpan = 2;
      totalsRow.appendChild(label);
      let grandTotal = 0;
      for (let d = 1; d <= days; d++) {
        const dayTotal = state.rows.filter(row => (row.entries[d] || '').trim()).length;
        totalsRow.appendChild(cell('td', dayTotal));
        grandTotal += dayTotal;
      }
      totalsRow.appendChild(cell('td', grandTotal, 'rc-total'));
      foot.replaceChildren(totalsRow);
      totalEl.textContent = String(grandTotal);
    }

    function switchPeriod() {
      const newMonth = Number(monthSelect.value);
      const newYear = Number(yearInput.value);
      if (!Number.isInteger(newMonth) || newMonth < 1 || newMonth > 12 ||
        !Number.isInteger(newYear) || newYear < 2020 || newYear > 2100) {
        setFeedback('Bulan atau tahun tidak sah. Gunakan tahun 2020 hingga 2100.');
        monthSelect.value = String(state.month);
        yearInput.value = String(state.year);
        return;
      }
      if (newMonth === state.month && newYear === state.year) return;
      const hasEntries = state.rows.some(row => countRow(row) > 0);
      if (hasEntries && !window.confirm(
        'Menukar bulan/tahun akan mengosongkan catatan gantian draf ini. Nama crew dikekalkan. Teruskan?'
      )) {
        monthSelect.value = String(state.month);
        yearInput.value = String(state.year);
        return;
      }
      state.month = newMonth;
      state.year = newYear;
      state.rows.forEach(row => { row.entries = {}; });
      render();
      setFeedback('Paparan ' + monthNames[newMonth - 1] + ' ' + newYear + '. Draf belum disimpan.');
    }

    q('rc-add-row').addEventListener('click', () => {
      if (state.rows.length >= 40) {
        setFeedback('Maksimum 40 crew untuk satu borang sementara.');
        return;
      }
      state.rows.push({ id: state.nextRowId++, name: '', entries: {} });
      render();
      setFeedback('Baris crew baharu telah ditambah.');
    });
    monthSelect.addEventListener('change', switchPeriod);
    yearInput.addEventListener('change', switchPeriod);
    q('rc-entry-cancel').addEventListener('click', () => dialog.close());
    entryForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!state.editing) return;
      const value = entryName.value.trim().replace(/\s+/g, ' ');
      if (!value) return;
      const row = state.rows.find(r => r.id === state.editing.rowId);
      if (!row) { dialog.close(); return; }
      row.entries[state.editing.day] = value;
      dialog.close();
      state.editing = null;
      render();
      setFeedback('Catatan ditambah dalam draf sementara (belum disimpan ke Firebase).');
    });
    entryDelete.addEventListener('click', () => {
      if (!state.editing) return;
      const row = state.rows.find(r => r.id === state.editing.rowId);
      if (row) delete row.entries[state.editing.day];
      dialog.close();
      state.editing = null;
      render();
      setFeedback('Catatan tarikh dipadam daripada draf sementara.');
    });
    dialog.addEventListener('close', () => { state.editing = null; });

    // Clear unsaved personnel notes whenever the existing HRMS logs out.
    // This observes the shell only; it never replaces or calls logout().
    const appContainer = document.getElementById('app-container');
    if (appContainer && typeof MutationObserver !== 'undefined') {
      const logoutObserver = new MutationObserver(() => {
        if (appContainer.style.display !== 'none') return;
        if (dialog.open) dialog.close();
        state.rows = Array.from({ length: 7 }, (_, i) => ({
          id: i + 1, name: '', entries: {}
        }));
        state.nextRowId = 8;
        state.editing = null;
        render();
        setFeedback('Draf sementara dikosongkan selepas log keluar.');
      });
      logoutObserver.observe(appContainer, {
        attributes: true, attributeFilter: ['style']
      });
    }

    // Sambungan data terhad untuk fail borang-tuntutan-firebase.js.
    // Fail cetakan sedia ada terus membaca jadual daripada DOM.
    window.hrmsReplacementClaims = {
      getDraft() {
        const maxDay = dayCount();
        return {
          month: state.month,
          year: state.year,
          rows: state.rows.map(row => {
            const entries = {};
            Object.entries(row.entries).forEach(([dayText, value]) => {
              const day = Number(dayText);
              if (!/^\d+$/.test(dayText) || !Number.isInteger(day) ||
                  day < 1 || day > maxDay || typeof value !== 'string') return;
              const name = value.trim().replace(/\s+/g, ' ').slice(0, 80);
              if (name) entries[String(day)] = name;
            });
            return { name: row.name.trim().replace(/\s+/g, ' ').slice(0, 80), entries };
          })
        };
      },

      loadDraft(saved) {
        const month = Number(saved?.month);
        const year = Number(saved?.year);
        if (!Number.isInteger(month) || month < 1 || month > 12 ||
            !Number.isInteger(year) || year < 2020 || year > 2100 ||
            !Array.isArray(saved?.rows) || saved.rows.length < 1 ||
            saved.rows.length > 40) {
          throw new Error('Format rekod Firebase tidak sah.');
        }

        const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const rows = saved.rows.map((item, index) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error('Format baris crew Firebase tidak sah.');
          }
          const name = typeof item.name === 'string'
            ? item.name.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
          const entries = {};
          if (item.entries && typeof item.entries === 'object' &&
              !Array.isArray(item.entries)) {
            Object.entries(item.entries).forEach(([dayText, value]) => {
              const day = Number(dayText);
              if (!/^\d+$/.test(dayText) || !Number.isInteger(day) ||
                  day < 1 || day > maxDay || typeof value !== 'string') return;
              const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, 80);
              if (cleaned) entries[day] = cleaned;
            });
          }
          return { id: index + 1, name, entries };
        });

        if (dialog.open) dialog.close();
        state.editing = null;
        state.month = month;
        state.year = year;
        state.rows = rows;
        state.nextRowId = rows.length + 1;
        monthSelect.value = String(month);
        yearInput.value = String(year);
        render();
      }
    };

    render();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // KAWALAN MODUL: hanya ADMIN yang telah disahkan boleh melihat borang.
  // Tidak mengubah login, navigateTab, logout atau fungsi Firestore asal.
  function syncReplacementClaimsAdminOnly() {
    const appContainer = document.getElementById('app-container');
    const firebaseUid = window.hrmsFirebase?.auth?.currentUser?.uid;
    const isAdmin =
      typeof currentUser !== 'undefined' &&
      currentUser !== null &&
      currentUser.role === 'ADMIN' &&
      Boolean(firebaseUid) &&
      firebaseUid === currentUser.id &&
      appContainer?.style.display === 'flex';

    let claimModule = document.getElementById('replacement-claim-module');

    if (isAdmin) {
      // Modul dicipta hanya selepas akaun ADMIN berjaya log masuk.
      if (!claimModule) {
        initReplacementClaims();
        claimModule = document.getElementById('replacement-claim-module');
      }
      if (claimModule) claimModule.style.display = '';
    } else if (claimModule) {
      // STAFF / SUPERVISOR / log keluar: jangan paparkan borang.
      claimModule.style.display = 'none';
    }
  }

  function watchReplacementClaimsAdminOnly() {
    const roleLabel = document.getElementById('sidebar-role');
    const appContainer = document.getElementById('app-container');
    if (!roleLabel || !appContainer) return;

    // HRMS asal menukar sidebar-role apabila profil pengguna berjaya dimuatkan.
    const roleObserver = new MutationObserver(syncReplacementClaimsAdminOnly);
    roleObserver.observe(roleLabel, {
      childList: true, characterData: true, subtree: true
    });
    roleObserver.observe(appContainer, {
      attributes: true, attributeFilter: ['style']
    });

    syncReplacementClaimsAdminOnly();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchReplacementClaimsAdminOnly, { once: true });
  } else {
    watchReplacementClaimsAdminOnly();
  }
})();
