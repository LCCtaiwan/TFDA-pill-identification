import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatConsultationDraft,
  formatConsultationRecord,
  formatConsultationStrength,
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
  dosageForm: "錠劑",
  imprints: ["APO-10", "BETA"],
  colors: ["白"],
  shapes: ["圓形"],
  scores: [true],
  strengths: ["ALPHA 10 MG", "BETA 0.5 MG"],
  ingredients: [
    { name: "ALPHA", amount: "10", unit: "MG", label: "EACH TABLET CONTAINS:" },
    { name: "BETA", amount: "0.5", unit: "MG", label: "EACH TABLET CONTAINS:" }
  ],
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

test("諮詢文字每顆一行，只含刻痕、學名、商品名與含量規格", () => {
  const recordText = formatConsultationRecord(completeRecord);
  assert.equal(recordText, "APO-10 / BETA ALPHA + BETA 測試錠10毫克 10 mg + 0.5 mg/tab");
  assert.equal(formatConsultationStrength(completeRecord), "10 mg + 0.5 mg/tab");
  assert.equal(formatConsultationDraft([completeRecord, missingRecord]).split("\n").length, 2);
  assert.doesNotMatch(recordText, /許可證/);
});
