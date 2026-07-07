const apiBaseInput = document.getElementById("apiBase");
const authTokenInput = document.getElementById("authToken");
const queueIdInput = document.getElementById("queueId");
const saveBtn = document.getElementById("saveBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");

const setStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
};

const getSettingsFromForm = () => ({
  apiBase: apiBaseInput.value.trim().replace(/\/+$/, ""),
  authToken: authTokenInput.value.trim(),
  queueId: queueIdInput.value.trim(),
});

const saveSettings = async () => {
  const settings = getSettingsFromForm();
  await chrome.storage.local.set({ hirelensSettings: settings });
  return settings;
};

const loadSettings = async () => {
  const { hirelensSettings } = await chrome.storage.local.get("hirelensSettings");
  const settings = {
    apiBase: "http://localhost:5000",
    authToken: "",
    queueId: "",
    ...(hirelensSettings ?? {}),
  };

  apiBaseInput.value = settings.apiBase;
  authTokenInput.value = settings.authToken;
  queueIdInput.value = settings.queueId;
};

saveBtn.addEventListener("click", async () => {
  await saveSettings();
  setStatus("Settings saved.", "ok");
});

continueBtn.addEventListener("click", async () => {
  const settings = await saveSettings();

  if (!settings.apiBase || !settings.authToken || !settings.queueId) {
    setStatus("API base, auth token, and queue ID are required.", "error");
    return;
  }

  setStatus("Opening next LinkedIn search...");

  chrome.runtime.sendMessage({ type: "HIRELENS_CONTINUE_QUEUE" }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, "error");
      return;
    }

    if (!response?.ok) {
      setStatus(response?.error ?? "Could not continue queue.", "error");
      return;
    }

    setStatus(response.done ? "Queue complete." : "Next task opened.", "ok");
  });
});

loadSettings();
