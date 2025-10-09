// === Saisoku Refund Calculator v3.0 ===
// Neon Precision Edition by SIVA

document.addEventListener("DOMContentLoaded", () => {
  const priceInput = document.getElementById("price");
  const buyDate = document.getElementById("buyDate");
  const claimDate = document.getElementById("claimDate");
  const duration = document.getElementById("duration");
  const claimStatus = document.getElementById("claimStatus");

  const durDays = document.getElementById("durDays");
  const usedDays = document.getElementById("usedDays");
  const remainDays = document.getElementById("remainDays");

  const grossEl = document.getElementById("gross");
  const netEl = document.getElementById("net");
  const msgEl = document.getElementById("msg");

  const copyBtn = document.getElementById("copyStrukBtn");
  const resetBtn = document.getElementById("resetBtn");
  const yearEl = document.getElementById("year");

  yearEl.textContent = new Date().getFullYear();

  // === Kalkulasi Refund ===
  function calcRefund() {
    const price = parseFloat(priceInput.value) || 0;
    const dur = parseInt(duration.value) || 0;
    const claimCoef = parseFloat(claimStatus.value) || 0;

    const d1 = new Date(buyDate.value);
    const d2 = new Date(claimDate.value);
    if (!buyDate.value || !claimDate.value || !dur || !price || !claimCoef) {
      msgEl.textContent = "Lengkapi semua data untuk hitung refund.";
      grossEl.textContent = "Rp 0";
      netEl.textContent = "Rp 0";
      return;
    }

    // Hitung selisih hari pemakaian
    const diffDays = Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
    const remain = Math.max(0, dur - diffDays);

    usedDays.textContent = diffDays + " hari";
    remainDays.textContent = remain + " hari";
    durDays.textContent = dur + " hari";

    const prorata = remain / dur;
    const gross = Math.round(price * prorata);
    const net = Math.round(gross * claimCoef);

    grossEl.textContent = "Rp " + gross.toLocaleString("id-ID");
    netEl.textContent = "Rp " + net.toLocaleString("id-ID");
    msgEl.textContent = "Perhitungan berhasil ✅";
  }

  [priceInput, buyDate, claimDate, duration, claimStatus].forEach(el => {
    el.addEventListener("input", calcRefund);
    el.addEventListener("change", calcRefund);
  });

  // === Copy Struk ===
  copyBtn.addEventListener("click", () => {
    const nama = document.getElementById("custPhone").value || "-";
    const tipe = document.getElementById("buyerType").value || "-";
    const produk = document.getElementById("productName").value || "-";
    const akun = document.getElementById("accountName").value || "-";
    const dur = duration.value || "-";
    const label = claimStatus.selectedOptions[0]?.dataset.label || "-";
    const gross = grossEl.textContent;
    const net = netEl.textContent;

    const text = `🧾 *STRUK REFUND SAISOKU.ID*\n\n📱 Buyer: ${nama}\n👤 Tipe: ${tipe}\n🎬 Produk: ${produk}\n🔑 Akun: ${akun}\n⏱️ Durasi: ${dur} Hari\n📆 Status: ${label}\n💰 Refund Awal: ${gross}\n💎 Refund Bersih: ${net}\n\nTerima kasih telah menggunakan layanan SAISOKU.ID 🙏`;

    navigator.clipboard.writeText(text)
      .then(() => alert("✅ Struk berhasil disalin ke clipboard!"))
      .catch(() => alert("❌ Gagal menyalin struk."));
  });

  // === Reset Form ===
  resetBtn.addEventListener("click", () => {
    document.querySelectorAll("input, select").forEach(el => el.value = "");
    [durDays, usedDays, remainDays].forEach(el => el.textContent = "0 hari");
    [grossEl, netEl].forEach(el => el.textContent = "Rp 0");
    msgEl.textContent = "Form telah direset.";
  });
});
