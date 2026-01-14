'use client';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

export function ChatRoom({ orderId, currentUser }: { orderId: string, currentUser: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  // 轮询逻辑：每 2 秒获取一次
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      try {
        // 修正点：去掉了多余的反斜杠
        const res = await fetch(`/api/messages?orderId=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setMessages(prev => {
              // 只有当有新消息时才滚动
              if (data.length > prev.length) {
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              }
              return data;
            });
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // 2秒刷新一次

    return () => { isMounted = false; clearInterval(interval); };
  }, [orderId]);

  const sendMessage = async () => {
    if (!input.trim() || !address) return;
    
    const tempContent = input;
    setInput(''); 
    setLoading(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          content: tempContent,
          senderAddress: address
        })
      });

      if (!res.ok) throw new Error("发送失败");

      // 发送成功后立刻刷新，修正点：去掉了多余的反斜杠
      const refreshRes = await fetch(`/api/messages?orderId=${orderId}`);
      const newData = await refreshRes.json();
      setMessages(newData);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (e) {
      toast.error("消息发送失败");
      setInput(tempContent);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col shadow-sm border-l-4 border-l-blue-500/20">
      <CardHeader className="py-3 border-b bg-slate-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" /> 
          安全交易聊天室
          <span className="text-xs ml-auto text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            已加密连接
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-20">
            <p>暂无消息，开始沟通吧</p>
          </div>
        )}
        
        {messages.map((msg, i) => {
          const isMe = msg.sender?.walletAddress?.toLowerCase() === address?.toLowerCase();
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                <div className="break-all whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </CardContent>
      
      <CardFooter className="p-3 border-t bg-slate-50">
        <div className="flex w-full gap-2 items-center">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()} 
            placeholder="输入消息..." 
            className="flex-1 bg-white" 
            disabled={loading}
          />
          <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()} className="bg-blue-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
