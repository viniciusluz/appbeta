const GEMINI_URL = (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const callAI = async (provider, key, history, systemPrompt) => {
  if (provider === 'gemini') {
    return await callGemini(key, history, systemPrompt);
  } else if (provider === 'groq') {
    return await callGroq(key, history, systemPrompt);
  }
};

const callGemini = async (key, history, systemPrompt) => {
  const contents = history.filter(h => h.role !== 'system').map(h => ({
    role: h.role === 'npc' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  const body = {
    contents,
    systemInstruction: { parts: [{ text: `You are a travel simulation NPC. Rule: ${systemPrompt}. Keep responses short and natural. Never break character. Never explain grammar.` }] }
  };

  const resp = await fetch(GEMINI_URL(key), { 
    method: 'POST', 
    body: JSON.stringify(body), 
    headers: { 'Content-Type': 'application/json' } 
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
};

const callGroq = async (key, history, systemPrompt) => {
  const messages = [
    { role: 'system', content: `You are a travel simulation NPC. Rule: ${systemPrompt}. Keep responses short and natural. Never break character. Never explain grammar.` },
    ...history.map(h => ({
      role: h.role === 'npc' ? 'assistant' : (h.role === 'system' ? 'system' : 'user'),
      content: h.content
    }))
  ];

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.choices[0].message.content;
};

export const getCorrections = async (provider, key, history) => {
  const analysisPrompt = `Analyze this conversation between an English learner (user) and an NPC. For each significant user error or "non-native" phrase, provide: 1) What they said, 2) How a native would say it, 3) A very short explanation. Format as JSON array: [{"original": "...", "native": "...", "explanation": "..."}]`;
  const historyText = history.filter(h => h.role !== 'system').map(h => `${h.role}: ${h.content}`).join('\n');

  if (provider === 'gemini') {
    const url = GEMINI_URL(key);
    const body = { contents: [{ parts: [{ text: analysisPrompt + "\n\nConversation:\n" + historyText }] }] };
    const resp = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    const json = await resp.json();
    let text = json.candidates[0].content.parts[0].text;
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } else {
    // Similar for Groq
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: 'user', content: analysisPrompt + "\n\nConversation:\n" + historyText }],
        response_format: { type: "json_object" }
      })
    });
    const json = await resp.json();
    const result = JSON.parse(json.choices[0].message.content);
    return result.corrections || result; // Handle different JSON structures
  }
};
