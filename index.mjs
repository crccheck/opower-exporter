import "dotenv/config";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  userDataDir: "./chrome-profile",
});
const page = await browser.newPage();
await page.goto("https://coautilities.com/wps/wcm/connect/occ/coa/home");
await page.type("#username", process.env.SITE_USERNAME, { delay: 5 });
await page.type("#password", process.env.SITE_PASSWORD, { delay: 5 });
await page.click('#LoginForm button[type="submit"]');
await page.waitForSelector("div.greeting-message");
await page.goto("https://dss-coa.opower.com/dss/energy/use-details");
await page.waitForSelector('select[aria-label="Change view"]');
await page.select('select[aria-label="Change view"]', "sub_day");
await page.setRequestInterception(true);
page.on("request", (interceptedRequest) => {
  const url = interceptedRequest.url();
  if (url.includes("DataBrowser")) {
    console.log(typeof url, url);
  }

  interceptedRequest.continue();
});
await page.waitForTimeout(300000);
await browser.close();
// https://dss-coa.opower.com/webcenter/edge/apis/DataBrowser-v1/cws/utilities/coa/utilityAccounts/34287e72-cb5d-11eb-9c6e-0000170032c5/reads?aggregateType=bill&includeEnhancedBilling=false&includeMultiRegisterData=false
// https://dss-coa.opower.com/webcenter/edge/apis/DataBrowser-v1/cws/weather/aggregate?interval=2021-05-12%2F2021-06-03&interval=2021-06-04%2F2021-07-06&interval=2021-07-07%2F2021-08-04&interval=2021-08-05%2F2021-09-03&interval=2021-09-04%2F2021-10-05&interval=2021-10-06%2F2021-11-03&interval=2021-11-04%2F2021-12-03&interval=2021-12-04%2F2022-01-05&interval=2022-01-06%2F2022-02-03&useCelsius=false
