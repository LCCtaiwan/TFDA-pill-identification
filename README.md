# TFDA 藥品辨識 PWA

提供藥師在院內訊號不穩或完全離線時，查詢 TFDA 藥品資料、辨識裸錠特徵，以及快速估算裸錠數量的 Offline-first PWA。

## 專案定位

- **TFDA 是最終藥品資料來源**：藥名、成分、許可證、外觀、仿單與健保資料以 TFDA 整合資料為準。
- **Gemini Vision 只做影像特徵擷取**：不得直接把模型回答當成藥品身分或臨床結論。
- **核心功能可離線**：藥品查詢、刻痕搜尋與裸錠計數不依賴即時 API；Gemini 圖片辨識需要網路。
- **計數由藥師肉眼確認**：每顆只顯示視覺點標記，不顯示序號、不提供人工補點或刪點，下方只顯示總數。

## 三大功能

1. **藥品資訊查詢**：品名、成分、許可證、外觀、仿單與健保規範。
2. **裸錠辨識**：刻痕精確／模糊搜尋、Gemini Vision 圖片特徵擷取、刻痕＋圖片並存，以及批次多顆候選整理。
3. **裸錠計數**：本機影像處理，於照片上的每顆藥錠中心疊加視覺點，並顯示總數。

## 上游整合方向

本專案延伸 [liangRXdev/TFDA-drug-info-search](https://github.com/liangRXdev/TFDA-drug-info-search) 的靜態資料與 PWA 方向。上游目前以 Python ETL 與 GitHub Actions 定期整理 TFDA 資料，輸出前端可快取的 JSON；新專案保留該資料管線的責任邊界，新增 `appearance_data.json` 與裸錠搜尋／辨識模組。

第一階段不直接複製上游完整資料或改寫上游 repo，而是先建立整合介面：

- 以 `drug_id`／許可證字號作為藥品資料的關聯鍵。
- 將上游 `drugs_data.json`、外觀資料與本專案 `appearance_data.json` 以版本化資料快取提供給前端。
- Service Worker 對靜態殼層採 network-first / cache fallback，對大型資料採 stale-while-revalidate。
- 未來可將本專案前端模組合併回上游 repo，或以獨立 GitHub Pages 應用部署。

## 目錄

```text
.
├── README.md
├── SPEC.md                  # 產品範圍與驗收條件
├── SDD.md                   # 系統設計與資料流
├── PROGRESS.md              # 目前狀態
├── CHANGELOG.md             # 變更摘要
├── docs/develog.md          # 詳細開發紀錄
├── data/appearance_data.json
├── public/                  # PWA 靜態入口與 manifest 預留
├── src/
│   ├── pill-search.js       # 刻痕與外觀資料搜尋
│   ├── gemini-vision.js     # BYOK、線上影像特徵擷取
│   ├── pill-counter.js      # 計數流程與視覺點模型
│   └── workers/pill-counter.worker.js
└── tests/                   # 單元、離線與驗收測試預留
```

## 開發方式

目前為規劃與骨架階段，採用無框架 Vanilla JS、Web Worker、Canvas／OffscreenCanvas 與 PWA API。瀏覽器必須透過 HTTP(S) 啟動，不能直接用 `file://` 讀取 JSON。

```bash
python3 -m http.server 8000 -d public
```

後續完成入口頁後，從 `http://localhost:8000` 開啟。實機驗證需使用 HTTPS 或 localhost，並以手機瀏覽器檢查相機、Service Worker 與離線行為。

## 安全與使用限制

- Gemini API Key 採 BYOK，僅存在記憶體或使用者主動提供的短期 session，不寫入 localStorage、IndexedDB、URL、日誌或版本庫。
- CSP 預設禁止 inline script、object、未列入 allowlist 的連線與 frame；Gemini endpoint 只在使用者啟用圖片辨識時呼叫。
- Gemini 結果只能形成候選特徵與搜尋提示；最終藥品資訊必須回到 TFDA 資料核對。
- 系統不是自動調劑、處方決策或藥品最終確認工具；介面需保留藥師人工核對與不確定性提示。

## 文件

- [SPEC.md](SPEC.md)：目標、範圍、需求與驗收指標。
- [SDD.md](SDD.md)：模組、資料模型、快取、安全與錯誤降級設計。
- [PROGRESS.md](PROGRESS.md)：目前 checkpoint 與下一步。
- [docs/develog.md](docs/develog.md)：決策、驗證證據與開發歷程。

