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
- 新增多筆諮詢紀錄；每顆一行，只複製刻痕、學名、商品名與 `mg/tab` 等含量規格。
- 新增每週／手動資料更新與 GitHub Pages workflow，Actions 使用固定 commit SHA。
- 新增 8 項測試、資料驗證、950 MiB Pages 安全門檻與桌機／手機瀏覽器驗收。
- 驗證：`npm run check`、真實 TFDA 兩筆圖片首次處理／第二次重用、Playwright console 0 error／0 warning。

## C-003 — 2026-08-12

- 實際操作作者的 `pill-detective-tw` 後，將顏色與形狀改為可複選按鈕，點選即更新下方候選。
- 刻痕改為 TFDA 原值「不限／無／直線／十字」按鈕，修正舊版布林模型會遺失直線與十字的問題。
- 未選任何條件時顯示開始提示，不再預先繪製全部候選；移除一般使用者不需要的搜尋演算法說明。
- 驗證：`npm run check`，10 tests、0 failure。
