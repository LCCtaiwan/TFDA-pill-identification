import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bootstrapPath = new URL("../.github/workflows/bootstrap-images.yml", import.meta.url);
const updatePath = new URL("../.github/workflows/update-data.yml", import.meta.url);

test("首次匯入會在文字資料與完整圖片完成後部署 Pages", async () => {
  const workflow = await readFile(bootstrapPath, "utf8");

  assert.match(workflow, /actions: write/);
  assert.equal(workflow.match(/gh workflow run pages\.yml --ref main/g)?.length, 2);
});

test("每週更新只在資料有變更時部署 Pages", async () => {
  const workflow = await readFile(updatePath, "utf8");

  assert.match(workflow, /actions: write/);
  assert.match(workflow, /changed=true/);
  assert.match(workflow, /if: steps\.commit\.outputs\.changed == 'true'/);
  assert.match(workflow, /gh workflow run pages\.yml --ref main/);
});
