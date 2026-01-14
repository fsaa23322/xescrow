'use client';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Send, MessageSquare, Loader2, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

export function ChatRoom({ orderId, currentUser, orderStatus }: { orderId: string, currentUser: any, orderStatus?: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  const isChatEnabled = orderStatus !== undefined && orderStatus >= 2;

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      try {
        // 关键修改：带上 reader 参数，后端会把未读消息标为已读
        const readerParam = address ? `&reader=${address}` : '';
        const res = await fetch(`/api/messages?orderId=${orderId}${readerParam}`);
        
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setMessages(prev => {
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

    if (address) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000); 
      return () => { isMounted = false; clearInterval(interval); };
    }
  }, [orderId, address]);

  const sendMessage = async () => {
    if (!input.trim() || !address || !isChatEnabled) return;
    
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

      const refreshRes = await fetch(`/api/messages?orderId=${orderId}&reader=${address}`);
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
            已加密连接
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-white relative">
        {!isChatEnabled && (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <Lock className="w-10 h-10 text-slate-400 mb-2" />
            <h3 className="font-bold text-slate-700">聊天功能未开启</h3>
            <p className="text-sm text-slate-500 mt-1">
              当订单进入“进行中”状态（双方确认并支付后），聊天功能将自动解锁以便进行工作对接或纠纷举证。
            </p>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-20">
            <p>暂无消息</p>
          </div>
        )}
        
        {messages.map((msg, i) => {
          const isMe = msg.sender?.walletAddress?.toLowerCase() === address?.toLowerCase();
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                <div className="break-all whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                  {/* 已读状态逻辑可以后续细化，这里暂不显示对方是否已读 */}
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
            onKeyDown={(e) => e.key === 'Enter' && !loading && isChatEnabled && sendMessage()} 
            placeholder={isChatEnabled ? "输入消息..." : "聊天已锁定"} 
            className="flex-1 bg-white" 
            disabled={loading || !isChatEnabled}
          />
          <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim() || !isChatEnabled} className="bg-blue-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
