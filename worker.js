const STORE_URL = "https://zabkanano247.wroclawvending.workers.dev/";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/telegram" && request.method === "POST") return telegramWebhook(request, env);
    if (url.pathname === "/api/data" && request.method === "GET") return getData(env);
    if (url.pathname === "/api/admin/verify" && request.method === "POST") return verifyAdmin(request, env);
    if (url.pathname === "/api/data" && request.method === "PUT") {
      if (!authorized(request, env)) return json({error:"Unauthorized"}, 401);
      return saveData(request, env);
    }
    if (url.pathname === "/api/upload" && request.method === "POST") {
      if (!authorized(request, env)) return json({error:"Unauthorized"}, 401);
      return uploadImage(request, env);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("ŻABKA NANO 24/7 Worker działa. Skonfiguruj ASSETS i Supabase.", {status:200});
  }
};

function json(value, status=200) {
  return new Response(JSON.stringify(value), {status, headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
function authorized(request, env) {
  const supplied = request.headers.get("X-Admin-Password") || "";
  return !!env.ADMIN_PASSWORD && supplied.length > 0 && supplied === env.ADMIN_PASSWORD;
}
async function verifyAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return json({error:"ADMIN_PASSWORD not configured"}, 503);
  let body; try { body = await request.json(); } catch { return json({error:"Bad JSON"},400); }
  return body.password === env.ADMIN_PASSWORD ? json({ok:true}) : json({error:"Unauthorized"},401);
}
function supabaseReady(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
async function getData(env) {
  if (!supabaseReady(env)) return json({error:"Supabase is not configured"},503);
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/zabka_store?id=eq.1&select=payload`, {
    headers: {"apikey":env.SUPABASE_SERVICE_ROLE_KEY,"Authorization":`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}
  });
  if (!r.ok) return json({error:"Could not read database",detail:await r.text()},502);
  const rows = await r.json();
  if (!rows.length) return json({error:"No store data. Run setup.sql and initialize the store."},503);
  return json(rows[0].payload);
}
async function saveData(request, env) {
  if (!supabaseReady(env)) return json({error:"Supabase is not configured"},503);
  let payload; try { payload=await request.json(); } catch { return json({error:"Bad JSON"},400); }
  if (!payload || !Array.isArray(payload.products) || !Array.isArray(payload.reviews) || !Array.isArray(payload.rules)) return json({error:"Invalid store data"},400);
  const r=await fetch(`${env.SUPABASE_URL}/rest/v1/zabka_store?on_conflict=id`,{
    method:"POST",
    headers:{"apikey":env.SUPABASE_SERVICE_ROLE_KEY,"Authorization":`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({id:1,payload,updated_at:new Date().toISOString()})
  });
  if(!r.ok) return json({error:"Database save failed",detail:await r.text()},502);
  return json({ok:true});
}
async function uploadImage(request, env) {
  if (!supabaseReady(env)) return json({error:"Supabase is not configured"},503);
  const form=await request.formData(), file=form.get("file");
  if (!(file instanceof File)) return json({error:"Missing file"},400);
  if (!file.type.startsWith("image/") || file.size>5*1024*1024) return json({error:"Use an image up to 5 MB"},400);
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const key=`products/${crypto.randomUUID()}.${ext}`;
  const r=await fetch(`${env.SUPABASE_URL}/storage/v1/object/product-images/${key}`,{
    method:"POST",headers:{"apikey":env.SUPABASE_SERVICE_ROLE_KEY,"Authorization":`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,"Content-Type":file.type,"x-upsert":"true"},body:file
  });
  if(!r.ok) return json({error:"Image upload failed",detail:await r.text()},502);
  return json({url:`${env.SUPABASE_URL}/storage/v1/object/public/product-images/${key}`});
}
async function telegramWebhook(request, env) {
  if (env.TELEGRAM_WEBHOOK_SECRET && request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Forbidden",{status:403});
  let update; try { update=await request.json(); } catch { return new Response("Bad Request",{status:400}); }
  const msg=update.message;
  if (msg?.text?.trim().startsWith("/start")) {
    const chatId=msg.chat.id;
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        chat_id:chatId,
        text:"🐸 ŻABKA NANO 24/7\n\nWitaj w naszym sklepie!\n\nDYSKONT CAŁODOBOWY\nWielosztukuj, to się opłaca!",
        reply_markup:{inline_keyboard:[[{text:"🛒 OTWÓRZ SKLEP",web_app:{url:STORE_URL}}]]}
      })
    });
  }
  return new Response("ok");
}
