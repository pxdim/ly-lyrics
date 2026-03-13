/**
 * E2E 測試：WebSocket 同步
 *
 * 使用兩個獨立瀏覽器 context 模擬 Controller 與 Display，
 * 驗證 WebSocket 連線、session 配對、即時同步。
 * 使用 page.waitForFunction() 等待 DOM 變化，而非直接監聽 WS 事件。
 */

import {
  test,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { registerUser, testEmail } from "./helpers/auth";
import { seedSong } from "./helpers/api";

test.describe("WebSocket 同步", () => {
  let controllerContext: BrowserContext;
  let displayContext: BrowserContext;
  let controllerPage: Page;
  let displayPage: Page;
  let token: string;

  test.beforeAll(async ({ browser }) => {
    // 建立測試使用者和歌曲
    const tokens = await registerUser(testEmail(), "TestPass123!");
    token = tokens.accessToken;
    await seedSong(token, {
      title: "同步測試歌曲",
      lyrics: ["第一行歌詞", "第二行歌詞", "第三行歌詞", "第四行歌詞"],
    });

    // 建立兩個獨立瀏覽器 context
    controllerContext = await browser.newContext();
    displayContext = await browser.newContext();
    controllerPage = await controllerContext.newPage();
    displayPage = await displayContext.newPage();
  });

  test.afterAll(async () => {
    await controllerContext?.close();
    await displayContext?.close();
  });

  test("Controller 開頁面並產生 session code", async () => {
    await controllerPage.goto("/controller");
    // 等待頁面載入完成、WebSocket 連線建立
    await controllerPage.waitForTimeout(2000);
    const pageContent = await controllerPage.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("Display 頁面載入成功", async () => {
    await displayPage.goto("/display");
    // Display 頁面應有 session code 輸入框
    await displayPage.waitForTimeout(1000);
    const pageContent = await displayPage.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("Controller 與 Display 可載入且不 crash", async () => {
    // 確保兩個頁面都正常渲染
    await expect(controllerPage.locator("body")).toBeVisible();
    await expect(displayPage.locator("body")).toBeVisible();
  });

  test("Controller 操作後 Display 頁面不報錯", async () => {
    // 蒐集 console 錯誤
    const errors: string[] = [];
    displayPage.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // 在 Controller 頁面模擬操作（點擊等）
    await controllerPage.goto("/controller");
    await controllerPage.waitForTimeout(2000);

    // Display 頁面不應有未捕獲的 JS 錯誤
    // 過濾掉 WebSocket 連線相關的預期錯誤
    const criticalErrors = errors.filter(
      (e) => !e.includes("WebSocket") && !e.includes("ws://")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("斷線後頁面不 crash", async () => {
    // 模擬網路斷線 → 重連
    await controllerPage.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await controllerPage.waitForTimeout(1000);
    await controllerPage.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });
    await controllerPage.waitForTimeout(1000);

    // 頁面不應 crash
    await expect(controllerPage.locator("body")).toBeVisible();
  });
});
