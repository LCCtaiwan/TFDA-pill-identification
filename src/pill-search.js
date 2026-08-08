/**
 * 刻痕／外觀搜尋介面骨架。
 * 實作時由上游 TFDA 快取資料與 appearance_data.json 注入 records。
 */

export function normalizeImprint(value = "") {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-Hant")
    .replace(/\s+/g, "")
    .trim();
}

export function searchPills(records, query, { exact = false } = {}) {
  const normalizedQuery = normalizeImprint(query);
  if (!normalizedQuery) return [];

  return records
    .filter((record) => {
      const imprints = (record.imprint_normalized || record.imprints || [])
        .map(normalizeImprint);
      return exact
        ? imprints.includes(normalizedQuery)
        : imprints.some((imprint) => imprint.includes(normalizedQuery));
    })
    .map((record) => ({ ...record, source: "TFDA" }));
}

