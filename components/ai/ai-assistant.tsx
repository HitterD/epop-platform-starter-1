'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Button } from '@/radix-ui/button';
import { Input } from '@/radix-ui/input';
import { Badge } from '@/radix-ui/badge';
import { ScrollArea } from '@/radix-ui/scroll-area';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  MessageSquare,
  Calendar,
  Lightbulb,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  conversationId?: string;
  contextData?: any;
  className?: string;
}

const AI_SUGGESTIONS = [
  'Summarize this conversation',
  'Draft a follow-up message',
  'Extract action items from this discussion',
  'Suggest next steps for this project',
  'Help me write a professional email',
  'Create a meeting agenda'
];

export function AIAssistant({ conversationId, contextData, className }: AIAssistantProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: messageContent
            }
          ],
          conversationId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response reader available');
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            const content = line.slice(2);
            assistantMessage.content += content;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: assistantMessage.content }
                  : msg
              )
            );
          }
        }
      }

    } catch (error: any) {
      console.error('Error sending message to AI:', error);

      if (error.name === 'AbortError') {
        toast.info('Request cancelled');
      } else {
        toast.error(error.message || 'Failed to get AI response');

        // Add error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return null;
  }

  return (
    <div className={className}>
      {/* AI Assistant Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg"
          size="lg"
        >
          <Bot className="w-6 h-6" />
        </Button>
      )}

      {/* AI Assistant Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-xl flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="w-5 h-5 text-primary" />
                AI Assistant
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Powered by AI
              </Badge>
              {conversationId && (
                <Badge variant="outline" className="text-xs">
                  Context Aware
                </Badge>
              )}
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && showSuggestions && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="w-4 h-4" />
                          <span>Suggested actions:</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {AI_SUGGESTIONS.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="h-auto p-3 text-left justify-start whitespace-normal"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {message.role === 'user' ? (
                            <span className="text-sm font-medium">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <div className={`flex-1 space-y-1 ${
                          message.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          <div className={`inline-block rounded-lg px-3 py-2 max-w-[280px] ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground px-1">
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="inline-block rounded-lg px-3 py-2 bg-muted">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      disabled={isLoading}
                    />
                    {isLoading ? (
                      <Button size="sm" variant="outline" onClick={stopGeneration}>
                        Stop
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => sendMessage(input)} disabled={!input.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="w-full"
                    >
                      Clear Chat
                    </Button>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>
      )}
    </div>
  );
}