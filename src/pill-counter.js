/**
 * 裸錠計數流程骨架：本機影像、Worker、視覺點與總數。
 * 不提供人工補點或刪點 API。
 */

export function createCounter(worker) {
  return {
    count(imageBitmap) {
      return new Promise((resolve, reject) => {
        const onMessage = ({ data }) => {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          resolve(data);
        };
        const onError = (error) => {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          reject(error);
        };
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        worker.postMessage({ type: "COUNT_PILLS", imageBitmap }, [imageBitmap]);
      });
    },
    renderMarkers(points, context, width, height) {
      context.clearRect(0, 0, width, height);
      for (const point of points) {
        const x = point.x * width;
        const y = point.y * height;
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.fillStyle = "rgba(0, 160, 120, 0.75)";
        context.fill();
      }
    }
  };
}

