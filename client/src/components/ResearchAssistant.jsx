
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

      setChats((previous) => [chat, ...previous]);
      setActiveChat(chat);
      setMessages([]);
    } catch (err) {
      setError(err.message || "Could not create a conversation.");
    }
  }

  async function openChat(chatId) {
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

    try {
      let chat = activeChat;

      if (!chat) {
        const created = await apiRequest("/research/chats", {
          method: "POST",
          body: JSON.stringify({}),
        });

        chat = created.chat;
        setActiveChat(chat);
        setChats((previous) => [chat, ...previous]);
      }

      const data = await apiRequest(
        `/research/chats/${chat._id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      setMessages((previous) => [
        ...previous,
        ...data.messages,
      ]);

      setPrompt("");

      // Refresh titles and activity timestamps.
      const refreshed = await apiRequest("/research/chats");
      setChats(refreshed.chats || []);
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteChat(chatId) {
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
      }
    } catch (err) {
      setError(err.message || "Could not delete this conversation.");
    }
  }

  return (
    <section className="research-assistant">
      <header className="research-header">
        <div>
          <h2>AI Research Assistant</h2>
          <p>
            Explore books, analyze literary themes, and develop
            research questions with AI.
          </p>
        </div>

        <button type="button" onClick={createChat}>
          New conversation
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
              >
                {chat.title || "New Research Chat"}
              </button>

              <button
                type="button"
                className="research-delete-button"
                onClick={() => deleteChat(chat._id)}
                aria-label={`Delete ${chat.title || "conversation"}`}
                title="Delete conversation"
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
                <h3>What would you like to research?</h3>
                <p>
                  Ask about a novel, an author, literary themes,
                  or ways to structure your research.
                </p>
              </div>
            )}

            {activeChat && messages.length === 0 && (
              <p>Send a message to begin this conversation.</p>
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
                Researching your question...
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
              placeholder="e.g. How does symbolism develop the central themes of a novel?"
              rows={3}
              maxLength={4000}
              required
            />

            <div className="research-form-footer">
              <span>{prompt.length}/4000</span>

              <button
                type="submit"
                disabled={sending || !prompt.trim()}
              >
                {sending ? "Thinking..." : "Send message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
