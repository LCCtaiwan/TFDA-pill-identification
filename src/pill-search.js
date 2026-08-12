const LEVEL_RANK = {
  exact: 3,
  prefix: 2,
  contains: 1,
  unknown: 0
};

export function normalizeImprint(value = "") {
  return String(value)
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9\u3400-\u9FFF]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenizeImprint(value = "") {
  const normalized = normalizeImprint(value);
  return normalized ? normalized.split(" ") : [];
}

export function matchImprint(query, imprints = []) {
  const queryTokens = tokenizeImprint(query);
  if (!queryTokens.length) return { state: "inactive", level: null };

  const targetTokens = imprints.flatMap(tokenizeImprint);
  if (!targetTokens.length) return { state: "unknown", level: "unknown" };

  let weakestRank = LEVEL_RANK.exact;

  for (const queryToken of queryTokens) {
    let bestRank = -1;

    for (const targetToken of targetTokens) {
      if (targetToken === queryToken) {
        bestRank = Math.max(bestRank, LEVEL_RANK.exact);
      } else if (targetToken.startsWith(queryToken)) {
        bestRank = Math.max(bestRank, LEVEL_RANK.prefix);
      } else if (queryToken.length > 1 && targetToken.includes(queryToken)) {
        bestRank = Math.max(bestRank, LEVEL_RANK.contains);
      }
    }

    if (bestRank < 0) return { state: "mismatch", level: null };
    weakestRank = Math.min(weakestRank, bestRank);
  }

  const level = Object.entries(LEVEL_RANK)
    .find(([, rank]) => rank === weakestRank)?.[0] ?? "contains";
  return { state: "match", level };
}

function normalizeFilterValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-Hant");
}

function matchListFilter(queries, values = []) {
  const normalizedQueries = (Array.isArray(queries) ? queries : [queries])
    .map(normalizeFilterValue)
    .filter(Boolean);
  if (!normalizedQueries.length) return { state: "inactive" };

  const knownValues = values.map(normalizeFilterValue).filter(Boolean);
  if (!knownValues.length) return { state: "unknown" };
  return normalizedQueries.some((query) => knownValues.includes(query))
    ? { state: "match" }
    : { state: "mismatch" };
}

function matchScoreFilter(query, values = []) {
  if (!query) return { state: "inactive" };
  const knownValues = values.map(normalizeFilterValue).filter(Boolean);
  if (!knownValues.length) return { state: "unknown" };
  return knownValues.includes(normalizeFilterValue(query))
    ? { state: "match" }
    : { state: "mismatch" };
}

export function searchPills(records, filters = {}) {
  const imprintQuery = typeof filters === "string" ? filters : filters.imprint ?? "";
  const normalizedFilters = typeof filters === "string" ? {} : filters;
  const results = [];

  for (const record of records) {
    const checks = [
      ["刻痕／標註", matchImprint(imprintQuery, record.imprints)],
      ["顏色", matchListFilter(normalizedFilters.colors ?? normalizedFilters.color, record.colors)],
      ["形狀", matchListFilter(normalizedFilters.shapes ?? normalizedFilters.shape, record.shapes)],
      ["刻痕", matchScoreFilter(normalizedFilters.score, record.scores)]
    ];

    if (checks.some(([, check]) => check.state === "mismatch")) continue;

    const missingFields = checks
      .filter(([, check]) => check.state === "unknown")
      .map(([label]) => label);
    const imprintCheck = checks[0][1];

    results.push({
      ...record,
      matchLevel: imprintCheck.level,
      missingFields,
      resultGroup: missingFields.length ? "unknown" : "matched"
    });
  }

  return results.sort((a, b) => {
    if (a.resultGroup !== b.resultGroup) return a.resultGroup === "matched" ? -1 : 1;
    const levelDiff = (LEVEL_RANK[b.matchLevel] ?? 0) - (LEVEL_RANK[a.matchLevel] ?? 0);
    if (levelDiff) return levelDiff;
    const aName = a.brandName || a.nameEn || a.licenseNumber;
    const bName = b.brandName || b.nameEn || b.licenseNumber;
    return aName < bName ? -1 : aName > bName ? 1 : 0;
  });
}

function displayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("；") || "資料未提供";
  return value || "資料未提供";
}

export function formatConsultationRecord(record) {
  const marking = (record.imprints || []).filter(Boolean).join(" / ") || "資料未提供";
  const ingredientNames = (record.ingredients || []).map((item) => item.name).filter(Boolean);
  const genericName = ingredientNames.join(" + ")
    || String(record.genericName || "").replace(/[；;]+/gu, " + ")
    || "資料未提供";
  const brandName = record.brandName || record.nameEn || "資料未提供";
  const strength = formatConsultationStrength(record);

  return `${marking} ${genericName} ${brandName} ${strength}`;
}

export function formatConsultationDraft(records) {
  return records.map(formatConsultationRecord).join("\n");
}

function normalizeConsultationUnit(unit) {
  const normalized = String(unit || "").trim().toUpperCase();
  return ({ MG: "mg", GM: "g", G: "g", MCG: "mcg", UG: "mcg", ML: "mL", IU: "IU", U: "U" })[normalized]
    || unit
    || "";
}

function doseBasisFromLabel(label) {
  const normalized = String(label || "").normalize("NFKC").toUpperCase();
  if (/EACH\s+TABLETS?\b/u.test(normalized)) return "tab";
  if (/EACH\s+CAPSULES?\b/u.test(normalized)) return "cap";
  if (/EACH\s+PILLS?\b/u.test(normalized)) return "pill";
  if (/EACH\s+(?:GM|G)\b/u.test(normalized)) return "g";
  if (/EACH\s+ML\b/u.test(normalized)) return "mL";
  return "";
}

function doseBasisFromDosageForm(dosageForm) {
  const normalized = String(dosageForm || "").normalize("NFKC");
  if (normalized.includes("錠")) return "tab";
  if (normalized.includes("膠囊")) return "cap";
  if (normalized.includes("丸")) return "pill";
  return "";
}

export function formatConsultationStrength(record) {
  const ingredients = record.ingredients || [];
  const amounts = ingredients
    .filter((item) => item.amount || item.unit)
    .map((item) => [item.amount, normalizeConsultationUnit(item.unit)].filter(Boolean).join(" "));
  const basis = ingredients.map((item) => doseBasisFromLabel(item.label)).find(Boolean)
    || doseBasisFromDosageForm(record.dosageForm);

  if (amounts.length) return `${amounts.join(" + ")}${basis ? `/${basis}` : ""}`;
  return displayValue(record.strengths);
}
