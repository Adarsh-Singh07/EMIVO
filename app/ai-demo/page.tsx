"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bot, User, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_CONVERSATION = [
  { role: "user", text: "Show me laptops under ₹60,000 with good battery life" },
  { role: "ai", text: "I found 3 great laptops under ₹60,000 that excel in battery life. Let me pull up their details and EMI options for you.", loading: true },
  { role: "ai", text: "Here are the top picks:\n\n**1. HP Pavilion 14**\n- Battery: Up to 10 hours\n- Price: ₹58,990\n- EMI from: ₹4,915/mo (No Cost EMI available via HDFC)\n\n**2. ASUS VivoBook 15**\n- Battery: Up to 9 hours\n- Price: ₹54,990\n- EMI from: ₹4,582/mo (Bajaj Finserv)\n\n**3. Lenovo IdeaPad Slim 3**\n- Battery: Up to 8 hours\n- Price: ₹52,490\n- EMI from: ₹4,374/mo (ICICI Bank)\n\nWhich one would you like to explore further?" },
  { role: "user", text: "What's the EMI on the HP Pavilion if I choose a 6-month plan?" },
  { role: "ai", text: "For the **HP Pavilion 14 (₹58,990)** on a 6-month plan, here are your options:\n\n• **HDFC Bank (No Cost EMI)**: ₹9,831/month. Zero processing fee.\n• **Bajaj Finserv**: ₹9,831/month. ₹499 processing fee.\n• **ZestMoney**: ₹10,215/month (includes interest). Zero processing fee.\n\nHDFC Bank offers the best deal here. Would you like me to start the application process?" }
];

export default function AiDemoPage() {
  const [messages, setMessages] = useState<{role: string, text: string, loading?: boolean}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("shopping");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex < MOCK_CONVERSATION.length) {
      const msg = MOCK_CONVERSATION[currentIndex];
      
      const timer = setTimeout(() => {
        if (msg.role === 'ai') {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, msg]);
            setCurrentIndex(prev => prev + 1);
          }, msg.loading ? 1500 : 800);
        } else {
          setMessages(prev => [...prev, msg]);
          setCurrentIndex(prev => prev + 1);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
      
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[var(--color-accent)]" /> 
          EMIVO AI Assistants
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-2 text-center max-w-lg">
          Experience our domain-specific AI models designed to assist customers, empower retailers, and provide business insights.
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="flex p-1 bg-[var(--color-surface-elevated)] rounded-lg">
          {["shopping", "retail", "copilot"].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMessages([]); setCurrentIndex(0); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-[var(--color-surface)] shadow text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              {tab === 'shopping' && 'Shopping Assistant'}
              {tab === 'retail' && 'Retail Assistant'}
              {tab === 'copilot' && 'Business Copilot'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="font-bold">Shopping Assistant</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Powered by EMIVO AI</p>
            </div>
          </div>
          <Button variant="ghost" size="icon"><X className="w-5 h-5" /></Button>
        </div>

        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="text-center text-xs text-[var(--color-text-muted)] my-4">Today, 10:42 AM</div>
          
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-[var(--radius-md)] p-4 ${msg.role === 'user' ? 'bg-[var(--color-primary)] text-[var(--color-surface)]' : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]'}`}>
                {msg.loading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
                    Fetching product data...
                  </div>
                ) : (
                  <div className="whitespace-pre-line text-sm leading-relaxed" dangerouslySetInnerHTML={{__html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center shrink-0 mt-1 border border-[var(--color-border)]">
                  <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[var(--color-accent)]" />
              </div>
              <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3 flex gap-1 items-center h-10">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {["Best phones under 30k", "Compare HDFC vs Bajaj EMI", "Track my order"].map(prompt => (
              <button key={prompt} className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] transition-colors">
                {prompt}
              </button>
            ))}
          </div>
          <div className="relative">
            <input 
              type="text" 
              disabled
              placeholder="Type your message... (Demo mode)" 
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            />
            <Button size="icon" className="absolute right-1.5 top-1.5 h-9 w-9 rounded-[var(--radius-sm)]">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
