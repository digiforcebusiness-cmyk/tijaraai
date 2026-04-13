"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/types";

interface FetchMessagesParams {
  sessionId: string;
  contactId: string;
}

interface SendMessageParams {
  sessionId: string;
  contactId: string;
  jid: string;
  text: string;
}

async function fetchMessages({ sessionId, contactId }: FetchMessagesParams): Promise<Message[]> {
  const res = await fetch(
    `/api/messages?sessionId=${sessionId}&contactId=${contactId}&limit=50`
  );
  if (!res.ok) throw new Error("Failed to load messages");
  const json = await res.json();
  return json.data as Message[];
}

async function postMessage(params: SendMessageParams): Promise<Message> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to send message");
  const json = await res.json();
  return json.data as Message;
}

export function useMessages(sessionId: string, contactId: string) {
  const queryClient = useQueryClient();
  const key = ["messages", sessionId, contactId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchMessages({ sessionId, contactId }),
    enabled: Boolean(sessionId && contactId),
    refetchInterval: 3_000,
  });

  const sendMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
