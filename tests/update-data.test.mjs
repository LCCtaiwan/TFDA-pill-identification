import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { decodeDatasetBytes, normalizeRecords, writeWebp } from "../tools/update-data.mjs";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

test("normalization 以許可證合併 37、42、43", async () => {
  const records = normalizeRecords({
    licenses: await fixture("licenses"),
    appearance: await fixture("appearance"),
    ingredients: await fixture("ingredients")
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].brandName, "測試錠10毫克");
  assert.equal(records[0].genericName, "ALPHA；BETA");
  assert.deepEqual(records[0].colors, ["白", "紅"]);
  assert.deepEqual(records[0].scores, [true, false]);
  assert.deepEqual(records[0].strengths, ["ALPHA 10 MG", "BETA 0.5 MG"]);
  assert.deepEqual(records[1].imprints, []);
});

test("dataset decoder 接受未壓縮 JSON", () => {
  const bytes = new TextEncoder().encode('[{"許可證字號":"A"}]');
  assert.deepEqual(decodeDatasetBytes(bytes, "fixture"), [{ "許可證字號": "A" }]);
});

test("sharp 產生最長邊 640px 的 WebP", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "tfda-pill-test-"));
  const output = path.join(directory, "image.webp");
  const input = await sharp({
    create: { width: 1200, height: 600, channels: 3, background: "#ffffff" }
  }).png().toBuffer();
  const metadata = await writeWebp(input, output);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 640);
  assert.equal(metadata.height, 320);
});
