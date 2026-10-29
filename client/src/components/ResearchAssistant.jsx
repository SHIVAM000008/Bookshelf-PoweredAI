
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import "./ResearchAssistant.css";

export default function ResearchAssistant() {
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(false);
  const chatRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      chatRequestIdRef.current += 1;
    };
  }, []);

  async function sendMessage(event) {
    event.preventDefault();

    const content = prompt.trim();

    if (!content || sending) return;

    setError("");
    setSending(true);

    let chatId = activeChat?._id;

    try {
      if (!chatId) {
        const created = await apiRequest("/research/chats", {
          method: "POST",
          body: JSON.stringify({}),
        });

        if (!mountedRef.current) return;

        const chat = created.chat;
        chatId = chat._id;
        setActiveChat(chat);
      }

      const requestId = chatRequestIdRef.current;

      const data = await apiRequest(
        `/research/chats/${chatId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      if (
        !mountedRef.current ||
        requestId !== chatRequestIdRef.current
      ) {
        return;
      }

      setMessages((previous) => [...previous, ...data.messages]);
      setPrompt("");
    } catch (err) {
      if (!mountedRef.current) return;

      if (err.status === 409 && chatId) {
        try {
          const latest = await apiRequest(`/research/chats/${chatId}`);

          if (!mountedRef.current) return;

          setActiveChat(latest.chat);
          setMessages(latest.chat.messages || []);
          setError(
            "This conversation changed while you were waiting. " +
              "The latest messages have been loaded. Please try again."
          );
        } catch {
          if (!mountedRef.current) return;

          setError(
            "Could not load the latest messages. Please try again."
          );
        }
      } else {
        setError(err.message || "Could not send your message.");
      }
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  }

  return (
    <section className="research-assistant" aria-label="Research chat">
      {error && (
        <p className="research-error" role="alert">
          {error}
        </p>
      )}

      <div className="research-layout">
        <div className="research-conversation">
          <div className="research-messages" aria-live="polite">
            {!activeChat && messages.length === 0 && (
              <div className="research-empty">
                <span className="research-empty-icon" aria-hidden="true">
                  ✧
                </span>
                <h3>What would you like to research?</h3>
                <p>
                  Ask about a book, an author, literary themes, or a
                  research question.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <article
                key={message._id || `${message.role}-${index}`}
                className={`research-message ${message.role}`}
              >
                <strong>
                  {message.role === "user" ? "You" : "AI Assistant"}
                </strong>
                <p>{message.content}</p>
              </article>
            ))}

            {sending && (
              <p className="research-thinking" role="status">
                Researching your question…
              </p>
            )}
          </div>

          <form className="research-prompt-form" onSubmit={sendMessage}>
            <label htmlFor="research-prompt">
              Your question
            </label>

            <textarea
              id="research-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask about a book or author…"
              rows={2}
              maxLength={4000}
              required
              disabled={sending}
            />

            <div className="research-form-footer">
              <span>{prompt.length}/4000</span>

              <button
                type="submit"
                disabled={sending || !prompt.trim()}
              >
                {sending ? "Thinking…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
