export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/views" && url.pathname !== "/api/views/") {
      return new Response("Not found", { status: 404 });
    }

    const headers = {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff"
    };

    try {
      let current = Number.parseInt(await env.SITE_VIEWS.get("total"), 10);
      if (!Number.isFinite(current) || current < 0) current = 0;

      if (request.method === "POST") {
        current += 1;
        await env.SITE_VIEWS.put("total", String(current));
        return new Response(JSON.stringify({ views: current }), { headers });
      }

      if (request.method === "GET") {
        return new Response(JSON.stringify({ views: current }), { headers });
      }

      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "allow": "GET, POST" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Counter unavailable" }), {
        status: 500,
        headers
      });
    }
  }
};
