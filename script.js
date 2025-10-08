// script.js — Saisoku Refund (final)

document.addEventListener('DOMContentLoaded', () => {
  /* ===== Helpers ===== */
  const $ = (s) => document.querySelector(s);

  const fmtIDR = (n) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(Number(n) || 0)));

  const toISO = (d) => d?.toISOString?.().slice(0, 10) ?? '';

  const fmtDDMMYYYY = (iso) => {
    // input "yyyy-mm-dd" -> "dd/mm/yyyy"
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  function daysBetween(a, b) {
    const MS = 24 * 60 * 60 * 1000;
    const d1 = new Date(a), d2 = new Date(b);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
    d1.setHours(12, 0, 0, 0);
    d2.setHours(12, 0, 0, 0);
    return Math.round((d2 - d1) / MS);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  /* ===== Elements ===== */
  const custPhone   = $('#custPhone');
  const custEmail   = $('#custEmail');

  const productName = $('#productName');
  const accountName = $('#accountName');
  const buyDate     = $('#buyDate');
  const claimDate   = $('#claimDate');
  const price       = $('#price');

  const durationSel = $('#duration');
  const claimStatus = $('#claimStatus');

  const durDaysEl   = $('#durDays');
  const usedDaysEl  = $('#usedDays');
  const remainDaysEl= $('#remainDays');

  const grossEl     = $('#gross'); // label di UI: "Refund Dana"
  const netEl       = $('#net');   // "Refund Bersih"

  const copyStrukBtn= $('#copyStrukBtn');
  const resetBtn    = $('#resetBtn');
  const msg         = $('#msg');
  const yearEl      = $('#year');

  // Safety check
  const required = [
    custPhone,custEmail,productName,accountName,buyDate,claimDate,price,
   durationSel,claimStatus,durDaysEl,usedDaysEl,remainDaysEl,grossEl,netEl,copyStrukBtn,resetBtn
  ];
  if (required.some(el => !el)) {
    console.error('Ada elemen yang belum ditemukan. Cek ID di HTML.');
    return;
  }

  /* ===== Init (optional defaults) ===== */
  (function init() {
    const today = new Date();
    if (yearEl) yearEl.textContent = today.getFullYear();

    calc();
  })();

  /* ===== Core Calculation ===== */
  function calc() {
    const A    = Number(price.value) || 0;
    const dur  = Number(durationSel.value) || 0;
    const coef = Number(claimStatus.value) || 1;

    const usageRaw = daysBetween(buyDate.value, claimDate.value);
    const usage    = Math.max(0, usageRaw || 0);
    const usageCap = dur ? Math.min(usage, dur) : usage;
    const remain   = dur ? Math.max(0, dur - usageCap) : 0;

    // Refund Dana (pro-rata * koefisien). Tidak ada potongan.
    const dana = dur > 0 ? (A * (remain / dur) * coef) : 0;
    const net  = Math.max(0, dana); // sama dengan dana (tanpa potongan)

    // Update UI (dengan satuan "hari")
    durDaysEl.textContent    = `${dur} hari`;
    usedDaysEl.textContent   = `${usageCap} hari`;
    remainDaysEl.textContent = `${remain} hari`;

    grossEl.textContent = fmtIDR(dana); // "Refund Dana"
    netEl.textContent   = fmtIDR(net);  // "Refund Bersih"
    msg.textContent     = '';
  }

  // Recalc on change
  ['input', 'change'].forEach(ev => {
    [
      custPhone, custEmail, productName, accountName, buyDate, claimDate,
      price, durationSel, claimStatus
    ].forEach(el => el.addEventListener(ev, calc));
  });

  /* ===== Copy Struk (3 section + separator) ===== */
  copyStrukBtn.addEventListener('click', async () => {
    const A    = Number(price.value) || 0;
    const dur  = Number(durationSel.value) || 0;
    const coef = Number(claimStatus.value) || 1;

    const usageRaw = daysBetween(buyDate.value, claimDate.value);
    const usage    = Math.max(0, usageRaw || 0);
    const usageCap = dur ? Math.min(usage, dur) : usage;
    const remain   = dur ? Math.max(0, dur - usageCap) : 0;

    const dana = dur > 0 ? (A * (remain / dur) * coef) : 0;
    const net  = Math.max(0, dana);

    const statusText = claimStatus.options[claimStatus.selectedIndex]?.text || '-';

    const text =
`=========================
👤 INFO PELANGGAN
› No. WhatsApp : ${custPhone.value || '-'}
› Akun : ${custEmail.value || '-'}

=========================
🛒 INFO PEMBELIAN
› Produk : ${productName.value || '-'}
› Harga Beli : ${fmtIDR(A)}
› Tanggal Beli : ${fmtDDMMYYYY(buyDate.value)}
› Tanggal Klaim : ${fmtDDMMYYYY(claimDate.value)}
› Durasi : ${dur} hari
› Usage : ${usageCap} hari
› Sisa : ${remain} hari

=========================
💰 PERHITUNGAN REFUND
› Kondisi : ${statusText}
› Rumus : (${fmtIDR(A)} × (${remain} ÷ ${dur || 1}) × ${coef})
› Refund Dana : ${fmtIDR(dana)}
› Refund Bersih : ${fmtIDR(net)}

=========================
Dihitung otomatis oleh Kalkulator Refund · SAISOKU.ID`;

    const ok = await copyText(text);
    if (ok) {
      msg.textContent = '✅ Summary refund disalin — siap ditempel.';
      const old = copyStrukBtn.textContent;
      copyStrukBtn.textContent = 'Copied!';
      setTimeout(() => (copyStrukBtn.textContent = old), 1400);
    } else {
      msg.textContent = '❌ Gagal menyalin. Coba klik lagi atau izinkan clipboard.';
    }
  });

  /* ===== Reset (bersihkan SEMUA input) ===== */
  resetBtn.addEventListener('click', () => {
    // kosongkan text/number
    ['custPhone','custEmail','productName','accountName','price'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // kosongkan tanggal
    ['buyDate','claimDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // kosongkan select (tanpa pilihan)
    if (durationSel) durationSel.selectedIndex = -1;
    if (claimStatus) claimStatus.selectedIndex = -1;

    // nolkan tampilan
    durDaysEl.textContent    = '0 hari';
    usedDaysEl.textContent   = '0 hari';
    remainDaysEl.textContent = '0 hari';
    grossEl.textContent      = fmtIDR(0);
    netEl.textContent        = fmtIDR(0);

    msg.textContent = 'Form direset.';
  });
});
