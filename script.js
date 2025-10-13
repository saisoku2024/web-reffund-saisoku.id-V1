// --- Patch: perbaiki kalkulasi & urutan pembulatan ---

document.addEventListener("DOMContentLoaded", () => {
  const pick = (...ids) => ids.map(id => document.getElementById(id)).find(Boolean);
  const nf = new Intl.NumberFormat("id-ID");

  // Inputs (kompatibel id lama/baru)
  const priceInput  = pick("price","harga");
  const startDate   = pick("buyDate","mulai");
  const issueDate   = pick("claimDate","kendala");
  const durationSel = pick("duration","durasi");
  const claimStatus = document.getElementById("claimStatus"); // optional
  const roundSel    = document.getElementById("round");       // optional: 1/100/1000
  const durCustom   = document.getElementById("durasiCustom");// optional

  // Outputs
  const durDays  = document.getElementById("durDays");
  const usedDays = document.getElementById("usedDays");
  const leftDays = document.getElementById("remainDays");
  const grossEl  = document.getElementById("gross");
  const netEl    = pick("net","refund");
  const msgEl    = document.getElementById("msg");
  const outBox   = document.getElementById("out");

  const num = v => parseInt(String(v||"").replace(/[^0-9]/g,""),10)||0;
  const roundTo = (x, step=1) => (step<=1 ? Math.round(x) : Math.round(x/step)*step);
  const daysBetweenInclusive = (a,b) => {
    if(!a || !b) return 0;
    // paksa ke 00:00 tanpa offset TZ
    const d1 = new Date(a + "T00:00:00");
    const d2 = new Date(b + "T00:00:00");
    return Math.floor((d2 - d1)/86400000) + 1; // inklusif
  };
  const getDuration = () => {
    if(!durationSel) return 0;
    const v = durationSel.value;
    return v==="custom" && durCustom ? num(durCustom.value) : num(v);
  };

  function calc(){
    const price  = parseFloat(priceInput?.value || 0) || 0;
    const start  = startDate?.value || "";
    const issue  = issueDate?.value || "";
    const dur    = getDuration();
    const coef   = claimStatus ? (parseFloat(claimStatus.value)||1) : 1;
    const step   = roundSel ? (num(roundSel.value)||1) : 1;

    if(!price || !start || !issue || !dur){
      if (msgEl) msgEl.textContent = "Lengkapi semua data untuk hitung refund.";
      if (grossEl) grossEl.textContent = "Rp 0";
      if (netEl)   netEl.textContent   = "Rp 0";
      return;
    }

    // hitung hari terpakai (inklusif) lalu clamp 0..dur
    let used = Math.max(0, daysBetweenInclusive(start, issue));
    used = Math.min(used, dur);
    const left = Math.max(0, dur - used);

    durDays && (durDays.textContent  = `${dur} hari`);
    usedDays && (usedDays.textContent = `${used} hari`);
    leftDays && (leftDays.textContent = `${left} hari`);

    // 1) Gross prorata -> bulatkan (mis. 100/1000)
    const grossRaw = Math.max(0, (left/dur) * price);
    const gross    = roundTo(grossRaw, step);

    // 2) Net = Gross × koefisien (contoh 0.95 = potong 5%)
    const net      = roundTo(gross * coef, 1);

    grossEl && (grossEl.textContent = "Rp " + nf.format(gross));
    netEl   && (netEl.innerHTML     = "<b>Rp " + nf.format(net) + "</b>");
    msgEl   && (msgEl.textContent   = "Perhitungan berhasil ✅");
    outBox  && (outBox.style.display = "grid");
  }

  [priceInput,startDate,issueDate,durationSel,claimStatus,roundSel,durCustom]
    .filter(Boolean).forEach(el => (el.oninput = el.onchange = calc));

  calc();
});
