import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync } from "fflate";
import sharp from "sharp";

export const SOURCE_URLS = {
  licenses: "https://data.fda.gov.tw/data/opendata/export/37/json",
  appearance: "https://data.fda.gov.tw/data/opendata/export/42/json",
  ingredients: "https://data.fda.gov.tw/data/opendata/export/43/json"
};

const SOURCE_META = {
  licenses: { datasetId: 37, name: "未註銷藥品許可證資料集" },
  appearance: { datasetId: 42, name: "藥品外觀資料集" },
  ingredients: { datasetId: 43, name: "藥品詳細處方成分資料集" }
};

const MINIMUM_COUNTS = {
  licenses: 10_000,
  appearance: 1_000,
  ingredients: 10_000
};

const SPLIT_MULTI_VALUE = /\s*(?:;;;|、|；|;|／|\/)\s*/u;

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
}

function splitValues(value, { conservative = false } = {}) {
  const text = cleanText(value);
  if (!text) return [];
  const separator = conservative ? /\s*;;;\s*/u : SPLIT_MULTI_VALUE;
  return [...new Set(text.split(separator).map(cleanText).filter(Boolean))];
}

function stableCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function formatNumericValue(value) {
  const text = cleanText(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return text;
  return text.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}

function normalizeScoreValue(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (["有", "Y", "YES", "TRUE", "1"].includes(text.toUpperCase())) return true;
  if (["無", "没有", "沒有", "N", "NO", "FALSE", "0"].includes(text.toUpperCase())) return false;
  return null;
}

function uniqueObjects(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLicenseIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const licenseNumber = cleanText(row["許可證字號"]);
    if (licenseNumber && !index.has(licenseNumber)) index.set(licenseNumber, row);
  }
  return index;
}

function normalizeIngredient(row) {
  const amount = formatNumericValue(row["含量"]);
  const amountDescription = cleanText(row["含量描述"]);
  const displayAmount = /^-?\d+(?:\.\d+)?$/u.test(amountDescription)
    ? formatNumericValue(amountDescription)
    : amount;

  return {
    name: cleanText(row["成分名稱"]),
    amount: displayAmount,
    unit: cleanText(row["含量單位"]),
    amountDescription,
    label: cleanText(row["處方標示"])
  };
}

function buildIngredientIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const licenseNumber = cleanText(row["許可證字號"]);
    if (!licenseNumber) continue;
    const ingredient = normalizeIngredient(row);
    if (!ingredient.name) continue;
    const list = index.get(licenseNumber) || [];
    list.push(ingredient);
    index.set(licenseNumber, list);
  }
  for (const [licenseNumber, ingredients] of index) {
    index.set(licenseNumber, uniqueObjects(ingredients));
  }
  return index;
}

function formatStrength(ingredient) {
  const amountAndUnit = [ingredient.amount, ingredient.unit].filter(Boolean).join(" ");
  if (!amountAndUnit) return "";
  return `${ingredient.name} ${amountAndUnit}`.trim();
}

export function normalizeRecords({ licenses, appearance, ingredients }) {
  const licenseIndex = buildLicenseIndex(licenses);
  const ingredientIndex = buildIngredientIndex(ingredients);
  const records = [];

  for (const appearanceRow of appearance) {
    const licenseNumber = cleanText(appearanceRow["許可證字號"]);
    if (!licenseNumber) continue;

    const licenseRow = licenseIndex.get(licenseNumber) || {};
    const ingredientRows = ingredientIndex.get(licenseNumber) || [];
    const scores = splitValues(appearanceRow["刻痕"], { conservative: true })
      .map(normalizeScoreValue);

    records.push({
      id: licenseNumber,
      licenseNumber,
      brandName: cleanText(licenseRow["中文品名"] || appearanceRow["中文品名"]),
      nameEn: cleanText(licenseRow["英文品名"] || appearanceRow["英文品名"]),
      genericName: cleanText(licenseRow["主成分略述"]).replace(/;;+/gu, "；"),
      dosageForm: cleanText(licenseRow["劑型"]),
      package: cleanText(licenseRow["包裝"]),
      imprints: uniqueObjects([
        ...splitValues(appearanceRow["標註一"], { conservative: true }),
        ...splitValues(appearanceRow["標註二"], { conservative: true })
      ]),
      colors: splitValues(appearanceRow["顏色"], { conservative: true }),
      shapes: splitValues(appearanceRow["形狀"], { conservative: true }),
      scores,
      dimensions: splitValues(appearanceRow["外觀尺寸"], { conservative: true }),
      ingredients: ingredientRows,
      strengths: ingredientRows.map(formatStrength).filter(Boolean),
      sourceImageUrls: splitValues(appearanceRow["外觀圖檔連結"], { conservative: true })
        .filter((value) => /^https?:\/\//u.test(value)),
      images: [],
      tfdaDetailUrl: `https://mcp.fda.gov.tw/im_detail_1/${encodeURIComponent(licenseNumber)}`
    });
  }

  return records.sort((a, b) => stableCompare(a.licenseNumber, b.licenseNumber));
}

export function decodeDatasetBytes(bytes, label = "dataset") {
  let jsonBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const isZip = jsonBytes[0] === 0x50 && jsonBytes[1] === 0x4b;

  if (isZip) {
    const files = unzipSync(jsonBytes);
    const jsonEntry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith(".json"));
    if (!jsonEntry) throw new Error(`${label} ZIP 內找不到 JSON`);
    jsonBytes = jsonEntry[1];
  }

  const text = new TextDecoder("utf-8").decode(jsonBytes).replace(/^\uFEFF/u, "");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error(`${label} 頂層不是 JSON array`);
  return parsed;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchBytes(url, { fetchImpl = fetch, attempts = 3, timeoutMs = 180_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "TFDA-Pill-Identification/0.2 (+GitHub Actions)" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

export async function loadDataset(source, label, options = {}) {
  const bytes = /^https?:\/\//u.test(source)
    ? await fetchBytes(source, options)
    : new Uint8Array(await readFile(path.resolve(source)));
  return decodeDatasetBytes(bytes, label);
}

function imageBaseName(licenseNumber, imageIndex) {
  const licenseHash = createHash("sha256").update(licenseNumber).digest("hex").slice(0, 20);
  return `${licenseHash}-${String(imageIndex + 1).padStart(2, "0")}.webp`;
}

export async function buildImagePlan(record, previousRecord, { imagesDir, publicImagesDir = "images" }) {
  const plans = [];
  for (const [imageIndex, sourceUrl] of record.sourceImageUrls.entries()) {
    const previousImage = previousRecord?.images?.find((image) => image.sourceUrl === sourceUrl);
    const previousAbsolutePath = previousImage?.path
      ? path.resolve(path.dirname(imagesDir), previousImage.path)
      : null;

    if (previousImage?.status === "available"
      && previousAbsolutePath
      && await fileExists(previousAbsolutePath)) {
      plans.push({ action: "reuse", sourceUrl, image: previousImage });
      continue;
    }

    const fileName = imageBaseName(record.licenseNumber, imageIndex);
    const shard = fileName.slice(0, 2);
    plans.push({
      action: "process",
      sourceUrl,
      outputPath: path.join(imagesDir, shard, fileName),
      image: {
        sourceUrl,
        path: `${publicImagesDir}/${shard}/${fileName}`,
        status: "available"
      }
    });
  }
  return plans;
}

export async function writeWebp(bytes, outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await sharp(bytes, { failOn: "error", limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(temporaryPath);
    await rename(temporaryPath, outputPath);
    return await sharp(outputPath).metadata();
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

async function processRecordImages(record, previousRecord, options, stats) {
  if (options.noImages) {
    record.images = record.sourceImageUrls.map((sourceUrl) => ({ sourceUrl, path: null, status: "unprocessed" }));
    return;
  }

  const plans = await buildImagePlan(record, previousRecord, options);
  const images = [];

  for (const plan of plans) {
    if (plan.action === "reuse") {
      images.push(plan.image);
      stats.reused += 1;
      continue;
    }

    try {
      const bytes = await fetchBytes(plan.sourceUrl, options);
      const metadata = await writeWebp(bytes, plan.outputPath);
      images.push({
        ...plan.image,
        width: metadata.width,
        height: metadata.height
      });
      stats.processed += 1;
    } catch (error) {
      console.warn(`圖片處理失敗：${record.licenseNumber} ${plan.sourceUrl} (${error.message})`);
      images.push({ sourceUrl: plan.sourceUrl, path: null, status: "error" });
      stats.failed += 1;
    }
  }

  if (!plans.length) stats.missing += 1;
  record.images = images;
}

async function mapWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const itemIndex = cursor;
      cursor += 1;
      await worker(items[itemIndex], itemIndex);
    }
  });
  await Promise.all(runners);
}

function datasetFingerprint(dataset) {
  return JSON.stringify({
    schemaVersion: dataset.schemaVersion,
    partial: dataset.partial,
    sources: dataset.sources,
    records: dataset.records
  });
}

async function readPreviousDataset(outputPath) {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function parseArgs(argv) {
  const options = {
    sourceLicenses: SOURCE_URLS.licenses,
    sourceAppearance: SOURCE_URLS.appearance,
    sourceIngredients: SOURCE_URLS.ingredients,
    output: "data/appearance_data.json",
    imagesDir: "images",
    batchSize: 50,
    concurrency: 4,
    limit: null,
    allowSmall: false,
    noImages: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} 缺少值`);
      index += 1;
      return value;
    };

    if (argument === "--source-licenses") options.sourceLicenses = nextValue();
    else if (argument === "--source-appearance") options.sourceAppearance = nextValue();
    else if (argument === "--source-ingredients") options.sourceIngredients = nextValue();
    else if (argument === "--output") options.output = nextValue();
    else if (argument === "--images-dir") options.imagesDir = nextValue();
    else if (argument === "--batch-size") options.batchSize = Number(nextValue());
    else if (argument === "--concurrency") options.concurrency = Number(nextValue());
    else if (argument === "--limit") options.limit = Number(nextValue());
    else if (argument === "--allow-small") options.allowSmall = true;
    else if (argument === "--no-images") options.noImages = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`未知參數：${argument}`);
  }

  for (const [name, value] of [["batch-size", options.batchSize], ["concurrency", options.concurrency]]) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} 必須是正整數`);
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit 必須是正整數");
  }
  return options;
}

function showHelp() {
  console.log(`用法：node tools/update-data.mjs [options]

--source-licenses <url|path>     TFDA 37 JSON/ZIP
--source-appearance <url|path>   TFDA 42 JSON/ZIP
--source-ingredients <url|path>  TFDA 43 JSON/ZIP
--output <path>                  輸出 JSON（預設 data/appearance_data.json）
--images-dir <path>              WebP 目錄（預設 images）
--batch-size <n>                 每批筆數（預設 50）
--concurrency <n>                每批同時處理數（預設 4）
--limit <n>                      僅處理前 n 筆，輸出會標記 partial
--allow-small                    fixture／小批次測試時略過最低筆數 gate
--no-images                      只建資料，不下載圖片`);
}

export async function runUpdate(rawOptions = {}) {
  const options = {
    ...parseArgs([]),
    ...rawOptions
  };
  options.output = path.resolve(options.output);
  options.imagesDir = path.resolve(options.imagesDir);
  options.publicImagesDir = "images";

  console.log("下載並解析 TFDA 37、42、43 資料集…");
  const [licenses, appearance, ingredients] = await Promise.all([
    loadDataset(options.sourceLicenses, "TFDA 37", options),
    loadDataset(options.sourceAppearance, "TFDA 42", options),
    loadDataset(options.sourceIngredients, "TFDA 43", options)
  ]);

  const counts = { licenses: licenses.length, appearance: appearance.length, ingredients: ingredients.length };
  console.log(`來源筆數：37=${counts.licenses.toLocaleString()}、42=${counts.appearance.toLocaleString()}、43=${counts.ingredients.toLocaleString()}`);
  if (!options.allowSmall) {
    for (const [key, minimum] of Object.entries(MINIMUM_COUNTS)) {
      if (counts[key] < minimum) throw new Error(`${key} 僅 ${counts[key]} 筆，低於安全門檻 ${minimum}`);
    }
  }

  let records = normalizeRecords({ licenses, appearance, ingredients });
  const partial = options.limit !== null && options.limit < records.length;
  if (options.limit !== null) records = records.slice(0, options.limit);

  const previous = await readPreviousDataset(options.output);
  const previousByLicense = new Map((previous?.records || []).map((record) => [record.licenseNumber, record]));
  const stats = { processed: 0, reused: 0, failed: 0, missing: 0 };

  for (let start = 0; start < records.length; start += options.batchSize) {
    const batch = records.slice(start, start + options.batchSize);
    const batchNumber = Math.floor(start / options.batchSize) + 1;
    const batchTotal = Math.ceil(records.length / options.batchSize);
    console.log(`圖片批次 ${batchNumber}/${batchTotal}（${start + 1}-${start + batch.length}）`);
    await mapWithConcurrency(batch, options.concurrency, async (record) => {
      await processRecordImages(record, previousByLicense.get(record.licenseNumber), options, stats);
    });
  }

  const dataset = {
    schemaVersion: "1.0.0",
    generatedAt: previous?.generatedAt || null,
    partial,
    sources: Object.fromEntries(Object.entries(SOURCE_META).map(([key, meta]) => [key, {
      ...meta,
      downloadUrl: options[`source${key[0].toUpperCase()}${key.slice(1)}`]
    }])),
    records
  };

  const changed = !previous
    || datasetFingerprint(dataset) !== datasetFingerprint(previous)
    || stats.processed > 0;
  if (changed) dataset.generatedAt = new Date().toISOString();

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(`完成：${records.length.toLocaleString()} 筆；新處理 ${stats.processed}、重用 ${stats.reused}、失敗 ${stats.failed}、無圖 ${stats.missing}`);
  return { dataset, stats, changed };
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) showHelp();
    else await runUpdate(options);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
