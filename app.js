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
  const deleteAllBtn = document.getElementById("delete-all-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const toast = document.getElementById("toast");

  let editingId = null;
  let toastTimer = null;

  // Entries are stored with date in DD/MM/YYYY, matching diary.txt.
  const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DISPLAY_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const entries = raw ? JSON.parse(raw) : [];
      // Migrate entries saved before dates were stored as DD/MM/YYYY.
      let migrated = false;
      for (const entry of entries) {
        const isoMatch = ISO_DATE_RE.exec(entry.date);
        if (isoMatch) {
          entry.date = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
          migrated = true;
        }
      }
      if (migrated) saveEntries(entries);
      return entries;
    } catch (e) {
      console.error("Failed to load entries from localStorage", e);
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function parseDisplayDate(str) {
    const m = DISPLAY_DATE_RE.exec(str);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return { day, month, year };
  }

  function isValidDisplayDate(str) {
    return parseDisplayDate(str) !== null;
  }

  // DD/MM/YYYY -> YYYY-MM-DD, for chronological sorting/comparison.
  function displayDateToSortKey(str) {
    const p = parseDisplayDate(str);
    if (!p) return "0000-00-00";
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  }

  function formatDisplayDate(day, month, year) {
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  function todayDisplayDate() {
    const now = new Date();
    return formatDisplayDate(now.getDate(), now.getMonth() + 1, now.getFullYear());
  }

  function addDaysToDisplayDate(str, days) {
    const p = parseDisplayDate(str);
    const d = new Date(p.year, p.month - 1, p.day);
    d.setDate(d.getDate() + days);
    return formatDisplayDate(d.getDate(), d.getMonth() + 1, d.getFullYear());
  }

  // Today's date, or the next free day after today if today is already used.
  function computeDefaultNewEntryDate(entries) {
    const usedDates = new Set(entries.map((e) => e.date));
    let candidate = todayDisplayDate();
    while (usedDates.has(candidate)) {
      candidate = addDaysToDisplayDate(candidate, 1);
    }
    return candidate;
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
      dateInput.value = computeDefaultNewEntryDate(loadEntries());
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

    const sorted = [...entries].sort((a, b) =>
      displayDateToSortKey(b.date).localeCompare(displayDateToSortKey(a.date))
    );

    for (const entry of sorted) {
      const li = document.createElement("li");
      li.className = "entry-item";
      li.dataset.id = entry.id;

      const main = document.createElement("div");
      main.className = "entry-main";

      const dateEl = document.createElement("span");
      dateEl.className = "entry-date";
      dateEl.textContent = entry.date;

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

    const date = dateInput.value.trim();
    const subject = subjectInput.value.trim();
    const content = contentInput.value.trim();

    if (!date || !subject || !content) {
      return;
    }

    if (!isValidDisplayDate(date)) {
      showToast("Please enter a valid date as DD/MM/YYYY");
      dateInput.focus();
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
    const sorted = [...entries].sort((a, b) =>
      displayDateToSortKey(b.date).localeCompare(displayDateToSortKey(a.date))
    );
    return sorted
      .map((entry) => {
        const flatContent = entry.content.replace(/\s*\n+\s*/g, " ").trim();
        return `${entry.date}|${entry.subject}|${flatContent}`;
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
    a.download = `diary_export_${displayDateToSortKey(todayDisplayDate())}.txt`;
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

  function handleDeleteAll() {
    const entries = loadEntries();
    if (entries.length === 0) {
      showToast("No entries to delete");
      return;
    }
    const confirmed = window.confirm(
      `Delete all ${entries.length} entr${entries.length === 1 ? "y" : "ies"}? This cannot be undone.`
    );
    if (!confirmed) return;

    saveEntries([]);
    showToast("All entries deleted");
    renderList();
  }

  dateInput.addEventListener("input", () => {
    const digits = dateInput.value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 4) {
      dateInput.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      dateInput.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      dateInput.value = digits;
    }
  });

  newEntryBtn.addEventListener("click", () => showEntryView(null));
  cancelBtn.addEventListener("click", showListView);
  entryForm.addEventListener("submit", handleSave);
  exportBtn.addEventListener("click", handleExport);
  deleteAllBtn.addEventListener("click", handleDeleteAll);

  renderList();
})();
