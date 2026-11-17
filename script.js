"use strict";

// Das Formular sendet seine Felder per POST an PHP.
const API_URL = "anfrage.php";
const $ = (selector) => document.querySelector(selector);
const form = $("#log-form");
const dateInput = $("#date");
const filterInput = $("#type-filter");
const descriptionInput = $("#description");
const saveButton = form.querySelector('button[type="submit"]');
const cancelEditButton = $("#cancel-edit");
const formError = $("#form-error");
const retryLoadButton = $("#retry-load");
const openAsFile = window.location.protocol === "file:";
const localServerMessage = "Starte im Projektordner den PHP-Server mit php -S localhost:8000.";
let entries = [];
let editingId = null;
let toastTimeout;
let historyError = "";

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

dateInput.value = todayLocal();
dateInput.max = todayLocal();

async function apiRequest(method = "GET", payload = null) {
  if (openAsFile) throw new Error(localServerMessage);

  const sendJson = payload !== null && !(payload instanceof FormData);
  let response;
  try {
    response = await fetch(API_URL, {
      method,
      headers: sendJson ? { "Content-Type": "application/json" } : undefined,
      body: sendJson ? JSON.stringify(payload) : payload,
      cache: "no-store"
    });
  } catch {
    throw new Error("Keine Verbindung zum PHP-Server. " + localServerMessage);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Der Server liefert keine SwimLog-Daten. " + localServerMessage);
  }
  if (!response.ok || !result?.ok) {
    const error = new Error(result?.meldung || "Die Anfrage konnte nicht verarbeitet werden.");
    error.fields = result?.fehler;
    throw error;
  }
  return result;
}

async function loadEntries() {
  retryLoadButton.disabled = true;
  try {
    const result = await apiRequest();
    entries = result.trainings;
    historyError = "";
  } catch (error) {
    historyError = error.message;
  } finally {
    retryLoadButton.disabled = false;
    render();
  }
}

function showToast(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3100);
}

function updateRange(id, outputId) {
  const slider = $(id);
  const value = Number(slider.value);
  const out = $(outputId);
  out.textContent = value;
  out.classList.remove("bump");
  void out.offsetWidth;
  out.classList.add("bump");
  slider.style.setProperty("--fill", `${(value - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100}%`);
}

[["#intensity", "#intensity-value"], ["#quality", "#quality-value"]].forEach(([slider, output]) => {
  $(slider).addEventListener("input", () => updateRange(slider, output));
  updateRange(slider, output);
});

descriptionInput.addEventListener("input", () => {
  $("#char-count").textContent = `${descriptionInput.value.length} / 600`;
});

function formatNumber(value, maxFraction = 1) {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: maxFraction }).format(value);
}

function clearFormError() {
  for (const field of form.querySelectorAll('[aria-invalid="true"]')) {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
  formError.hidden = true;
  formError.textContent = "";
}

function showFormError(error) {
  const fields = error.fields ?? {};
  const messages = Object.values(fields);
  formError.textContent = messages.length ? messages.join(" ") : error.message;
  formError.hidden = false;

  let firstInvalid;
  for (const field of form.querySelectorAll("[name]")) {
    if (!Object.hasOwn(fields, field.name)) continue;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", "form-error");
    firstInvalid ??= field;
  }
  (firstInvalid ?? formError).focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (saveButton.disabled) return;
  clearFormError();

  const formData = new FormData(form);
  for (const name of ["distance", "duration", "sleep"]) {
    const number = form.elements.namedItem(name).valueAsNumber;
    if (Number.isFinite(number)) formData.set(name, number);
  }
  const id = editingId;
  saveButton.disabled = true;
  cancelEditButton.disabled = true;
  $("#save-label").textContent = "Wird gespeichert …";
  try {
    const result = id === null
      ? await apiRequest("POST", formData)
      : await apiRequest("PUT", { ...Object.fromEntries(formData), id });
    resetForm();
    await loadEntries();
    $("#verlauf").scrollIntoView({ block: "start" });
    showToast(result.meldung);
  } catch (error) {
    showFormError(error);
  } finally {
    saveButton.disabled = false;
    cancelEditButton.disabled = false;
    if (editingId === null) $("#save-label").textContent = "Training speichern";
    else $("#save-label").textContent = "Änderungen speichern";
  }
});

function resetForm() {
  editingId = null;
  form.reset();
  dateInput.value = todayLocal();
  dateInput.max = dateInput.value;
  $("#form-title").textContent = "Neues Training";
  $("#save-label").textContent = "Training speichern";
  cancelEditButton.hidden = true;
  clearFormError();
  $("#char-count").textContent = "0 / 600";
  updateRange("#intensity", "#intensity-value");
  updateRange("#quality", "#quality-value");
}

cancelEditButton.addEventListener("click", resetForm);

function editEntry(id) {
  if (saveButton.disabled) return;
  const item = entries.find((entry) => entry.id === id);
  if (!item) return;
  form.reset();
  clearFormError();
  editingId = id;
  dateInput.value = item.date;
  $("#stroke").value = item.stroke || "";
  $("#intensity").value = item.intensity;
  $("#quality").value = item.quality ?? 8;
  const typeRadio = [...form.elements.type].find((radio) => radio.value === item.type);
  if (typeRadio) typeRadio.checked = true;
  $("#sleep").value = item.sleep ?? 8;
  $("#distance").value = item.distance ?? "";
  $("#duration").value = item.duration ?? "";
  descriptionInput.value = item.description || "";
  $("#char-count").textContent = `${descriptionInput.value.length} / 600`;
  $("#form-title").textContent = "Training bearbeiten";
  $("#save-label").textContent = "Änderungen speichern";
  cancelEditButton.hidden = false;
  updateRange("#intensity", "#intensity-value");
  updateRange("#quality", "#quality-value");
  $("#eintrag").scrollIntoView({ block: "start" });
  dateInput.focus({ preventScroll: true });
}

async function deleteEntry(id) {
  if (!window.confirm("Diesen Trainingseintrag wirklich löschen?")) return;
  try {
    await apiRequest("DELETE", { id });
    if (editingId === id) resetForm();
    await loadEntries();
    showToast("Eintrag gelöscht");
  } catch (error) { showToast(error.message, true); }
}

function displayDate(date) {
  // Midday prevents changes caused by daylight-saving boundaries.
  const d = new Date(`${date}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("de-CH", { day: "2-digit" }).format(d),
    month: new Intl.DateTimeFormat("de-CH", { month: "short" }).format(d).replace(".", ""),
    short: new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(d)
  };
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function renderStats() {
  const count = entries.length;
  const unavailable = !!historyError && count === 0;
  $("#stat-count").textContent = unavailable ? "–" : formatNumber(count, 0);
  $("#stat-intensity").textContent = count ? formatNumber(entries.reduce((total, e) => total + Number(e.intensity), 0) / count) : "–";
  const sleepEntries = entries.filter((e) => Number.isFinite(Number(e.sleep)) && e.sleep !== null && e.sleep !== "");
  $("#stat-sleep").textContent = sleepEntries.length ? formatNumber(sleepEntries.reduce((total, e) => total + Number(e.sleep), 0) / sleepEntries.length) : "–";
  const distance = entries.reduce((total, e) => total + (Number(e.distance) || 0), 0);
  $("#stat-distance").textContent = unavailable ? "–" : formatNumber(distance, 0);
}

function renderChart() {
  const container = $("#trend-chart");
  container.replaceChildren();
  const lastSeven = [...entries].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "")).slice(-7);
  if (!lastSeven.length) {
    const message = historyError ? "Intensitätsverlauf gerade nicht verfügbar." : "Hier siehst du die Intensität deiner Trainings.";
    container.append(createElement("p", "chart-placeholder", message));
    container.setAttribute("aria-label", message);
    return;
  }
  container.setAttribute("aria-label", "Intensität der letzten " + lastSeven.length + " Einheiten: " + lastSeven.map((e) => `${displayDate(e.date).short}: ${e.intensity} von 10`).join(", "));
  for (const entry of lastSeven) {
    const col = createElement("div", "chart-col");
    const wrap = createElement("div", "chart-bar-wrap");
    const bar = createElement("div", "chart-bar");
    bar.style.height = `${Number(entry.intensity) * 10}%`;
    bar.title = `${displayDate(entry.date).short} · ${entry.type} · ${entry.intensity}/10`;
    wrap.append(bar);
    col.append(wrap, createElement("span", "chart-date", displayDate(entry.date).short));
    container.append(col);
  }
}

function renderHistory() {
  const list = $("#history-list");
  list.replaceChildren();
  const filter = filterInput.value;
  const visible = [...entries].filter((e) => filter === "Alle" || e.type === filter).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
  const emptyState = $("#empty-state");
  emptyState.hidden = entries.length > 0;
  emptyState.textContent = historyError ? "Trainingsverlauf gerade nicht verfügbar." : "Dein erstes gespeichertes Training erscheint hier.";
  $("#no-filter-state").hidden = !(entries.length > 0 && visible.length === 0);
  $("#export-btn").disabled = entries.length === 0;
  $("#delete-all").hidden = entries.length === 0;

  for (const entry of visible) {
    const card = createElement("article", "log-card");
    const date = displayDate(entry.date);
    const dateBox = createElement("div", "log-date");
    dateBox.append(createElement("strong", "", date.day), createElement("span", "", date.month));
    const main = createElement("div", "log-main");
    const top = createElement("div", "log-top");
    top.append(createElement("h3", "", entry.type), createElement("span", "intensity-badge", `Intensität ${entry.intensity}/10`));
    const meta = createElement("div", "log-meta");
    if (entry.stroke) meta.append(createElement("span", "", entry.stroke));
    if (entry.sleep !== null) meta.append(createElement("span", "", `Schlaf: ${formatNumber(Number(entry.sleep))} h`));
    if (entry.quality !== null) meta.append(createElement("span", "", `Qualität: ${entry.quality}/10`));
    if (entry.distance !== null && entry.distance !== undefined && entry.distance !== "") meta.append(createElement("span", "", `${formatNumber(Number(entry.distance), 0)} m`));
    if (entry.duration !== null && entry.duration !== undefined && entry.duration !== "") meta.append(createElement("span", "", `${formatNumber(Number(entry.duration), 0)} min`));
    main.append(top, meta);
    if (entry.description) main.append(createElement("p", "log-desc", entry.description));
    const actions = createElement("div", "log-actions");
    const editBtn = createElement("button", "", "Bearbeiten");
    editBtn.type = "button";
    editBtn.setAttribute("aria-label", `Eintrag vom ${date.short} bearbeiten`);
    editBtn.addEventListener("click", () => editEntry(entry.id));
    const deleteBtn = createElement("button", "delete", "Löschen");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `Eintrag vom ${date.short} löschen`);
    deleteBtn.addEventListener("click", () => deleteEntry(entry.id));
    actions.append(editBtn, deleteBtn);
    card.append(dateBox, main, actions);
    card.style.animationDelay = `${Math.min(list.children.length * 65, 420)}ms`;
    list.append(card);
  }
}

function render() {
  $("#connection-notice").hidden = !historyError;
  $("#connection-details").textContent = historyError;
  $("#open-local-server").hidden = !openAsFile;
  retryLoadButton.hidden = openAsFile;
  renderStats();
  renderChart();
  renderHistory();
}

filterInput.addEventListener("change", renderHistory);
retryLoadButton.addEventListener("click", loadEntries);

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  // Avoid spreadsheet formula execution if a field begins with a formula character.
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

$("#export-btn").addEventListener("click", () => {
  if (!entries.length) return;
  const columns = ["Datum", "Schwimmart", "Trainingstyp", "Intensität (1-10)", "Schlaf (Stunden)", "Schlafqualität (1-10)", "Distanz (m)", "Dauer (Minuten)", "Beschreibung"];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [columns.map(csvCell).join(";"), ...sorted.map((e) => [e.date, e.stroke, e.type, e.intensity, e.sleep === null ? "" : String(e.sleep).replace(".", ","), e.quality ?? "", e.distance, e.duration, e.description].map(csvCell).join(";"))];
  const blob = new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SwimLog_Export_${todayLocal()}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("CSV-Datei exportiert");
});

$("#delete-all").addEventListener("click", async () => {
  if (!entries.length) return;
  if (!window.confirm("Wirklich ALLE Trainingseinträge aus SQLite löschen? Das lässt sich nicht rückgängig machen. Exportiere sie vorher als CSV, wenn du sie behalten möchtest.")) return;
  try {
    await apiRequest("DELETE", { all: true });
    resetForm();
    await loadEntries();
    showToast("Alle Einträge aus SQLite gelöscht");
  } catch (error) { showToast(error.message, true); }
});

loadEntries();
