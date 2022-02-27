import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false,userDataDir: './chrome-profile' })
const page = await browser.newPage()
await page.goto('https://coautilities.com/wps/wcm/connect/occ/coa/home')
