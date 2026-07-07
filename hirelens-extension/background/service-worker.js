const SETTINGS_KEY = "hirelensSettings";
const ACTIVE_TASK_KEY = "hirelensActiveTask";

const getSettings = async () => {
  const { [SETTINGS_KEY]: settings } = await chrome.storage.local.get(SETTINGS_KEY);

  if (!settings?.apiBase || !settings?.authToken || !settings?.queueId) {
    throw new Error("Configure API base, auth token, and queue ID in the extension popup.");
  }

  return {
    ...settings,
    apiBase: settings.apiBase.replace(/\/+$/, ""),
  };
};

const apiRequest = async (path, options = {}) => {
  const settings = await getSettings();
  const response = await fetch(`${settings.apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.authToken}`,
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed with ${response.status}`);
  }

  return body.data;
};

const getActiveLinkedInTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return activeTab;
};

const openTaskInCurrentTab = async (task) => {
  const activeTab = await getActiveLinkedInTab();

  await chrome.storage.local.set({ [ACTIVE_TASK_KEY]: task });
  await apiRequest(`/api/outreach/discovery-queues/tasks/${task.id}/opened`, {
    method: "POST",
  });

  if (activeTab?.id) {
    await chrome.tabs.update(activeTab.id, { url: task.searchUrl });
    return;
  }

  await chrome.tabs.create({ url: task.searchUrl, active: true });
};

const continueQueue = async () => {
  const settings = await getSettings();
  const data = await apiRequest(
    `/api/outreach/discovery-queues/${settings.queueId}/next`
  );

  if (!data.task) {
    await chrome.storage.local.remove(ACTIVE_TASK_KEY);
    return { done: true, queue: data.queue };
  }

  await openTaskInCurrentTab(data.task);
  return { done: false, task: data.task, queue: data.queue };
};

const captureAndContinue = async (taskId, contacts) => {
  await apiRequest(`/api/outreach/discovery-queues/tasks/${taskId}/capture`, {
    method: "POST",
    body: JSON.stringify({ contacts }),
  });

  return continueQueue();
};

const skipAndContinue = async (taskId) => {
  await apiRequest(`/api/outreach/discovery-queues/tasks/${taskId}/skip`, {
    method: "POST",
  });

  return continueQueue();
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    if (message.type === "HIRELENS_GET_ACTIVE_TASK") {
      const { [ACTIVE_TASK_KEY]: task } = await chrome.storage.local.get(ACTIVE_TASK_KEY);
      return { task: task ?? null };
    }

    if (message.type === "HIRELENS_CONTINUE_QUEUE") {
      return continueQueue();
    }

    if (message.type === "HIRELENS_CAPTURE_AND_NEXT") {
      return captureAndContinue(message.taskId, message.contacts ?? []);
    }

    if (message.type === "HIRELENS_SKIP_AND_NEXT") {
      return skipAndContinue(message.taskId);
    }

    throw new Error("Unknown HireLens extension message.");
  };

  run()
    .then((data) => sendResponse({ ok: true, ...data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
