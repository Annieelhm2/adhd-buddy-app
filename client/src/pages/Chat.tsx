import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { BuddyCharacter, type BuddyMood } from "@/components/BuddyCharacter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const SYSTEM_MESSAGE: Message = {
  role: "system",
  content: "You are ADHD Buddy, a warm and supportive accountability partner.",
};

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed today",
  "Help me get started on my tasks",
  "I need some motivation right now",
  "I can't focus, what should I do?",
  "Celebrate my progress with me!",
];

function detectMood(text: string): BuddyMood {
  const lower = text.toLowerCase();
  if (
    lower.includes("tired") ||
    lower.includes("exhausted") ||
    lower.includes("sleepy") ||
    lower.includes("can't focus")
  ) {
    return "sleeping";
  }
  if (
    lower.includes("overwhelmed") ||
    lower.includes("stressed") ||
    lower.includes("anxious") ||
    lower.includes("stuck")
  ) {
    return "thinking";
  }
  if (
    lower.includes("celebrate") ||
    lower.includes("done") ||
    lower.includes("finished") ||
    lower.includes("completed") ||
    lower.includes("did it")
  ) {
    return "celebrating";
  }
  if (
    lower.includes("motivation") ||
    lower.includes("encourage") ||
    lower.includes("help me")
  ) {
    return "encouraging";
  }
  return "happy";
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([SYSTEM_MESSAGE]);
  const [buddyMood, setBuddyMood] = useState<BuddyMood>("waving");

  const { data: chatHistory, isLoading: historyLoading } =
    trpc.chat.messages.useQuery();

  const utils = trpc.useUtils();

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      const mood = detectMood(data.content);
      setBuddyMood(mood);
    },
    onError: () => {
      toast.error("Buddy had trouble responding. Try again!");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having a little trouble right now, but I'm still here for you! Try sending your message again.",
        },
      ]);
    },
  });

  const clearChat = trpc.chat.clear.useMutation({
    onSuccess: () => {
      setMessages([SYSTEM_MESSAGE]);
      setBuddyMood("waving");
      utils.chat.messages.invalidate();
      toast.success("Chat cleared! Fresh start!");
    },
  });

  // Load chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const historyMessages: Message[] = [
        SYSTEM_MESSAGE,
        ...chatHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];
      setMessages(historyMessages);

      // Set mood based on last assistant message
      const lastAssistant = [...chatHistory]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) {
        setBuddyMood(detectMood(lastAssistant.content));
      } else {
        setBuddyMood("happy");
      }
    }
  }, [chatHistory]);

  const handleSendMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setBuddyMood("thinking");
    sendMessage.mutate({ content });
  };

  const buddyMessage = useMemo(() => {
    if (sendMessage.isPending) return "Let me think about that...";
    if (messages.length <= 1) return "Hey! How can I help you today?";
    return undefined;
  }, [sendMessage.isPending, messages.length]);

  if (historyLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
        </div>
        <Skeleton className="h-[400px] sm:h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
      {/* Buddy with mood */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BuddyCharacter mood={buddyMood} size={56} />
          {buddyMessage && (
            <div className="bg-card border rounded-2xl px-3 py-2 text-sm font-medium shadow-sm max-w-[220px] sm:max-w-[250px]">
              {buddyMessage}
            </div>
          )}
        </div>
        {messages.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-sm sm:text-xs text-muted-foreground h-9 sm:h-8"
            onClick={() => clearChat.mutate()}
            disabled={clearChat.isPending}
          >
            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Chat interface */}
      <AIChatBox
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={sendMessage.isPending}
        placeholder="Tell me how you're feeling, or ask for help..."
        height="calc(100vh - 240px)"
        emptyStateMessage="I'm your ADHD Buddy! Tell me how you're doing, ask for motivation, or let me help you break down tasks."
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </div>
  );
}
