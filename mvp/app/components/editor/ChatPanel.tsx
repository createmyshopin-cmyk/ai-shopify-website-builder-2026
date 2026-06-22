import { useCallback, useState } from "react";

import type { ChatMessage, ChatResponse, PreviewState } from "@theme-editor/shared";

import { Input } from "~/components/ui/input";

interface ChatPanelProps {
  projectId: string;
  shop: string;
  apiBase: string;
  onStateUpdated: (state: PreviewState) => void;
}

export function ChatPanel({
  projectId,
  shop,
  apiBase,
  onStateUpdated,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/api/projects/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop-domain": shop,
        },
        body: JSON.stringify({ projectId, message: trimmed }),
      });

      const payload = (await response.json()) as ChatResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? `Chat failed (${response.status})`);
      }

      setMessages(payload.history);
      setInput("");
      if (payload.patchesApplied.length > 0) {
        onStateUpdated(payload.state);
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }, [apiBase, input, onStateUpdated, projectId, sending, shop]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-semibold">AI chat refinements</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Preview only — try “Change colors to black”, “Add FAQ section”, or
        “Make hero smaller”.
      </p>

      <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No messages yet. Describe a change in plain language.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.createdAt}-${index}`}
              className={
                message.role === "user"
                  ? "text-right text-sm"
                  : "text-left text-sm text-muted-foreground"
              }
            >
              <span className="font-medium">
                {message.role === "user" ? "You" : "AI"}:
              </span>{" "}
              {message.content}
            </div>
          ))
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <Input
          id="preview-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. Change colors to black"
          disabled={sending}
          aria-label="Chat message"
        />
        <s-button type="submit" variant="primary" disabled={sending || !input.trim()}>
          {sending ? "Sending…" : "Send"}
        </s-button>
      </form>

      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
