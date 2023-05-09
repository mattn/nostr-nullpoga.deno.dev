'use strict';

import { Application, Context } from "https://deno.land/x/oak/mod.ts";
import "npm:websocket-polyfill"
import {
    nip19,
    relayInit,
    generatePrivateKey,
    getPublicKey,
    getEventHash,
    signEvent
} from 'npm:nostr-tools'

const page = `
<!doctype html>
<link href="//fonts.bunny.net/css?family=sigmar-one:400" rel="stylesheet" />
<meta charset="utf-8" />
<title>Cloudflare Gyazo</title>
<style>
body {
  font-size: 40px;
  text-align: center;
}
h1,h2,h3 {
  font-family: 'Sigmar One', serif;
  font-style: normal;
  text-shadow: none;
  text-decoration: none;
  text-transform: none;
  letter-spacing: -0.05em;
  word-spacing: 0em;
  line-height: 1.15;
}
</style>
<body>
	<h1>ぬるぽ・ｶﾞｯ</h1>
	2023 (C) <a href="http://mattn.kaoriya.net/">mattn</a>, code is <a href="https://github.com/mattn/cloudflare-nullpoga">here</a>
</body>
`

async function topPage(request: Request, env: Env) {
    return new Response(page, {
        headers: {
            'content-type': 'text/html; charset=UTF-8',
        },
    });
}

function bearerAuthentication(request: Request) {
    if (!request.headers.has('authorization')) {
        return false;
    }
    const authorization = request.headers.get('Authorization')!;
    const [scheme, encoded] = authorization.split(' ');
    return scheme === 'Bearer' && encoded === Deno.env.get("NULLPOGA_TOKEN")!;
}

function notAuthenticated(ctx: Context) {
  ctx.response.status = 401;
  ctx.response.type = "text/plain; charset=utf-8";
  ctx.response.body = "Not Authenticated";
}

await new Application()
  .use(async (ctx) => {
    if (ctx.request.method === "GET") {
      const name = ctx.request.url.pathname;
      ctx.response.type = "text/html; charset=utf-8";
      ctx.response.body = page;
      return;
    }
    if (ctx.request.method === "POST") {
      if (!bearerAuthentication(ctx.request)) {
        return notAuthenticated(ctx);
      }
      const mention = await ctx.request.body({type: 'json'}).value;
      if (!await mention.content?.match(/ぬるぽ/)) {
        return;
      }
      const decoded = nip19.decode(Deno.env.get("NULLPOGA_NSEC"));
      const sk = decoded.data as string;
      const pk = getPublicKey(sk);
      let event = {
        id: '',
        kind: 1,
        pubkey: pk,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', mention.id], ['p', mention.pubkey]],
        content: 'ｶﾞｯ',
        sig: '',
      }
      event.id = getEventHash(event)
      event.sig = signEvent(event, sk)
      console.log(event)
      ctx.response.type = "application/json; charset=utf-8";
      ctx.response.body = JSON.stringify(event);
      return;
    }
  }).listen({ port: 8000 });
