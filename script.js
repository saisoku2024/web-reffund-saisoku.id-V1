// ===== Helpers =====
const $ = (s) => document.querySelector(s);
const fmtIDR = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n || 0)));
const toISO = (d) => d?.toISOString?.().slice(0,10) ?? "";

function fmtDDMMYYYY(iso) {
  // iso = yyyy-mm-dd
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "-";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysBetween(a, b) {
  // floor by noon to avoid tz drift
  const MS = 24*60*60*1000;
  const d1 = new Date(a), d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  d1.setHours(12,0,0,0); d2.setHours(12,0,0,0);
  return Math.round((d2 - d1) / MS);
}

// ===== Elements =====
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

// ===== Init defaults =====
(function init() {
  const today = new Date();
  const isoToday = toISO(today);
  claimDate.value = isoToday;

  const start = new Date(today); start.setDate(today.getDate() - 7);
  buyDate.value = toISO(start);

  $('#year').textContent = today.getFullYear();
  durationSel.value = ""; // biar user pilih 30/60/90 sendiri
  calc();
})();

// ===== Core Calc =====
function calc(){
  const A = parseFloat(price.value || 0);
  const dur = parseInt(durationSel.value || 0);
  const coef = parseFloat(claimStatus.value || 1);

  // usage & remain
  const usageRaw = daysBetween(buyDate.value, claimDate.value);
  const usage = (isFinite(usageRaw) && usageRaw > 0) ? usageRaw : 0;
  const usageCapped = Math.min(usage, dur || usage); // batasi oleh durasi jika dipilih
  const remain = dur ? Math.max(0, dur - usageCapped) : 0;

  // refund
  const gross = (dur > 0) ? (A * (remain / dur) * coef) : 0;
  const deduct = 0; // Tidak ada input potongan lain di versi ini
  const net = Math.max(0, gross - deduct);

  // UI update (with "hari")
  durDaysEl.textContent = `${dur || 0} hari`;
  usedDaysEl.textContent = `${usageCapped || 0} hari`;
  remainDaysEl.textContent = `${remain || 0} hari`;

  grossEl.textContent = fmtIDR(gross);
  deductEl.textContent = fmtIDR(deduct);
  netEl.textContent = fmtIDR(net);

  msg.textContent = "";
}

// listen
['input','change'].forEach(ev=>{
  [custPhone,custEmail,productName,accountName,buyDate,claimDate,price,durationSel,claimStatus]
    .forEach(el=> el.addEventListener(ev, calc));
});

// ===== Copy Struk (Summary 3 Section) =====
copyStrukBtn.addEventListener('click', async () => {
  const A = parseFloat(price.value || 0);
  const dur = parseInt(durationSel.value || 0);
  const coef = parseFloat(claimStatus.value || 1);

  const usageRaw = daysBetween(buyDate.value, claimDate.value);
  const usage = (isFinite(usageRaw) && usageRaw > 0) ? usageRaw : 0;
  const usageCapped = Math.min(usage, dur || usage);
  const remain = dur ? Math.max(0, dur - usageCapped) : 0;

  const gross = (dur > 0) ? (A * (remain / dur) * coef) : 0;
  const deduct = 0;
  const net = Math.max(0, gross - deduct);

  // label status klaim (ambil teks option yg dipilih)
  const statusText = claimStatus.options[claimStatus.selectedIndex]?.text || '-';

  // build summary with separators and dd/mm/yyyy
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
› Durasi : ${dur || 0} hari
› Usage : ${usageCapped || 0} hari
› Sisa : ${remain || 0} hari

=========================
💰 PERHITUNGAN REFUND
› Kondisi : ${statusText}
› Rumus : (${fmtIDR(A)} × (${remain || 0} ÷ ${dur || 0}) × ${coef || 1})
› Refund Kotor : ${fmtIDR(gross)}
› Potongan : ${fmtIDR(deduct)}
› Refund Bersih : ${fmtIDR(net)}

=========================
Dihitung otomatis oleh Kalkulator Refund · SAISOKU.ID`;

  try {
    await navigator.clipboard.writeText(text);
    msg.textContent = '✅ Summary refund disalin (Copy Struk) — siap tempel di WA.';
    const old = copyStrukBtn.textContent;
    copyStrukBtn.textContent = 'Copied!';
    setTimeout(()=> copyStrukBtn.textContent = old, 1400);
  } catch (e) {
    msg.textContent = 'Gagal menyalin. Izinkan akses clipboard di browser.';
  }
});

// ===== Reset =====
resetBtn.addEventListener('click', () => {
  ['custPhone','custEmail','productName','accountName','price'].forEach(id => (document.getElementById(id).value = ''));
  durationSel.value = '';
  claimStatus.value = '0.95';

  // set tanggal default lagi
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - 7);
  buyDate.value = toISO(start);
  claimDate.value = toISO(today);

  calc();
});
