import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const requireData = process.argv.includes("--require-data");
const requireImagesComplete = process.argv.includes("--require-images-complete");
const dataPath = path.resolve("data/appearance_data.json");
const dataset = JSON.parse(await readFile(dataPath, "utf8"));

if (dataset.schemaVersion !== "1.0.0") throw new Error("schemaVersion 必須是 1.0.0");
if (!Array.isArray(dataset.records)) throw new Error("records 必須是 array");
if (requireData && dataset.records.length < 1_000) throw new Error("正式更新後 records 應至少 1,000 筆");

const licenses = new Set();
const referencedImages = [];
const unprocessedImages = [];
let imageBytes = 0;
for (const record of dataset.records) {
  if (!record.licenseNumber) throw new Error("record 缺少 licenseNumber");
  if (licenses.has(record.licenseNumber)) throw new Error(`重複許可證：${record.licenseNumber}`);
  licenses.add(record.licenseNumber);
  if (!Array.isArray(record.imprints) || !Array.isArray(record.colors) || !Array.isArray(record.shapes)) {
    throw new Error(`${record.licenseNumber} 的外觀欄位型別錯誤`);
  }
  for (const image of record.images || []) {
    if (image.status === "available" && image.path) referencedImages.push(image.path);
    if (image.status === "unprocessed") unprocessedImages.push(`${record.licenseNumber}: ${image.sourceUrl}`);
  }
}

if (requireImagesComplete && unprocessedImages.length) {
  throw new Error(`仍有 ${unprocessedImages.length.toLocaleString()} 張圖片未處理`);
}

for (const imagePath of referencedImages) {
  await access(path.resolve(imagePath));
  imageBytes += (await stat(path.resolve(imagePath))).size;
}

const maximumSiteImageBytes = 950 * 1024 * 1024;
if (imageBytes > maximumSiteImageBytes) {
  throw new Error(`圖片總量 ${(imageBytes / 1024 / 1024).toFixed(1)} MiB，超過 GitHub Pages 安全門檻 950 MiB`);
}

for (const imagePath of referencedImages.slice(0, 100)) {
  const metadata = await sharp(path.resolve(imagePath)).metadata();
  if (metadata.format !== "webp") throw new Error(`${imagePath} 不是 WebP`);
  if (metadata.width > 640 || metadata.height > 640) throw new Error(`${imagePath} 超過 640px`);
}

if (!dataset.records.length) console.warn("提醒：目前是尚未執行第一次更新的空資料集。 ");
console.log(`資料驗證通過：${dataset.records.length.toLocaleString()} 筆、${referencedImages.length.toLocaleString()} 張圖片、${(imageBytes / 1024 / 1024).toFixed(1)} MiB。`);
