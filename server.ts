import { Application, config, oakCors, Snelm } from './deps.ts';

import router from './components/router.ts';

const app = new Application();

app.addEventListener('listen', ({ hostname, port, secure }) => {
  console.log(`
        Listening on: http:${secure ? 's' : ''}//${hostname}:${port}
    `);
});

app.addEventListener('error', ({ error }) => {
  console.log(error);
});

app.use(
  oakCors({
    origin: /^.+[web.localhost|localhost:3000|connect.kinesis.games|shop.kinesis.games|chat.kinesis.games|www.kinesis.games|blog.kinesis.games|apps.connect.kinesis.games|kinesis.games|www.kinesis.games]*$/,
    optionsSuccessStatus: 200,
  })
);

// const snelm = new Snelm('oak');

// app.use((ctx, next) => {
//   ctx.response = snelm.snelm(ctx.request, ctx.response);

//   next();
// });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: parseInt(config().PORT) });
