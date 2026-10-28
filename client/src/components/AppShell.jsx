
import { useEffect, useState } from "react";
import "./AppShell.css";

const navigation = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "bookshelf", label: "My Bookshelf", icon: "▤" },
  { id: "discover", label: "Discover Books", icon: "⌕" },
  { id: "recommendations", label: "For You", icon: "✧" },
  { id: "research", label: "AI Research", icon: "◈" },
];

function readSavedTheme() {
  try {
    return localStorage.getItem("bookshelf-theme") === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

export default function AppShell({
  user,
  onLogout,
  bookshelf,
  discover,
  contentRecommendations,
  aiRecommendations,
  researchAssistant,
}) {
  const [theme, setTheme] = useState(readSavedTheme);
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recommendationMode, setRecommendationMode] =
    useState("content");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("bookshelf-theme", theme);
    } catch {
      // Theme remains usable for the current session.
    }
  }, [theme]);

  function navigateTo(id) {
    setActiveSection(id);
    setMobileMenuOpen(false);

    document.getElementById(`section-${id}`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Reader";

  return (
    <div className="bs-app">
      <button
        className="bs-mobile-menu"
        type="button"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-expanded={mobileMenuOpen}
        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {mobileMenuOpen && (
        <button
          className="bs-mobile-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`bs-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <a
          className="bs-brand"
          href="#section-overview"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("overview");
          }}
        >
          <span className="bs-brand-mark">B</span>
          <span className="bs-brand-copy">
            <strong>Bookshelf</strong>
            <small>POWERED AI</small>
          </span>
        </a>

        <div className="bs-nav-label">WORKSPACE</div>

        <nav className="bs-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`bs-nav-item ${
                activeSection === item.id ? "is-active" : ""
              }`}
              onClick={() => navigateTo(item.id)}
            >
              <span className="bs-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="bs-sidebar-bottom">
          <div className="bs-ai-note">
            <span className="bs-ai-note-icon">✧</span>
            <strong>Your reading companion</strong>
            <p>Discover books and explore ideas with AI.</p>
            <button
              type="button"
              className="bs-ai-note-link"
              onClick={() => navigateTo("research")}
            >
              Start researching <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="bs-user">
            <div className="bs-avatar" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="bs-user-copy">
              <strong>{displayName}</strong>
              <small>Your library</small>
            </div>

            {onLogout && (
              <button
                type="button"
                className="bs-logout"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
              >
                ↗
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="bs-main">
        <header className="bs-topbar">
          <div className="bs-breadcrumb">
            <span>Bookshelf</span>
            <span aria-hidden="true">/</span>
            <strong>
              {navigation.find((item) => item.id === activeSection)?.label ||
                "Overview"}
            </strong>
          </div>

          <div className="bs-topbar-actions">
            <span className="bs-status">
              <span className="bs-status-dot" />
              Your reading space
            </span>

            <button
              className="bs-theme-toggle"
              type="button"
              onClick={() =>
                setTheme((current) =>
                  current === "dark" ? "light" : "dark"
                )
              }
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
              title={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
            >
              <span aria-hidden="true">
                {theme === "dark" ? "☼" : "☾"}
              </span>
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>
        </header>

        <div className="bs-workspace">
          <div className="bs-content-column">
            <section
              className="bs-welcome"
              id="section-overview"
              aria-labelledby="bs-welcome-title"
            >
              <div className="bs-welcome-copy">
                <span className="bs-eyebrow">YOUR PERSONAL LIBRARY</span>
                <h1 id="bs-welcome-title">
                  A world of books,
                  <br />
                  <span>one space to explore.</span>
                </h1>
                <p>
                  Keep your collection organized, discover your next read,
                  and explore ideas with your AI research companion.
                </p>

                <div className="bs-welcome-actions">
                  <button
                    className="bs-button bs-button-primary"
                    type="button"
                    onClick={() => navigateTo("bookshelf")}
                  >
                    <span aria-hidden="true">＋</span> View my bookshelf
                  </button>

                  <button
                    className="bs-button bs-button-secondary"
                    type="button"
                    onClick={() => navigateTo("discover")}
                  >
                    Discover books
                  </button>
                </div>
              </div>

              <div className="bs-welcome-art" aria-hidden="true">
                <span className="bs-art-orbit bs-art-orbit-one" />
                <span className="bs-art-orbit bs-art-orbit-two" />
                <div className="bs-art-book bs-art-book-back" />
                <div className="bs-art-book bs-art-book-front">
                  <span>THE</span>
                  <strong>
                    READING
                    <br />
                    ROOM
                  </strong>
                  <i />
                </div>
                <span className="bs-art-star">✦</span>
              </div>
            </section>

            <section
              className="bs-section"
              id="section-bookshelf"
              aria-labelledby="bs-bookshelf-title"
            >
              <div className="bs-section-heading">
                <div>
                  <span className="bs-eyebrow">YOUR COLLECTION</span>
                  <h2 id="bs-bookshelf-title">My Bookshelf</h2>
                  <p>Your saved books and reading progress.</p>
                </div>

                <button
                  className="bs-text-button"
                  type="button"
                  onClick={() => navigateTo("discover")}
                >
                  Add books <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="bs-feature-content">{bookshelf}</div>
            </section>

            <section
              className="bs-section"
              id="section-discover"
              aria-labelledby="bs-discover-title"
            >
              <div className="bs-section-heading">
                <div>
                  <span className="bs-eyebrow">FIND SOMETHING NEW</span>
                  <h2 id="bs-discover-title">Discover Books</h2>
                  <p>Search the catalog for your next great read.</p>
                </div>
              </div>

              <div className="bs-feature-content">{discover}</div>
            </section>

            <section
              className="bs-section"
              id="section-recommendations"
              aria-labelledby="bs-recommendations-title"
            >
              <div className="bs-section-heading">
                <div>
                  <span className="bs-eyebrow">PICKED FOR YOU</span>
                  <h2 id="bs-recommendations-title">Your next read</h2>
                  <p>Compare recommendations from two approaches.</p>
                </div>
              </div>

              <div
                className="bs-segmented"
                role="group"
                aria-label="Recommendation method"
              >
                <button
                  type="button"
                  className={
                    recommendationMode === "content" ? "is-selected" : ""
                  }
                  aria-pressed={recommendationMode === "content"}
                  onClick={() => setRecommendationMode("content")}
                >
                  <span aria-hidden="true">▤</span> Content-based
                </button>

                <button
                  type="button"
                  className={
                    recommendationMode === "ai" ? "is-selected" : ""
                  }
                  aria-pressed={recommendationMode === "ai"}
                  onClick={() => setRecommendationMode("ai")}
                >
                  <span aria-hidden="true">✧</span> AI recommendations
                </button>
              </div>

              <div className="bs-feature-content">
                {recommendationMode === "content"
                  ? contentRecommendations
                  : aiRecommendations}
              </div>
            </section>

            <footer className="bs-footer">
              <span>Bookshelf PoweredAI</span>
              <span>Your next chapter starts here.</span>
            </footer>
          </div>

          <aside
            className="bs-research-column"
            id="section-research"
            aria-label="AI research panel"
          >
            <div className="bs-research-heading">
              <div>
                <span className="bs-eyebrow">YOUR AI WORKSPACE</span>
                <h2>Research Assistant</h2>
              </div>
              <span className="bs-ai-badge" aria-label="AI">
                ✧
              </span>
            </div>

            <p className="bs-research-description">
              Explore ideas, ask questions, and research your next read.
            </p>

            <div className="bs-research-body">{researchAssistant}</div>
          </aside>
        </div>
      </main>
    </div>
  );
}
