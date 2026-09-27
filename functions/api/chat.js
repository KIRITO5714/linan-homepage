// EdgeOne Pages 云函数：数字分身
// 路由：/api/chat（由 /functions 目录结构自动生成）
// 密钥：从平台环境变量 DEEPSEEK_API_KEY 读取，不在代码里
// 注意：兼容 EdgeOne 边缘函数运行环境——统一使用 new Response() + JSON.stringify，
// 不使用 Response.json() 静态方法（部分运行环境不支持，会导致 545 执行异常）。

const SYSTEM_PROMPT = `你是"林安"的数字分身，在她的个人主页上代替她与访客（朋友、潜在合作伙伴、面试官）文字交流。

关于林安（你）的事实：
- 身份：内容策划，正在学习用 AI 做产品。
- 最近在做：搭建个人主页，整理作品集和写作方向。
- 擅长与关心：内容表达、AI 应用、知识整理。
- 兴趣：AI 应用、写作、旅行。
- 记忆点：喜欢把复杂问题讲成人话。
- 作品：已上线作品《惊鸿五瞥/奶娃版》；更多内容策划案例和写作作品仍在整理中。
- 联系方式：邮箱 2943179597@qq.com，微信 SZRHYR07；访客问起时可以直接给出。

交流要求：
1. 用第一人称"我"说话，语气自然、亲切、简洁，像朋友聊天。
2. 每次回答尽量控制在 100 字以内，信息层次清楚。
3. 只依据上面的事实回答；不知道的如实说明，不要编造作品、经历或联系方式。
4. 对方如果想合作或面试，可以直接给出邮箱或微信，并说明自己最近在整理作品集。`;

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequest(context) {
  const request = context.request;
  const env = context.env || {};

  if (request.method !== 'POST') {
    return jsonResponse({ error: '只支持 POST 请求' }, 405);
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: '云函数未配置 DEEPSEEK_API_KEY 环境变量' },
      500
    );
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch (e) {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400);
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  if (incoming && Array.isArray(incoming.messages)) {
    for (let i = 0; i < incoming.messages.length; i++) {
      const m = incoming.messages[i];
      if (m && (m.role === 'user' || m.role === 'assistant') && m.content) {
        messages.push({ role: m.role, content: String(m.content) });
      }
    }
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.8,
        max_tokens: 500
      })
    });

    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* 保持 data 为 null */ }

    if (!resp.ok) {
      const msg = (data && data.error && data.error.message)
        ? data.error.message
        : ('HTTP ' + resp.status);
      return jsonResponse({ error: '调用大模型失败：' + msg }, 502);
    }

    const reply = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      return jsonResponse({ error: '大模型返回内容为空' }, 502);
    }
    return jsonResponse({ reply: reply });
  } catch (err) {
    const msg = (err && err.message) ? err.message : '未知异常';
    return jsonResponse({ error: '云函数请求异常：' + msg }, 502);
  }
}
