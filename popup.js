// ── Stanley Chrome Extension - Multi-Provider AI ──

const PROVIDERS = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    call: async (apiKey, system, user) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.8, max_tokens: 1000 })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "OpenAI error"); }
      const d = await res.json();
      return d.choices[0].message.content.trim();
    }
  },
  anthropic: {
    call: async (apiKey, system, user) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 1000, system: system, messages: [{ role: "user", content: user }] })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Anthropic error"); }
      const d = await res.json();
      return d.content[0].text.trim();
    }
  },
  gemini: {
    call: async (apiKey, system, user) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: system + "\n\n" + user }] }] })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Gemini error"); }
      const d = await res.json();
      return d.candidates[0].content.parts[0].text.trim();
    }
  }
};

// ── DOM ──
const loading = document.getElementById("loading");
const apiSetup = document.getElementById("api-setup");
const apiKeyInput = document.getElementById("api-key-input");
const apiProvider = document.getElementById("api-provider");
const saveApiKeyBtn = document.getElementById("save-api-key");
const settingsBtn = document.getElementById("settings-btn");

// ── Tabs ──
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ── API Key ──
function getSettings() {
  return new Promise(resolve => chrome.storage.local.get("stanleySettings", d => resolve(d.stanleySettings || null)));
}

saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  const provider = apiProvider.value;
  if (!key) { alert("Please enter an API key!"); return; }
  chrome.storage.local.set({ stanleySettings: { key, provider } }, () => {
    apiSetup.classList.add("hidden");
    alert("✅ Saved! You're all set.");
  });
});

settingsBtn.addEventListener("click", () => apiSetup.classList.toggle("hidden"));

// ── Core AI Call ──
async function callAI(system, user) {
  const settings = await getSettings();
  if (!settings) { apiSetup.classList.remove("hidden"); throw new Error("Please set up your API key first."); }
  return await PROVIDERS[settings.provider].call(settings.key, system, user);
}

function showLoading() { loading.classList.remove("hidden"); }
function hideLoading() { loading.classList.add("hidden"); }
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent; btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = orig, 1800);
  });
}

// ── DRAFT TAB ──
const draftInput = document.getElementById("draft-input");
const draftTone = document.getElementById("draft-tone");
const draftFormat = document.getElementById("draft-format");
const btnDraft = document.getElementById("btn-draft");
const draftOutput = document.getElementById("draft-output");
const draftResult = document.getElementById("draft-result");

async function generateDraft() {
  const idea = draftInput.value.trim();
  if (!idea) { alert("Please enter an idea first!"); return; }
  const system = `You are Stanley, an expert LinkedIn content strategist. Transform rough ideas into scroll-stopping LinkedIn posts. Write in first person. Be human and authentic. No hashtags unless asked. No titles — just write the post.`;
  const user = `Write a LinkedIn post based on this idea: "${idea}"\nTone: ${draftTone.value}\nFormat: ${draftFormat.value}\n\nGuidelines:\n- Open with a strong hook\n- Keep paragraphs short (1-3 lines)\n- End with a question or CTA\n- Sound like a real human`;
  try {
    showLoading(); btnDraft.disabled = true;
    const result = await callAI(system, user);
    draftResult.textContent = result;
    draftOutput.classList.remove("hidden");
    incrementStats();
  } catch(e) { alert("Error: " + e.message); }
  finally { hideLoading(); btnDraft.disabled = false; }
}

btnDraft.addEventListener("click", generateDraft);
document.getElementById("regenerate-draft").addEventListener("click", generateDraft);
document.getElementById("copy-draft").addEventListener("click", () => copyText(draftResult.textContent, document.getElementById("copy-draft")));

// ── IDEAS TAB ──
const ideasNiche = document.getElementById("ideas-niche");
const ideasThemes = document.getElementById("ideas-themes");
const ideasCount = document.getElementById("ideas-count");
const btnIdeas = document.getElementById("btn-ideas");
const ideasOutput = document.getElementById("ideas-output");
const ideasResult = document.getElementById("ideas-result");

btnIdeas.addEventListener("click", async () => {
  const niche = ideasNiche.value.trim();
  if (!niche) { alert("Please enter your niche!"); return; }
  const system = `You are Stanley, a creative LinkedIn content strategist. Generate fresh, specific, high-performing LinkedIn post ideas. Each idea should be emotionally resonant and optimized for engagement.`;
  const user = `Generate ${ideasCount.value} unique LinkedIn post ideas for someone in: ${niche}\n${ideasThemes.value ? "Their themes: " + ideasThemes.value : ""}\n\nFormat each as:\n[Number]. [Catchy hook or title]\n→ [One sentence describing the angle]\n\nMix formats: stories, lists, hot takes, lessons learned, behind-the-scenes.`;
  try {
    showLoading(); btnIdeas.disabled = true;
    const result = await callAI(system, user);
    ideasResult.textContent = result;
    ideasOutput.classList.remove("hidden");
  } catch(e) { alert("Error: " + e.message); }
  finally { hideLoading(); btnIdeas.disabled = false; }
});

document.getElementById("copy-ideas").addEventListener("click", () => copyText(ideasResult.textContent, document.getElementById("copy-ideas")));

// ── REMIX TAB ──
const remixInput = document.getElementById("remix-input");
const remixAction = document.getElementById("remix-action");
const btnRemix = document.getElementById("btn-remix");
const remixOutput = document.getElementById("remix-output");
const remixResult = document.getElementById("remix-result");

const remixMap = {
  hook: "Rewrite with a much stronger, scroll-stopping opening hook.",
  shorter: "Make shorter and punchier. Maximum impact, minimum words.",
  longer: "Expand with more detail, context, and examples.",
  story: "Rewrite as a compelling personal story with beginning, conflict, takeaway.",
  list: "Reformat as a clean, scannable numbered or bulleted list.",
  cta: "Keep the post but add a strong, specific CTA at the end.",
  hashtags: "Suggest 5-8 highly relevant LinkedIn hashtags with brief explanations.",
  different_tone: "Rewrite in a completely different tone (formal→casual or vice versa)."
};

async function generateRemix() {
  const post = remixInput.value.trim();
  if (!post) { alert("Please paste a post to remix!"); return; }
  const system = `You are Stanley, a LinkedIn content expert. Help people improve their posts. Only return the rewritten post — no meta-commentary unless doing hashtags.`;
  const user = `Original post:\n---\n${post}\n---\n\nTask: ${remixMap[remixAction.value]}`;
  try {
    showLoading(); btnRemix.disabled = true;
    const result = await callAI(system, user);
    remixResult.textContent = result;
    remixOutput.classList.remove("hidden");
  } catch(e) { alert("Error: " + e.message); }
  finally { hideLoading(); btnRemix.disabled = false; }
}

btnRemix.addEventListener("click", generateRemix);
document.getElementById("regenerate-remix").addEventListener("click", generateRemix);
document.getElementById("copy-remix").addEventListener("click", () => copyText(remixResult.textContent, document.getElementById("copy-remix")));

// ── ANALYTICS TAB ──
const analyticsInput = document.getElementById("analytics-input");
const btnAnalytics = document.getElementById("btn-analytics");
const analyticsOutput = document.getElementById("analytics-output");
const analyticsResult = document.getElementById("analytics-result");
const statPosts = document.getElementById("stat-posts");
const statMonth = document.getElementById("stat-month");
const statTotal = document.getElementById("stat-total");

function loadStats() {
  chrome.storage.local.get("stanleyStats", d => {
    const s = d.stanleyStats || { week: 0, month: 0, total: 0, lastReset: Date.now() };
    if (Date.now() - s.lastReset > 7 * 86400000) { s.week = 0; s.lastReset = Date.now(); }
    statPosts.textContent = s.week;
    statMonth.textContent = s.month;
    statTotal.textContent = s.total;
    chrome.storage.local.set({ stanleyStats: s });
  });
}

function incrementStats() {
  chrome.storage.local.get("stanleyStats", d => {
    const s = d.stanleyStats || { week: 0, month: 0, total: 0, lastReset: Date.now() };
    s.week++; s.month++; s.total++;
    statPosts.textContent = s.week;
    statMonth.textContent = s.month;
    statTotal.textContent = s.total;
    chrome.storage.local.set({ stanleyStats: s });
  });
}

document.getElementById("log-post").addEventListener("click", function() {
  incrementStats();
  this.textContent = "✅ Logged!";
  setTimeout(() => this.textContent = "+ Log a Post", 1500);
});

btnAnalytics.addEventListener("click", async () => {
  const postData = analyticsInput.value.trim();
  if (!postData) { alert("Please paste your post and stats!"); return; }
  const system = `You are Stanley, a LinkedIn growth analyst. Analyze posts and give specific, actionable insights — not generic advice.`;
  const user = `Analyze this LinkedIn post and performance:\n---\n${postData}\n---\n\nProvide:\n1. 🎯 What worked well\n2. ⚠️ What could improve\n3. 💡 3 follow-up post ideas based on what performed\n4. 📈 One tactical change to try next\n\nBe concise but insightful.`;
  try {
    showLoading(); btnAnalytics.disabled = true;
    const result = await callAI(system, user);
    analyticsResult.textContent = result;
    analyticsOutput.classList.remove("hidden");
  } catch(e) { alert("Error: " + e.message); }
  finally { hideLoading(); btnAnalytics.disabled = false; }
});

document.getElementById("copy-analytics").addEventListener("click", () => copyText(analyticsResult.textContent, document.getElementById("copy-analytics")));

// ── Init ──
loadStats();
getSettings().then(s => { if (!s) apiSetup.classList.remove("hidden"); });
