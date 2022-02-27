#!/usr/bin/env node
/*
  Pushes saved data to InfluxDB
  USAGE: ./push.mjs <path_to_data.json>

  To push a whole directory use:

      $ find archive -name "*.json" -exec ./push.mjs {} \;
*/
import fs from "fs";

import "dotenv/config";
import { InfluxDB, Point } from "@influxdata/influxdb-client";

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

async function pushData(path) {
  console.log("Processing %s", path);
  const data = JSON.parse(fs.readFileSync(path));
  const points = [];
  if (path.includes("weather")) {
    const weatherPoints = data.reads.map(({ date, meanTemperature }) =>
      new Point("weather")
        .floatField("temperature", meanTemperature)
        .timestamp(new Date(date))
    );
    points.push(...weatherPoints);
  } else {
    const costPoints = data.reads.flatMap(
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
    points.push(...costPoints);
  }

  const writeApi = getInfluxDBWriter();
  await writeApi.writePoints(points);
  console.log(" %d points written", points.length);
  try {
    await writeApi.close();
  } catch (err) {
    console.error(err);
    console.log(" Finished ERROR");
  }
  console.log(" FINISHED");
}

const [, , path] = process.argv;
await pushData(path);
