// ------------------ Config and data ------------------
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });

const products = {
  "1334566": { name: "Blazing Canes", price: 35000 },
  "1434565": { name: "Tangkuban Captures", price: 13000 },
  "1534564": { name: "Choco Eruption", price: 14000 },
  "1634563": { name: "Reversible Waves Tote", price: 45000 },
  "1734562": { name: "Mango Breeze", price: 12000 },
  "1834561": { name: "Sumbi's Accesories", price: 8000 },
  "1934560": { name: "Kue Lekker", price: 3000 },
  "2034559": { name: "Mountain Parfait", price: 22000 },
  "2134558": { name: "Keychain Plush Aruna", price: 15000 },
  "2234557": { name: "Keychain Plush Aruno", price: 15000 },
  "2334556": { name: "Legenda Nusa Keychain 1", price: 18000 },
  "2434555": { name: "Legenda Nusa Keychain 2", price: 18000 },
  "2534554": { name: "Seafoam Ocean Slime", price: 15000 },
};

let cart = {};
let scannerRunning = false;
let lastScan = 0; // cooldown tracker

// ------------------ Helpers ------------------
function successGlow() {
  const camera = document.querySelector(".camera");
  if (!camera) {
    console.warn("Camera element not found");
    return;
  }

  camera.classList.remove("scan-success");
  void camera.offsetWidth;
  camera.classList.add("scan-success");

  setTimeout(() => {
    camera.classList.remove("scan-success");
  }, 800);
}


function fmt(n) { return currency.format(n); }
function cartTotal() { return Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0); }
function nowIso() {
  const d = new Date();
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false
  });
}

// ------------------ Cart operations ------------------
function addProductByBarcode(barcode) {
  const item = products[barcode];
  if (!item) {
    flashWarning("Product not found: " + barcode);
    return;
  }

  if (!cart[barcode]) {
    cart[barcode] = { name: item.name, price: item.price, quantity: 0 };
  }

  cart[barcode].quantity += 1;
  updateCartUI();

  successGlow();
}

function removeOne(barcode) { if (!cart[barcode]) return; cart[barcode].quantity -= 1; if (cart[barcode].quantity <= 0) delete cart[barcode]; updateCartUI(); }
function deleteItem(barcode) { if (!cart[barcode]) return; delete cart[barcode]; updateCartUI(); }
function clearCart() { cart = {}; updateCartUI(); clearPaymentUI(); clearReceiptUI(); }
function updateCartUI() {
  const body = document.getElementById("cartBody"); body.innerHTML = "";
  Object.entries(cart).forEach(([barcode, item]) => {
    const row = document.createElement("tr");
    const itemTotal = item.price * item.quantity;
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${fmt(item.price)}</td>
      <td>${fmt(itemTotal)}</td>
      <td>
        <button class="secondary" onclick="removeOne('${barcode}')">-1</button>
        <button class="secondary" onclick="addProductByBarcode('${barcode}')">+1</button>
        <button class="secondary" onclick="deleteItem('${barcode}')">Remove</button>
      </td>`;
    body.appendChild(row);
  });
  document.getElementById("totalDisplay").textContent = fmt(cartTotal());
}
function flashWarning(msg) { const w = document.getElementById("paymentWarning"); w.textContent = msg; setTimeout(() => (w.textContent = ""), 2000); }

// ------------------ Payment & receipt ------------------
function handlePay() {
  const cashInput = document.getElementById("cashInput");
  const cash = parseInt(cashInput.value || "0", 10);
  const total = cartTotal();
  document.getElementById("cashGivenDisplay").textContent = fmt(cash);
  if (total <= 0) { flashWarning("Cart is empty."); return; }
  if (isNaN(cash) || cash < total) { document.getElementById("changeDisplay").textContent = fmt(0); flashWarning("Cash is less than the total fee!"); return; }
  const change = cash - total;
  document.getElementById("changeDisplay").textContent = fmt(change);
  renderReceipt(cash, change);
}
function renderReceipt(cash, change) {
  const total = cartTotal();
  const receiptDiv = document.getElementById("receipt");
  const lines = Object.values(cart).map(i => `<div>${i.name} x${i.quantity} @ ${fmt(i.price)} = <strong>${fmt(i.price * i.quantity)}</strong></div>`);
  receiptDiv.innerHTML = `
    <div><strong>Time:</strong> ${nowIso()}</div>
    ${lines.join("")}
    <hr />
    <div><strong>Subtotal:</strong> ${fmt(total)}</div>
    <div><strong>Cash:</strong> ${fmt(cash)}</div>
    <div><strong>Change:</strong> ${fmt(change)}</div>`;
}
function completeSale() {
  const total = cartTotal();
  const cashTxt = document.getElementById("cashGivenDisplay").textContent;
  const changeTxt = document.getElementById("changeDisplay").textContent;
  if (total <= 0) { flashWarning("Add items before completing the sale."); return; }
  if (cashTxt === "Rp 0" || changeTxt === "Rp 0") { flashWarning("Press Pay first."); return; }
  saveReceiptHistory(); clearCart();
}
function clearReceiptUI() { document.getElementById("receipt").innerHTML = ""; }
function clearPaymentUI() { document.getElementById("cashInput").value = ""; document.getElementById("cashGivenDisplay").textContent = fmt(0); document.getElementById("changeDisplay").textContent = fmt(0); }

// ------------------ History ------------------
function saveReceiptHistory() {
  const history = JSON.parse(localStorage.getItem("il_receipts") || "[]");
  const record = {
    id: Date.now(), time: nowIso(), items: cart, total: cartTotal(),
    cash: document.getElementById("cashGivenDisplay").textContent,
    change: document.getElementById("changeDisplay").textContent
  };
  history.push(record);
  localStorage.setItem("il_receipts", JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  const history = JSON.parse(localStorage.getItem("il_receipts") || "[]");
  const wrap = document.getElementById("historyList"); wrap.innerHTML = "";
  if (history.length === 0) { wrap.innerHTML = "<p>No receipts yet.</p>"; return; }
  history.slice().reverse().forEach(rec => {
    const div = document.createElement("div");
    const itemsHtml = Object.values(rec.items).map(i => `${i.name} x${i.quantity} = ${fmt(i.price * i.quantity)}`).join(" | ");
    div.innerHTML = `
      <p><strong>${rec.time}</strong></p>
      <p>${itemsHtml}</p>
      <p><strong>Total:</strong> ${fmt(rec.total)} — <strong>Cash:</strong> ${rec.cash} — <strong>Change:</strong> ${rec.change}</p>
      <hr />`;
    wrap.appendChild(div);
  });
}
function clearHistory() { localStorage.removeItem("il_receipts"); renderHistory(); }

// ------------------ CSV export ------------------
function exportCurrentReceiptCsv() {
  const total = cartTotal();
  if (total <= 0) { flashWarning("No items to export."); return; }
  const cash = document.getElementById("cashGivenDisplay").textContent.replace(/[^\d]/g, "");
  const change = document.getElementById("changeDisplay").textContent.replace(/[^\d]/g, "");
  let csv = "Product,Quantity,Price,Line Total\n";
  Object.values(cart).forEach(i => { csv += `${i.name},${i.quantity},${i.price},${i.price * i.quantity}\n`; });
  csv += `Subtotal,, ,${total}\nCash,, ,${cash}\nChange,, ,${change}\nTime,, ,${nowIso()}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `IL_Receipt_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ------------------ Barcode scanner (Quagga) ------------------
function startScanner() {
  if (scannerRunning) return;
  Quagga.init({
    inputStream: {
      type: "LiveStream",
      target: document.querySelector("#camera"),
      constraints: { facingMode: "environment" }
    },
    locator: { patchSize: "medium", halfSample: true },
    numOfWorkers: navigator.hardwareConcurrency || 2,
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
    }
  }, function (err) {
    if (err) {
      console.error(err);
      flashWarning("Camera init failed. Check permissions.");
      return;
    }
    Quagga.start();
    scannerRunning = true;
    document.getElementById("toggleScannerBtn").textContent = "Stop scanner";

    // pasang onDetected DI SINI setelah start
    Quagga.onDetected(function (result) {
      const now = Date.now();
      if (now - lastScan < 1500) return;
      lastScan = now;

      const code = result?.codeResult?.code?.trim();
      if (!code) return;

      console.log("SCAN:", code);

      if (products[code]) {
        addProductByBarcode(code);
      } else {
        flashWarning("Product not found: " + code);
      }
    });


  });
}

function stopScanner() {
  if (!scannerRunning) return;
  Quagga.stop();
  scannerRunning = false;
  document.getElementById("toggleScannerBtn").textContent = "Start scanner";
}

// ------------------ Wiring UI ------------------
window.addEventListener("DOMContentLoaded", () => {
  // Manual add
  document.getElementById("addBtn").addEventListener("click", () => {
    const code = document.getElementById("barcodeInput").value.trim();
    if (code) addProductByBarcode(code);
    document.getElementById("barcodeInput").value = "";
  });

  // Toggle scanner
  document.getElementById("toggleScannerBtn").addEventListener("click", () => {
    if (scannerRunning) stopScanner();
    else startScanner();
  });

  // Other buttons
  document.getElementById("clearCartBtn").addEventListener("click", clearCart);
  document.getElementById("payBtn").addEventListener("click", handlePay);
  document.getElementById("completeSaleBtn").addEventListener("click", completeSale);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCurrentReceiptCsv);
  document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);

  renderHistory();
});