(function () {
  "use strict";

  const STORAGE_KEY = "travelDiaryEntries";

  const listView = document.getElementById("list-view");
  const entryView = document.getElementById("entry-view");
  const entriesList = document.getElementById("entries-list");
  const emptyState = document.getElementById("empty-state");
  const entryViewTitle = document.getElementById("entry-view-title");
  const entryForm = document.getElementById("entry-form");
  const dateInput = document.getElementById("entry-date");
  const subjectInput = document.getElementById("entry-subject");
  const contentInput = document.getElementById("entry-content");
  const newEntryBtn = document.getElementById("new-entry-btn");
  const exportBtn = document.getElementById("export-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const toast = document.getElementById("toast");

  let editingId = null;
  let toastTimer = null;

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load entries from localStorage", e);
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function todayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ISO (YYYY-MM-DD, from <input type=date>) -> DD/MM/YYYY (diary.txt format)
  function isoToDisplayDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2500);
  }

  function showListView() {
    entryView.hidden = true;
    listView.hidden = false;
    renderList();
  }

  function showEntryView(entry) {
    if (entry) {
      editingId = entry.id;
      entryViewTitle.textContent = "Edit Entry";
      dateInput.value = entry.date;
      subjectInput.value = entry.subject;
      contentInput.value = entry.content;
    } else {
      editingId = null;
      entryViewTitle.textContent = "New Entry";
      dateInput.value = todayIsoDate();
      subjectInput.value = "";
      contentInput.value = "";
    }
    listView.hidden = true;
    entryView.hidden = false;
    subjectInput.focus();
  }

  function renderList() {
    const entries = loadEntries();
    entriesList.innerHTML = "";

    if (entries.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    for (const entry of sorted) {
      const li = document.createElement("li");
      li.className = "entry-item";
      li.dataset.id = entry.id;

      const main = document.createElement("div");
      main.className = "entry-main";

      const dateEl = document.createElement("span");
      dateEl.className = "entry-date";
      dateEl.textContent = isoToDisplayDate(entry.date);

      const subjectEl = document.createElement("span");
      subjectEl.className = "entry-subject";
      subjectEl.textContent = entry.subject;

      main.appendChild(dateEl);
      main.appendChild(subjectEl);

      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        showEntryView(entry);
      });

      actions.appendChild(editBtn);

      li.appendChild(main);
      li.appendChild(actions);

      li.addEventListener("click", () => showEntryView(entry));

      entriesList.appendChild(li);
    }
  }

  function handleSave(ev) {
    ev.preventDefault();

    const date = dateInput.value;
    const subject = subjectInput.value.trim();
    const content = contentInput.value.trim();

    if (!date || !subject || !content) {
      return;
    }

    const entries = loadEntries();

    if (editingId) {
      const idx = entries.findIndex((e) => e.id === editingId);
      if (idx !== -1) {
        entries[idx] = { id: editingId, date, subject, content };
      }
    } else {
      entries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        subject,
        content,
      });
    }

    saveEntries(entries);
    showToast("Entry saved");
    showListView();
  }

  function buildExportText() {
    const entries = loadEntries();
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted
      .map((entry) => {
        const flatContent = entry.content.replace(/\s*\n+\s*/g, " ").trim();
        return `${isoToDisplayDate(entry.date)}|${entry.subject}|${flatContent}`;
      })
      .join("\n");
  }

  async function handleExport() {
    const entries = loadEntries();
    if (entries.length === 0) {
      showToast("No entries to export");
      return;
    }

    const text = buildExportText();

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diary_export_${todayIsoDate()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    try {
      await navigator.clipboard.writeText(text);
      showToast("Exported: file downloaded and copied to clipboard");
    } catch (e) {
      console.error("Clipboard copy failed", e);
      showToast("File downloaded (clipboard copy failed)");
    }
  }

  newEntryBtn.addEventListener("click", () => showEntryView(null));
  cancelBtn.addEventListener("click", showListView);
  entryForm.addEventListener("submit", handleSave);
  exportBtn.addEventListener("click", handleExport);

  renderList();
})();
