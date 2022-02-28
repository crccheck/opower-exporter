# Opower Exporter

Push your electricity usage to InfluxDB

## Usage

1. Set up your `.env` based on [`example.env`](./example.env).
2. Scrape `node index.mjs`

To gather historical data, let Puppeteer open a browser and after it navigates
to the latest day view, start clicking on the previous day. It will start saving
`.json` files in the `./archive` directory.

To push historical data to InfluxDB, run this command:

    $ find archive -name "*.json" -exec ./push.mjs {} \;
