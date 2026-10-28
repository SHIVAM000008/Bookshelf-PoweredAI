
import { useEffect, useState } from "react";
import "./AppShell.css";

const navigation = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "bookshelf", label: "My Bookshelf", icon: "▤" },
  { id: "discover", label: "Discover Books", icon: "⌕" },
  { id: "recommendations", label: "Recommendations", icon: "✧" },
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

function readSavedSidebarState() {
  try {
    return localStorage.getItem("bookshelf-sidebar-collapsed") === "true";
  } catch {
    return false;
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
  const [activePage, setActivePage] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    readSavedSidebarState
  );
  const [recommendationMode, setRecommendationMode] =
    useState("content");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("bookshelf-theme", theme);
    } catch {
      // Theme remains active for this session.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "bookshelf-sidebar-collapsed",
        String(sidebarCollapsed)
      );
    } catch {
      // Sidebar preference remains active for this session.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  function navigateTo(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
  }

  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Reader";

  const activeNavigationItem = navigation.find(
    (item) => item.id === activePage
  );

  return (
    <div
      className={`bs-app${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
    >
      <button
        className="bs-mobile-menu"
        type="button"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-expanded={mobileMenuOpen}
        aria-controls="bs-sidebar"
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

      <aside
        id="bs-sidebar"
        className={`bs-sidebar${mobileMenuOpen ? " is-open" : ""}`}
        aria-label="Sidebar navigation"
      >
        <button
          className="bs-brand"
          type="button"
          onClick={() => navigateTo("overview")}
          aria-label="Go to Bookshelf overview"
        >
          <span className="bs-brand-mark">B</span>

          <span className="bs-brand-copy">
            <strong>Bookshelf</strong>
            <small>POWERED AI</small>
          </span>
        </button>

        <div className="bs-nav-label">WORKSPACE</div>

        <nav className="bs-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`bs-nav-item ${
                activePage === item.id ? "is-active" : ""
              }`}
              onClick={() => navigateTo(item.id)}
              aria-current={activePage === item.id ? "page" : undefined}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="bs-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="bs-nav-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="bs-sidebar-bottom">
          {/* The duplicate AI promo card is intentionally removed. */}
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
          <div className="bs-topbar-left">
            <button
              className="bs-sidebar-toggle"
              type="button"
              onClick={() => {
                setSidebarCollapsed((collapsed) => !collapsed);
                setMobileMenuOpen(false);
              }}
              aria-expanded={!sidebarCollapsed}
              aria-controls="bs-sidebar"
              aria-label={
                sidebarCollapsed ? "Show sidebar" : "Hide sidebar"
              }
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              <span aria-hidden="true">
                {sidebarCollapsed ? "☰" : "◧"}
              </span>
            </button>

            <div className="bs-breadcrumb" aria-live="polite">
              <span>Bookshelf</span>
              <span aria-hidden="true">/</span>
              <strong>{activeNavigationItem?.label || "Overview"}</strong>
            </div>
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
            {activePage === "overview" && (
              <section
                className="bs-welcome bs-page"
                aria-labelledby="bs-welcome-title"
              >
                <div className="bs-welcome-copy">
                  <span className="bs-eyebrow">
                    YOUR PERSONAL LIBRARY
                  </span>

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
                      <span aria-hidden="true">＋</span>
                      View my bookshelf
                    </button>

                    <button
                      className="bs-button bs-button-secondary"
                      type="button"
                      onClick={() => navigateTo("discover")}
                    >
                      Discover books
                    </button>

                    <button
                      className="bs-button bs-button-secondary"
                      type="button"
                      onClick={() => navigateTo("recommendations")}
                    >
                      View recommendations
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
            )}

            {activePage === "bookshelf" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-bookshelf-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <span className="bs-eyebrow">YOUR COLLECTION</span>
                    <h1 id="bs-bookshelf-title">My Bookshelf</h1>
                    <p>Your saved books and reading progress.</p>
                  </div>

                  <button
                    className="bs-text-button"
                    type="button"
                    onClick={() => navigateTo("discover")}
                  >
                    Find books <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="bs-feature-content">{bookshelf}</div>
              </section>
            )}

            {activePage === "discover" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-discover-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <span className="bs-eyebrow">FIND SOMETHING NEW</span>
                    <h1 id="bs-discover-title">Discover Books</h1>
                    <p>Search the catalog for your next great read.</p>
                  </div>
                </div>

                <div className="bs-feature-content">{discover}</div>
              </section>
            )}

            {activePage === "recommendations" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-recommendations-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <span className="bs-eyebrow">PICKED FOR YOU</span>
                    <h1 id="bs-recommendations-title">
                      Your Recommendations
                    </h1>
                    <p>
                      Explore personalized picks and AI-generated book ideas.
                    </p>
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
                    <span aria-hidden="true">▤</span>
                    Content-based
                  </button>

                  <button
                    type="button"
                    className={
                      recommendationMode === "ai" ? "is-selected" : ""
                    }
                    aria-pressed={recommendationMode === "ai"}
                    onClick={() => setRecommendationMode("ai")}
                  >
                    <span aria-hidden="true">✧</span>
                    AI recommendations
                  </button>
                </div>

                <div className="bs-feature-content">
                  {recommendationMode === "content"
                    ? contentRecommendations
                    : aiRecommendations}
                </div>
              </section>
            )}

            <footer className="bs-footer">
              <span>Bookshelf PoweredAI</span>
              <span>Your next chapter starts here.</span>
            </footer>
          </div>

          <aside
            className="bs-research-column"
            id="bs-research-panel"
            aria-label="AI Assistant"
          >
            <div className="bs-research-heading">
              <div>
                <span className="bs-eyebrow">YOUR READING COMPANION</span>
                <h2>AI Assistant</h2>
              </div>
              <span className="bs-ai-badge" aria-label="AI">
                ✧
              </span>
            </div>

            <p className="bs-research-description">
              Ask about books, authors, literary themes, or research ideas.
            </p>

            <div className="bs-research-body">{researchAssistant}</div>
          </aside>
        </div>
      </main>
    </div>
  );
}
