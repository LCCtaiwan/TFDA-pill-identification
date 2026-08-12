# CHANGELOG

## C-001 — 2026-08-08

- 建立 TFDA 藥品辨識 PWA 的新專案骨架。
- 新增 README、SPEC、SDD、PROGRESS 與 `docs/develog.md`。
- 新增 `appearance_data.json`、搜尋／Gemini／計數模組與 Worker 的架構檔案。
- 定義 Offline-first、BYOK、CSP、資料來源責任與裸錠計數的藥師目視 QC 規則。
- 驗證：文件檢查、JSON 解析、JavaScript 語法檢查與 Git 初始提交均完成。

## C-002 — 2026-08-12

- 新增 TFDA 37／42／43 Node.js 22 資料整合與來源安全 gate。
- 新增 `sharp` 640px WebP、固定批次、有限 concurrency、URL 增量重用與 hash 分目錄。
- 新增刻痕 Exact／Prefix／Contains、單字元規則、顏色／形狀／分割線與 missing-data 三態。
- 新增多筆諮詢紀錄，可複製刻痕／標註、藥名、商品名、含量規格與許可證。
- 新增每週／手動資料更新與 GitHub Pages workflow，Actions 使用固定 commit SHA。
- 新增 8 項測試、資料驗證、950 MiB Pages 安全門檻與桌機／手機瀏覽器驗收。
- 驗證：`npm run check`、真實 TFDA 兩筆圖片首次處理／第二次重用、Playwright console 0 error／0 warning。
