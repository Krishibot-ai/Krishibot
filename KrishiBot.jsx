import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Tu ek expert Indian agricultural assistant hai jiska naam KrishiBot hai. 
Tu sirf Hindi mein baat karta hai. 
Tu kisan ki madad karta hai:
- Fasal ki bimari pehchanna
- Keetnashak/dawai suggest karna
- Mausam ke hisab se salah dena
- Mandi ke bhav batana (estimated)
- Khad (fertilizer) ki jaankari dena

Har jawab mein:
1. 🌾 emoji use kar
2. Simple Hindi mein likho (difficult words avoid karo)
3. Practical solution do
4. Short aur clear rakho (max 150 words)
5. End mein ek helpful tip do

Tu friendly, caring aur expert hai jaise gaon ka agriculture officer.`;

const MENU_OPTIONS = [
  { icon: "🌿", label: "फसल की बीमारी", desc: "रोग पहचानें", color: "#16a34a", msg: "मेरी फसल में बीमारी के लक्षण हैं, मदद करो" },
  { icon: "🌦️", label: "मौसम सलाह", desc: "आज क्या करें", color: "#0369a1", msg: "मौसम के हिसाब से आज खेती में क्या करूँ?" },
  { icon: "💊", label: "दवाई पूछो", desc: "सही दवाई जानें", color: "#7c3aed", msg: "फसल के लिए कौन सी दवाई सही रहेगी?" },
  { icon: "💰", label: "मंडी भाव", desc: "आज के दाम", color: "#b45309", msg: "आज मंडी में फसल के क्या भाव हैं?" },
  { icon: "🧪", label: "खाद जानकारी", desc: "उर्वरक सलाह", color: "#0f766e", msg: "मेरी फसल के लिए कौन सी खाद डालूँ?" },
  { icon: "🐛", label: "कीट समस्या", desc: "कीड़े भगाएं", color: "#b91c1c", msg: "मेरी फसल में कीड़े लग गए हैं, क्या करूँ?" },
  { icon: "🌱", label: "बीज जानकारी", desc: "अच्छे बीज चुनें", color: "#15803d", msg: "इस मौसम के लिए कौन सा बीज सबसे अच्छा है?" },
  { icon: "💧", label: "सिंचाई सलाह", desc: "पानी कब दें", color: "#1d4ed8", msg: "फसल में कब और कितना पानी देना चाहिए?" },
  { icon: "📋", label: "सरकारी योजना", desc: "मदद पाएं", color: "#9d174d", msg: "किसानों के लिए कौन सी सरकारी योजनाएं हैं?" },
];

export default function KrishiBot() {
  const [screen, setScreen] = useState("menu");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeOption, setActiveOption] = useState(null);

  // PWA Install states
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const messagesEndRef = useRef(null);

  // ── PWA Install Logic ──
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Android/Chrome — capture install prompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS detection — show manual guide
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = window.navigator.standalone;
    if (isIOS && !isInStandalone) {
      setTimeout(() => setShowInstallBanner(true), 3000);
    }

    // Installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleInstall = async () => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
    }
  };

  const startChat = (option) => {
    setActiveOption(option);
    const welcomeMsg = {
      role: "assistant",
      content: `🌾 नमस्ते किसान भाई!\n\nआपने **${option.label}** चुना है। मैं आपकी पूरी मदद करूँगा!\n\nकृपया अपनी समस्या बताएं 👇`,
    };
    setMessages([welcomeMsg]);
    setScreen("chat");
    sendAI(option.msg, [welcomeMsg]);
  };

  const sendAI = async (userText, base) => {
    if (!userText || loading) return;
    setLoading(true); setIsTyping(true);
    const newMessages = [...base, { role: "user", content: userText }];
    setMessages(newMessages);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "माफ करो, कुछ गड़बड़ हो गई।";
      setIsTyping(false);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setIsTyping(false);
      setMessages([...newMessages, { role: "assistant", content: "⚠️ नेटवर्क में दिक्कत है।" }]);
    } finally { setLoading(false); }
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput(""); setLoading(true); setIsTyping(true);
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "माफ करो, कुछ गड़बड़ हो गई।";
      setIsTyping(false);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setIsTyping(false);
      setMessages([...newMessages, { role: "assistant", content: "⚠️ नेटवर्क में दिक्कत है।" }]);
    } finally { setLoading(false); }
  };

  const fmt = (t) => t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  const now = new Date();
  const timeStr = now.toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div style={{
      fontFamily: "'Noto Sans Devanagari','Segoe UI',sans-serif",
      background: "linear-gradient(160deg,#071a07 0%,#0d2a0d 60%,#091909 100%)",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "12px",
    }}>

      {/* ── iOS Install Guide Modal ── */}
      {showIOSGuide && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 1000, padding: "0 16px 16px",
        }}>
          <div style={{
            background: "#0d2a0d", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "24px", padding: "28px 24px", width: "100%", maxWidth: "420px",
          }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "40px" }}>📱</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "18px", marginTop: "8px" }}>
                iPhone पर Install करो
              </div>
              <div style={{ color: "#86efac", fontSize: "13px", marginTop: "4px" }}>
                KrishiBot को App की तरह Home Screen पर लगाओ
              </div>
            </div>
            {[
              { num: "1", icon: "⬆️", text: "नीचे Safari में Share button दबाओ", sub: "(बीच वाला icon — ऊपर arrow)" },
              { num: "2", icon: "📋", text: '"Add to Home Screen" choose करो', sub: "नीचे Scroll करो — मिल जाएगा" },
              { num: "3", icon: "✅", text: '"Add" button दबाओ', sub: "KrishiBot icon Home Screen पर आ जाएगा!" },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: "14px", alignItems: "flex-start",
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "14px", padding: "14px", marginBottom: "10px",
              }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "14px", flexShrink: 0,
                }}>{step.num}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>
                    {step.icon} {step.text}
                  </div>
                  <div style={{ color: "#86efac", fontSize: "12px", marginTop: "3px" }}>{step.sub}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowIOSGuide(false)} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              border: "none", borderRadius: "14px", color: "#fff",
              fontWeight: 800, fontSize: "15px", cursor: "pointer",
              fontFamily: "inherit", marginTop: "6px",
            }}>समझ गए ✓</button>
          </div>
        </div>
      )}

      {/* ── Install Banner ── */}
      {showInstallBanner && !isInstalled && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          background: "linear-gradient(135deg,#14532d,#166534)",
          borderBottom: "1px solid rgba(34,197,94,0.3)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "24px", flexShrink: 0 }}>📲</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "13px" }}>
              KrishiBot को App बनाओ!
            </div>
            <div style={{ color: "#86efac", fontSize: "11px" }}>
              Home Screen पर लगाओ — बिना Browser खोले चलेगा
            </div>
          </div>
          <button onClick={handleInstall} style={{
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "20px", padding: "7px 16px", color: "#fff",
            fontWeight: 700, fontSize: "12px", cursor: "pointer",
            fontFamily: "inherit", flexShrink: 0,
          }}>
            {isIOS ? "कैसे करें?" : "Install करो"}
          </button>
          <button onClick={() => setShowInstallBanner(false)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.6)",
            fontSize: "18px", cursor: "pointer", padding: "4px", flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      {/* ── Main App ── */}
      <div style={{
        width: "100%", maxWidth: "430px",
        borderRadius: "28px", overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7),0 0 0 1px rgba(34,197,94,0.2)",
        display: "flex", flexDirection: "column",
        height: "92vh", maxHeight: "800px",
        background: "#0a1a0a",
        marginTop: showInstallBanner && !isInstalled ? "56px" : "0",
        transition: "margin-top 0.3s",
      }}>

        {/* HEADER */}
        <div style={{
          background: "linear-gradient(135deg,#14532d,#166534)",
          padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px",
          borderBottom: "1px solid rgba(34,197,94,0.2)", flexShrink: 0,
        }}>
          {screen === "chat" && (
            <button onClick={() => { setScreen("menu"); setMessages([]); }} style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
              width: "34px", height: "34px", color: "#fff", cursor: "pointer",
              fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>←</button>
          )}
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", boxShadow: "0 0 18px rgba(34,197,94,0.5)", flexShrink: 0,
          }}>🌾</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px" }}>KrishiBot</div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "1px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#86efac", fontSize: "11px" }}>
                {screen === "chat" && activeOption ? activeOption.label : "कृषि विशेषज्ञ AI • ऑनलाइन"}
              </span>
            </div>
          </div>

          {/* Install Button in Header */}
          {!isInstalled && (
            <button onClick={handleInstall} style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px", padding: "6px 12px", color: "#fff",
              fontWeight: 700, fontSize: "11px", cursor: "pointer",
              fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: "5px",
            }}>
              📲 Install
            </button>
          )}
          {isInstalled && (
            <div style={{
              background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: "20px", padding: "5px 10px", color: "#86efac",
              fontSize: "10px", fontWeight: 700, flexShrink: 0,
            }}>✅ Installed</div>
          )}
        </div>

        {/* MENU SCREEN */}
        {screen === "menu" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px" }}>

            {/* Welcome */}
            <div style={{
              background: "linear-gradient(135deg,rgba(34,197,94,0.13),rgba(34,197,94,0.04))",
              border: "1px solid rgba(34,197,94,0.22)", borderRadius: "20px",
              padding: "20px 16px", marginBottom: "18px", textAlign: "center",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>👨‍🌾</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "19px", marginBottom: "5px" }}>नमस्ते किसान भाई!</div>
              <div style={{ color: "#86efac", fontSize: "13px", lineHeight: 1.7 }}>
                आपका डिजिटल कृषि मित्र<br />
                <strong style={{ color: "#4ade80" }}>नीचे से विषय चुनें 👇</strong>
              </div>

              {/* PWA Install Card inside welcome */}
              {!isInstalled && (
                <div onClick={handleInstall} style={{
                  marginTop: "14px", background: "rgba(34,197,94,0.1)",
                  border: "1px dashed rgba(34,197,94,0.4)", borderRadius: "14px",
                  padding: "10px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{ fontSize: "22px" }}>📲</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "12px" }}>
                      Home Screen पर App बनाओ!
                    </div>
                    <div style={{ color: "#86efac", fontSize: "11px" }}>
                      एक बार Install करो — हमेशा आसानी से खुलेगा ✨
                    </div>
                  </div>
                  <span style={{ color: "#4ade80", fontSize: "18px" }}>›</span>
                </div>
              )}
            </div>

            <div style={{ color: "#4ade80", fontSize: "12px", fontWeight: 700, marginBottom: "10px", letterSpacing: "0.8px" }}>
              📋 क्या जानना है आपको?
            </div>

            {/* 3-col grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "18px" }}>
              {MENU_OPTIONS.map((opt, i) => (
                <button key={i} onClick={() => startChat(opt)} style={{
                  background: `linear-gradient(145deg,${opt.color}25,${opt.color}0f)`,
                  border: `1.5px solid ${opt.color}40`, borderRadius: "16px", padding: "14px 6px",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "5px", transition: "all 0.2s", fontFamily: "inherit",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(145deg,${opt.color}45,${opt.color}22)`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(145deg,${opt.color}25,${opt.color}0f)`; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <span style={{ fontSize: "26px" }}>{opt.icon}</span>
                  <span style={{ color: "#e8f5e9", fontSize: "10.5px", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{opt.label}</span>
                  <span style={{ color: "rgba(134,239,172,0.55)", fontSize: "9.5px", textAlign: "center" }}>{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Free type */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: "16px", padding: "14px" }}>
              <div style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>✍️ या सीधे अपनी समस्या लिखो:</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && input.trim()) {
                      const txt = input.trim(); setInput("");
                      setActiveOption({ label: "सीधा सवाल", icon: "💬" });
                      setMessages([]); setScreen("chat");
                      setTimeout(() => sendAI(txt, []), 200);
                    }
                  }}
                  placeholder="यहाँ लिखो..."
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "20px", padding: "10px 16px", color: "#e8f5e9", fontSize: "13px",
                    outline: "none", fontFamily: "inherit",
                  }} />
                <button onClick={() => {
                  if (input.trim()) {
                    const txt = input.trim(); setInput("");
                    setActiveOption({ label: "सीधा सवाल", icon: "💬" });
                    setMessages([]); setScreen("chat");
                    setTimeout(() => sendAI(txt, []), 200);
                  }
                }} style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: input.trim() ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(34,197,94,0.15)",
                  border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                  color: "#fff", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>➤</button>
              </div>
            </div>
          </div>
        )}

        {/* CHAT SCREEN */}
        {screen === "chat" && (
          <>
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px",
              display: "flex", flexDirection: "column", gap: "12px",
            }}>
              <div style={{ textAlign: "center" }}>
                <span style={{
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)",
                  color: "#86efac", fontSize: "11px", padding: "4px 12px", borderRadius: "20px",
                }}>आज • {now.toLocaleDateString("hi-IN")}</span>
              </div>

              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end", gap: "8px",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%",
                      background: "linear-gradient(135deg,#22c55e,#16a34a)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", flexShrink: 0,
                    }}>🌾</div>
                  )}
                  <div style={{
                    maxWidth: "80%",
                    background: msg.role === "user" ? "linear-gradient(135deg,#15803d,#16a34a)" : "rgba(255,255,255,0.05)",
                    border: msg.role === "user" ? "none" : "1px solid rgba(34,197,94,0.15)",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                  }}>
                    <div style={{ color: "#e8f5e9", fontSize: "13.5px", lineHeight: 1.65 }}
                      dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                    <div style={{ color: "rgba(134,239,172,0.5)", fontSize: "10px", marginTop: "5px", textAlign: "right" }}>
                      {timeStr} {msg.role === "user" ? "✓✓" : ""}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                  }}>🌾</div>
                  <div style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: "18px 18px 18px 4px", padding: "12px 16px",
                    display: "flex", gap: "5px", alignItems: "center",
                  }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80",
                        animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick chips */}
            <div style={{ padding: "8px 14px 4px", background: "#0a1a0a", borderTop: "1px solid rgba(34,197,94,0.08)" }}>
              <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "2px" }}>
                {["और बताओ", "दवाई का नाम", "कहाँ मिलेगी", "कितना खर्च", "🏠 मेनू"].map((chip, i) => (
                  <button key={i} onClick={() => chip === "🏠 मेनू" ? (setScreen("menu"), setMessages([])) : sendMessage(chip)}
                    style={{
                      flexShrink: 0, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                      borderRadius: "16px", padding: "5px 12px", color: "#86efac",
                      fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
                    }}>{chip}</button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div style={{ padding: "8px 14px 14px", background: "#0a1a0a", display: "flex", gap: "8px", alignItems: "center" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="यहाँ लिखो..." disabled={loading}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "22px", padding: "11px 16px", color: "#e8f5e9",
                  fontSize: "13.5px", outline: "none", fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(34,197,94,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(34,197,94,0.2)"} />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: loading || !input.trim() ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg,#22c55e,#16a34a)",
                border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "17px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: loading || !input.trim() ? "none" : "0 4px 14px rgba(34,197,94,0.35)", flexShrink: 0,
              }}>{loading ? "⏳" : "➤"}</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(34,197,94,0.25);border-radius:4px}
      `}</style>
    </div>
  );
}
