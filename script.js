// === Saisoku Refund Calculator v3.1 ===
// Fitur: Searchable Produk + preset 30 hari, Rupiah formatter, validasi tanggal,
// kalkulasi prorata (inklusif), pembulatan, koefisien status, Copy Struk robust.

document.addEventListener("DOMContentLoaded", () => {
  const nf = new Intl.NumberFormat("id-ID");
  const $  = id => document.getElementById(id);

  // ---------- INPUTS ----------
  const priceInput  = $("price");
  const buyDate     = $("buyDate");
  const claimDate   = $("claimDate");
  const durationSel = $("duration");
  const roundSel    = $("round");
  const claimStatus = $("claimStatus");

  // ---------- OUTPUTS ----------
  const durDays  = $("durDays");
  const usedDays = $("usedDays");
  const leftDays = $("remainDays");
  const grossEl  = $("gross");
  const netEl    = $("net");
  const msgEl    = $("msg");

  const copyBtn  = $("copyStrukBtn");
  const resetBtn = $("resetBtn");
  const yearEl   = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- HELPERS ----------
  const num = v => parseInt(String(v||"").replace(/[^0-9]/g,""),10)||0;
  const roundTo = (x, step=1) => (step<=1 ? Math.round(x) : Math.round(x/step)*step);
  const daysBetweenInclusive = (a,b) => {
    if(!a || !b) return 0;
    const d1 = new Date(a + "T00:00:00");
    const d2 = new Date(b + "T00:00:00");
    return Math.floor((d2 - d1)/86400000) + 1; // inklusif
  };

  // ---------- Product Picker (searchable + preset 30) ----------
  (function initProductPicker(){
    const input = $("productName");
    const dl    = $("productList");
    if (!input || !durationSel || !dl) return;

    const PRODUCTS = [
      "Canva",
      "CapCut Pro",
      "ChatGPT",
      "Disney+",
      "Gemini AI",
      "HBO Max",
      "iQIYI",
      "Netflix Premium",
      "Prime Video",
      "Spotify Premium",
      "Vidio",
      "Viu Premium",
      "WeTV VIP",
      "YouTube Premium",
      "Zoom Pro"
    ];
    const ALIASES = {
      "capcut pro":"CapCut Pro","capcut pro.":"CapCut Pro","capcut pro,":"CapCut Pro","capcut pro!":"CapCut Pro",
      "geminiai":"Gemini AI","geminia":"Gemini AI",
      "hbo max":"HBO Max","hbo  max":"HBO Max","hbo max.":"HBO Max","hbo max!":"HBO Max",
      "iqiyi":"iQIYI","iqyi":"iQIYI","iqiyi.":"iQIYI","iqiyi,":"iQIYI",
      "netlfix premium":"Netflix Premium","netflix premium":"Netflix Premium",
      "youtube premium":"YouTube Premium","youtube  premium":"YouTube Premium","youtube premium.":"YouTube Premium",
      "wetv vip":"WeTV VIP","wetv  vip":"WeTV VIP",
      "prime video":"Prime Video","disney+":"Disney+","viu premium":"Viu Premium","vidio":"Vidio",
      "spotify premium":"Spotify Premium","chatgpt":"ChatGPT","zoom pro":"Zoom Pro","canva":"Canva"
    };

    const CANON = Array.from(new Set(PRODUCTS))
      .sort((a,b)=> a.localeCompare(b, 'id', {sensitivity:'base'}));
    dl.innerHTML = CANON.map(name => `<option value="${name}"></option>`).join('');

    function toCanonical(raw){
      if (!raw) return "";
      const t = raw.trim();
      const key = t.toLowerCase();
      if (ALIASES[key]) return ALIASES[key];
      const hit = CANON.find(p => p.toLowerCase() === key);
      return hit || t;
    }
    function applyPreset(){
      const canon = toCanonical(input.value);
      const matched = CANON.some(p => p.toLowerCase() === canon.toLowerCase());
      if (matched) {
        input.value = CANON.find(p => p.toLowerCase() === canon.toLowerCase());
        durationSel.value = "30";
        durationSel.dispatchEvent(new Event('change'));
        input.dispatchEvent(new Event('change'));
      }
    }
    input.addEventListener('change', applyPreset);
    input.addEventListener('blur', applyPreset);
  })();

  // ---------- Formatter Rupiah saat ketik ----------
  if (priceInput) {
    priceInput.addEventListener("input", () => {
      const raw = priceInput.value.replace(/[^0-9]/g,"");
      priceInput.dataset.raw = raw;
      priceInput.value = raw ? nf.format(+raw) : "";
      calc(); // real-time
    });
  }
  const getPrice = () => num(priceInput?.dataset?.raw ?? priceInput?.value);

  // ---------- Validasi tanggal: klaim >= beli ----------
  if (buyDate && claimDate) {
    const syncMin = () => { if (buyDate.value) claimDate.min = buyDate.value; };
    buyDate.addEventListener("change", syncMin);
    syncMin();
  }

  // ---------- Kalkulasi ----------
  function calc(){
    const price = getPrice();
    const start = buyDate?.value || "";
    const issue = claimDate?.value || "";
    const dur   = num(durationSel?.value);
    const coef  = claimStatus ? (parseFloat(claimStatus.value)||1) : 1;
    const step  = Math.max(1, num(roundSel?.value) || 1);

    if(!price || !start || !issue || !dur){
      msgEl && (msgEl.className="msg error", msgEl.textContent = "Lengkapi data untuk hitung refund.");
      grossEl && (grossEl.textContent = "Rp 0");
      netEl   && (netEl.textContent   = "Rp 0");
      copyBtn && (copyBtn.disabled = true);
      return;
    }
    if (new Date(issue + "T00:00:00") < new Date(start + "T00:00:00")) {
      msgEl && (msgEl.className="msg error", msgEl.textContent = "Tanggal klaim tidak boleh sebelum tanggal beli.");
      grossEl && (grossEl.textContent = "Rp 0");
      netEl   && (netEl.textContent   = "Rp 0");
      copyBtn && (copyBtn.disabled = true);
      return;
    }

    let used = Math.max(0, daysBetweenInclusive(start, issue));
    used = Math.min(used, dur);
    const left = Math.max(0, dur - used);

    durDays && (durDays.textContent = `${dur} hari`);
    usedDays && (usedDays.textContent = `${used} hari`);
    leftDays && (leftDays.textContent = `${left} hari`);

    const grossRaw = Math.max(0, (left/dur) * price);
    const gross    = roundTo(grossRaw, step);   // bulatkan dulu
    const net      = roundTo(gross * coef, 1);  // lalu kali koefisien

    grossEl && (grossEl.textContent = "Rp " + nf.format(gross));
    netEl   && (netEl.textContent   = "Rp " + nf.format(net));
    msgEl   && (msgEl.className="msg success", msgEl.textContent = "Perhitungan berhasil ✅");
    copyBtn && (copyBtn.disabled = false);
  }

  [priceInput,buyDate,claimDate,durationSel,roundSel,claimStatus]
    .filter(Boolean)
    .forEach(el => {
      el.addEventListener("input",  calc);
      el.addEventListener("change", calc);
    });

  // ---------- Copy Struk: robust + fallback ----------
  (function initCopyStruk(){
    const btn = $("copyStrukBtn");
    if (!btn) return;

    const txt = id => (document.getElementById(id)?.textContent || "").trim();
    const val = id => (document.getElementById(id)?.value || "").trim();

    function copyFallback(text){
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly','');
      ta.style.position='fixed'; ta.style.top='-9999px';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, 99999);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }

    btn.addEventListener('click', () => {
      const statusOpt  = $("claimStatus")?.selectedOptions?.[0];
      const statusLabel= statusOpt?.dataset?.label || statusOpt?.textContent || "-";
      const refundText = txt("net") || "Rp 0";

      const struk =
`🧾 *STRUK REFUND SAISOKU.ID*

📱 Buyer: ${val('custPhone') || '-'}
👤 Tipe: ${val('buyerType') || '-'}

🎬 Produk: ${val('productName') || '-'}
🔑 Akun: ${val('accountName') || '-'}
⏱️ Durasi: ${val('duration') || '-'} Hari

📆 Status: ${statusLabel}
💎 Refund: ${refundText}

Terima kasih telah menggunakan layanan SAISOKU.ID 🙏`;

      const useModern = !!(navigator.clipboard && window.isSecureContext);

      (useModern
        ? navigator.clipboard.writeText(struk)
        : Promise.resolve(copyFallback(struk)))
        .then(() => alert("✅ Struk berhasil disalin"))
        .catch(() => {
          copyFallback(struk)
            ? alert("✅ Struk disalin (fallback)")
            : alert("❌ Gagal menyalin struk.");
        });
    });
  })();

  // ---------- Reset ----------
  if (resetBtn){
    resetBtn.addEventListener("click", () => {
      document.querySelectorAll("input, select").forEach(el => {
        if (el.id === "price") { el.value = ""; el.dataset.raw = ""; }
        else if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });
      durDays.textContent = usedDays.textContent = leftDays.textContent = "0 hari";
      grossEl.textContent = netEl.textContent = "Rp 0";
      msgEl.textContent = ""; msgEl.className = "msg";
      copyBtn.disabled = true;
    });
  }

  // initial compute
  calc();
});
