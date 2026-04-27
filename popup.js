const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const finishBtn = document.getElementById("finishBtn");
const clearBtn = document.getElementById("clearBtn");
const themeToggleEl = document.getElementById("themeToggle");
const THEME_KEY = "popupTheme";
let saveTimer = null;

void init();

async function init() {
  loadTheme();
  await refreshPreview();
  finishBtn.addEventListener("click", onFinishSession);
  clearBtn.addEventListener("click", onClearSession);
  previewEl.addEventListener("input", onPreviewInput);
  themeToggleEl.addEventListener("change", onThemeToggle);
}

async function onFinishSession() {
  setButtonsDisabled(true);
  setStatus("Exporting...");

  const response = await sendMessage({ type: "finish-session" });

  if (!response?.ok) {
    if (response?.reason === "empty") {
      setStatus("Session is empty. Save some words first.");
    } else if (response?.reason === "download_failed") {
      const entriesResponse = await sendMessage({ type: "get-entries" });
      const entries = entriesResponse?.entries ?? [];
      if (!entries.length) {
        setStatus("Export failed and session is empty.");
      } else {
        const filename = buildFilename();
        triggerPopupDownload(filename, `${entries.join("\n")}\n`);
        setStatus(`Fallback export used. Saved ${entries.length} entries.`);
      }
    } else {
      setStatus(`Export failed: ${response?.message ?? "unknown error"}`);
    }
    setButtonsDisabled(false);
    return;
  }

  setStatus(`Saved ${response.count} entries to ${response.filename}`);
  setButtonsDisabled(false);
}

async function onClearSession() {
  setButtonsDisabled(true);
  await sendMessage({ type: "clear-entries" });
  await refreshPreview();
  setStatus("Session cleared.");
  setButtonsDisabled(false);
}

async function refreshPreview() {
  setStatus("Loading current session...");
  const response = await sendMessage({ type: "get-entries" });
  const entries = response?.entries ?? [];
  previewEl.value = entries.join("\n");
  setStatus(`Entries in session: ${entries.length}`);
}

function onPreviewInput() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    const lines = previewEl.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const response = await sendMessage({ type: "set-entries", entries: lines });
    if (response?.ok) {
      setStatus(`Entries in session: ${response.count}`);
    } else {
      setStatus("Could not save changes.");
    }
  }, 300);
}

function onThemeToggle() {
  const theme = themeToggleEl.checked ? "dark" : "light";
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const theme = savedTheme === "dark" ? "dark" : "light";
  themeToggleEl.checked = theme === "dark";
  applyTheme(theme);
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setButtonsDisabled(disabled) {
  finishBtn.disabled = disabled;
  clearBtn.disabled = disabled;
}

function triggerPopupDownload(filename, body) {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildFilename() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate()),
    pad2(now.getHours()),
    pad2(now.getMinutes())
  ];
  return `study-${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}.txt`;
}

function pad2(value) {
  return value.toString().padStart(2, "0");
}

function sendMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      resolve(response);
    });
  });
}
