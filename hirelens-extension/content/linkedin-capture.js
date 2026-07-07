const PANEL_ID = "hirelens-discovery-panel";

const sendMessage = (message) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error ?? "HireLens extension request failed."));
        return;
      }

      resolve(response);
    });
  });

const cleanText = (value) => value?.replace(/\s+/g, " ").trim() ?? "";

const isVisible = (element) => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
};

const stripLinkedInUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].replace(/\/+$/, "");
  }
};

const inferRoleFromCardText = (card, name) => {
  if (!card) return "";
  const nameStart = name.toLowerCase().split(" ")[0];
  const blocked = /^(connect|follow|message|view profile|premium|promoted|people|save)$/i;
  const lines = (card.innerText || card.textContent || "")
    .split(/\n/)
    .map(cleanText)
    .filter(Boolean)
    .filter((line) => !blocked.test(line))
    .filter((line) => !line.toLowerCase().startsWith(nameStart))
    .filter((line) => !line.match(/^(?:1st|2nd|3rd\+?|•\s*1st|•\s*2nd|•\s*3rd\+?)$/i));

  return (
    lines.find((line) =>
      /(?:engineer|recruiter|talent|manager|lead|developer|founder|hr|people|technical)/i.test(line)
    ) ||
    lines.find((line) => line.length > 8) ||
    ""
  );
};

const extractVisibleContacts = () => {
  const profileLinks = Array.from(document.querySelectorAll("a"))
    .filter(a => a.href.includes('/in/') && !a.href.includes('/in/linkedin'))
    .filter(a => !a.closest(`#${PANEL_ID}`));

  const contactsMap = new Map();

  profileLinks.forEach(a => {
    const linkedinUrl = stripLinkedInUrl(a.href);
    if (!linkedinUrl) return;

    let name = cleanText(a.textContent)
       .replace(/View (.*?)'s profile/i, '$1')
       .replace(/\s*View profile\s*/i, "")
       .replace(/\s*(?:1st|2nd|3rd\+?)\s*(?:degree connection)?/i, "")
       .trim();
       
    if (name.length > 60 || name.length === 0) name = "";

    if (!name) {
       const match = linkedinUrl.match(/in\/([^\/]+)/);
       if (match) {
          name = match[1].replace(/-/g, ' ').replace(/[0-9]+/g, '').trim();
       }
    }

    if (!contactsMap.has(linkedinUrl)) {
       contactsMap.set(linkedinUrl, { name, role: null, linkedinUrl, _element: a });
    } else {
       const existing = contactsMap.get(linkedinUrl);
       let fallbackName = "";
       const m = linkedinUrl.match(/in\/([^\/]+)/);
       if (m && m[1]) {
           fallbackName = m[1].replace(/-/g, ' ').replace(/[0-9]+/g, '').trim();
       }
       if (name && name.length > 0 && name.length < 60 && (!existing.name || existing.name === fallbackName)) {
           existing.name = name;
           existing._element = a;
       }
    }
  });

  const contacts = Array.from(contactsMap.values()).map(c => {
     let role = "";
     try {
         const card = c._element.closest("[role='listitem']") || c._element.closest("li") || c._element.closest(".entity-result");
         if (card) {
             role = inferRoleFromCardText(card, c.name);
         }
     } catch(e) {}
     
     return {
        name: c.name,
        role: role || null,
        linkedinUrl: c.linkedinUrl
     };
  });

  return contacts.slice(0, 10);
};



const createContactRow = (contact, index) => {
  const label = document.createElement("label");
  label.className = "hirelens-contact-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = index < 5;
  checkbox.dataset.index = String(index);

  const textWrap = document.createElement("span");
  textWrap.className = "hirelens-contact-text";

  const name = document.createElement("strong");
  name.textContent = contact.name;

  const role = document.createElement("span");
  role.textContent = contact.role || "No title found";

  textWrap.append(name, role);
  label.append(checkbox, textWrap);

  return label;
};

const renderContacts = (panel, contacts) => {
  const list = panel.querySelector("[data-hirelens-list]");
  const count = panel.querySelector("[data-hirelens-count]");
  list.innerHTML = "";
  count.textContent = `${contacts.length} visible`;

  if (!contacts.length) {
    const empty = document.createElement("p");
    empty.className = "hirelens-empty";
    empty.textContent = "No visible LinkedIn profile results found yet.";
    list.append(empty);
    return;
  }

  contacts.forEach((contact, index) => {
    list.append(createContactRow(contact, index));
  });
};

const selectedContacts = (panel, contacts, task) => {
  const selectedIndexes = Array.from(
    panel.querySelectorAll(".hirelens-contact-row input:checked")
  ).map((input) => Number(input.dataset.index));

  return selectedIndexes
    .map((index) => contacts[index])
    .filter(Boolean)
    .map((contact) => ({
      ...contact,
      company: task?.targetCompany?.name ?? null,
    }));
};

const setPanelState = (panel, message, isError = false) => {
  const status = panel.querySelector("[data-hirelens-status]");
  status.textContent = message;
  status.classList.toggle("is-error", isError);
};

const injectPanel = async () => {
  if (document.getElementById(PANEL_ID)) {
    return;
  }

  const active = await sendMessage({ type: "HIRELENS_GET_ACTIVE_TASK" });
  const task = active.task;

  if (!task) {
    return;
  }

  let contacts = extractVisibleContacts();

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="hirelens-panel-header">
      <div>
        <p>HireLens Queue</p>
        <h2></h2>
      </div>
      <button type="button" data-hirelens-refresh title="Refresh visible results">Refresh</button>
    </div>
    <div class="hirelens-meta">
      <span data-hirelens-count></span>
      <span>${task.searchTitle}</span>
    </div>
    <div class="hirelens-list" data-hirelens-list></div>
    <div class="hirelens-actions">
      <button type="button" data-hirelens-skip class="secondary">Skip & Next</button>
      <button type="button" data-hirelens-capture>Capture Selected & Next</button>
    </div>
    <p class="hirelens-status" data-hirelens-status></p>
  `;

  panel.querySelector("h2").textContent = task.searchQuery;
  document.body.append(panel);
  renderContacts(panel, contacts);
  if (contacts.length === 0) {
    const allA = document.querySelectorAll("a").length;
    const inA = Array.from(document.querySelectorAll("a")).filter(a => typeof a.href === 'string' && a.href.includes('/in/')).length;
    setPanelState(panel, `Debug: Total A tags=${allA}, IN tags=${inA}. Please screenshot this!`, true);
  } else {
    setPanelState(panel, "Review the visible results, then capture selected profiles.");
  }

  panel.querySelector("[data-hirelens-refresh]").addEventListener("click", () => {
    contacts = extractVisibleContacts();
    renderContacts(panel, contacts);
    if (contacts.length === 0) {
      const allA = document.querySelectorAll("a").length;
      const inA = Array.from(document.querySelectorAll("a")).filter(a => typeof a.href === 'string' && a.href.includes('/in/')).length;
      setPanelState(panel, `Debug: Total A=${allA}, IN=${inA}. Please screenshot!`, true);
    } else {
      setPanelState(panel, "Visible results refreshed.");
    }
  });

  panel.querySelector("[data-hirelens-capture]").addEventListener("click", async () => {
    const chosenContacts = selectedContacts(panel, contacts, task);

    if (!chosenContacts.length) {
      setPanelState(panel, "Select at least one profile before capturing.", true);
      return;
    }

    setPanelState(panel, "Saving contacts and opening next search...");

    try {
      const response = await sendMessage({
        type: "HIRELENS_CAPTURE_AND_NEXT",
        taskId: task.id,
        contacts: chosenContacts,
      });

      setPanelState(panel, response.done ? "Queue complete." : "Opening next search...");
    } catch (error) {
      setPanelState(panel, error.message, true);
    }
  });

  panel.querySelector("[data-hirelens-skip]").addEventListener("click", async () => {
    setPanelState(panel, "Skipping and opening next search...");

    try {
      const response = await sendMessage({
        type: "HIRELENS_SKIP_AND_NEXT",
        taskId: task.id,
      });

      setPanelState(panel, response.done ? "Queue complete." : "Opening next search...");
    } catch (error) {
      setPanelState(panel, error.message, true);
    }
  });
};

const runWhenReady = () => {
  let attempts = 0;
  
  const check = () => {
    attempts++;
    // Check if LinkedIn has rendered the profile links yet
    const hasResults = Array.from(document.querySelectorAll("a")).some(a => a.href.includes('/in/') && !a.href.includes('/in/linkedin'));
    
    // Inject if we found results, or if we waited too long (5 seconds max)
    if (hasResults || attempts > 10) {
      injectPanel().catch(() => {
        // The panel is intentionally quiet if the queue has not been started.
      });
    } else {
      setTimeout(check, 500);
    }
  };
  
  check();
};

runWhenReady();
