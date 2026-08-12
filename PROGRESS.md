# PROGRESS

## 目前狀態

- Change ID：`C-006`
- 狀態：6,295 筆文字資料已上線；圖片前三批已提交，補上資料更新後明確部署 Pages 的流程。
- Git：遠端為 `LCCtaiwan/TFDA-pill-identification`，`main` 已推送。

## 已完成

- 建立 README、SPEC、SDD、CHANGELOG 與 `docs/develog.md`。
- 建立 `src/`、`src/workers/`、`data/`、`public/`、`tests/` 目錄。
- 建立 `appearance_data.json` 與三個核心模組／Worker 的最小介面骨架。
- 定義上游 `liangRXdev/TFDA-drug-info-search` 的資料整合方向。
- 完成 TFDA 37／42／43 合併、批次／增量 WebP、純前端搜尋與諮詢紀錄。
- 完成每週／手動更新 workflow、Pages workflow、10 項測試與桌機／手機瀏覽器驗收。
- 完成顏色／形狀可複選按鈕與 TFDA 刻痕「無／直線／十字」模型校正。
- 顏色／形狀改用固定受控詞彙，首次全量資料完成前也可看見並點選。
- 已手動部署正式資料；公開網站已驗證可讀取 6,295 筆資料與 2,253 張第一、二批圖片。

## 進行中

- 原首建 workflow 已在第三批提交後停止，避免與 `C-006` 推送衝突；前三批資料均已保留。
- `C-006` 推送後，首建將從第四批續跑。

## 下一步

1. 推送 `C-006`，從第四批續跑圖片首建。
2. 監看剩餘圖片逐批提交並驗證自動 Pages 部署。
3. 監看正式圖片總量與 Pages 1 GB 安全門檻。
4. 再回到 PWA shell／離線快取切片。
