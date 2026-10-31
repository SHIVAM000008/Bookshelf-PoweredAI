
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/api";
import AppShell from "./components/AppShell";
import "./App.css";
import "./components/UnifiedBookGrid.css";

import Bookshelf from "./components/Bookshelf";
import AddBookPage from "./components/AddBookPage";
import DiscoverBooks from "./components/DiscoverBooks";
import Recommendations from "./components/Recommendations";
import AIRecommendations from "./components/AIRecommendations";
import ResearchAssistant from "./components/ResearchAssistant";

function BookLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 7.5C9.5 5.7 6.3 5.2 3 6v12c3.3-.8 6.5-.3 9 1.5" />
      <path d="M12 7.5C14.5 5.7 17.7 5.2 21 6v12c-3.3-.8-6.5-.3-9 1.5" />
      <path d="M12 7.5v12" />
      <path d="M6 9.2c1.5-.2 2.8.1 4 .7" />
      <path d="M18 9.2c-1.5-.2-2.8.1-4 .7" />
    </svg>
  );
}

function readResetToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("resetToken");

  if (token !== null) {
    url.searchParams.delete("resetToken");

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );
  }

  return token;
}

function App() {
  const [resetToken, setResetToken] = useState(readResetToken);
  const [user, setUser] = useState(null);

  const [mode, setMode] = useState(() => {
    return new URLSearchParams(window.location.search).has(
      "resetToken"
    )
      ? "reset"
      : "login";
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [resetForm, setResetForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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

  useEffect(() => {
    if (resetToken) {
      setMode("reset");
    }
  }, [resetToken]);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setForm((current) => ({
      ...current,
      password: "",
    }));
    setResetForm({
      password: "",
      confirmPassword: "",
    });

    if (nextMode !== "reset") {
      setResetToken(null);
    }
  }

  function handleBookAdded() {
    setBookshelfVersion((version) => version + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const data = await apiRequest(
          "/auth/forgot-password",
          {
            method: "POST",
            body: JSON.stringify({
              email: form.email,
            }),
          }
        );

        setMessage(
          data.message ||
            "If an account exists, reset instructions will be provided."
        );
        return;
      }

      if (mode === "reset") {
        if (!resetToken) {
          setError(
            "Reset link is missing. Request a new password reset."
          );
          return;
        }

        if (
          resetForm.password !==
          resetForm.confirmPassword
        ) {
          setError("Passwords do not match.");
          return;
        }

        if (
          resetForm.password.length < 12 ||
          resetForm.password.length > 72
        ) {
          setError(
            "Password must contain 12–72 characters."
          );
          return;
        }

        const data = await apiRequest(
          "/auth/reset-password",
          {
            method: "POST",
            body: JSON.stringify({
              token: resetToken,
              password: resetForm.password,
            }),
          }
        );

        setResetToken(null);
        setResetForm({
          password: "",
          confirmPassword: "",
        });
        setForm((current) => ({
          ...current,
          password: "",
        }));
        setMode("login");
        setMessage(
          data.message ||
            "Password updated. Please log in."
        );
        setUser(null);
        return;
      }

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
      setError(
        err.message || "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setBookshelfVersion(0);
      changeMode("login");
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
      <main
        className="auth-loading"
        role="status"
        aria-live="polite"
      >
        <div className="loading-mark">
          <BookLogo />
        </div>
        <p>Preparing your reading space...</p>
      </main>
    );
  }

  if (user && mode !== "reset") {
    return (
      <>
        <AppShell
          user={user}
          onLogout={handleLogout}
          bookshelf={
            <Bookshelf key={bookshelfVersion} />
          }
          addBook={(navigateTo) => (
            <AddBookPage
              onBookAdded={handleBookAdded}
              onViewBookshelf={() =>
                navigateTo("bookshelf")
              }
            />
          )}
          discover={
            <DiscoverBooks
              userId={user?.id || user?._id}
              onBookAdded={handleBookAdded}
            />
          }
          contentRecommendations={
            <Recommendations
              userId={user?.id || user?._id}
              onBookAdded={handleBookAdded}
            />
          }
          aiRecommendations={
            <AIRecommendations
              userId={user?.id || user?._id}
              onBookAdded={handleBookAdded}
            />
          }
          researchAssistant={
            <ResearchAssistant />
          }
        />

        {error && (
          <p role="alert" className="global-error">
            {error}
          </p>
        )}
      </>
    );
  }

  const headings = {
    login: {
      title: "Welcome back.",
      description:
        "Pick up where your curiosity left off.",
    },
    register: {
      title: "Begin a new chapter.",
      description:
        "Create your account and build a library of your own.",
    },
    forgot: {
      title: "Forgot your password?",
      description:
        "Enter your registered email address to request a password reset link.",
    },
    reset: {
      title: "Create a new password.",
      description:
        "Choose a secure new password to regain access to your reading space.",
    },
  };

  const heading = headings[mode] || headings.login;

  return (
    <main className="auth-container">
      <section className="auth-card">
        <a className="auth-brand" href="#login">
          <span className="brand-mark">
            <BookLogo />
          </span>

          <span className="brand-copy">
            <strong>Bookshelf</strong>
            <span>POWERED AI</span>
          </span>
        </a>

        <div className="auth-heading">
          <span className="eyebrow">
            YOUR PERSONAL READING SPACE
          </span>

          <h1>{heading.title}</h1>
          <p>{heading.description}</p>
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

          {mode !== "reset" && (
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
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
          )}

          {(mode === "login" ||
            mode === "register") && (
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
                maxLength={
                  mode === "register" ? 72 : undefined
                }
                placeholder="Enter your password"
              />
            </label>
          )}

          {mode === "login" && (
            <div className="auth-forgot">
              <button
                type="button"
                className="text-button"
                onClick={() => changeMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === "reset" && (
            <>
              <label>
                New password
                <input
                  type="password"
                  value={resetForm.password}
                  onChange={(event) =>
                    setResetForm({
                      ...resetForm,
                      password: event.target.value,
                    })
                  }
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                  placeholder="At least 12 characters"
                />
              </label>

              <label>
                Confirm new password
                <input
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(event) =>
                    setResetForm({
                      ...resetForm,
                      confirmPassword:
                        event.target.value,
                    })
                  }
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                  placeholder="Re-enter your password"
                />
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="auth-success"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || !resetToken && mode === "reset"}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Enter your library"
                : mode === "register"
                  ? "Create your account"
                  : mode === "forgot"
                    ? "Request reset link"
                    : "Reset password"}

            {!submitting && (
              <span aria-hidden="true">→</span>
            )}
          </button>
        </form>

        {mode === "login" ||
        mode === "register" ? (
          <p className="auth-switch">
            {mode === "login"
              ? "New to Bookshelf PoweredAI?"
              : "Already have an account?"}

            <button
              type="button"
              className="text-button"
              onClick={() =>
                changeMode(
                  mode === "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {mode === "login"
                ? "Create an account"
                : "Log in"}
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            <button
              type="button"
              className="text-button"
              onClick={() => changeMode("login")}
            >
              ← Back to login
            </button>
          </p>
        )}

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
