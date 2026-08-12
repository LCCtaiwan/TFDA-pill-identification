# PROGRESS

## 目前狀態

- Change ID：`C-005`
- 狀態：準備立即啟動六批可續傳首建；先發布可搜尋文字資料，再補圖片。
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

## 進行中

- 推送並啟動 `C-005` 首建 workflow，確認正式資料筆數大於 1,000。

## 下一步

1. 確認文字資料先行發布與 Pages 重新部署。
2. 監看六批圖片逐批提交；失敗時由未完成批次續跑。
3. 監看正式圖片總量與 Pages 1 GB 安全門檻。
4. 再回到 PWA shell／離線快取切片。
