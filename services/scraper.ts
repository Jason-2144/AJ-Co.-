import { chromium } from "playwright";

export async function scrapeWebsite(url: string) {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  const text = await page.locator("body").innerText();

  console.log("Text length:", text.length);
  console.log(text.substring(0, 300));

  await browser.close();

  return text;
}