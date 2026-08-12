import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatConsultationDraft,
  formatConsultationRecord,
  matchImprint,
  normalizeImprint,
  searchPills,
  tokenizeImprint
} from "../src/pill-search.js";

const completeRecord = {
  id: "A",
  licenseNumber: "衛部藥製字第000001號",
  brandName: "測試錠10毫克",
  nameEn: "TEST TABLETS 10MG",
  genericName: "ALPHA；BETA",
  imprints: ["APO-10", "BETA"],
  colors: ["白"],
  shapes: ["圓形"],
  scores: [true],
  strengths: ["ALPHA 10 MG", "BETA 0.5 MG"],
  ingredients: [],
  images: []
};

const missingRecord = {
  id: "B",
  licenseNumber: "衛部藥製字第000002號",
  brandName: "資料不足錠",
  nameEn: "UNKNOWN TABLETS",
  genericName: "",
  imprints: [],
  colors: [],
  shapes: [],
  scores: [],
  strengths: [],
  ingredients: [],
  images: []
};

test("刻痕 normalization 將常見分隔符轉成相同 token", () => {
  assert.equal(normalizeImprint(" apo／10 "), "APO 10");
  assert.deepEqual(tokenizeImprint("APO-10"), ["APO", "10"]);
});

test("刻痕依 Exact、Prefix、Contains 分級", () => {
  assert.deepEqual(matchImprint("APO-10", ["APO/10"]), { state: "match", level: "exact" });
  assert.deepEqual(matchImprint("AP-1", ["APO", "10"]), { state: "match", level: "prefix" });
  assert.deepEqual(matchImprint("PO", ["APO"]), { state: "match", level: "contains" });
});

test("單一字元不做 Contains，但仍允許 Exact 與 Prefix", () => {
  assert.deepEqual(matchImprint("P", ["APO"]), { state: "mismatch", level: null });
  assert.deepEqual(matchImprint("A", ["APO"]), { state: "match", level: "prefix" });
  assert.deepEqual(matchImprint("A", ["A"]), { state: "match", level: "exact" });
});

test("已知不符被排除，missing data 保留並排在後方", () => {
  const wrongColor = { ...completeRecord, id: "C", licenseNumber: "C", colors: ["藍"] };
  const results = searchPills([missingRecord, wrongColor, completeRecord], { color: "白" });
  assert.deepEqual(results.map((record) => record.id), ["A", "B"]);
  assert.equal(results[0].resultGroup, "matched");
  assert.deepEqual(results[1].missingFields, ["顏色"]);
});

test("諮詢文字含刻痕、藥名、商品名、含量與許可證", () => {
  const recordText = formatConsultationRecord(completeRecord);
  assert.match(recordText, /刻痕／標註：APO-10；BETA；有分割線/);
  assert.match(recordText, /藥名（成分）：ALPHA；BETA/);
  assert.match(recordText, /商品名：測試錠10毫克/);
  assert.match(recordText, /含量規格：ALPHA 10 MG；BETA 0.5 MG/);
  assert.match(formatConsultationDraft([completeRecord, missingRecord]), /【辨識藥品 2】/);
});
