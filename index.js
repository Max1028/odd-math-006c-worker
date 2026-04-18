export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get("url");
    if (!target) return json({ ok: false, error: "missing url query" }, 400);

    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return json({ ok: false, error: "invalid target url" }, 400);
    }

    const allowedHosts = new Set([
      "api.predict.fun",
      "api-testnet.predict.fun",
      "api.binance.com"
    ]);
    if (!allowedHosts.has(upstream.hostname)) {
      return json({ ok: false, error: "host not allowed" }, 403);
    }

    const headers = new Headers();
    headers.set("Accept", "application/json");

    const incomingKey = request.headers.get("x-api-key");
    const configuredKey = env.PREDICT_API_KEY || "";

    if (incomingKey) {
      headers.set("x-api-key", incomingKey);
    } else if (configuredKey && upstream.hostname.includes("predict.fun")) {
      headers.set("x-api-key", configuredKey);
    }

    const upstreamResp = await fetch(upstream.toString(), {
      method: "GET",
      headers
    });

    const respHeaders = new Headers(upstreamResp.headers);
    for (const [k, v] of Object.entries(corsHeaders())) {
      respHeaders.set(k, v);
    }
    respHeaders.set("Cache-Control", "no-store");

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: respHeaders
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key"
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
      "Cache-Control": "no-store"
    }
  });
}
