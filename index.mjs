import Koa from 'koa'
import Router from '@koa/router'
import fetch from 'node-fetch'

const app = new Koa();
const router = new Router()

router.get('/', (ctx, next) => {
  ctx.body = 'Hello World'
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(process.env.PORT || 3000);
