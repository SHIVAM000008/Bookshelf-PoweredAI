
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/api";
import AppShell from "./components/AppShell";
import "./App.css";

import Bookshelf from "./components/Bookshelf";
import DiscoverBooks from "./components/DiscoverBooks";
import Recommendations from "./components/Recommendations";
import AIRecommendations from "./components/AIRecommendations";
import ResearchAssistant from "./components/ResearchAssistant";

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookshelfVersion, setBookshelfVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const data = await apiRequest("/auth/me");

        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleBookAdded() {
    setBookshelfVersion((version) => version + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const endpoint =
        mode === "register"
          ? "/auth/register"
          : "/auth/login";

      const payload =
        mode === "register"
          ? form
          : {
              email: form.email,
              password: form.password,
            };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUser(data.user);
      setForm({
        name: "",
        email: "",
        password: "",
      });
      setBookshelfVersion(0);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setBookshelfVersion(0);
      setMode("login");
      setForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(err.message || "Could not log out.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !user) {
    return (
      <main className="auth-loading">
        <div className="loading-mark">B</div>
        <p>Preparing your reading space...</p>
      </main>
    );
  }

  if (user) {
    return (
      <>
        <AppShell
          user={user}
          onLogout={handleLogout}
          bookshelf={
            <Bookshelf key={bookshelfVersion} />
          }
          discover={
            <DiscoverBooks onBookAdded={handleBookAdded} />
          }
          contentRecommendations={
            <Recommendations onBookAdded={handleBookAdded} />
          }
          aiRecommendations={
            <AIRecommendations onBookAdded={handleBookAdded} />
          }
          researchAssistant={<ResearchAssistant />}
        />

        {error && (
          <p role="alert" className="global-error">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <main className="auth-container">
      <section className="auth-card">
        <a className="auth-brand" href="#login">
          <span className="brand-mark">B</span>

          <span className="brand-copy">
            <strong>Bookshelf</strong>
            <span>POWERED AI</span>
          </span>
        </a>

        <div className="auth-heading">
          <span className="eyebrow">
            YOUR PERSONAL READING SPACE
          </span>

          <h1>
            {mode === "login"
              ? "Welcome back."
              : "Begin a new chapter."}
          </h1>

          <p>
            {mode === "login"
              ? "Pick up where your curiosity left off."
              : "Create your account and build a library of your own."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Your name
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                autoComplete="name"
                required
                maxLength={80}
                placeholder="How should we call you?"
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password: event.target.value,
                })
              }
              autoComplete={
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
              required
              minLength={
                mode === "register" ? 12 : undefined
              }
              placeholder="Enter your password"
            />
          </label>

          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Enter your library"
                : "Create your account"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login"
            ? "New to Bookshelf PoweredAI?"
            : "Already have an account?"}

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode((current) =>
                current === "login" ? "register" : "login"
              );
              setError("");
            }}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>

        <div className="auth-decoration">
          <span>READ</span>
          <span>REFLECT</span>
          <span>DISCOVER</span>
        </div>
      </section>
    </main>
  );
}

export default App;
