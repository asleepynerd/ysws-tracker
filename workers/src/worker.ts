import { differenceBy } from "lodash";
import webpush from "web-push";
import * as jose from "jose";

interface Env {
  YSWS_KV: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  FIREBASE_SERVER_KEY: string;
}

interface YSWSProgram {
  id: string;
  fields: {
    Name: string;
    "Unweighted–Total": number;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

async function getYSWSPrograms() {
  const response = await fetch(
    "https://api2.hackclub.com/v0.1/Unified%20YSWS%20Projects%20DB/YSWS%20Programs?cache=true",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
        Accept: "*/*",
        Origin: "https://ysws.hackclub.com",
        Referer: "https://ysws.hackclub.com/",
      },
    }
  );
  return (await response.json()) as YSWSProgram[];
}

async function sendNotification(
  subscription: PushSubscription,
  payload: string,
  env: Env
) {
  webpush.setVapidDetails(
    "mailto:notifications@sleepy.engineer",
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;

  const vapidPublicKey = new Uint8Array(
    atob(env.VAPID_PUBLIC_KEY)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  const vapidPrivateKey = new Uint8Array(
    atob(env.VAPID_PRIVATE_KEY)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const audience = new URL(endpoint).origin;
  const subject = "mailto:notifications@sleepy.engineer";
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;

  const vapidHeaders = await createVAPIDHeaders(
    audience,
    subject,
    expiration,
    vapidPublicKey,
    vapidPrivateKey
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      ...vapidHeaders,
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Push service responded with ${response.status}`);
  }
}

async function createVAPIDHeaders(
  audience: string,
  subject: string,
  expiration: number,
  publicKey: Uint8Array,
  privateKey: Uint8Array
) {
  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(
      await crypto.subtle.importKey(
        "raw",
        privateKey,
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        false,
        ["sign"]
      )
    );

  return {
    Authorization: `vapid t=${token}, k=${btoa(
      String.fromCharCode.apply(null, Array.from(publicKey))
    )}`,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const currentPrograms = await getYSWSPrograms();

    const previousPrograms =
      ((await env.YSWS_KV.get("programs", "json")) as YSWSProgram[]) || [];

    const newPrograms = differenceBy(currentPrograms, previousPrograms, "id");

    if (newPrograms.length > 0) {
      const subscriptions =
        ((await env.YSWS_KV.get(
          "subscriptions",
          "json"
        )) as PushSubscription[]) || [];

      const notificationPromises = subscriptions.map((subscription) => {
        const payload = JSON.stringify({
          title: "New YSWS Programs Available!",
          body: `${newPrograms.length} new program(s) added: ${newPrograms
            .map((p: YSWSProgram) => p.fields.Name)
            .join(", ")}`,
          url: "https://ysws-tracker.pages.dev",
        });

        return sendNotification(subscription, payload, env);
      });

      await Promise.all(notificationPromises);
    }

    await env.YSWS_KV.put("programs", JSON.stringify(currentPrograms));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (request.method === "POST") {
      const subscription = (await request.json()) as PushSubscription;

      const subscriptions =
        ((await env.YSWS_KV.get(
          "subscriptions",
          "json"
        )) as PushSubscription[]) || [];

      if (!subscriptions.find((s) => s.endpoint === subscription.endpoint)) {
        subscriptions.push(subscription);
        await env.YSWS_KV.put("subscriptions", JSON.stringify(subscriptions));
      }

      const response = new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
      });

      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (request.method === "DELETE") {
      const subscription = (await request.json()) as PushSubscription;

      const subscriptions =
        ((await env.YSWS_KV.get(
          "subscriptions",
          "json"
        )) as PushSubscription[]) || [];

      const filteredSubscriptions = subscriptions.filter(
        (s) => s.endpoint !== subscription.endpoint
      );
      await env.YSWS_KV.put(
        "subscriptions",
        JSON.stringify(filteredSubscriptions)
      );

      const response = new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
      });

      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
