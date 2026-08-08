/**
 * Gemini Vision BYOK adapter 骨架。
 * API key 只由呼叫端在記憶體中傳入；此模組不得寫入任何持久化儲存。
 */

export async function extractPillFeatures({ apiKey, image, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("Gemini Vision 需要使用者提供 BYOK API key");
  if (!navigator.onLine) throw new Error("Gemini Vision 需要網路連線");
  if (!image) throw new Error("缺少待分析圖片");

  // TODO: 接入正式 Gemini endpoint、request schema 與 response schema 驗證。
  void fetchImpl;
  return {
    source: "gemini-vision",
    features: {
      shape: null,
      color: [],
      imprint: [],
      score: null,
      notes: []
    },
    disclaimer: "僅為影像特徵擷取，須回到 TFDA 資料由藥師核對"
  };
}

