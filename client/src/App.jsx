import { useEffect, useState } from "react";
import { apiRequest } from "./lib/api";
import "./App.css";

import Bookshelf from "./components/Bookshelf";
import DiscoverBooks from "./components/DiscoverBooks";
import Recommendations from "./components/Recommendations";
import AIRecommendations from "./components/AIRecommendations";
import ResearchAssistant from "./components/ResearchAssistant";

const navigationItems = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "bookshelf", label: "My Bookshelf", icon: "▤" },
  { id: "discover", label: "Discover Books", icon: "⌕" },
  { id: "recommendations", label: "For You", icon: "✳" },
  { id: "research", label: "AI Research", icon: "✧" },
];

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [theme, setTheme] = useState(
  () => localStorage.getItem("bookshelf-theme") || "light"
);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookshelfVersion, setBookshelfVersion] = useState(0);

  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleBookAdded() {
    setBookshelfVersion((version) => version + 1);
  }

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("bookshelf-theme", theme);
}, [theme]);

  useEffect(() => {
    if (!user) return undefined;

    const sections = navigationItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        if (visibleSections[0]) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [user]);

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

      setActiveSection("overview");
    } catch (err) {
      setError(err.message);
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
      setActiveSection("overview");
      setMobileMenuOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function navigateToSection(id) {
    setActiveSection(id);
    setMobileMenuOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
      <div className="app-shell">
        {mobileMenuOpen && (
          <button
            type="button"
            className="mobile-overlay"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`app-sidebar ${
            mobileMenuOpen ? "sidebar-open" : ""
          }`}
        >
          <a
            className="brand"
            href="#overview"
            onClick={() => {
              setActiveSection("overview");
              setMobileMenuOpen(false);
            }}
          >
            <span className="brand-mark">B</span>

            <span className="brand-copy">
              <strong>Bookshelf</strong>
              <span>POWERED AI</span>
            </span>
          </a>

          <div className="sidebar-caption">
            YOUR READING SPACE
          </div>

          <nav
            className="primary-navigation"
            aria-label="Main navigation"
          >
            {navigationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${
                  activeSection === item.id
                    ? "nav-item-active"
                    : ""
                }`}
                onClick={() => navigateToSection(item.id)}
              >
                <span
                  className="nav-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {activeSection === item.id && (
                  <span className="nav-active-dot" />
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="sidebar-note-icon">✦</span>

              <p>
                <strong>Read with intention.</strong>
                <span>
                  Discover your next meaningful read.
                </span>
              </p>
            </div>

            <div className="sidebar-user">
              <div className="user-avatar">
                {user.name?.trim()?.charAt(0)?.toUpperCase() ||
                  "R"}
              </div>

              <div className="user-details">
                <strong>{user.name}</strong>
                <span>Reader account</span>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
                disabled={loading}
                aria-label="Log out"
                title="Log out"
              >
                ↗
              </button>
            </div>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen((open) => !open)
              }
            >
              ☰
            </button>

            <div className="topbar-context">
              <span className="topbar-eyebrow">
                YOUR PERSONAL LIBRARY
              </span>
              <span className="topbar-title">
                A space to explore ideas.
              </span>
            </div>
            <button
  type="button"
  className="theme-toggle"
  onClick={() =>
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    )
  }
  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
  aria-pressed={theme === "dark"}
  title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
>
  <span aria-hidden="true">
    {theme === "light" ? "☾" : "☀"}
  </span>
  <span className="theme-toggle-label">
    {theme === "light" ? "Dark mode" : "Light mode"}
  </span>
</button>

            <button
              type="button"
              className="topbar-account"
              onClick={() => navigateToSection("overview")}
              title="Return to overview"
            >
              <span className="account-avatar">
                {user.name?.trim()?.charAt(0)?.toUpperCase() ||
                  "R"}
              </span>
              <span className="account-name">
                {user.name}
              </span>
              <span className="account-chevron">⌄</span>
            </button>
          </header>

          <main className="workspace">
            <section
              id="overview"
              className="welcome-panel page-section"
            >
              <div className="welcome-copy">
                <span className="eyebrow">
                  YOUR NEXT CHAPTER STARTS HERE
                </span>

                <h1>
                  Welcome back,
                  <br />
                  <span>{user.name}.</span>
                </h1>

                <p>
                  Your books, new discoveries, and fresh
                  perspectives—all in one place.
                </p>

                <button
                  type="button"
                  className="primary-action"
                  onClick={() =>
                    navigateToSection("discover")
                  }
                >
                  Discover your next read
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div
                className="welcome-art"
                aria-hidden="true"
              >
                <div className="art-orbit art-orbit-one" />
                <div className="art-orbit art-orbit-two" />

                <div className="art-book art-book-back">
                  <span>THE ART OF</span>
                  <strong>THINKING</strong>
                  <span>DEEPLY</span>
                </div>

                <div className="art-book art-book-front">
                  <span>VOL. 01</span>
                  <strong>
                    A WORLD
                    <br />
                    OF IDEAS
                  </strong>
                  <span>READ · REFLECT · GROW</span>
                </div>

                <span className="art-spark art-spark-one">
                  ✳
                </span>
                <span className="art-spark art-spark-two">
                  ✦
                </span>
              </div>
            </section>

            <section className="quick-links" aria-label="Quick actions">
              <button
                type="button"
                className="quick-link"
                onClick={() =>
                  navigateToSection("bookshelf")
                }
              >
                <span className="quick-link-icon">▤</span>
                <span>
                  <strong>Your collection</strong>
                  <small>Return to your bookshelf</small>
                </span>
                <span className="quick-link-arrow">→</span>
              </button>

              <button
                type="button"
                className="quick-link"
                onClick={() =>
                  navigateToSection("recommendations")
                }
              >
                <span className="quick-link-icon">✳</span>
                <span>
                  <strong>Made for you</strong>
                  <small>Explore recommendations</small>
                </span>
                <span className="quick-link-arrow">→</span>
              </button>

              <button
                type="button"
                className="quick-link"
                onClick={() =>
                  navigateToSection("research")
                }
              >
                <span className="quick-link-icon">✧</span>
                <span>
                  <strong>Explore an idea</strong>
                  <small>Talk with your AI researcher</small>
                </span>
                <span className="quick-link-arrow">→</span>
              </button>
            </section>

            <section
              id="bookshelf"
              className="content-section page-section"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    YOUR PERSONAL COLLECTION
                  </span>
                  <h2>My Bookshelf</h2>
                  <p>
                    The stories and ideas you're keeping close.
                  </p>
                </div>

                <span className="section-number">01</span>
              </div>

              <Bookshelf key={bookshelfVersion} />
            </section>

            <section
              id="discover"
              className="content-section page-section"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    FOLLOW YOUR CURIOSITY
                  </span>
                  <h2>Discover Books</h2>
                  <p>
                    Find a new perspective, one book at a time.
                  </p>
                </div>

                <span className="section-number">02</span>
              </div>

              <DiscoverBooks onBookAdded={handleBookAdded} />
            </section>

            <section
              id="recommendations"
              className="content-section page-section"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    SELECTED FOR YOUR JOURNEY
                  </span>
                  <h2>Recommended for You</h2>
                  <p>
                    Ideas worth exploring, chosen around your
                    reading interests.
                  </p>
                </div>

                <span className="section-number">03</span>
              </div>

              <Recommendations
                onBookAdded={handleBookAdded}
              />

              <div className="ai-recommendations-panel">
                <AIRecommendations
                  onBookAdded={handleBookAdded}
                />
              </div>
            </section>

            <section
              id="research"
              className="research-section page-section"
            >
              <div className="research-intro">
                <span className="eyebrow">
                  YOUR THINKING PARTNER
                </span>

                <h2>
                  Great questions lead
                  <br />
                  to <span>new discoveries.</span>
                </h2>

                <p>
                  Explore a topic, develop an idea, or follow
                  your curiosity with your AI Research Assistant.
                </p>
              </div>

              <div className="research-workspace">
                <ResearchAssistant />
              </div>
            </section>

            {error && (
              <p role="alert" className="global-error">
                {error}
              </p>
            )}

            <footer className="app-footer">
              <a
                className="footer-brand"
                href="#overview"
                onClick={() => setActiveSection("overview")}
              >
                Bookshelf <span>PoweredAI</span>
              </a>

              <p>
                Made for curious minds and lifelong readers.
              </p>

              <button
                type="button"
                className="footer-logout"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? "Please wait..." : "Log out"}
              </button>
            </footer>
          </main>
        </div>
      </div>
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