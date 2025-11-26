// multi-login.js
const { chromium, firefox } = require("playwright");

(async () => {
  const APP_URL = "https://localhost:8443";
  const room_list = "https://localhost:5173/roomList";
  const LOGIN_PATH = "/login";
  const SUCCESS_PATH = "/main-menu";
  const TOTAL_TABS = 8;

  const USERS = [
    { identifier: "username1", password: "Password1" },
    { identifier: "username2", password: "Password1" },
    { identifier: "username3", password: "Password1" },
    { identifier: "username4", password: "Password1" },
    { identifier: "username5", password: "Password1" },
    { identifier: "username6", password: "Password1" },
    { identifier: "username7", password: "Password1" },
    { identifier: "username8", password: "Password1" },
  ];

  const browsers = [];
  let lastPage = null;

  console.log(`Launching ${TOTAL_TABS} tabs...`);

  for (let i = 0; i < TOTAL_TABS; i++) {
    const { identifier, password } = USERS[i % USERS.length];

    const browser = await chromium.launch({
      executablePath: "/opt/google/chrome/chrome",
      ignoreHTTPSErrors: true,
      headless: false,
    });
    browsers.push(browser);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    lastPage = page;

    console.log(`Opening tab ${i + 1}: ${identifier}`);

    await page.goto(`${APP_URL}${LOGIN_PATH}`);

    // Wait for text/username field
    await page.waitForSelector('input:not([type="password"])', {
      timeout: 10000,
    });

    // Fill username/email field
    await page.fill('input:not([type="password"])', identifier);

    // Fill password field (type=password)
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.fill('input[type="password"]', password);

    // Click login button (try several possible texts)
    await page
      .locator(
        'button:has-text("Login"), button:has-text("Log In"), button:has-text("Masuk")',
      )
      .first()
      .click();

    // Wait for redirect
    try {
      await page.waitForURL(`**${SUCCESS_PATH}`, { timeout: 10000 });
      console.log(`✅ Tab ${i + 1}: Logged in as ${identifier}`);
    } catch {
      console.warn(`⚠️ Tab ${i + 1}: Login may have failed (${identifier})`);
    }

    // --- Go to Tournament Mode ---
    await page.waitForSelector("text=Tournament Mode", { timeout: 10000 });
    await page.click("text=Tournament Mode");
    console.log(`${identifier}: Clicked Tournament Mode`);

    try {
      await page.waitForSelector('button:has-text("YES")', { timeout: 5000 });
      await page.click('button:has-text("YES")');
    } catch {
      console.warn(`⚠️ Tab ${i + 1}: Join button not found (${identifier})`);
    }

    // --- choose sprite ---
    try {
      // wait for choose-sprite page
      await page.waitForURL(`**/choose-sprite`, { timeout: 10000 });
      console.log(`${identifier}: On choose-sprite page`);

      // choose a sprite (rotate by tab index so tabs pick different sprites)
      const spriteIndex = i % 8;
      const spriteButtons = page.locator("div.grid button");
      await spriteButtons
        .nth(spriteIndex)
        .waitFor({ state: "visible", timeout: 5000 });
      await spriteButtons.nth(spriteIndex).click();
      console.log(`${identifier}: Selected sprite #${spriteIndex + 1}`);

      // click confirm (try common text variants)
      await page
        .locator(
          'button:has-text("Confirm"), button:has-text("confirm"), button:has-text("CONFIRM")',
        )
        .first()
        .click();

      // wait for navigation to tournament lobby (e.g. /tournament/:id)
      try {
        await page.waitForURL("**/tournament/**", { timeout: 10000 });
        console.log(`✅ Tab ${i + 1}: Joined tournament lobby (${identifier})`);
      } catch {
        console.warn(
          `⚠️ Tab ${i + 1}: Did not reach tournament lobby after choosing sprite (${identifier})`,
        );
      }
    } catch (err) {
      console.warn(
        `⚠️ Tab ${i + 1}: Error during sprite selection (${identifier}):`,
        err,
      );
    }
  }

  //  if (lastPage) {
  //    await lastPage.goto(`${room_list}`);
  //  }

  console.log("All tabs opened. Close the browser manually when done.");
  await new Promise(() => {});
})();
