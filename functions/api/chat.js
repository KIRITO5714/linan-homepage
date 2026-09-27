// EdgeOne Pages 云函数：数字分身
// 路由：/api/chat（由 /functions 目录结构自动生成）
// 密钥：从平台环境变量 DEEPSEEK_API_KEY 读取，不在代码里

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

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return Response.json({ error: '只支持 POST 请求' }, { status: 405 });
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: '云函数未配置 DEEPSEEK_API_KEY 环境变量' },
      { status: 500 }
    );
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  if (Array.isArray(incoming.messages)) {
    for (const m of incoming.messages) {
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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return Response.json(
        { error: `调用大模型失败：${data.error?.message || resp.status}` },
        { status: 502 }
      );
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return Response.json({ error: '大模型返回内容为空' }, { status: 502 });
    }
    return Response.json({ reply });
  } catch (err) {
    return Response.json(
      { error: `云函数请求异常：${err.message}` },
      { status: 502 }
    );
  }
}
