/**
 * 完全離線的計數 Worker 介面骨架。
 * 實作影像演算法時，輸出仍維持 normalized center points，不加入序號。
 */

self.addEventListener("message", async ({ data }) => {
  if (data?.type !== "COUNT_PILLS") return;

  // TODO: 將 imageBitmap 交給本機 CV adapter，處理光線、重疊與背景雜訊。
  self.postMessage({
    points: [],
    count: 0,
    confidence: 0,
    warnings: ["計數演算法尚未接入；完成後仍需藥師肉眼確認每顆均有標記"]
  });
});

