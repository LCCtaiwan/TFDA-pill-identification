# SDD：TFDA 藥品辨識 PWA

## 1. 設計原則

1. **TFDA authoritative**：藥品身分與正式資訊只從版本化 TFDA 資料確認。
2. **Offline-first**：離線是預期狀態，不是例外；網路只提升資料更新與 Gemini 能力。
3. **Evidence before conclusion**：刻痕與圖片是證據欄位，候選結果必須能回到來源資料核對。
4. **Human-in-the-loop**：計數畫面讓藥師目視確認標記完整性，不提供容易造成誤操作的人工改點功能。
5. **最小依賴**：MVP 採 Vanilla JS、原生 PWA API 與 Web Worker，避免增加手機端下載與維護負擔。

## 2. 整合上游 repo

上游 `TFDA-drug-info-search` 採純靜態 SPA、Vanilla JS、Python ETL、GitHub Actions 與 GitHub Pages。新專案採「資料管線沿用、功能模組新增」策略：

```text
TFDA open data
      │
      ▼
上游 build_data.py / GitHub Actions
      │
      ├── drugs_data.json ───────┐
      ├── 外觀／圖片資料 ─────────┤
      └── 仿單／健保關聯 ─────────┤
                                  ▼
                         PWA 本機快取層
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
             藥品查詢       pill-search.js    pill-counter.js
                                                   │
                                      Web Worker / local CV
```

本專案 `appearance_data.json` 是針對裸錠搜尋的正規化索引，不取代上游正式藥品資料；每筆資料需帶 `tfda_license_id` 或等價關聯鍵。

## 3. 目錄與模組責任

### `src/pill-search.js`

- 載入並正規化刻痕與外觀索引。
- 提供精確、模糊、複合條件搜尋。
- 回傳候選與來源欄位，不自行宣稱已辨識。
- 在離線時只讀本地資料；不得偷偷 fallback 到遠端 API。

### `src/gemini-vision.js`

- 接受使用者主動提供的 BYOK key 與圖片。
- 只在確認網路可用時呼叫 Gemini Vision。
- 將回應限制為 schema 化影像特徵：`shape`、`color`、`imprint`、`score`、`notes`。
- key 只存在呼叫期間的記憶體，呼叫完成後清除引用；不寫入任何持久化儲存。
- 任何模型錯誤、逾時、無網路都回傳可理解的狀態物件。

### `src/pill-counter.js`

- 管理拍照、影像尺寸限制、Worker 任務與結果狀態。
- 接收 Worker 回傳的 normalized center points。
- 只提供 `renderMarkers()` 與總數，不提供 `addPoint()`／`removePoint()`。
- 原始照片與點位只存於目前頁面生命週期；除非明確選擇，不寫入 IndexedDB。

### `src/workers/pill-counter.worker.js`

- 在 Worker 執行本機影像前處理與候選中心點偵測。
- 不使用 fetch、不讀取 API key、不與外部服務通訊。
- 回傳 `{ points, count, confidence, warnings }`。
- 演算法先以可測試的 adapter 介面包裝，後續可替換 OpenCV.js、WASM 或本地模型。

## 4. 資料模型

### `data/appearance_data.json`

```json
{
  "schema_version": "0.1.0",
  "source": "TFDA",
  "updated_at": "YYYY-MM-DD",
  "records": [
    {
      "tfda_license_id": "sample-license-id",
      "imprints": ["ABC", "123"],
      "imprint_normalized": ["abc", "123"],
      "shape": "round",
      "color": ["white"],
      "score": null,
      "image_urls": [],
      "source_url": null
    }
  ]
}
```

MVP 先放空資料集與 schema metadata，避免把未驗證資料誤當成 TFDA 正式內容。

### 計數結果

```js
{
  points: [{ x: 0.23, y: 0.41 }], // 0..1 normalized coordinates
  count: 1,
  confidence: 0.0,
  warnings: ["需藥師肉眼確認每顆均有標記"]
}
```

不建立序號欄位，不保存人工修正欄位。

## 5. Offline-first 與快取

- App shell：`index.html`、CSS、JS、manifest、icons 由 Service Worker 預快取。
- TFDA JSON：stale-while-revalidate；離線先讀舊版本，線上背景更新並提示資料版本變更。
- `appearance_data.json`：與 TFDA 資料同批版本化，首次有網路時下載並快取。
- Gemini：不快取 API response；不在 Service Worker 中代理或保存 key。
- 計數：完全本機，沒有任何網路分支；即使 Service Worker 未啟用，也能在頁面生命週期內執行。

## 6. 安全設計

建議部署回應標頭：

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' blob: data: https:;
  connect-src 'self' https://generativelanguage.googleapis.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
```

- 不使用 inline event handler 或 `eval`。
- BYOK key 不進 localStorage、sessionStorage、IndexedDB、URL、錯誤訊息或 analytics。
- 圖片上傳前顯示目的地、網路需求與使用者確認；預設不傳送。
- 任何候選結果均顯示來源與不確定性；TFDA 無匹配時不得以 Gemini 推測補上藥名。

## 7. 錯誤與降級

| 狀態 | 行為 |
| --- | --- |
| 無網路 | 保留 TFDA／刻痕查詢與計數；停用 Gemini 並顯示提示 |
| 尚未快取資料 | 顯示需先連線完成資料初始化，不顯示空白或假結果 |
| Gemini key 缺失 | 提供刻痕搜尋與計數；圖片辨識顯示 BYOK 入口 |
| Gemini 失敗 | 清除本次 key 引用，保留原圖於本頁，允許重試或改用刻痕搜尋 |
| Worker 失敗 | 顯示無法計數的原因，允許重新拍照；不自動送雲端 |
| 低信心／重疊 | 顯示警告並要求藥師肉眼核對，不自動修正數量 |

## 8. 驗證策略

- 單元測試：刻痕 normalization、精確／模糊搜尋排序、資料 schema、Gemini response schema。
- Worker 測試：固定基準圖的點數、normalized coordinates、空圖／重疊警告。
- PWA 測試：首次快取、斷網重開、SWR 更新提示、舊資料版本回退。
- 安全測試：掃描版本庫與建置輸出是否含 key；確認 CSP 阻擋 inline script。
- 實機驗收：iOS Safari 與 Android Chrome，至少測試 0、1、10、100 顆及不同光線背景。

## 9. C-002：TFDA 外觀資料管線

- 官方來源：`https://data.fda.gov.tw/data/opendata/export/42/json`（ZIP 內含 UTF-8 JSON array）。
- canonical output：`data/appearance_data.json`；圖片輸出至 `images/*.webp`。
- 正規化保留原始中文值，並產生前端比對用陣列；空字串與 `null` 統一視為 missing。
- 刻痕欄轉為 `true`、`false`、`null` 三態；標註一／二拆成刻字 token，不把「無」當成刻字。
- 圖片檔名以許可證字號的 SHA-256 前綴產生，並依前 2 碼分成 `images/xx/`，避免單一目錄超過 GitHub 建議的 3,000 entries；圖片 URL 改變時穩定覆寫同一位置。
- 只有成功產出新 WebP 後才更新該筆圖片 metadata；失敗時若舊圖仍對應舊 URL，不冒充新圖。
- full run 必須通過最低筆數與許可證覆蓋率 gate，避免來源 schema 改變時以空資料覆蓋正常資料。
- 圖片總量超過 950 MiB 時中止 commit，保留 GitHub Pages 1 GB 上限的餘裕。

## 10. C-002：搜尋語意

每個使用中的條件回傳 `match`、`mismatch` 或 `unknown`：

- 任一已知欄位 `mismatch`：排除。
- 沒有 mismatch，但至少一欄 `unknown`：保留為資料不足候選，排在完整匹配之後。
- 刻字 match 依 Exact、Prefix、Contains 排序；query token 長度為 1 時不執行 Contains。
- UI 限制一次渲染筆數，但保留完整命中／資料不足計數，避免大量 DOM 節點拖慢手機。
