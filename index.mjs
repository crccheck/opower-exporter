import Koa from 'koa'
import Router from '@koa/router'
import promClient from 'prom-client'

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
