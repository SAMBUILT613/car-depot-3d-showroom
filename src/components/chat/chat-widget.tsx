"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import * as Ably from "ably";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type ChatMessage = { id: string; content: string; senderId: string; senderName: string; createdAt: string | Date };

export function ChatWidget({ listingId, initialConversationId, readOnly = false }: { listingId: string; initialConversationId?: string; readOnly?: boolean }) {
  const { isLoaded, userId, isSignedIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);

  const loadMessages = useCallback(async () => {
    const query = initialConversationId
      ? `conversationId=${encodeURIComponent(initialConversationId)}`
      : `listingId=${encodeURIComponent(listingId)}`;
    const response = await fetch(`/api/messages?${query}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Messages could not be loaded.");
    setMessages(data.messages || []);
    setConversationId(data.conversationId || null);
    return data.conversationId as string | null;
  }, [listingId, initialConversationId]);

  const connectRealtime = useCallback((id: string) => {
    if (clientRef.current) return;
    const client = new Ably.Realtime({ authUrl: `/api/chat/token?conversationId=${encodeURIComponent(id)}` });
    clientRef.current = client;
    const channel = client.channels.get(`conversation:${id}`);
    channel.subscribe("new-message", (message: Ably.Message) => {
      const incoming = message.data as ChatMessage;
      setMessages((previous) => previous.some((item) => item.id === incoming.id) ? previous : [...previous, incoming]);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    loadMessages().then((id) => { if (!cancelled && id) connectRealtime(id); }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Messages could not be loaded.");
    });
    return () => { cancelled = true; clientRef.current?.close(); clientRef.current = null; };
  }, [isLoaded, isSignedIn, loadMessages, connectRealtime]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim(), conversationId, listingId: conversationId ? undefined : listingId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your message could not be sent.");
      setConversationId(data.conversationId);
      setMessages((previous) => previous.some((item) => item.id === data.message.id) ? previous : [...previous, data.message]);
      setInput("");
      if (!clientRef.current) connectRealtime(data.conversationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  if (!isLoaded) return null;
  if (!isSignedIn) return <p className="mt-4 text-center text-[12px] text-muted-600">Sign in to send an inquiry to ENES. Our team will reply here.</p>;

  return (
    <div id="message-thread" className="mt-6 border-t border-line-200 pt-4">
      <h4 className="mb-2 text-[14px] font-semibold text-ink-900">Ask ENES about this listing</h4>
      <div className="flex h-48 flex-col gap-2 overflow-y-auto rounded-[8px] border border-line-200 bg-paper-50 p-2">
        {messages.length === 0 && <p className="m-auto text-center text-[12px] text-muted-600">Send your question or offer. ENES reviews every inquiry and replies here.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[80%] rounded-[8px] p-2 text-[13px] ${message.senderId === userId ? "self-end bg-coral-600 text-white" : "self-start border border-line-200 bg-white text-ink-900"}`}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <time className="mt-1 block text-[10px] opacity-70">{new Date(message.createdAt).toLocaleString()}</time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="mt-2 text-[12px] text-danger-700">{error}</p>}
      {readOnly ? <p className="mt-3 rounded-[8px] bg-[#EAF6F1] p-3 text-[11px] text-[#69756E]">This conversation is closed. You can still review its previous messages.</p> : <form onSubmit={sendMessage} className="mt-2 flex gap-2">
        <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder="Type a message..." aria-label="Message to ENES" className="min-w-0 flex-1 rounded-control border border-line-200 p-2 text-[13px]" />
        <Button type="submit" size="sm" disabled={sending || !input.trim()}><Send className="h-4 w-4" /> Send</Button>
      </form>}
    </div>
  );
}
