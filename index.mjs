import "dotenv/config";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  devtools: true,
  headless: false,
  userDataDir: "./chrome-profile",
  defaultViewport: null,
});
// This doesn't do anything but I wish it did
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Closing browser [${signal}]...`);
    await browser.close();
  });
});

const page = await browser.newPage();
await page.goto("https://dss-coa.opower.com/dss/overview");
await page.waitForTimeout(5000);
const isLoggedOut = await page.$("#username");
console.log("Need to login again?", !!isLoggedOut);
if (isLoggedOut) {
  await page.type("#username", process.env.SITE_USERNAME, { delay: 5 });
  await page.type("#password", process.env.SITE_PASSWORD, { delay: 5 });
  await page.click('#LoginForm button[type="submit"]');
}

await page.waitForSelector("div.greeting-message");
await page.goto("https://dss-coa.opower.com/dss/energy/use-details");
console.log("check use and wait");
// await page.waitForTimeout(10000);
// await page.waitForSelector('select[aria-label="Change view"]');
// await page.select('select[aria-label="Change view"]', "sub_day");

// await page.setRequestInterception(true);
// // Need to catch 2 requests. Otherwise do:
// // https://github.com/puppeteer/puppeteer/blob/v13.4.0/docs/api.md#pagewaitforresponseurlorpredicate-options
page.on("response", async (response) => {
  const url = response.url();
  if (url.includes("weather/hourly")) {
    console.log("hourly weather response");
  }
  if (url.includes("aggregateType=quarter_hour")) {
    console.log("hourly electricity cost found");
  }
});
await page.waitForTimeout(600000);
await browser.close();
