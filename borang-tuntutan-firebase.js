/*
  STAFF HRMS - FIREBASE SIMPAN / MUAT TUNTUTAN CREW GANTIAN
  - ADMIN aktif sahaja; disokong oleh Firestore Security Rules.
  - Satu dokumen bagi satu bulan (contoh: replacement_claims/2026-10).
  - Tidak menyentuh Firebase untuk cuti, kehadiran atau modul cetak.
  - Simpan manual; rekod disimpan sebagai draf, bukan kelulusan rasmi.
*/
(() => {
  'use strict';

  const sdkURL = 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
  const knownVersions = new Map();
  let sdkPromise;
  let working = false;

  function firestoreSDK() {
    if (!sdkPromise) sdkPromise = import(sdkURL);
    return sdkPromise;
  }

  function activeAdminSession() {
    const firebase = window.hrmsFirebase;
    const authUser = firebase?.auth?.currentUser;
    const app = document.getElementById('app-container');
    if (!firebase?.db || !authUser ||
        typeof currentUser === 'undefined' || !currentUser ||
        currentUser.role !== 'ADMIN' || currentUser.id !== authUser.uid ||
        app?.style.display !== 'flex') return null;
    return { firebase, uid: authUser.uid };
  }

  function getAPI() {
    const api = window.hrmsReplacementClaims;
    return api && typeof api.getDraft === 'function' &&
      typeof api.loadDraft === 'function' ? api : null;
  }

  function announce(message) {
    const element = document.getElementById('rc-feedback');
    if (element) element.textContent = message;
  }

  function periodId(data) {
    return String(data.year) + '-' + String(data.month).padStart(2, '0');
  }

  function versionKey(uid, period) {
    return uid + '|' + period;
  }

  function documentVersion(snapshot) {
    if (!snapshot.exists()) return null;
    const stamp = snapshot.data().updated_at;
    if (!stamp || typeof stamp.seconds !== 'number') return 'unknown';
    return stamp.seconds + ':' + stamp.nanoseconds;
  }

  function draftHasContent(draft) {
    return draft.rows.some(row => row.name.trim() ||
      Object.keys(row.entries).length > 0);
  }

  function draftIsValid(draft) {
    if (!Number.isInteger(draft.month) || draft.month < 1 || draft.month > 12 ||
        !Number.isInteger(draft.year) || draft.year < 2020 || draft.year > 2100 ||
        !Array.isArray(draft.rows) || draft.rows.length < 1 ||
        draft.rows.length > 40) return false;
    const maxDay = new Date(Date.UTC(draft.year, draft.month, 0)).getUTCDate();
    return draft.rows.every(row =>
      typeof row.name === 'string' && row.name.length <= 80 &&
      row.entries && typeof row.entries === 'object' &&
      !Array.isArray(row.entries) &&
      Object.entries(row.entries).every(([dayText, name]) => {
        const day = Number(dayText);
        return /^\d+$/.test(dayText) && Number.isInteger(day) &&
          day >= 1 && day <= maxDay &&
          typeof name === 'string' && name.trim().length > 0 &&
          name.length <= 80 && row.name.trim().length > 0;
      })
    );
  }

  function createButton(id, text, cssClass) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = cssClass;
    btn.textContent = text;
    return btn;
  }

  function install() {
    const root = document.getElementById('replacement-claim-module');
    const actions = root?.querySelector('.rc-control-actions');
    if (!root || !actions || !getAPI()) return false;
    if (document.getElementById('rc-save-firebase')) return true;

    const saveBtn = createButton(
      'rc-save-firebase', 'Simpan ke Firebase', 'rc-btn rc-btn-blue'
    );
    const loadBtn = createButton(
      'rc-load-firebase', 'Muat Rekod', 'rc-btn'
    );
    // Butang "Tambah Crew" dan "Cetak Borang" sedia ada tidak diubah.
    actions.prepend(loadBtn, saveBtn);

    function setBusy(value) {
      working = value;
      saveBtn.disabled = value;
      loadBtn.disabled = value;
    }

    saveBtn.addEventListener('click', async () => {
      if (working) return;
      const session = activeAdminSession();
      const api = getAPI();
      if (!session || !api) {
        announce('Akses ditolak. Log masuk menggunakan akaun ADMIN aktif.');
        return;
      }
      if (document.getElementById('rc-entry-dialog')?.open) {
        announce('Simpan Catatan dalam tetingkap penggantian dahulu.');
        return;
      }
      const draft = api.getDraft();
      const id = periodId(draft);
      if (!draftIsValid(draft)) {
        announce('Semak nama crew dan catatan tarikh sebelum menyimpan.');
        return;
      }
      if (!draftHasContent(draft)) {
        announce('Isi sekurang-kurangnya satu nama crew sebelum menyimpan.');
        return;
      }
      const versionSlot = versionKey(session.uid, id);
      const originalDraft = JSON.stringify(draft);
      setBusy(true);
      announce('Menyemak rekod ' + id + ' sebelum menyimpan...');
      let committed = false;

      try {
        const { doc, getDocFromServer, runTransaction, serverTimestamp } =
          await firestoreSDK();
        const ref = doc(session.firebase.db, 'replacement_claims', id);
        if (activeAdminSession()?.uid !== session.uid) {
          throw new Error('Sesi ADMIN telah berubah.');
        }
        let expectedVersion;
        if (knownVersions.has(versionSlot)) {
          expectedVersion = knownVersions.get(versionSlot);
        } else {
          const existing = await getDocFromServer(ref);
          expectedVersion = documentVersion(existing);
          if (existing.exists() && !window.confirm(
            'Rekod ' + id + ' sudah wujud dalam Firebase.\n\n' +
            'Anda belum memuat rekod terkini. Timpa rekod sedia ada?'
          )) {
            announce('Simpanan dibatalkan. Tekan Muat Rekod untuk semak dahulu.');
            return;
          }
        }
        if (activeAdminSession()?.uid !== session.uid ||
            periodId(api.getDraft()) !== id) {
          throw new Error('Sesi atau bulan telah berubah. Simpanan dibatalkan.');
        }
        if (JSON.stringify(api.getDraft()) !== originalDraft) {
          throw new Error('Borang berubah semasa menyemak. Tekan Simpan semula.');
        }
        announce('Sedang menyimpan borang ' + id + ' ke Cloud Firestore...');
        await runTransaction(session.firebase.db, async transaction => {
          const existing = await transaction.get(ref);
          if (documentVersion(existing) !== expectedVersion) {
            const conflict = new Error('Rekod telah berubah dalam Firebase.');
            conflict.code = 'claim/conflict';
            throw conflict;
          }
          transaction.set(ref, {
            month: draft.month,
            year: draft.year,
            rows: draft.rows,
            updated_by_uid: session.uid,
            updated_at: serverTimestamp()
          });
        });
        committed = true;
        try {
          // Baca semula timestamp pelayan bagi mengesan suntingan ADMIN lain.
          const latest = await getDocFromServer(ref);
          knownVersions.set(versionSlot, documentVersion(latest));
        } catch (verifyError) {
          knownVersions.delete(versionSlot);
          console.warn('Rekod disimpan tetapi versi tidak dapat disemak:', verifyError);
        }
        if (activeAdminSession()?.uid !== session.uid) return;
        if (JSON.stringify(api.getDraft()) !== originalDraft) {
          announce('Rekod ' + id + ' disimpan. Perubahan yang dibuat selepas klik Simpan belum disimpan.');
        } else {
          announce('Berjaya disimpan ke Firebase: ' + id + '. Status masih DRAF, belum disahkan penyelia.');
        }
      } catch (err) {
        console.error('Ralat Simpan Borang Tuntutan:', err);
        if (activeAdminSession()?.uid !== session.uid) return;
        if (committed) {
          announce('Rekod telah disimpan, tetapi pengesahan versi tidak berjaya.');
        } else if (err.code === 'claim/conflict') {
          knownVersions.delete(versionSlot);
          announce('SIMPANAN DITOLAK: rekod bulan ini diubah oleh ADMIN lain. Semak rekod terkini sebelum menyimpan.');
        } else if (err.code === 'permission-denied') {
          announce('Simpanan ditolak Firestore Rules. Pastikan akaun ADMIN aktif dan Rules telah diterbitkan.');
        } else {
          announce('Gagal menyimpan: ' + (err.message || 'ralat tidak diketahui'));
        }
      } finally {
        setBusy(false);
      }
    });

    loadBtn.addEventListener('click', async () => {
      if (working) return;
      const session = activeAdminSession();
      const api = getAPI();
      if (!session || !api) {
        announce('Akses ditolak. Log masuk menggunakan akaun ADMIN aktif.');
        return;
      }
      if (document.getElementById('rc-entry-dialog')?.open) {
        announce('Tutup tetingkap catatan dahulu sebelum memuat rekod.');
        return;
      }
      const selected = api.getDraft();
      const id = periodId(selected);
      if (draftHasContent(selected) && !window.confirm(
        'Muat rekod ' + id + ' dari Firebase?\n\n' +
        'Draf yang belum disimpan dalam borang mungkin akan diganti.'
      )) return;
      const originalDraft = JSON.stringify(selected);
      setBusy(true);
      announce('Sedang memuatkan rekod ' + id + ' daripada Firebase...');

      try {
        const { doc, getDocFromServer } = await firestoreSDK();
        const ref = doc(session.firebase.db, 'replacement_claims', id);
        const snapshot = await getDocFromServer(ref);
        if (activeAdminSession()?.uid !== session.uid ||
            periodId(api.getDraft()) !== id) {
          throw new Error('Sesi atau bulan sudah berubah. Muat semula rekod.');
        }
        if (JSON.stringify(api.getDraft()) !== originalDraft) {
          throw new Error('Borang diubah semasa proses muat. Rekod tidak ditimpa.');
        }
        const versionSlot = versionKey(session.uid, id);
        knownVersions.set(versionSlot, documentVersion(snapshot));
        if (!snapshot.exists()) {
          announce('Tiada rekod Firebase bagi bulan ' + id + '.');
          return;
        }
        const saved = snapshot.data();
        if (saved.month !== selected.month || saved.year !== selected.year) {
          throw new Error('Bulan dan tahun rekod Firebase tidak sepadan.');
        }
        api.loadDraft(saved);
        announce('Rekod ' + id + ' berjaya dimuatkan. Anda boleh kemas kini, simpan dan cetak.');
      } catch (err) {
        console.error('Ralat Muat Borang Tuntutan:', err);
        if (activeAdminSession()?.uid !== session.uid) return;
        if (err.code === 'permission-denied') {
          announce('Akses ditolak Firestore Rules. Pastikan akaun anda ADMIN aktif.');
        } else {
          announce('Gagal memuat rekod: ' + (err.message || 'ralat tidak diketahui'));
        }
      } finally {
        setBusy(false);
      }
    });

    return true;
  }

  function start() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
