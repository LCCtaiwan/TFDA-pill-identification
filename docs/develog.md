# Development Log

## Current Goal

完成 `C-002`：把既有骨架推進為可直接上傳 GitHub 的最小完整藥品外觀搜尋站，包含 TFDA 37／42／43 資料整合、Node.js normalization、分批／增量 WebP 圖片處理、諮詢紀錄、純前端搜尋、每週 Actions、Pages 部署與基本測試。

## Stack And Run Commands

- 前端：HTML5、CSS3、Vanilla JavaScript。
- PWA：Web App Manifest、Service Worker、Cache API。
- 影像：Canvas／Web Worker；後續可插拔 OpenCV.js、WASM 或本地模型。
- 資料：TFDA 版本化 JSON；`appearance_data.json` 為裸錠搜尋索引。
- Gemini：BYOK、線上限定、只做影像特徵擷取。
- 本地預覽：`python3 -m http.server 8000 -d public`。
- 資料更新：Node.js 22+、`sharp`、TFDA 37／42／43。
- 本地預覽（C-002 起）：從 repository 根目錄執行 `npm run serve`。

## Brainstorming Summary

- 核心問題不是「讓 AI 猜藥」，而是讓藥師在訊號差的地方仍可快速取得 TFDA 資訊與檢查裸錠。
- 裸錠計數畫面採 PillEye 類似的視覺點標記：每顆只標一個點，不顯示數字。
- 計數不提供人工補點／刪點；藥師以肉眼確認點是否覆蓋每顆藥，下方顯示總數。
- Gemini 是加值能力，必須與資料查詢、計數的離線路徑隔離。

### C-002

- 這一輪只完成藥品外觀資料與確定性搜尋，不提前實作 Gemini 或裸錠計數。
- 官方 JSON 下載實際是 ZIP；2026-08-12 實測為 6,295 筆，欄位包含許可證、品名、形狀、顏色、刻痕、標註一／二與圖片 URL。
- 第一輪圖片量大，處理器一次只保留一小批圖片，原圖不落地；後續以許可證穩定檔名、來源圖片 URL 與既有 WebP 是否存在判定重用。
- missing data 採三態：已提供且符合、已提供但不符、官方未提供。只有「已提供但不符」直接排除；未提供者保留為低排序候選並顯示缺少欄位。
- 參考 `liangRXdev/TFDA-drug-info-search` 的靜態站與 Actions 責任邊界；使用者已取得作者同意。實質重用時仍以 MIT 歸屬資訊為準。

## SDD

- 沿用 `liangRXdev/TFDA-drug-info-search` 的純靜態、Vanilla JS、Python ETL、GitHub Actions 與 Service Worker 方向。
- 上游資料維持 TFDA 正式來源；新專案新增 `appearance_data.json` 作為可追溯的外觀／刻痕索引。
- `pill-search.js`、`gemini-vision.js`、`pill-counter.js` 與 `pill-counter.worker.js` 分離責任。
- 不持久化 API key，不在 Service Worker 代理 Gemini，不把模型回答當成藥品身分。

### C-002 資料與搜尋切片

```text
TFDA 37 / 42 / 43 JSON ZIP
        ↓
tools/update-data.mjs
        ├─ schema 驗證／欄位 normalization
        ├─ 固定批次 + 有限 concurrency
        ├─ URL 未變且 WebP 存在 → 重用
        └─ 新增／URL 變更 → 下載 → sharp 640px WebP
        ↓
data/appearance_data.json + images/*.webp
        ↓
index.html + app.js + src/pill-search.js
```

- 搜尋刻字依序分為 Exact、Prefix、Contains；單一字元不允許 Contains。
- 顏色、形狀與刻痕採確定性 AND 篩選；缺值不是不符合，而是 `unknown`。
- 已確認候選可累積成諮詢紀錄，輸出刻痕／標註、藥名（成分）、商品名、含量規格與許可證字號。
- Actions 的更新 job 可排程或手動觸發；資料有實質變更才 commit。Pages 由獨立 workflow 部署靜態檔案。

## Completed Work

### C-001 — 2026-08-08

- 已建立專案目錄：`src/`、`src/workers/`、`data/`、`public/`、`tests/`、`docs/`。
- 已完成 README、SPEC、SDD、PROGRESS、CHANGELOG。
- 已完成 `appearance_data.json` schema 預留與核心模組骨架。
- 已完成初步安全、快取、roadmap、驗收指標與風險文件。

### C-002 — 2026-08-12

- 已核對 TFDA 官方資料集頁、JSON ZIP endpoint 與 6,295 筆真實欄位樣本。
- 已核對參考 repository 的公開 metadata、README 與每週 Actions 觸發方式。
- 已定義本輪最小切片、missing-data 三態與增量圖片判定。
- 已完成 TFDA 37／42／43 ETL、WebP、搜尋 UI、諮詢紀錄、workflow、測試與瀏覽器驗收。
- 真實小批次驗證：第一次處理 2 張；第二次新處理 0、重用 2；WebP 最大邊分別為 582px 與 640px。
- Playwright 驗證桌機與 390×844 手機版；搜尋、資料不足候選、加入兩筆、複製均通過，console 0 error／0 warning。

## Accepted / Rejected Outputs

- Accepted：以 Vanilla JS + PWA 作為 MVP 基礎，因上游 repo 已採同一方向。
- Accepted：計數完全離線、視覺點、不編號、不人工改點。
- Rejected：Gemini 直接做藥品最終辨識；這不符合 TFDA authoritative 與醫療風險邊界。
- Rejected：以即時網路服務作為計數依賴；這不符合院內訊號不穩情境。

## Current Checkpoint

- `C-002` 本機實作與驗證完成，等待 GitHub 重新授權後建立 remote、推送、啟用 Pages 並觀察第一次完整資料更新。
- repository 內的初始資料集刻意保持空白；第一次 Actions 完整更新後才 commit 正式資料，避免把 2 筆驗證資料冒充完整資料。

## Verification Status

- 文件與目錄驗證：pass；已確認 14 個版本控制檔案與必要目錄 placeholder。
- JSON schema syntax：pass；`python3 -m json.tool data/appearance_data.json`。
- JavaScript syntax：pass；四個骨架模組均通過 `node --check`。
- Git 初始提交：pass；`d66a1fb`，無遠端推送。
- `npm run check`：pass；8 tests，0 failure。
- TFDA 真實小批次與圖片增量：pass。
- Playwright 桌機／手機搜尋與諮詢複製：pass；console 0 error／0 warning。
- GitHub 部署：等待帳號重新授權。
