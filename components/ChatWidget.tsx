import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'مرحباً! أنا مساعدك الذكي في منصة المئة. كيف يمكنني مساعدتك اليوم؟', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        const responseText = await getChatResponse(userMsg.text);
        
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: responseText, sender: 'bot' };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 md:bottom-8 left-4 md:left-8 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center justify-center"
                aria-label="Open Chat"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-36 md:bottom-24 left-4 md:left-8 w-[90vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col max-h-[60vh] md:max-h-[500px]">
                    {/* Header */}
                    <div className="bg-primary-600 p-4 text-white flex items-center gap-2">
                        <MessageCircle size={20} />
                        <h3 className="font-bold">المساعد الذكي</h3>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                                    msg.sender === 'user' 
                                        ? 'bg-primary-100 text-primary-900 rounded-bl-none' 
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-br-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-br-none flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                    جاري الكتابة...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="اكتب سؤالك هنا..."
                            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={isLoading}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};