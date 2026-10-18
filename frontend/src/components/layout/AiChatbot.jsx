import React, { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';

export default function AiChatbot({ onFilterRainRisk, onSendAllHighTenders }) {
  // CLOSED BY DEFAULT on page load/reload as requested
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Road Inspection Assistant. Ask me about rain risk potholes, active tenders, or work done status in Nagpur Zone 4!'
    }
  ]);

  const handleSend = (textToSend) => {
    const queryText = textToSend || input.trim();
    if (!queryText) return;

    const userMsg = { sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    setTimeout(() => {
      let botReply = "";
      const q = queryText.toLowerCase();

      if (q.includes("rain") || q.includes("monsoon") || q.includes("risk")) {
        botReply = "🌧️ MONSOON RISK ALERT: 3 Critical Potholes (#POT-1092 on Wardha Road, #POT-1090 on Sitabuldi Main Road) are in heavy rainfall zones (42mm rain). They have an 85% probability of expanding into major structural road failures within 24 hours if not patched immediately!";
        if (onFilterRainRisk) onFilterRainRisk();
      } else if (q.includes("dispatch") || q.includes("high tenders") || q.includes("urgent")) {
        botReply = "⚡ EMERGENCY ACTION EXECUTED: All pending High-Severity potholes have been queued for contractor tender dispatch!";
        if (onSendAllHighTenders) onSendAllHighTenders();
      } else if (q.includes("done") || q.includes("work") || q.includes("repaired")) {
        botReply = "2 defects have been completed and verified as 'Work Done'. You can view them under the Road Damage Inventory section.";
      } else {
        botReply = "RoadWatch AI is actively monitoring 3 survey vehicles in Nagpur Zone 4. Use the quick prompt chips below for rain risk alerts or tender dispatch!";
      }

      setMessages(prev => [...prev, { sender: 'ai', text: botReply }]);
    }, 500);
  };

  return (
    <div className="ai-chatbot-widget">
      <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)} title="Ask AI Assistant">
        <Bot className="w-6 h-6 text-white" />
        <span className="chat-badge">AI</span>
      </button>

      {isOpen && (
        <div className="chat-window active">
          <div className="chat-header">
            <div className="chat-title">
              <Bot className="w-5 h-5 text-indigo-600" />
              <div>
                <h4>Ask RoadWatch AI</h4>
                <span>Municipal AI Assistant</span>
              </div>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></button>
          </div>

          <div className="chat-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`msg ${m.sender}`}>
                {m.text}
              </div>
            ))}
          </div>

          {/* Quick Prompt Chips */}
          <div className="chat-quick-prompts">
            <button className="prompt-chip" onClick={() => handleSend("🌧️ Rain Risk Potholes")}>
              🌧️ Rain Risk Potholes
            </button>
            <button className="prompt-chip" onClick={() => handleSend("⚡ Dispatch High Tenders")}>
              ⚡ Dispatch High Tenders
            </button>
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask AI (e.g. Rain Risk Potholes)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={() => handleSend()}><Send className="w-4 h-4 text-white" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
