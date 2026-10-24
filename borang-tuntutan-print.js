/*
  STAFF HRMS - CETAK BORANG TUNTUTAN (ADMIN SAHAJA)
  Tambahan berasingan; tidak mengubah borang-tuntutan.js, fungsi cuti,
  atau data Firebase. Cetak draf yang sedang dipaparkan dalam pelayar.
*/
(() => {
  'use strict';

  const MODULE_ID = 'replacement-claim-module';
  const BUTTON_ID = 'rc-print-button';
  const PRINT_ID = 'rc-print-sheet';
  const STYLE_ID = 'rc-print-extra-styles';

  function adminSedangLogMasuk() {
    const app = document.getElementById('app-container');
    const uid = window.hrmsFirebase?.auth?.currentUser?.uid;
    return typeof currentUser !== 'undefined' &&
      currentUser !== null &&
      currentUser.role === 'ADMIN' &&
      Boolean(uid) &&
      uid === currentUser.id &&
      app?.style.display === 'flex';
  }

  function buatElemen(tag, value, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined && value !== null) el.textContent = String(value);
    return el;
  }

  function tambahCSSCetak() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 40px; padding: 9px 15px; border: 1px solid #cbd5e1;
        border-radius: 8px; background: #ffffff; color: #1e293b;
        font-size: 13px; font-weight: 700; cursor: pointer;
        white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      #${BUTTON_ID}:hover { background: #f1f5f9; }
      #${BUTTON_ID}[hidden] { display: none !important; }
      #${PRINT_ID} { display: none !important; }

      @page { size: A4 landscape; margin: 8mm; }
      @media print {
        html, body {
          display: block !important; width: auto !important; min-height: 0 !important;
          margin: 0 !important; padding: 0 !important;
          background: white !important; overflow: visible !important;
        }
        body > :not(#${PRINT_ID}) { display: none !important; }
        body > #${PRINT_ID} {
          display: block !important; position: static !important;
          width: 100% !important; max-width: none !important;
          margin: 0 !important; padding: 0 !important;
          background: #ffffff !important; color: #111827 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 10px !important; line-height: 1.25 !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #${PRINT_ID} * { box-sizing: border-box !important; }
        #${PRINT_ID} .rc-pr-title { text-align: center; margin-bottom: 3mm; }
        #${PRINT_ID} .rc-pr-title h2 { font-size: 14px; margin: 0 0 2mm; font-weight: 700; }
        #${PRINT_ID} .rc-pr-title p { font-size: 10px; margin: 0; }
        #${PRINT_ID} .rc-pr-meta {
          display: flex; justify-content: space-between; gap: 6mm;
          margin: 3mm 0; font-size: 10px;
        }
        #${PRINT_ID} .rc-pr-draft {
          border: 1px solid #92400e; color: #92400e;
          padding: 2px 5px; font-weight: bold;
        }
        #${PRINT_ID} .rc-pr-table {
          width: 100%; border-collapse: collapse; table-layout: fixed;
          font-size: 7px; margin: 0;
        }
        #${PRINT_ID} .rc-pr-table th,
        #${PRINT_ID} .rc-pr-table td {
          border: 1px solid #1f2937; padding: 1px;
          text-align: center; vertical-align: middle; overflow-wrap: anywhere;
        }
        #${PRINT_ID} .rc-pr-table thead th { height: 7mm; background: #e2e8f0 !important; }
        #${PRINT_ID} .rc-pr-table thead th:first-child { width: 8mm; }
        #${PRINT_ID} .rc-pr-table thead th:nth-child(2) { width: 39mm; }
        #${PRINT_ID} .rc-pr-table thead th:last-child { width: 9mm; }
        #${PRINT_ID} .rc-pr-table td.rc-pr-crew { text-align: left; padding: 1.5mm; font-size: 9px; }
        #${PRINT_ID} .rc-pr-table td.rc-pr-day-cell { height: 19mm; }
        #${PRINT_ID} .rc-pr-vertical {
          display: inline-block; writing-mode: vertical-rl;
          transform: rotate(180deg); max-height: 17mm; overflow: hidden;
          white-space: nowrap; font-size: 6px; line-height: 1;
        }
        #${PRINT_ID} .rc-pr-table td.rc-pr-filled { background: #f1f5f9 !important; }
        #${PRINT_ID} .rc-pr-table tfoot th,
        #${PRINT_ID} .rc-pr-table tfoot td {
          background: #e2e8f0 !important; font-weight: bold; height: 7mm;
        }
        #${PRINT_ID} .rc-pr-totals {
          margin: 3mm 0 4mm; display: flex; justify-content: flex-end;
          font-size: 11px; font-weight: bold;
        }
        #${PRINT_ID} .rc-pr-notice { font-size: 9px; margin: 2mm 0 0; }
        #${PRINT_ID} .rc-pr-details { margin-top: 4mm; font-size: 9px; }
        #${PRINT_ID} .rc-pr-details h3 { font-size: 10px; margin: 0 0 2mm; }
        #${PRINT_ID} .rc-pr-details ol { margin: 0; padding-left: 5mm; }
        #${PRINT_ID} .rc-pr-details li { margin-bottom: 1mm; }
        #${PRINT_ID} .rc-pr-signature {
          display: flex; gap: 10mm; margin-top: 9mm;
          break-inside: avoid; page-break-inside: avoid;
        }
        #${PRINT_ID} .rc-pr-signature > div { flex: 1; padding-top: 7mm; border-top: 1px solid #475569; }
        #${PRINT_ID} .rc-pr-footer { margin-top: 4mm; color: #475569; font-size: 8px; }
        #${PRINT_ID} .rc-pr-table thead { display: table-header-group; }
        #${PRINT_ID} .rc-pr-table tfoot { display: table-row-group; }
        #${PRINT_ID} .rc-pr-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
  }

  function bacaDataBorang() {
    const root = document.getElementById(MODULE_ID);
    if (!root) throw new Error('Borang tuntutan tidak ditemui.');

    const month = root.querySelector('#rc-month');
    const year = root.querySelector('#rc-year');
    const dayHeaders = Array.from(root.querySelectorAll('#rc-table-head th.rc-day-head'));
    const days = dayHeaders.map(th => Number(th.textContent));
    if (!days.length || days.some((d, i) => d !== i + 1)) {
      throw new Error('Tarikh jadual belum tersedia. Cuba buka Dashboard semula.');
    }

    const rows = Array.from(root.querySelectorAll('#rc-table-body tr')).map(tr => {
      const crewName = tr.querySelector('input.rc-name-input')?.value.trim() || '';
      const buttons = Array.from(tr.querySelectorAll('button.rc-cell-btn'));
      if (buttons.length !== days.length) {
        throw new Error('Bilangan petak jadual tidak sepadan.');
      }
      const entries = buttons.map(btn => {
        if (!btn.classList.contains('has-value')) return '';
        const title = btn.getAttribute('title') || '';
        return title.startsWith('Ganti: ') ? title.slice(7) : title;
      });
      return { crewName, entries, total: entries.filter(Boolean).length };
    });

    const monthName = month?.selectedOptions?.[0]?.textContent?.trim() || '-';
    const yearValue = year?.value || '-';
    const grandTotal = rows.reduce((n, row) => n + row.total, 0);
    const printDate = new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short'
    }).format(new Date());

    return { monthName, yearValue, days, rows, grandTotal, printDate };
  }

  function binaHelaianCetak(data) {
    const sheet = buatElemen('section');
    sheet.id = PRINT_ID;
    sheet.setAttribute('aria-hidden', 'true');

    const title = buatElemen('header', null, 'rc-pr-title');
    title.append(
      buatElemen('h2', 'BORANG TUNTUTAN PEMANDU GANTI / CREW FIRST AID RESPONDER GANTIAN'),
      buatElemen('p', 'HOTSPOT 999 SJAM KOTA BHARU')
    );
    sheet.appendChild(title);

    const meta = buatElemen('div', null, 'rc-pr-meta');
    meta.append(
      buatElemen('span', `BULAN: ${data.monthName.toUpperCase()}   TAHUN: ${data.yearValue}`),
      buatElemen('span', 'DRAF TEMPATAN - BELUM DISAHKAN', 'rc-pr-draft')
    );
    sheet.appendChild(meta);

    const table = buatElemen('table', null, 'rc-pr-table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.append(buatElemen('th', 'BIL'), buatElemen('th', 'NAMA CREW'));
    data.days.forEach(d => headerRow.appendChild(buatElemen('th', d)));
    headerRow.appendChild(buatElemen('th', 'JUM'));
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const details = [];
    data.rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.append(buatElemen('td', index + 1), buatElemen('td', row.crewName || '-', 'rc-pr-crew'));
      row.entries.forEach((name, dayIndex) => {
        const td = buatElemen('td', null, 'rc-pr-day-cell');
        if (name) {
          td.classList.add('rc-pr-filled');
          // Paparan ringkas pada petak; nama penuh dicetak pada lampiran di bawah.
          const shortened = Array.from(name).slice(0, 10).join('') +
            (Array.from(name).length > 10 ? '…' : '');
          td.appendChild(buatElemen('span', shortened, 'rc-pr-vertical'));
          details.push(`${row.crewName || 'Crew ' + (index + 1)} | ` +
            `${data.days[dayIndex]} ${data.monthName} ${data.yearValue} | Ganti: ${name}`);
        }
        tr.appendChild(td);
      });
      tr.appendChild(buatElemen('td', row.total));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const tfoot = document.createElement('tfoot');
    const totalRow = document.createElement('tr');
    const totalLabel = buatElemen('th', 'JUMLAH HARIAN');
    totalLabel.colSpan = 2;
    totalRow.appendChild(totalLabel);
    data.days.forEach((_, dayIndex) => {
      totalRow.appendChild(buatElemen('td',
        data.rows.filter(row => Boolean(row.entries[dayIndex])).length));
    });
    totalRow.appendChild(buatElemen('td', data.grandTotal));
    tfoot.appendChild(totalRow);
    table.appendChild(tfoot);
    sheet.appendChild(table);

    sheet.appendChild(buatElemen('div',
      `JUMLAH KESELURUHAN TUNTUTAN: ${data.grandTotal}`, 'rc-pr-totals'));

    if (details.length) {
      sheet.appendChild(buatElemen('p',
        'Nama pada petak tarikh dipendekkan supaya jadual muat pada A4. Semua nama penuh disenaraikan di bawah.',
        'rc-pr-notice'));
      const section = buatElemen('section', null, 'rc-pr-details');
      section.appendChild(buatElemen('h3', 'CATATAN PENGGANTIAN (NAMA PENUH)'));
      const ol = document.createElement('ol');
      details.forEach(item => ol.appendChild(buatElemen('li', item)));
      section.appendChild(ol);
      sheet.appendChild(section);
    }

    const signature = buatElemen('div', null, 'rc-pr-signature');
    signature.append(
      buatElemen('div', 'Disahkan oleh / Tandatangan Penyelia Hotspot'),
      buatElemen('div', 'Tarikh pengesahan: __________________')
    );
    sheet.appendChild(signature);
    sheet.appendChild(buatElemen('p',
      `Dicetak: ${data.printDate} (MYT). Ini draf setempat dan bukan pengesahan rasmi.`,
      'rc-pr-footer'));
    return sheet;
  }

  function cetakBorang() {
    if (!adminSedangLogMasuk()) {
      window.alert('Fungsi cetak ini khusus untuk ADMIN sahaja.');
      return;
    }
    try {
      const data = bacaDataBorang();
      document.getElementById(PRINT_ID)?.remove();
      document.body.appendChild(binaHelaianCetak(data));
      window.print();
    } catch (err) {
      console.error('Ralat cetak tuntutan:', err);
      window.alert('Cetakan tidak dapat disediakan: ' + err.message);
    }
  }

  function semakButang() {
    const root = document.getElementById(MODULE_ID);
    const actions = root?.querySelector('.rc-control-actions');
    let btn = document.getElementById(BUTTON_ID);
    if (actions && !btn) {
      btn = buatElemen('button', '🖨 Cetak Borang');
      btn.id = BUTTON_ID;
      btn.type = 'button';
      btn.addEventListener('click', cetakBorang);
      actions.appendChild(btn);
    }
    if (btn) btn.hidden = !adminSedangLogMasuk();
    if (!adminSedangLogMasuk()) document.getElementById(PRINT_ID)?.remove();
  }

  function mula() {
    tambahCSSCetak();
    const dashboard = document.getElementById('view-dashboard');
    const roleLabel = document.getElementById('sidebar-role');
    const app = document.getElementById('app-container');
    if (dashboard) {
      new MutationObserver(semakButang).observe(dashboard, { childList: true });
    }
    if (roleLabel) {
      new MutationObserver(semakButang).observe(roleLabel, {
        childList: true, subtree: true, characterData: true
      });
    }
    if (app) {
      new MutationObserver(semakButang).observe(app, {
        attributes: true, attributeFilter: ['style']
      });
    }
    semakButang();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mula, { once: true });
  } else {
    mula();
  }
})();
