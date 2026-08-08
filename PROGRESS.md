# PROGRESS

## 目前狀態

- Change ID：`C-001`
- 狀態：專案骨架與規格文件完成，尚未進入功能實作。
- Git：已初始化並完成初始 commit，無遠端推送。

## 已完成

- 建立 README、SPEC、SDD、CHANGELOG 與 `docs/develog.md`。
- 建立 `src/`、`src/workers/`、`data/`、`public/`、`tests/` 目錄。
- 建立 `appearance_data.json` 與三個核心模組／Worker 的最小介面骨架。
- 定義上游 `liangRXdev/TFDA-drug-info-search` 的資料整合方向。

## 進行中

- 無；下一階段是先完成 PWA shell 與離線資料載入，再接入測試資料。

## 下一步

1. 補上 `public/index.html`、manifest、CSP 與 Service Worker。
2. 接入一份可驗證的 TFDA 資料快照與資料版本檢查。
3. 實作刻痕搜尋與固定 fixture 測試。
4. 實作計數 Worker，建立基準照片與效能測試。
5. 最後接 Gemini BYOK adapter 與線上／離線降級。
