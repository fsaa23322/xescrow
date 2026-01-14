'use client';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Send, MessageSquare } from 'lucide-react';
import { useAccount } from 'wagmi';

export function ChatRoom({ orderId, currentUser }: { orderId: string, currentUser: any }) {
  const { socket, isConnected } = useSocket(orderId);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => { socket.off('new_message'); };
  }, [socket]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    const msgData = {
      orderId, content: input, senderId: currentUser.id, senderAddress: address
    };
    socket.emit('send_message', msgData);
    setInput('');
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> 加密聊天室
          <span className={`text-xs ml-auto ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? '● 在线' : '● 离线'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => {
          const isMe = msg.sender?.walletAddress?.toLowerCase() === address?.toLowerCase();
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </CardContent>
      <CardFooter className="p-3 border-t bg-white">
        <div className="flex w-full gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="发送消息..." className="flex-1" />
          <Button size="icon" onClick={sendMessage}><Send className="w-4 h-4" /></Button>
        </div>
      </CardFooter>
    </Card>
  );
}
