// === Saisoku Refund Calculator v3.3 ===
// Fitur: Produk searchable (custom combobox) + preset 30 hari, Rupiah formatter,
// validasi tanggal, kalkulasi prorata (inklusif), pembulatan, koefisien,
// Copy Struk multi-style (default: detail_no_gross), Reset.

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

  // ---------- Product Picker (custom combobox + preset 30) ----------
  (function initProductPicker(){
    const input = $("productName");
    const dl    = $("productList");
    if (!input || !durationSel || !dl) return;

    const PRODUCTS = [
      "Canva","CapCut Pro","ChatGPT","Disney+","Gemini AI","HBO Max","iQIYI",
      "Netflix Premium","Prime Video","Spotify Premium","Vidio","Viu Premium",
      "WeTV VIP","YouTube Premium","Zoom Pro"
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
      .sort((a,b)=> a.localeCompare(b,'id',{sensitivity:'base'}));
    // isi datalist (fallback native)
    dl.innerHTML = CANON.map(n=>`<option value="${n}"></option>`).join('');

    // custom menu
    const menu = document.createElement('div');
    menu.className = 'combo-list';
    document.body.appendChild(menu);

    let items = [];
    let active = -1;

    function toCanonical(raw){
      if (!raw) return "";
      const t = raw.trim(); const k = t.toLowerCase();
      if (ALIASES[k]) return ALIASES[k];
      const hit = CANON.find(p => p.toLowerCase() === k);
      return hit || t;
    }
    function positionMenu(){
      const r = input.getBoundingClientRect();
      menu.style.left  = `${r.left + window.scrollX}px`;
      menu.style.top   = `${r.bottom + window.scrollY + 6}px`;
      menu.style.width = `${r.width}px`;
    }
    function hide(){ menu.style.display = 'none'; active = -1; }
    function show(){ positionMenu(); menu.style.display = 'block'; }

    function render(list){
      if (!list.length){
        menu.innerHTML = `<div class="combo-empty">Tidak ada hasil</div>`;
        return;
      }
      menu.innerHTML = list.map((txt,i)=>
        `<div class="combo-item${i===active?' active':''}" data-i="${i}">${txt}</div>`
      ).join('');
      menu.querySelectorAll('.combo-item').forEach(el=>{
        el.addEventListener('mousedown', (e)=>{
          const i = +el.dataset.i; choose(list[i]); e.preventDefault();
        });
      });
    }
    function filter(q){
      const term = (q||'').trim().toLowerCase();
      items = term ? CANON.filter(n => n.toLowerCase().includes(term)).slice(0,8)
                   : CANON.slice(0,8);
      active = -1; render(items);
      if (items.length) show(); else hide();
    }
    function choose(value){
      input.value = value;
      durationSel.value = "30";
      durationSel.dispatchEvent(new Event('change'));
      input.dispatchEvent(new Event('change'));
      hide();
    }

    input.addEventListener('input',  ()=>filter(input.value));
    input.addEventListener('focus',  ()=>filter(input.value));
    input.addEventListener('blur',   ()=>setTimeout(hide,120));

    input.addEventListener('keydown', (e)=>{
      if (menu.style.display === 'none') return;
      if (e.key === 'ArrowDown'){ active = Math.min(active+1, items.length-1); render(items); e.preventDefault(); }
      else if (e.key === 'ArrowUp'){ active = Math.max(active-1, 0); render(items); e.preventDefault(); }
      else if (e.key === 'Enter'){ if (active>=0) { choose(items[active]); e.preventDefault(); } }
      else if (e.key === 'Escape'){ hide(); }
    });
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);

    function applyPreset(){
      const canon = toCanonical(input.value);
      const matched = CANON.some(p => p.toLowerCase() === canon.toLowerCase());
      if (matched) {
        input.value = CANON.find(p => p.toLowerCase() === canon.toLowerCase());
        durationSel.value = "30";
        durationSel.dispatchEvent(new Event('change'));
      }
    }
    input.addEventListener('change', applyPreset);
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
    const gross    = roundTo(grossRaw, step);   // pembulatan dulu
    const net      = roundTo(gross * coef, 1);  // lalu koefisien

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

  // ---------- Copy Struk (multi-style) ----------
  (function initCopyStruk(){
    const btn = $("copyStrukBtn");
    if (!btn) return;

    const txt = id => (document.getElementById(id)?.textContent || "").trim();
    const val = id => (document.getElementById(id)?.value || "").trim();

    // Pilih: 'final_super' | 'final' | 'final_with_product' | 'kartu' | 'detail' | 'detail_no_gross'
    const STYLE = 'detail_no_gross';

    function getStepLabel() {
      const v = (roundSel?.value || '1');
      return v === '1000' ? 'Ke 1.000' : v === '100' ? 'Ke 100' : 'Ke 1';
    }

    function buildStruk(style=STYLE){
      const buyer   = val('custPhone') || '-';
      const tipe    = val('buyerType') || '-';
      const produk  = (val('productName') || '-').trim();
      const akun    = val('accountName') || '-';
      const durasi  = val('duration') || '-';
      const tBeli   = val('buyDate') || '-';
      const tKlaim  = val('claimDate') || '-';

      const statusOpt   = $("claimStatus")?.selectedOptions?.[0];
      const statusLabel = statusOpt?.dataset?.label || statusOpt?.textContent || '-';

      const gross = txt('gross') || 'Rp 0';
      const net   = txt('net')   || 'Rp 0';

      const stepLabel = getStepLabel();
      const hargaRaw  = $("price")?.dataset?.raw ?? val('price');
      const hargaFmt  = 'Rp ' + nf.format(parseInt(String(hargaRaw||'').replace(/[^0-9]/g,''))||0);

      const usedTxt  = (usedDays?.textContent || '0 hari').trim();
      const leftTxt  = (leftDays?.textContent || '0 hari').trim();

      const now = new Date();
      const ts  = now.toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' });

      if (style === 'final_super') {
        return `💎 *REFUND BERSIH: ${net}*`;
      }
      if (style === 'final') {
        return `🧾 *STRUK REFUND — SAISOKU.ID*\n\n💎 *${net}*`;
      }
      if (style === 'final_with_product') {
        return `🧾 *STRUK REFUND — SAISOKU.ID*\n🎬 ${produk}\n\n💎 *${net}*`;
      }
      if (style === 'kartu') {
        return (
`🧾 *STRUK REFUND SAISOKU.ID*
════════════════════════

🎬 *${produk}*
💎 *${net}*

📱 ${buyer} • ${tipe}
⏱️ ${durasi} Hari • ${statusLabel}

════════════════════════
© ${now.getFullYear()} SAISOKU.ID • ${ts}`
        );
      }
      if (style === 'detail') {
        return (
`🧾 *STRUK REFUND SAISOKU.ID*
──────────

📱 Buyer     : ${buyer}
👤 Tipe      : ${tipe}
🎬 Produk    : ${produk}
🔑 Akun      : ${akun}

📅 Beli/Klaim: ${tBeli} → ${tKlaim}
⏱️ Durasi    : ${durasi} hari
📊 Pemakaian : Terpakai ${usedTxt} • Sisa ${leftTxt}

🏷️ Harga     : ${hargaFmt}
🔧 Pembulatan: ${stepLabel}
🧩 Status    : ${statusLabel}

──────────
💰 Refund Dana : ${gross}
💎 *Refund Bersih: ${net}*
──────────

Terima kasih telah menggunakan layanan SAISOKU.ID 🙏
© ${now.getFullYear()} SAISOKU.ID • ${ts}`
        );
      }
      // default: 'detail_no_gross'
      return (
`🧾 *STRUK REFUND SAISOKU.ID*
──────────

📱 Buyer     : ${buyer}
👤 Tipe      : ${tipe}
🎬 Produk    : ${produk}
🔑 Akun      : ${akun}

📅 Beli/Klaim: ${tBeli} → ${tKlaim}
⏱️ Durasi    : ${durasi} hari
📊 Pemakaian : Terpakai ${usedTxt} • Sisa ${leftTxt}

🏷️ Harga     : ${hargaFmt}
🔧 Pembulatan: ${stepLabel}
🧩 Status    : ${statusLabel}

──────────
💎 *Refund Bersih: ${net}*
──────────

Terima kasih telah menggunakan layanan SAISOKU.ID 🙏
© ${now.getFullYear()} SAISOKU.ID • ${ts}`
      );
    }

    // Fallback untuk environment tanpa Clipboard API
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
      const struk = buildStruk();
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
