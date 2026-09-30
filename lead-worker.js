export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: true, service: "sashosha-leads" }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    let data = {};
    try {
      data = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: cors });
    }
    if ((data.company || "").trim()) {
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }
    if (!data.name || !data.contact) {
      return new Response(JSON.stringify({ ok: false, error: "empty" }), { status: 400, headers: cors });
    }
    const token = env.BOT_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "no bot" }), { status: 500, headers: cors });
    }
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updates = await updatesRes.json();
    let chatId = env.CHAT_ID || "";
    const list = (updates.result || []).slice().reverse();
    for (const item of list) {
      const id = item.message && item.message.chat && item.message.chat.id;
      if (id) { chatId = String(id); break; }
    }
    if (!chatId) {
      return new Response(JSON.stringify({ ok: false, error: "start-bot" }), { status: 500, headers: cors });
    }
    const lines = [
      "Новая заявка с сайта sashosha math",
      "",
      "Имя: " + (data.name || ""),
      "Город: " + (data.city || ""),
      "Класс: " + (data.class || ""),
      "Цель: " + (data.goal || ""),
      "Откуда: " + (data.source || ""),
      "Контакт: " + (data.contact || "")
    ];
    if ((data.note || "").trim()) lines.push("Комментарий: " + data.note);
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") })
    });
    const tgJson = await tg.json();
    if (!tgJson.ok) {
      const desc = String(tgJson.description || "").toLowerCase();
      const error = desc.includes("blocked") ? "blocked" : "send";
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
};
