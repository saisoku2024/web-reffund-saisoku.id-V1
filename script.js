// Saisoku Refund Calculator — PWA + Debounce + TZ Guard + Masking + Safe Share
document.addEventListener("DOMContentLoaded", () => {
  const nf = new Intl.NumberFormat("id-ID");
  const $  = id => document.getElementById(id);

  // Inputs
  const priceInput  = $("price");
  const buyDate     = $("buyDate");
  const claimDate   = $("claimDate");
  const durationSel = $("duration");
  const roundSel    = $("round");
  const claimStatus = $("claimStatus");
  const maskPII     = $("maskPII");

  // Outputs
  const durDays  = $("durDays");
  const usedDays = $("usedDays");
  const leftDays = $("remainDays");
  const grossEl  = $("gross");
  const netEl    = $("net");
  const msgEl    = $("msg");
  const copyBtn  = $("copyStrukBtn");
  const shareBtn = $("shareLinkBtn");
  const resetBtn = $("resetBtn");
  const yearEl   = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Utilities =====
  const num = v => parseInt(String(v||"").replace(/[^0-9]/g,""),10)||0;
  const roundTo = (x, step=1) => (step<=1 ? Math.round(x) : Math.round(x/step)*step);

  // TZ guard: parse "yyyy-mm-dd" → UTC midnight → hitung selisih hari inklusif
  function parseYMDToUTC(dateStr){
    if (!dateStr) return null;
    const [y,m,d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, (m||1)-1, d||1, 0,0,0)); // 00:00:00Z
  }
  function daysBetweenInclusive(a,b){
    const d1 = parseYMDToUTC(a), d2 = parseYMDToUTC(b);
    if (!d1 || !d2) return 0;
    const diff = (d2 - d1) / 86400000;
    return Math.floor(diff) + 1; // inklusif
  }

  // Debounce helper
  function debounce(fn, wait=150){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
  }

  // ===== Product searchable + preset 30 =====
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
      "capcut pro":"CapCut Pro","geminiai":"Gemini AI","hbo max":"HBO Max","iqiyi":"iQIYI",
      "netlfix premium":"Netflix Premium","youtube premium":"YouTube Premium","wetv vip":"WeTV VIP",
      "prime video":"Prime Video","disney+":"Disney+","viu premium":"Viu Premium","vidio":"Vidio",
      "spotify premium":"Spotify Premium","chatgpt":"ChatGPT","zoom pro":"Zoom Pro","canva":"Canva"
    };
    const CANON = Array.from(new Set(PRODUCTS))
      .sort((a,b)=> a.localeCompare(b,'id',{sensitivity:'base'}));

    dl.innerHTML = CANON.map(n=>`<option value="${n}"></option>`).join('');

    // custom combobox (ringkas)
    const menu = document.createElement('div');
    menu.className = 'combo-list'; document.body.appendChild(menu);
    let items = [], active = -1;

    function positionMenu(){
      const r = input.getBoundingClientRect();
      menu.style.left = `${r.left + scrollX}px`;
      menu.style.top  = `${r.bottom + scrollY + 6}px`;
      menu.style.width= `${r.width}px`;
    }
    function render(list){
      menu.innerHTML = list.length
        ? list.map((t,i)=>`<div class="combo-item${i===active?' active':''}" data-i="${i}">${t}</div>`).join('')
        : `<div class="combo-empty">Tidak ada hasil</div>`;
      menu.querySelectorAll('.combo-item').forEach(el=>{
        el.addEventListener('mousedown', e=>{
          choose(list[+el.dataset.i]); e.preventDefault();
        });
      });
    }
    function filter(q){
      const term = (q||"").toLowerCase().trim();
      items = term ? CANON.filter(n=>n.toLowerCase().includes(term)).slice(0,8) : CANON.slice(0,8);
      active=-1; render(items); if(items.length){positionMenu();menu.style.display='block'} else menu.style.display='none';
    }
    function choose(val){
      input.value = val; durationSel.value = "30";
      durationSel.dispatchEvent(new Event('change')); input.dispatchEvent(new Event('change'));
      menu.style.display='none';
    }
    input.addEventListener('input', ()=>filter(input.value));
    input.addEventListener('focus', ()=>filter(input.value));
    input.addEventListener('blur', ()=>setTimeout(()=>menu.style.display='none',120));
    input.addEventListener('keydown', e=>{
      if(menu.style.display==='none') return;
      if(e.key==='ArrowDown'){active=Math.min(active+1,items.length-1);render(items);e.preventDefault();}
      else if(e.key==='ArrowUp'){active=Math.max(active-1,0);render(items);e.preventDefault();}
      else if(e.key==='Enter'){ if(active>=0){choose(items[active]); e.preventDefault();} }
      else if(e.key==='Escape'){ menu.style.display='none'; }
    });
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);

    function toCanonical(raw){
      const k=(raw||'').trim().toLowerCase(); return ALIASES[k] || CANON.find(p=>p.toLowerCase()===k) || raw;
    }
    input.addEventListener('change', ()=>{
      const canon = toCanonical(input.value);
      const match = CANON.some(p=>p.toLowerCase()===String(canon).toLowerCase());
      if (match) { input.value = CANON.find(p=>p.toLowerCase()===String(canon).toLowerCase()); durationSel.value="30"; }
    });
  })();

  // ===== Formatter Rupiah saat ketik =====
  priceInput?.addEventListener("input", () => {
    const raw = priceInput.value.replace(/[^0-9]/g,"");
    priceInput.dataset.raw = raw;
    priceInput.value = raw ? nf.format(+raw) : "";
    debouncedCalc();
  });

  // ===== Validasi & sync tanggal =====
  if (buyDate && claimDate) {
    const syncMin = () => { if (buyDate.value) claimDate.min = buyDate.value; };
    buyDate.addEventListener("change", syncMin); syncMin();
  }

  // ===== Kalkulasi (debounced) =====
  function calc(){
    const price = num(priceInput?.dataset?.raw ?? priceInput?.value);
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
    if (parseYMDToUTC(issue) < parseYMDToUTC(start)) {
      msgEl && (msgEl.className="msg error", msgEl.textContent = "Tanggal klaim tidak boleh sebelum tanggal beli.");
      grossEl && (grossEl.textContent = "Rp 0");
      netEl   && (netEl.textContent   = "Rp 0");
      copyBtn && (copyBtn.disabled = true);
      return;
    }

    let used = Math.max(0, daysBetweenInclusive(start, issue));
    used = Math.min(used, dur);
    const left = Math.max(0, dur - used);

    durDays.textContent  = `${dur} hari`;
    usedDays.textContent = `${used} hari`;
    leftDays.textContent = `${left} hari`;

    const gross = roundTo(Math.max(0, (left/dur) * price), step);  // bulatkan dulu
    const net   = roundTo(gross * coef, 1);                        // baru koefisien

    grossEl.textContent = "Rp " + nf.format(gross);
    netEl.textContent   = "Rp " + nf.format(net);
    msgEl.className="msg success"; msgEl.textContent = "Perhitungan berhasil ✅";
    copyBtn.disabled = false;
  }
  const debouncedCalc = debounce(calc, 150);

  [buyDate, claimDate, durationSel, roundSel, claimStatus]
    .filter(Boolean).forEach(el=>{
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', debouncedCalc);
    });

  // ===== Copy Struk (masking PII: 4 depan + 'xxxx' + 4 belakang) =====
  (function initCopy(){
    const btn = $("copyStrukBtn"); if(!btn) return;
    const val = id => (document.getElementById(id)?.value || "").trim();
    const txt = id => (document.getElementById(id)?.textContent || "").trim();

    const STYLE = 'detail_no_gross'; // default

    // >>>> Masking nomor sesuai request: 4 depan + 'xxxx' + 4 belakang (fallback untuk nomor pendek)
    function maskPhoneStrict(phone) {
      const s = String(phone).replace(/\D/g,'');
      if (!s) return '-';
      if (s.length <= 8) {
        const head = s.slice(0, Math.min(2, s.length));
        const tail = s.slice(-2);
        return head + 'xxxx' + tail;
      }
      return s.slice(0,4) + 'xxxx' + s.slice(-4);
    }

    const maskEmail = e => {
      const m = String(e).split("@"); if(m.length!==2) return e || '-';
      const user=m[0], dom=m[1];
      const vis = user.slice(0, Math.min(2, user.length));
      return `${vis}${"*".repeat(Math.max(1, user.length - vis.length))}@${dom}`;
    };

    function getStepLabel(){
      const v = roundSel?.value || '1';
      return v==='1000' ? 'Ke 1.000' : v==='100' ? 'Ke 100' : 'Ke 1';
    }

    function buildStruk(){
      const buyer0 = val('custPhone') || '-';
      const akun0  = val('accountName') || '-';
      const buyer  = maskPII?.checked ? maskPhoneStrict(buyer0) : buyer0;
      const akun   = maskPII?.checked ? maskEmail(akun0)        : akun0;

      const tipe   = val('buyerType') || '-';
      const produk = val('productName') || '-';
      const durasi = val('duration') || '-';
      const tBeli  = val('buyDate') || '-';
      const tKlaim = val('claimDate') || '-';

      const statusOpt = claimStatus?.selectedOptions?.[0];
      const statusLbl = statusOpt?.dataset?.label || statusOpt?.textContent || '-';

      const stepLbl = getStepLabel();
      const hargaRaw = priceInput?.dataset?.raw ?? val('price');
      const hargaFmt = 'Rp ' + nf.format(num(hargaRaw));
      const usedTxt  = usedDays?.textContent || '0 hari';
      const leftTxt  = leftDays?.textContent || '0 hari';

      const net = txt('net') || 'Rp 0';
      const now = new Date();
      const ts  = now.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});

      if (STYLE === 'detail_no_gross') {
        return (
`🧾 *STRUK REFUND SAISOKU.ID*
──────────
📱 Buyer     : ${buyer}
👤 Tipe      : ${tipe}
🎬 Produk    : ${produk}
🔑 Akun      : ${akun}
──────────
📅 Beli/Klaim: ${tBeli} → ${tKlaim}
⏱️ Durasi    : ${durasi} hari
📊 Pemakaian : Terpakai ${usedTxt} • Sisa ${leftTxt}
──────────
🏷️ Harga     : ${hargaFmt}
🔧 Pembulatan: ${stepLbl}
🧩 Status    : ${statusLbl}
──────────
💎 *Refund Bersih: ${net}*
──────────

Terima kasih telah menggunakan layanan SAISOKU.ID 🙏
© ${now.getFullYear()} SAISOKU.ID • ${ts}`
        );
      }
      // fallback ringkas
      return `🧾 *STRUK REFUND — SAISOKU.ID*\n\n💎 *${net}*`;
    }

    function copyFallback(text){
      const ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly','');
      ta.style.position='fixed'; ta.style.top='-9999px'; document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, 99999);
      const ok=document.execCommand('copy'); document.body.removeChild(ta); return ok;
    }

    btn.addEventListener('click', ()=>{
      const struk = buildStruk();
      const modern = !!(navigator.clipboard && isSecureContext);
      (modern ? navigator.clipboard.writeText(struk) : Promise.resolve(copyFallback(struk)))
        .then(()=>alert('✅ Struk berhasil disalin'))
        .catch(()=>{ copyFallback(struk) ? alert('✅ Struk disalin (fallback)') : alert('❌ Gagal menyalin struk.'); });
    });
  })();

  // ===== Share link aman (tanpa PII) =====
  shareBtn?.addEventListener('click', ()=>{
    // simpan HANYA non-PII
    const state = {
      productName: $("productName")?.value || "",
      buyDate: buyDate?.value || "",
      claimDate: claimDate?.value || "",
      priceRaw: priceInput?.dataset?.raw || "",
      duration: durationSel?.value || "",
      round: roundSel?.value || "",
      claimStatus: claimStatus?.value || ""
    };
    const key = 'sks_' + Math.random().toString(36).slice(2,10);
    try {
      localStorage.setItem(key, JSON.stringify(state));
      const url = new URL(location.href);
      url.searchParams.set('s', key);
      navigator.clipboard?.writeText(url.toString());
      alert('🔗 Link (tanpa data pribadi) disalin ke clipboard');
    } catch {
      alert('❌ Gagal membuat link.');
    }
  });

  // Load state jika ada ?s= (hanya non-PII)
  (function loadShared(){
    const key = new URL(location.href).searchParams.get('s');
    if (!key) return;
    try{
      const raw = localStorage.getItem(key); if(!raw) return;
      const d = JSON.parse(raw);
      if ($("productName")) $("productName").value = d.productName || "";
      if (buyDate)   buyDate.value   = d.buyDate   || "";
      if (claimDate) claimDate.value = d.claimDate || "";
      if (priceInput){ priceInput.dataset.raw = d.priceRaw || ""; priceInput.value = d.priceRaw ? nf.format(+d.priceRaw) : ""; }
      if (durationSel) durationSel.value = d.duration || "";
      if (roundSel)    roundSel.value    = d.round    || "";
      if (claimStatus) claimStatus.value = d.claimStatus || "";
    }catch{}
  })();

  // Reset
  resetBtn?.addEventListener('click', ()=>{
    document.querySelectorAll("input, select").forEach(el=>{
      if (el.id==='price'){ el.value=""; el.dataset.raw=""; }
      else if (el.tagName==='SELECT') el.selectedIndex=0;
      else el.value="";
    });
    durDays.textContent = usedDays.textContent = leftDays.textContent = "0 hari";
    grossEl.textContent = netEl.textContent = "Rp 0";
    msgEl.textContent=""; msgEl.className="msg";
    copyBtn.disabled = true;
  });

  // First calc
  calc();
});
