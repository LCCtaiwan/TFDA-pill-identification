import { COLORS, SHAPES, formatConsultationDraft, searchPills } from "./src/pill-search.js";

const DISPLAY_LIMIT = 60;
const state = {
  dataset: null,
  records: [],
  results: [],
  criteriaActive: false,
  draft: new Map()
};

const elements = {
  form: document.querySelector("#search-form"),
  imprint: document.querySelector("#imprint-input"),
  colors: document.querySelector("#color-options"),
  shapes: document.querySelector("#shape-options"),
  scores: document.querySelector("#score-options"),
  reset: document.querySelector("#reset-button"),
  status: document.querySelector("#data-status"),
  resultCount: document.querySelector("#result-count"),
  results: document.querySelector("#results"),
  draftItems: document.querySelector("#draft-items"),
  draftText: document.querySelector("#consultation-draft"),
  copyDraft: document.querySelector("#copy-draft-button"),
  clearDraft: document.querySelector("#clear-draft-button"),
  copyStatus: document.querySelector("#copy-status")
};

function textOrMissing(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("；") || "資料未提供";
  return value || "資料未提供";
}

function addChoiceOptions(container, values, name) {
  container.replaceChildren();
  for (const value of [...new Set(values.filter(Boolean))].sort()) {
    const label = document.createElement("label");
    label.className = "choice-chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = value;
    const text = document.createElement("span");
    text.textContent = value;
    label.append(input, text);
    container.append(label);
  }
}

function createFact(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = textOrMissing(value);
  return [term, description];
}

function renderCard(result) {
  const card = document.createElement("article");
  card.className = "drug-card";

  const availableImage = result.images?.find((image) => image.status === "available" && image.path);
  if (availableImage) {
    const image = document.createElement("img");
    image.className = "drug-image";
    image.src = `./${availableImage.path}`;
    image.alt = `${result.brandName || result.licenseNumber} 外觀圖`;
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.textContent = "TFDA 圖片未提供或尚未處理";
    card.append(placeholder);
  }

  const body = document.createElement("div");
  const head = document.createElement("div");
  head.className = "drug-head";
  const title = document.createElement("h3");
  title.textContent = result.brandName || result.nameEn || result.licenseNumber;
  const badge = document.createElement("span");
  badge.className = `match-badge ${result.resultGroup === "unknown" ? "unknown" : ""}`;
  badge.textContent = result.resultGroup === "unknown"
    ? "資料不足候選"
    : ({ exact: "Exact", prefix: "Prefix", contains: "Contains" }[result.matchLevel] || "條件符合");
  head.append(title, badge);

  const englishName = document.createElement("p");
  englishName.className = "drug-en";
  englishName.textContent = result.nameEn || "英文品名未提供";

  const facts = document.createElement("dl");
  facts.className = "facts";
  for (const [label, value] of [
    ["刻痕／標註", result.imprints],
    ["顏色", result.colors],
    ["形狀", result.shapes],
    ["刻痕", result.scores],
    ["藥名（成分）", result.genericName],
    ["含量規格", result.strengths],
    ["劑型", result.dosageForm],
    ["許可證", result.licenseNumber]
  ]) {
    facts.append(...createFact(label, value));
  }

  body.append(head, englishName, facts);

  if (result.missingFields.length) {
    const missing = document.createElement("p");
    missing.className = "missing-note";
    missing.textContent = `官方未提供：${result.missingFields.join("、")}；因此保留候選，未視為不符合。`;
    body.append(missing);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const addButton = document.createElement("button");
  addButton.className = "button button-primary";
  addButton.type = "button";
  addButton.textContent = state.draft.has(result.licenseNumber) ? "已加入諮詢紀錄" : "加入諮詢紀錄";
  addButton.disabled = state.draft.has(result.licenseNumber);
  addButton.addEventListener("click", () => {
    state.draft.set(result.licenseNumber, result);
    renderDraft();
    addButton.textContent = "已加入諮詢紀錄";
    addButton.disabled = true;
  });

  const sourceLink = document.createElement("a");
  sourceLink.className = "card-link";
  sourceLink.href = result.tfdaDetailUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noreferrer";
  sourceLink.textContent = "查看 TFDA 資料";
  actions.append(addButton, sourceLink);
  body.append(actions);
  card.append(body);
  return card;
}

function renderResults() {
  elements.results.replaceChildren();
  const matched = state.results.filter((result) => result.resultGroup === "matched").length;
  const unknown = state.results.length - matched;
  elements.resultCount.textContent = state.criteriaActive
    ? `${matched} 符合 · ${unknown} 資料不足`
    : "等待選擇";

  if (!state.records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "尚未建立 TFDA 資料。請先在 GitHub Actions 手動執行 Update TFDA data。";
    elements.results.append(empty);
    return;
  }


  if (!state.criteriaActive) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "輸入刻字，或點選上方的顏色、形狀、刻痕開始搜尋。";
    elements.results.append(empty);
    return;
  }

  if (!state.results.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "沒有已知欄位符合的候選；請減少條件或確認刻痕。";
    elements.results.append(empty);
    return;
  }

  for (const result of state.results.slice(0, DISPLAY_LIMIT)) {
    elements.results.append(renderCard(result));
  }

  if (state.results.length > DISPLAY_LIMIT) {
    const limited = document.createElement("p");
    limited.className = "empty-state";
    limited.textContent = `為避免手機畫面過重，目前顯示前 ${DISPLAY_LIMIT} 筆；請增加刻痕或外觀條件。`;
    elements.results.append(limited);
  }
}

function currentFilters() {
  return {
    imprint: elements.imprint.value,
    colors: [...elements.colors.querySelectorAll("input:checked")].map((input) => input.value),
    shapes: [...elements.shapes.querySelectorAll("input:checked")].map((input) => input.value),
    score: elements.scores.querySelector("input:checked")?.value || ""
  };
}

function hasActiveFilters(filters) {
  return Boolean(filters.imprint.trim() || filters.colors.length || filters.shapes.length || filters.score);
}

function runSearch() {
  const filters = currentFilters();
  state.criteriaActive = hasActiveFilters(filters);
  state.results = state.criteriaActive ? searchPills(state.records, filters) : [];
  renderResults();
}

function renderDraft() {
  const records = [...state.draft.values()];
  elements.draftItems.replaceChildren();
  for (const record of records) {
    const item = document.createElement("div");
    item.className = "draft-item";
    const name = document.createElement("span");
    name.textContent = record.brandName || record.licenseNumber;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "移除";
    remove.addEventListener("click", () => {
      state.draft.delete(record.licenseNumber);
      renderDraft();
      renderResults();
    });
    item.append(name, remove);
    elements.draftItems.append(item);
  }
  elements.draftText.value = formatConsultationDraft(records);
  elements.copyDraft.disabled = records.length === 0;
  elements.copyStatus.textContent = "";
}

async function copyDraft() {
  const text = elements.draftText.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    elements.draftText.focus();
    elements.draftText.select();
    if (!document.execCommand("copy")) throw new Error("copy failed");
  }
  elements.copyStatus.textContent = "已複製，可貼到諮詢內容。";
}

async function loadData() {
  try {
    const response = await fetch("./data/appearance_data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const dataset = await response.json();
    if (dataset.schemaVersion !== "1.0.0" || !Array.isArray(dataset.records)) {
      throw new Error("資料 schema 不相容");
    }
    state.dataset = dataset;
    state.records = dataset.records;
    addChoiceOptions(elements.colors, COLORS, "colors");
    addChoiceOptions(elements.shapes, SHAPES, "shapes");
    elements.status.textContent = dataset.records.length
      ? `已載入 ${dataset.records.length.toLocaleString()} 筆；資料版本 ${dataset.generatedAt ? new Date(dataset.generatedAt).toLocaleString("zh-TW") : "未提供"}${dataset.partial ? "（部分資料）" : ""}`
      : "資料結構已就緒，但尚未執行第一次 TFDA 更新。";
    runSearch();
  } catch (error) {
    elements.status.dataset.state = "error";
    elements.status.textContent = `資料載入失敗：${error.message}`;
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
elements.form.addEventListener("change", runSearch);
elements.imprint.addEventListener("input", runSearch);
elements.reset.addEventListener("click", () => {
  elements.form.reset();
  runSearch();
});
elements.copyDraft.addEventListener("click", () => copyDraft().catch(() => {
  elements.copyStatus.textContent = "無法自動複製，請手動選取上方文字。";
}));
elements.clearDraft.addEventListener("click", () => {
  state.draft.clear();
  renderDraft();
  renderResults();
});

renderDraft();
await loadData();
