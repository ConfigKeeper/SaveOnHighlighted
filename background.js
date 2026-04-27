const SESSION_KEY = "sessionEntries";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSessionArray();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-selection") {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? ""
    });

    const normalized = normalizeSelection(result);
    if (!normalized) {
      return;
    }

    await appendEntry(normalized);
  } catch (error) {
    console.error("Failed to save selection:", error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    try {
      switch (message?.type) {
        case "get-entries": {
          const entries = await getEntries();
          sendResponse({ ok: true, entries });
          break;
        }
        case "clear-entries": {
          await chrome.storage.local.set({ [SESSION_KEY]: [] });
          sendResponse({ ok: true });
          break;
        }
        case "set-entries": {
          const entries = normalizeEntries(message?.entries);
          await chrome.storage.local.set({ [SESSION_KEY]: entries });
          sendResponse({ ok: true, count: entries.length });
          break;
        }
        case "finish-session": {
          const entries = await getEntries();
          if (entries.length === 0) {
            sendResponse({ ok: false, reason: "empty" });
            return;
          }

          const filename = buildFilename();
          const fileBody = `${entries.join("\n")}\n`;
          await downloadTextFile(filename, fileBody);
          sendResponse({ ok: true, filename, count: entries.length });
          break;
        }
        default:
          sendResponse({ ok: false, reason: "unknown_message" });
      }
    } catch (error) {
      console.error("Background message handler error:", error);
      sendResponse({ ok: false, reason: "download_failed", message: String(error) });
    }
  })();

  return true;
});

async function ensureSessionArray() {
  const data = await chrome.storage.local.get(SESSION_KEY);
  if (!Array.isArray(data[SESSION_KEY])) {
    await chrome.storage.local.set({ [SESSION_KEY]: [] });
  }
}

async function getEntries() {
  await ensureSessionArray();
  const data = await chrome.storage.local.get(SESSION_KEY);
  return Array.isArray(data[SESSION_KEY]) ? data[SESSION_KEY] : [];
}

async function appendEntry(value) {
  const entries = await getEntries();
  entries.push(value);
  await chrome.storage.local.set({ [SESSION_KEY]: entries });
}

function normalizeEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .map((item) => normalizeSelection(item))
    .filter((item) => Boolean(item));
}

function normalizeSelection(rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  const cleaned = rawValue.replace(/\s+/g, " ").trim();
  return cleaned;
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

async function downloadTextFile(filename, body) {
  const url = `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;
  await new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: true
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}
