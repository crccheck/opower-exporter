import fs from "fs";

import "dotenv/config";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import prettier from "prettier";
import puppeteer from "puppeteer";

async function gatherData() {
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
  await page.waitForSelector('select[aria-label="Change view"]');
  await page.select('select[aria-label="Change view"]', "sub_day");

  // await page.setRequestInterception(true);
  // // Need to catch 2 requests. Otherwise do:
  // // https://github.com/puppeteer/puppeteer/blob/v13.4.0/docs/api.md#pagewaitforresponseurlorpredicate-options
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("weather/hourly")) {
      console.log("hourly weather response");
      const out = prettier.format(await response.text(), { parser: "json" });
      fs.writeFileSync("data_weather.json", out);
    }
    if (url.includes("aggregateType=quarter_hour")) {
      if (url.includes("DataBrowser-v1/cws/cost")) {
        console.log("hourly electricity cost found");
        const out = prettier.format(await response.text(), { parser: "json" });
        fs.writeFileSync("data_cost.json", out);
      } else {
        console.log("hourly electricity consumption found");
        const out = prettier.format(await response.text(), { parser: "json" });
        fs.writeFileSync("data_usage.json", out);
      }
    }
  });

  await page.waitForTimeout(5000);
  page.click(".chart-control-category > li:nth-child(2) > button");
  await page.waitForTimeout(600000);
  await browser.close();
}

async function pushData() {
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = "influxdb's Bucket";
  const client = new InfluxDB({
    url: "https://us-east-1-1.aws.cloud2.influxdata.com",
    token,
  });

  const writeApi = client.getWriteApi(org, bucket);
  const weatherData = JSON.parse(fs.readFileSync("data_weather.json"));
  const weatherPoints = weatherData.reads.map(({ date, meanTemperature }) =>
    new Point("weather")
      .floatField("temperature", +meanTemperature)
      .timestamp(new Date(date))
  );
  console.log(weatherPoints[0]);
  await writeApi.writePoints(weatherPoints);
  console.log("points written");

  writeApi
    .close()
    .then(() => {
      console.log("FINISHED");
    })
    .catch((e) => {
      console.error(e);
      console.log("Finished ERROR");
    });
}

// await gatherData();
await pushData();
