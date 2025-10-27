'use client';

import React from 'react';
import { AIAssistant } from '@/components/ai/ai-assistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/radix-ui/card';
import { Badge } from '@/radix-ui/badge';
import { useAuth } from '@/lib/auth';
import {
  Bot,
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Lightbulb,
  Zap
} from 'lucide-react';

export default function AIAssistantPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to access the AI assistant.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by GPT
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Your intelligent companion for messaging, project management, and productivity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Features Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What can I help you with?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Communication</h4>
                    <p className="text-sm text-muted-foreground">
                      Draft messages, summarize conversations, extract action items
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Document Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Summarize documents, extract key information, create summaries
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Planning & Scheduling</h4>
                    <p className="text-sm text-muted-foreground">
                      Create meeting agendas, suggest timelines, plan projects
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Ideas & Suggestions</h4>
                    <p className="text-sm text-muted-foreground">
                      Brainstorm solutions, provide recommendations, offer insights
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Quick Actions</h4>
                    <p className="text-sm text-muted-foreground">
                      Generate emails, create templates, automate tasks
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p>• Be specific in your requests for better results</p>
                <p>• I can see conversation context when you're in a chat</p>
                <p>• Ask me to summarize long conversations</p>
                <p>• Use me for drafting professional messages</p>
                <p>• I can help extract action items from discussions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Chat with AI Assistant
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ask questions, request assistance, or explore ideas
              </p>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AIAssistant className="h-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}