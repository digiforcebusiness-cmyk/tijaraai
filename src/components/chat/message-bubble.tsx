import { Bot, Check, CheckCheck } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "OUTBOUND";

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
          isOutbound
            ? "rounded-tr-sm bg-whatsapp-light text-gray-900"
            : "rounded-tl-sm bg-white border border-border text-gray-900"
        )}
      >
        {/* AI badge */}
        {message.isAiReply && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-medium text-primary">
            <Bot className="h-3 w-3" />
            AI Reply
          </span>
        )}

        <p className="leading-relaxed whitespace-pre-wrap break-words">
          {message.body}
        </p>

        {/* Timestamp + status */}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            isOutbound ? "justify-end text-gray-500" : "text-gray-400"
          )}
        >
          <span>{formatRelativeTime(message.timestamp)}</span>
          {isOutbound && (
            <>
              {message.status === "READ" ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : message.status === "DELIVERED" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
