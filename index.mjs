import Koa from 'koa'
import Router from '@koa/router'
import promClient from 'prom-client'
import fetch from 'node-fetch'

const app = new Koa();
const router = new Router()

router.get('/', (ctx, next) => {
  ctx.body = 'Hello World'
})

promClient.collectDefaultMetrics()
router.get('/metrics', async (ctx, next) => {
  ctx.body = await promClient.register.metrics()
  ctx.set('Content-Type', promClient.register.contentType)
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(process.env.PORT || 3000);
const res = await fetch(`https://dss-coa.opower.com/webcenter/edge/apis/DataBrowser-v1/cws/cost/utilityAccount/${process.env.UTILTY_ACCOUNT}?startDate=2022-02-24T00%3A00-0600&endDate=2022-02-24T23%3A59-0600&aggregateType=quarter_hour&includePtr=false`, {
    "credentials": "include",
    "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "authorization": `Bearer ${process.env.SESSION_UUID}`,
        "opower-selected-entities": `["urn:opower:customer:uuid:${process.env.CUSTOMER_UUID}","urn:session:account:${process.env.SESSION_ACCOUNT}"]`,
        "x-requested-with": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
    },
    "referrer": "https://dss-coa.opower.com/dss/energy/use-details?ou-data-browser=%2Fcost%2Felectricity%2Fyear%2F2021-06-04%3FaccountUuid%3D34287e72-cb5d-11eb-9c6e-0000170032c5",
    "method": "GET",
    "mode": "cors"
});
console.log(await res.json())
