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

function matchListFilter(query, values = []) {
  const normalizedQuery = normalizeFilterValue(query);
  if (!normalizedQuery) return { state: "inactive" };

  const knownValues = values.map(normalizeFilterValue).filter(Boolean);
  if (!knownValues.length) return { state: "unknown" };
  return knownValues.includes(normalizedQuery)
    ? { state: "match" }
    : { state: "mismatch" };
}

function matchScoreFilter(query, values = []) {
  if (!query) return { state: "inactive" };
  const knownValues = values.filter((value) => typeof value === "boolean");
  const hasUnknown = values.length === 0 || values.some((value) => value === null);

  if (query === "unknown") {
    return hasUnknown ? { state: "match" } : { state: "mismatch" };
  }

  const expected = query === "yes";
  if (knownValues.includes(expected)) return { state: "match" };
  return hasUnknown ? { state: "unknown" } : { state: "mismatch" };
}

export function searchPills(records, filters = {}) {
  const imprintQuery = typeof filters === "string" ? filters : filters.imprint ?? "";
  const normalizedFilters = typeof filters === "string" ? {} : filters;
  const results = [];

  for (const record of records) {
    const checks = [
      ["刻痕／標註", matchImprint(imprintQuery, record.imprints)],
      ["顏色", matchListFilter(normalizedFilters.color, record.colors)],
      ["形狀", matchListFilter(normalizedFilters.shape, record.shapes)],
      ["分割刻痕", matchScoreFilter(normalizedFilters.score, record.scores)]
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
  const scoreLabels = (record.scores || [])
    .filter((value) => typeof value === "boolean")
    .map((value) => value ? "有分割線" : "無分割線");
  const marking = [
    displayValue(record.imprints),
    [...new Set(scoreLabels)].join("／")
  ].filter((value) => value && value !== "資料未提供").join("；") || "資料未提供";

  const genericName = record.genericName
    || (record.ingredients || []).map((item) => item.name).filter(Boolean).join("；");

  return [
    `刻痕／標註：${marking}`,
    `藥名（成分）：${displayValue(genericName)}`,
    `商品名：${displayValue(record.brandName || record.nameEn)}`,
    `含量規格：${displayValue(record.strengths)}`,
    `許可證字號：${displayValue(record.licenseNumber)}`
  ].join("\n");
}

export function formatConsultationDraft(records) {
  return records
    .map((record, index) => `【辨識藥品 ${index + 1}】\n${formatConsultationRecord(record)}`)
    .join("\n\n");
}
