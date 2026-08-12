# TFDA 藥品外觀辨識

可部署至 GitHub Pages 的純靜態藥品外觀搜尋站。GitHub Actions 每週從 TFDA 官方公開資料下載最新內容，在雲端清理資料、把圖片縮至最長邊 640px 並轉成 WebP；瀏覽器端不需要後端或資料庫。

搜尋結果可加入「諮詢紀錄」，每顆一行，只複製「刻痕 學名 商品名 含量規格」：

```text
GL 500 Metformin Glucophage 500 mg/tab
```

## 功能

- 從 TFDA 37、42、43 三份官方資料，以許可證字號關聯商品名、主成分、含量、劑型、外觀與圖片。
- 刻痕／標註採 Exact → Prefix → Contains；單一字元不做 Contains。
- 可依顏色、形狀與分割刻痕複合搜尋。
- missing data 採三態：官方已提供且符合、已提供但不符、官方未提供。只有已知不符直接排除；未提供者保留為較低排序候選並清楚標記。
- 可累積多筆已確認藥品；剪貼簿每顆一行，只輸出刻痕、學名、商品名、含量規格。重新整理後清空，不保存病人資料。
- 圖片使用 `sharp` 等比例縮小至最長邊 640px、轉 WebP；原始大圖不落地。
- 每批固定筆數、有限 concurrency；圖片來源 URL 未變且 WebP 存在時直接重用。
- GitHub Actions 每週自動更新，也可從 Actions 頁面手動執行。
- GitHub Pages 使用獨立 workflow 發布 HTML／CSS／Vanilla JS／JSON／WebP。

## 官方資料來源

| Dataset | 用途 | 官方下載 |
| --- | --- | --- |
| TFDA 37 未註銷藥品許可證 | 商品名、英文品名、主成分、劑型、包裝 | `https://data.fda.gov.tw/data/opendata/export/37/json` |
| TFDA 42 藥品外觀 | 形狀、顏色、刻痕、標註、尺寸、圖片 URL | `https://data.fda.gov.tw/data/opendata/export/42/json` |
| TFDA 43 詳細處方成分 | 成分名稱、含量、單位、處方標示 | `https://data.fda.gov.tw/data/opendata/export/43/json` |

三個 endpoint 目前回傳 ZIP，內含 UTF-8 JSON array。更新腳本同時支援 URL、ZIP 檔與未壓縮 JSON fixture。

## 本機執行

需求：Node.js 22+。

```bash
npm ci
npm test
npm run serve
```

開啟 `http://localhost:8000`。初始 repository 刻意保留空的 `data/appearance_data.json`；推到 GitHub 後，第一次資料更新 workflow 會建立完整資料與圖片。

若要在本機完整更新：

```bash
npm run update:data
npm run validate:data -- --require-data
```

常用參數：

```text
--batch-size 50       每批筆數
--concurrency 4       同時處理圖片數
--limit 10            僅做小批次驗證，輸出標記 partial
--allow-small         fixture／小批次略過最低筆數 gate
--no-images           只建資料，不下載圖片
```

## GitHub 部署

1. 將 repository 推到 GitHub，預設分支設為 `main`。
2. Repository Settings → Pages → Source 選擇 **GitHub Actions**。
3. 第一次推送會執行：
   - `Update TFDA data`：測試、抓資料、增量處理圖片、驗證後 commit 回 `main`。
   - `Deploy GitHub Pages`：把靜態檔案組成 Pages artifact 並發布。
4. 若第一次資料更新未自動啟動，到 Actions → **Update TFDA data** → **Run workflow** 手動執行。

排程為每週日 `18:17 UTC`，即台灣時間每週一 `02:17`。排程只在 default branch 執行；公開 repository 若連續 60 天沒有活動，GitHub 可能自動停用 scheduled workflow，屆時可手動重新啟用。

### 更新流程

```text
GitHub Actions
  ├─ 下載 TFDA 37 / 42 / 43 ZIP
  ├─ schema 與最低筆數 gate
  ├─ 以許可證字號合併與 normalization
  ├─ 每 50 筆一批
  │    ├─ URL 未變 + WebP 存在 → reuse
  │    └─ 新增／URL 改變 → download → sharp → 640px WebP
  ├─ 驗證 JSON、圖片存在、WebP 尺寸與總容量
  └─ 有實質變更才 commit / push
          ↓
     Pages workflow 自動重新發布
```

圖片依許可證 SHA-256 前綴分散到 `images/00/` 至 `images/ff/`，避免單一目錄放入數千檔案。驗證器在圖片超過 950 MiB 時中止 commit，為 GitHub Pages 的 1 GB site limit 保留餘裕。

## 主要檔案

```text
.
├── index.html                         搜尋與諮詢紀錄介面
├── styles.css                         響應式樣式
├── app.js                             資料載入、畫面與複製流程
├── src/pill-search.js                 normalization、搜尋、諮詢文字格式
├── tools/update-data.mjs              TFDA ETL、批次／增量圖片處理
├── tools/validate-data.mjs            schema、檔案、尺寸與容量 gate
├── data/appearance_data.json          前端讀取的 canonical JSON
├── images/                             產生的 WebP（依 hash 前綴分目錄）
├── tests/                              搜尋、missing data、ETL、sharp 測試
└── .github/workflows/
    ├── update-data.yml                 每週／手動資料更新
    └── pages.yml                       GitHub Pages 部署
```

## 驗證

```bash
npm run check
node --check app.js
node --check tools/update-data.mjs
```

目前單元測試涵蓋：刻痕 normalization、Exact／Prefix／Contains、單字元規則、missing-data 保留、諮詢文字、三資料集合併與 640px WebP。

## 安全與限制

- 本站是藥品辨識輔助，不可取代醫師診斷、處方、藥師指導或實物核對。
- TFDA 未提供的內容顯示「資料未提供」，不從商品名猜測成分或含量。
- 諮詢紀錄只存在目前頁面的記憶體；不寫入 localStorage、IndexedDB 或遠端服務。
- GitHub Pages 為公開靜態網站，請勿在 repository、Actions log 或頁面資料中放入病人資訊或 API key。
- 完整首次圖片更新可能花費較久；後續通常只下載新增或圖片 URL 已變更的項目。

## 參考與歸屬

架構方向參考 [liangRXdev/TFDA-drug-info-search](https://github.com/liangRXdev/TFDA-drug-info-search)，使用者已表示取得作者同意。詳見 [NOTICE.md](NOTICE.md)。

TFDA 資料依各政府資料集頁面所示之政府資料開放授權條款使用。
