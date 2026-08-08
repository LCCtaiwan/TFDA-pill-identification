# Development Log

## Current Goal

建立「TFDA 藥品辨識」新專案的可接續骨架與設計文件，讓後續實作可沿用上游 TFDA 靜態資料管線，並逐步加入裸錠搜尋、Gemini Vision 與完全離線的裸錠計數。

## Stack And Run Commands

- 前端：HTML5、CSS3、Vanilla JavaScript。
- PWA：Web App Manifest、Service Worker、Cache API。
- 影像：Canvas／Web Worker；後續可插拔 OpenCV.js、WASM 或本地模型。
- 資料：TFDA 版本化 JSON；`appearance_data.json` 為裸錠搜尋索引。
- Gemini：BYOK、線上限定、只做影像特徵擷取。
- 本地預覽：`python3 -m http.server 8000 -d public`。

## Brainstorming Summary

- 核心問題不是「讓 AI 猜藥」，而是讓藥師在訊號差的地方仍可快速取得 TFDA 資訊與檢查裸錠。
- 裸錠計數畫面採 PillEye 類似的視覺點標記：每顆只標一個點，不顯示數字。
- 計數不提供人工補點／刪點；藥師以肉眼確認點是否覆蓋每顆藥，下方顯示總數。
- Gemini 是加值能力，必須與資料查詢、計數的離線路徑隔離。

## SDD

- 沿用 `liangRXdev/TFDA-drug-info-search` 的純靜態、Vanilla JS、Python ETL、GitHub Actions 與 Service Worker 方向。
- 上游資料維持 TFDA 正式來源；新專案新增 `appearance_data.json` 作為可追溯的外觀／刻痕索引。
- `pill-search.js`、`gemini-vision.js`、`pill-counter.js` 與 `pill-counter.worker.js` 分離責任。
- 不持久化 API key，不在 Service Worker 代理 Gemini，不把模型回答當成藥品身分。

## Completed Work

### C-001 — 2026-08-08

- 已建立專案目錄：`src/`、`src/workers/`、`data/`、`public/`、`tests/`、`docs/`。
- 已完成 README、SPEC、SDD、PROGRESS、CHANGELOG。
- 已完成 `appearance_data.json` schema 預留與核心模組骨架。
- 已完成初步安全、快取、roadmap、驗收指標與風險文件。

## Accepted / Rejected Outputs

- Accepted：以 Vanilla JS + PWA 作為 MVP 基礎，因上游 repo 已採同一方向。
- Accepted：計數完全離線、視覺點、不編號、不人工改點。
- Rejected：Gemini 直接做藥品最終辨識；這不符合 TFDA authoritative 與醫療風險邊界。
- Rejected：以即時網路服務作為計數依賴；這不符合院內訊號不穩情境。

## Current Checkpoint

- 規格與設計已可供實作，初始資料集刻意保持空白，避免未驗證資料被誤認為 TFDA 正式資料。
- 初始 Git commit 完成後，下一個可驗證成果是「PWA shell 可安裝、可快取、斷網重開」。

## Verification Status

- 文件與目錄驗證：pass；已確認 14 個版本控制檔案與必要目錄 placeholder。
- JSON schema syntax：pass；`python3 -m json.tool data/appearance_data.json`。
- JavaScript syntax：pass；四個骨架模組均通過 `node --check`。
- Git 初始提交：pass；`d66a1fb`，無遠端推送。
