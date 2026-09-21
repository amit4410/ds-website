const API_URL = "https://ds-backend-xxxx.onrender.com";

// Immediately show something so we know the script ran
window.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  status.textContent = "Script loaded — checking backend...";

  checkHealth();
  loadHistory();
});

async function checkHealth() {
  const el = document.getElementById("status");
  try {
    // 5-second timeout so it never hangs forever
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const r = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);

    if (r.ok) {
      el.textContent = "✅ Backend online";
      el.style.color = "#4ade80";
    } else {
      el.textContent = `❌ Backend error: ${r.status}`;
      el.style.color = "#f87171";
    }
  } catch (e) {
    el.textContent = "❌ Backend offline: " + e.message;
    el.style.color = "#f87171";
  }
}

async function predict() {
  const raw = document.getElementById("features").value;
  const features = raw.split(",").map((x) => parseFloat(x.trim()));
  const box = document.getElementById("result");

  if (features.length !== 4 || features.some(isNaN)) {
    box.className = "result error";
    box.textContent = "❌ Please enter 4 valid numbers.";
    return;
  }

  box.className = "result";
  box.textContent = "Predicting...";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const r = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Prediction failed");

    box.className = "result";
    box.textContent = `✅ ${data.label} (confidence ${(data.confidence * 100).toFixed(1)}%)`;
    loadHistory();
  } catch (e) {
    box.className = "result error";
    box.textContent = "❌ " + (e.name === "AbortError" ? "Request timed out" : e.message);
  }
}

async function loadHistory() {
  try {
    const r = await fetch(`${API_URL}/history`);
    if (!r.ok) return;
    const rows = await r.json();
    document.getElementById("history").innerHTML = rows
      .map(
        (p) =>
          `<tr><td>${p.features}</td><td>${p.label}</td><td>${(p.confidence * 100).toFixed(1)}%</td></tr>`
      )
      .join("");
  } catch {
    // silent
  }
}
