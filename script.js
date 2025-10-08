document.addEventListener('DOMContentLoaded', () => {
  // ===== Helpers =====
  const $ = (s) => document.querySelector(s);
  const fmtIDR = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Math.max(0, Math.round(Number(n) || 0)));

  const toISO = (d) => d?.toISOString?.().slice(0,10) ?? "";
  const fmtDDMMYYYY = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "-";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  function daysBetween(a, b) {
    const MS = 24*60*60*1000;
    const d1 = new Date(a), d2 = new Date(b);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
    d1.setHours(12,0,0,0); d2.setHours(12,0,0,0);
    return Math.round((d2 - d1) / MS);
  }

  async function copyText(text) {
    // Modern API
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback (textarea)
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

  // ===== Elements (pastikan ID di HTML sama persis) =====
  const custPhone = $('#custPhone');
  const custEmail = $('#custEmail');
  const productName = $('#productName');
  const accountName = $('#accountName');
  const buyDate = $('#buyDate');
  const claimDate = $('#claimDate');
  const price = $('#price');
  const durationSel = $('#duration');
  const claimStatus = $('#claimStatus');

  const durDaysEl = $('#durDays');
  const usedDaysEl = $('#usedDays');
  const remainDaysEl = $('#remainDays');

  const grossEl = $('#gross');
  const deductEl = $('#deduct');
  const netEl = $('#net');

  const copyStrukBtn = $('#copyStrukBtn');
  const resetBtn = $('#resetBtn');
  const msg = $('#msg');
  const yearEl = $('#year');

  // Safety: pastikan semua elemen ada
  const requiredEls = [
    custPhone,custEmail,productName,accountName,buyDate,claimDate,price,
    durationSel,claimStatus,durDaysEl,usedDaysEl,remainDaysEl,
    grossEl,deductEl,netEl,copyStrukBtn,resetBtn,msg
  ];
  if (requiredEls.some(el => !el)) {
    console.error('Ada elemen yang tidak ditemukan. Cek ID di HTML.');
    return;
  }

  // ===== Init defaults =====
  (function init() {
    const today = new Date();
    const isoToday = toISO(today);
    claimDate.value = claimDate.value || isoToday;

    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    buyDate.value = buyDate.value || toISO(start);

    // Default biar langsung kelihatan hasil
    if (!durationSel.value) durationSel.value = '30';

    if (yearEl) yearEl.textContent = today.getFullYear();
    calc();
  })();

  // ===== Core Calc =====
  function calc() {
    const A = Number(price.value) || 0;
    const dur = Number(durationSel.value) || 0;
    const coef = Number(claimStatus.value) || 1;

    // usage & remain
    const usageRaw = daysBetween(buyDate.value, claimDate.value);
    const usage = Math.max(0, usageRaw || 0);
    const usageCapped = dur ? Math.min(usage, dur) : usage;
    const remain = dur ? Math.max(0, dur - usageCapped) : 0;

    // refund (kotor=pro-rata*coef; potongan versi ini 0)
    const gross = dur > 0 ? (A * (remain / dur) * coef) : 0;
    const deduct = 0;
    const net = Math.max(0, gross - deduct);

    // UI
    durDaysEl.textContent = `${dur} hari`;
    usedDaysEl.textContent = `${usageCapped} hari`;
    remainDaysEl.textContent = `${remain} hari`;

    grossEl.textContent = fmtIDR(gross);
    deductEl.textContent = fmtIDR(deduct);
    netEl.textContent = fmtIDR(net);

    msg.textContent = '';
  }

  // Recalc on change
  ['input','change'].forEach(ev => {
    [
      custPhone,custEmail,productName,accountName,buyDate,claimDate,
      price,durationSel,claimStatus
    ].forEach(el => el.addEventListener(ev, calc));
  });

  // ===== Copy Struk (Summary 3 Section) =====
  copyStrukBtn.addEventListener('click', async () => {
    const A = Number(price.value) || 0;
    const dur = Number(durationSel.value) || 0;
    const coef = Number(claimStatus.value) || 1;

    const usageRaw = daysBetween(buyDate.value, claimDate.value);
    const usage = Math.max(0, usageRaw || 0);
    const usageCapped = dur ? Math.min(usage, dur) : usage;
    const remain = dur ? Math.max(0, dur - usageCapped) : 0;

    const gross = dur > 0 ? (A * (remain / dur) * coef) : 0;
    const deduct = 0;
    const net = Math.max(0, gross - deduct);

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
› Usage : ${usageCapped} hari
› Sisa : ${remain} hari

=========================
💰 PERHITUNGAN REFUND
› Kondisi : ${statusText}
› Rumus : (${fmtIDR(A)} × (${remain} ÷ ${dur || 1}) × ${coef})
› Refund Kotor : ${fmtIDR(gross)}
› Potongan : ${fmtIDR(deduct)}
› Refund Bersih : ${fmtIDR(net)}

=========================
Dihitung otomatis oleh Kalkulator Refund · SAISOKU.ID`;

    const ok = await copyText(text);
    if (ok) {
      msg.textContent = '✅ Summary refund disalin — siap tempel di WA.';
      const old = copyStrukBtn.textContent;
      copyStrukBtn.textContent = 'Copied!';
      setTimeout(()=> copyStrukBtn.textContent = old, 1400);
    } else {
      msg.textContent = '❌ Gagal menyalin. Coba klik lagi atau izinkan clipboard.';
    }
  });

  // ===== Reset =====
  resetBtn.addEventListener('click', () => {
  // kosongkan text/number
  ['custPhone','custEmail','productName','accountName','price']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // kosongkan tanggal
  ['buyDate','claimDate']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // kosongkan select (tidak memilih apa pun)
  if (durationSel)   durationSel.selectedIndex = -1;
  if (claimStatus)   claimStatus.selectedIndex = -1;

  // nolkan tampilan
  durDaysEl.textContent    = '0 hari';
  usedDaysEl.textContent   = '0 hari';
  remainDaysEl.textContent = '0 hari';
  grossEl.textContent      = fmtIDR(0);
  netEl.textContent        = fmtIDR(0);

  msg.textContent = 'Form direset.';
});
