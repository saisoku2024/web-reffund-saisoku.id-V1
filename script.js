// ====== Util ======
const $ = (s) => document.querySelector(s);
const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n || 0)));

function daysBetween(a, b) {
  const MS = 24*60*60*1000;
  const d1 = new Date(a), d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  // Normalisasi ke 12:00 supaya aman DST/offset
  d1.setHours(12,0,0,0); d2.setHours(12,0,0,0);
  return Math.round((d2 - d1) / MS);
}

// ====== Elemen ======
const amount = $('#amount');
const startDate = $('#startDate');
const endDate = $('#endDate');
const cancelDate = $('#cancelDate');
const feePct = $('#feePct');
const feeFlat = $('#feeFlat');

const totalDaysEl = $('#totalDays');
const usedDaysEl = $('#usedDays');
const remainingDaysEl = $('#remainingDays');

const grossEl = $('#gross');
const deductEl = $('#deduct');
const netEl = $('#net');

const copyBtn = $('#copyBtn');
const resetBtn = $('#resetBtn');
const msg = $('#msg');

// Default tanggal
(function initDates(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  cancelDate.value = `${yyyy}-${mm}-${dd}`;

  // contoh default 30 hari berlangganan
  const start = new Date(today); start.setDate(today.getDate() - 7);
  const end = new Date(today); end.setDate(today.getDate() + 23);
  const iso = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  startDate.value = iso(start);
  endDate.value = iso(end);

  $('#year').textContent = yyyy;
})();

function calc(){
  const A = parseFloat(amount.value || 0);
  const feeP = parseFloat(feePct.value || 0) / 100;
  const feeF = parseFloat(feeFlat.value || 0);

  const totalDays = Math.max(0, daysBetween(startDate.value, endDate.value));
  const usedDaysRaw = daysBetween(startDate.value, cancelDate.value);
  const usedDays = Math.min(Math.max(0, usedDaysRaw), totalDays);
  const remainingDays = Math.max(0, totalDays - usedDays);

  const gross = totalDays > 0 ? A * (remainingDays / totalDays) : 0;
  const deduct = (feeP * A) + feeF;
  const net = Math.max(0, gross - deduct);

  totalDaysEl.textContent = totalDays;
  usedDaysEl.textContent = usedDays;
  remainingDaysEl.textContent = remainingDays;

  grossEl.textContent = fmtIDR(gross);
  deductEl.textContent = fmtIDR(deduct);
  netEl.textContent = fmtIDR(net);

  msg.textContent = totalDays === 0
    ? 'Lengkapi tanggal dengan benar untuk menghitung prorata.'
    : '';
}

['input','change'].forEach(ev=>{
  [amount,startDate,endDate,cancelDate,feePct,feeFlat].forEach(el=>el.addEventListener(ev, calc));
});
calc();

// Copy hasil
copyBtn.addEventListener('click', async () => {
  const val = netEl.textContent || '';
  try {
    await navigator.clipboard.writeText(val);
    const old = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    msg.textContent = `Nilai refund ${val} telah disalin ke clipboard.`;
    setTimeout(()=>{ copyBtn.textContent = old; }, 1400);
  } catch (e) {
    msg.textContent = 'Gagal menyalin. Izinkan clipboard di browser Anda.';
  }
});

// Reset
resetBtn.addEventListener('click', () => {
  [amount, feePct, feeFlat].forEach(i => i.value = '');
  calc();
});
