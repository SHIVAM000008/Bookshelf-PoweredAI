import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import "./ResearchAssistant.css";

export default function ResearchAssistant() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadChats() {
    setError("");

    try {
      const data = await apiRequest("/research/chats");
      setChats(data.chats || []);
    } catch (err) {
      setError(err.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
  }, []);

  async function createChat() {
    setError("");

    try {
      const data = await apiRequest("/research/chats", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const chat = data.chat;

      setChats((previous) => [
        chat,
        ...previous.filter((item) => item._id !== chat._id),
      ]);

      setActiveChat(chat);
      setMessages([]);
      setPrompt("");
    } catch (err) {
      setError(err.message || "Could not create a conversation.");
    }
  }

  async function openChat(chatId) {
    if (activeChat?._id === chatId) return;

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest(`/research/chats/${chatId}`);

      setActiveChat(data.chat);
      setMessages(data.chat.messages || []);
    } catch (err) {
      setError(err.message || "Could not open this conversation.");
    } finally {
      setLoading(false);
    }
  }

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

        const chat = created.chat;
        chatId = chat._id;

        setActiveChat(chat);
        setChats((previous) => [
          chat,
          ...previous.filter((item) => item._id !== chat._id),
        ]);
      }

      const data = await apiRequest(
        `/research/chats/${chatId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      setMessages((previous) => [...previous, ...data.messages]);
      setPrompt("");

      // Refresh titles and activity timestamps without losing the
      // currently open conversation.
      const refreshed = await apiRequest("/research/chats");
      setChats(refreshed.chats || []);
    } catch (err) {
      if (err.status === 409 && chatId) {
        try {
          const latest = await apiRequest(`/research/chats/${chatId}`);

          setActiveChat(latest.chat);
          setMessages(latest.chat.messages || []);

          setError(
            "This conversation changed while you were waiting. " +
              "The latest messages have been loaded. Please send " +
              "your question again if it wasn't answered."
          );
        } catch {
          setError(
            "This conversation changed, but its latest messages " +
              "could not be loaded. Please reopen the conversation."
          );
        }
      } else {
        setError(err.message || "Could not send your message.");
      }
    } finally {
      setSending(false);
    }
  }

  async function deleteChat(chatId) {
    // Preserve the existing confirmation before permanently deleting.
    const confirmed = window.confirm(
      "Delete this research conversation permanently?"
    );

    if (!confirmed) return;

    setError("");

    try {
      await apiRequest(`/research/chats/${chatId}`, {
        method: "DELETE",
      });

      setChats((previous) =>
        previous.filter((chat) => chat._id !== chatId)
      );

      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
        setPrompt("");
      }
    } catch (err) {
      setError(err.message || "Could not delete this conversation.");
    }
  }

  return (
    <section className="research-assistant" aria-label="Research chat">
      <header className="research-header">
        <div>
          <h2>AI Research Assistant</h2>
          <p>
            Explore books, literary themes, and research questions with AI.
          </p>
        </div>

        <button
          type="button"
          onClick={createChat}
          disabled={sending}
        >
          + New conversation
        </button>
      </header>

      {error && (
        <p className="research-error" role="alert">
          {error}
        </p>
      )}

      <div className="research-layout">
        <aside className="research-sidebar">
          <h3>Your conversations</h3>

          {loading && chats.length === 0 && (
            <p>Loading conversations...</p>
          )}

          {!loading && chats.length === 0 && (
            <p>No conversations yet. Start a new one.</p>
          )}

          {chats.map((chat) => (
            <div
              className={`research-chat-item ${
                activeChat?._id === chat._id ? "active" : ""
              }`}
              key={chat._id}
            >
              <button
                type="button"
                className="research-chat-open"
                onClick={() => openChat(chat._id)}
                aria-current={
                  activeChat?._id === chat._id ? "true" : undefined
                }
                title={chat.title || "New Research Chat"}
              >
                {chat.title || "New Research Chat"}
              </button>

              <button
                type="button"
                className="research-delete-button"
                onClick={() => deleteChat(chat._id)}
                aria-label={`Delete ${chat.title || "conversation"}`}
                title="Delete conversation"
                disabled={sending}
              >
                Delete
              </button>
            </div>
          ))}
        </aside>

        <div className="research-conversation">
          <div className="research-messages" aria-live="polite">
            {!activeChat && (
              <div className="research-empty">
                <span className="research-empty-icon" aria-hidden="true">
                  ✧
                </span>
                <h3>What would you like to research?</h3>
                <p>
                  Ask about a novel, an author, literary themes, or how to
                  structure your research.
                </p>
              </div>
            )}

            {activeChat && messages.length === 0 && (
              <p className="research-start-hint">
                Send a message to begin this conversation.
              </p>
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
              Your research question
            </label>

            <textarea
              id="research-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask a question about a book or author…"
              rows={3}
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