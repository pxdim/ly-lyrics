/**
 * Layout 與 ThemeApplier 整合測試
 *
 * 驗證 layout.tsx 正確引入並使用了 ThemeApplier 元件。
 * 因為 layout.tsx 是 server component，使用原始碼分析驗證。
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const layoutSource = readFileSync(
  resolve(__dirname, "layout.tsx"),
  "utf-8",
);

describe("Layout 整合 ThemeApplier", () => {
  it("layout.tsx 引入 ThemeApplier 元件", () => {
    expect(layoutSource).toContain("ThemeApplier");
  });

  it("layout.tsx 在 body 中渲染 <ThemeApplier />", () => {
    expect(layoutSource).toContain("<ThemeApplier");
  });

  it("layout.tsx 從 @/components/ThemeApplier 引入", () => {
    expect(layoutSource).toMatch(
      /import.*ThemeApplier.*from.*["']@\/components\/ThemeApplier["']/,
    );
  });
});
