import fs from "fs";

import "dotenv/config";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import prettier from "prettier";
import puppeteer from "puppeteer";

function getInfluxDBWriter() {
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = "influxdb's Bucket";
  const client = new InfluxDB({
    url: "https://us-east-1-1.aws.cloud2.influxdata.com",
    token,
  });
  return client.getWriteApi(org, bucket);
}

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
  await page.waitForSelector('select[aria-label="Change view"]');
  await page.select('select[aria-label="Change view"]', "sub_day");

  const writeApi = getInfluxDBWriter();

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("weather/hourly")) {
      console.log("hourly weather response");
      const out = prettier.format(await response.text(), { parser: "json" });
      fs.writeFileSync("data_weather.json", out);
      const weatherData = await response.json();
      const weatherPoints = weatherData.reads.map(({ date, meanTemperature }) =>
        new Point("weather")
          .floatField("temperature", meanTemperature)
          .timestamp(new Date(date))
      );
      await writeApi.writePoints(weatherPoints);
      try {
        await writeApi.flush();
      } catch (err) {
        console.error(err);
      }
    }
    if (url.includes("aggregateType=quarter_hour")) {
      console.log("hourly electricity cost found");
      const out = prettier.format(await response.text(), { parser: "json" });
      fs.writeFileSync("data_cost.json", out);
      const costData = await response.json();
      const costPoints = costData.reads.flatMap(
        ({ startTime, endTime, value, readType, readComponents }) => [
          new Point("usage")
            .floatField("consumption", value)
            .tag("type", readType)
            .timestamp(new Date(startTime)),
          ...readComponents.map(({ tierNumber, cost }) =>
            new Point("usage")
              .floatField("cost", cost)
              .tag("usageTier", tierNumber)
              .timestamp(new Date(startTime))
          ),
        ]
      );
      await writeApi.writePoints(costPoints);
      try {
        await writeApi.flush();
      } catch (err) {
        console.error(err);
      }
    }
  });

  await page.waitForTimeout(600000);
  await browser.close();
}

async function pushData() {
  const weatherData = JSON.parse(fs.readFileSync("data_weather.json"));
  const weatherPoints = weatherData.reads.map(({ date, meanTemperature }) =>
    new Point("weather")
      .floatField("temperature", meanTemperature)
      .timestamp(new Date(date))
  );
  console.log(weatherPoints[0]);
  const costData = JSON.parse(fs.readFileSync("data_cost.json"));
  const costPoints = costData.reads.flatMap(
    ({ startTime, endTime, value, readType, readComponents }) => [
      new Point("usage")
        .floatField("consumption", value)
        .tag("type", readType)
        .timestamp(new Date(startTime)),
      ...readComponents.map(({ tierNumber, cost }) =>
        new Point("usage")
          .floatField("cost", cost)
          .tag("usageTier", tierNumber)
          .timestamp(new Date(startTime))
      ),
    ]
  );

  await writeApi.writePoints([...weatherPoints, ...costPoints]);
  console.log("points written");
  try {
    await writeApi.flush();
  } catch (err) {
    console.error(err);
    console.log("Finished ERROR");
  }
  console.log("FINISHED");
}

await gatherData();
// await pushData();
