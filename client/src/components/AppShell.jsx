
import { useEffect, useRef, useState } from "react";
import "./AppShell.css";
import "./AppShell.responsive.css";
import KarwaChauthGift from "./KarwaChauthGift";

const navigation = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "bookshelf", label: "My Bookshelf", icon: "▤" },
  { id: "discover", label: "Discover Books", icon: "⌕" },
  { id: "recommendations", label: "Recommendations", icon: "✧" },
  { id: "assistant", label: "AI Assistant", icon: "✧" },
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
  const [recommendationMode, setRecommendationMode] = useState("content");
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  // Floating AI Assistant state
  const assistantPanelRef = useRef(null);
  const assistantDragRef = useRef(null);
  const assistantLauncherRef = useRef(null);
  const launcherDragRef = useRef(null);
  const suppressLauncherClickRef = useRef(false);

  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState(null);
  const [launcherPosition, setLauncherPosition] = useState(null);

  // Start dragging from the assistant header.
  function startAssistantDrag(event) {
    if (event.button !== 0 || event.target.closest("button")) {
      return;
    }

    if (window.matchMedia("(max-width: 680px)").matches) {
      return;
    }

    const panel = assistantPanelRef.current;
    if (!panel) return;

    const bounds = panel.getBoundingClientRect();

    assistantDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };

    setAssistantPosition({
      left: bounds.left,
      top: bounds.top,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  // Move the window while keeping it inside the viewport.
  function moveAssistantDrag(event) {
    const drag = assistantDragRef.current;
    const panel = assistantPanelRef.current;

    if (
      !drag ||
      !panel ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const width = panel.offsetWidth;
    const height = panel.offsetHeight;

    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);

    setAssistantPosition({
      left: Math.max(
        0,
        Math.min(event.clientX - drag.offsetX, maxLeft)
      ),
      top: Math.max(
        0,
        Math.min(event.clientY - drag.offsetY, maxTop)
      ),
    });
  }

  function stopAssistantDrag(event) {
    if (
      assistantDragRef.current?.pointerId === event.pointerId
    ) {
      assistantDragRef.current = null;
    }
  }

  // Drag the minimized launcher without triggering its open action.
  function startLauncherDrag(event) {
    if (event.button !== 0 || window.matchMedia("(max-width: 680px)").matches) {
      return;
    }

    const launcher = assistantLauncherRef.current;
    if (!launcher) return;

    const rect = launcher.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    suppressLauncherClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveLauncherDrag(event) {
    const drag = launcherDragRef.current;
    const launcher = assistantLauncherRef.current;
    if (!drag || !launcher || drag.pointerId !== event.pointerId) return;

    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    ) {
      return;
    }

    drag.moved = true;
    const maxLeft = Math.max(0, window.innerWidth - launcher.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - launcher.offsetHeight);

    setLauncherPosition({
      left: Math.max(0, Math.min(event.clientX - drag.offsetX, maxLeft)),
      top: Math.max(0, Math.min(event.clientY - drag.offsetY, maxTop)),
    });
  }

  function stopLauncherDrag(event) {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressLauncherClickRef.current = drag.moved;
    launcherDragRef.current = null;
  }

  // Keep the floating window visible after resizing.
  useEffect(() => {
    function keepAssistantVisible() {
      if (window.matchMedia("(max-width: 680px)").matches) {
        return;
      }

      const panel = assistantPanelRef.current;
      if (!panel) return;

      setAssistantPosition((current) => {
        if (!current) return current;

        return {
          left: Math.max(
            0,
            Math.min(
              current.left,
              Math.max(0, window.innerWidth - panel.offsetWidth)
            )
          ),
          top: Math.max(
            0,
            Math.min(
              current.top,
              Math.max(0, window.innerHeight - panel.offsetHeight)
            )
          ),
        };
      });
    }

    function keepLauncherVisible() {
      const launcher = assistantLauncherRef.current;
      if (!launcher || window.matchMedia("(max-width: 680px)").matches) return;
      setLauncherPosition((current) => {
        if (!current) return current;
        return {
          left: Math.max(0, Math.min(current.left, window.innerWidth - launcher.offsetWidth)),
          top: Math.max(0, Math.min(current.top, window.innerHeight - launcher.offsetHeight)),
        };
      });
    }

    window.addEventListener("resize", keepAssistantVisible);
    window.addEventListener("resize", keepLauncherVisible);

    return () => {
      window.removeEventListener("resize", keepAssistantVisible);
      window.removeEventListener("resize", keepLauncherVisible);
    };
  }, []);

  // Existing theme effect follows below.

  // Apply the selected theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("bookshelf-theme", theme);
    } catch {
      // Theme remains active for this session.
    }
  }, [theme]);

  // Remember the desktop sidebar preference.
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

  // Close the profile menu or mobile navigation when appropriate.
  useEffect(() => {
    if (!profileOpen && !mobileMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen, mobileMenuOpen]);

  function navigateTo(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
    setProfileOpen(false);
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
      className={`bs-app${
        sidebarCollapsed ? " sidebar-collapsed" : ""
      }`}
    >
      <KarwaChauthGift />

      {/* Mobile navigation button */}
      <button
        className="bs-mobile-menu"
        type="button"
        onClick={() =>
          setMobileMenuOpen((open) => !open)
        }
        aria-expanded={mobileMenuOpen}
        aria-controls="bs-sidebar"
        aria-label={
          mobileMenuOpen
            ? "Close navigation"
            : "Open navigation"
        }
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

      {/* Sidebar */}
      <aside
        id="bs-sidebar"
        className={`bs-sidebar${
          mobileMenuOpen ? " is-open" : ""
        }`}
        aria-label="Sidebar navigation"
      >
        <button
          className="bs-brand"
          type="button"
          onClick={() => navigateTo("overview")}
          aria-label="Go to Bookshelf overview"
        >
          <span className="bs-brand-mark">
            <BookLogo />
          </span>

          <span className="bs-brand-copy">
            <strong>Bookshelf</strong>
            <small>POWERED AI</small>
          </span>
        </button>

        <div className="bs-nav-label">WORKSPACE</div>

        <nav
          className="bs-navigation"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`bs-nav-item ${
                item.id === "assistant"
                  ? "bs-mobile-ai-nav-item"
                  : ""
              } ${
                activePage === item.id
                  ? "is-active"
                  : ""
              }`}
              onClick={() => navigateTo(item.id)}
              aria-current={
                activePage === item.id
                  ? "page"
                  : undefined
              }
              title={
                sidebarCollapsed
                  ? item.label
                  : undefined
              }
            >
              <span
                className="bs-nav-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span className="bs-nav-text">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Theme toggle */}
        <div
          className="bs-sidebar-bottom"
          style={{
            marginTop: "auto",
            paddingTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <button
            className="bs-theme-toggle"
            type="button"
            onClick={() =>
              setTheme((current) =>
                current === "dark"
                  ? "light"
                  : "dark"
              )
            }
            aria-label={`Switch to ${
              theme === "dark"
                ? "light"
                : "dark"
            } mode`}
            title={`Switch to ${
              theme === "dark"
                ? "light"
                : "dark"
            } mode`}
            style={{
              alignSelf: "flex-start",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >
            <span aria-hidden="true">
              {theme === "dark" ? "☼" : "☾"}
            </span>

            <span>
              {theme === "dark"
                ? "Light mode"
                : "Dark mode"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="bs-main">
        <header className="bs-topbar">
          <div className="bs-topbar-left">
            <button
              className="bs-sidebar-toggle"
              type="button"
              onClick={() => {
                setSidebarCollapsed(
                  (collapsed) => !collapsed
                );
                setMobileMenuOpen(false);
              }}
              aria-expanded={!sidebarCollapsed}
              aria-controls="bs-sidebar"
              aria-label={
                sidebarCollapsed
                  ? "Show sidebar"
                  : "Hide sidebar"
              }
              title={
                sidebarCollapsed
                  ? "Show sidebar"
                  : "Hide sidebar"
              }
            >
              <span aria-hidden="true">
                {sidebarCollapsed ? "☰" : "◧"}
              </span>
            </button>

            <div
              className="bs-breadcrumb"
              aria-live="polite"
            >
              <span>Bookshelf</span>
              <span aria-hidden="true">/</span>
              <strong>
                {activeNavigationItem?.label ||
                  "Overview"}
              </strong>
            </div>
          </div>

          <div
            className="bs-topbar-actions"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "16px",
              minWidth: 0,
            }}
          >
            <span className="bs-status">
              <span className="bs-status-dot" />
              Your reading space
            </span>

            {/* Profile dropdown begins in Part 3 */}

            {/* Header profile button and dropdown */}
            <div
              ref={profileRef}
              style={{
                position: "relative",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="bs-user"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label={`Open profile menu for ${displayName}`}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                aria-controls="bs-profile-popover"
                title="Account menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  maxWidth: "220px",
                  minWidth: 0,
                  padding: "6px 10px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  className="bs-avatar"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>

                <span
                  className="bs-user-copy"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    textAlign: "left",
                  }}
                >
                  <strong
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "130px",
                    }}
                  >
                    {displayName}
                  </strong>

                  <small>My account</small>
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: "12px",
                    transform: profileOpen
                      ? "rotate(180deg)"
                      : "none",
                    transition: "transform 150ms ease",
                  }}
                >
                  ▾
                </span>
              </button>

              {profileOpen && (
                <div
                  id="bs-profile-popover"
                  role="region"
                  aria-label="Account details"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    zIndex: 1000,
                    width: "min(320px, calc(100vw - 24px))",
                    padding: "18px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    boxShadow:
                      "var(--shadow-card, 0 12px 36px rgba(0, 0, 0, 0.2))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                      paddingBottom: "16px",
                      borderBottom:
                        "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      className="bs-avatar"
                      aria-hidden="true"
                      style={{
                        width: "46px",
                        height: "46px",
                        flexShrink: 0,
                        fontSize: "18px",
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: "15px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {displayName}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "var(--text-secondary)",
                          fontSize: "12px",
                        }}
                      >
                        Book Lover
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "13px",
                      padding: "16px 0",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "var(--text-secondary)",
                          fontSize: "11px",
                        }}
                      >
                        Full name
                      </span>

                      <strong
                        style={{
                          display: "block",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {user?.name || "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "var(--text-secondary)",
                          fontSize: "11px",
                        }}
                      >
                        Email address
                      </span>

                      <strong
                        style={{
                          display: "block",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {user?.email || "Not provided"}
                      </strong>
                    </div>

                    {user?.username && (
                      <div>
                        <span
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            color: "var(--text-secondary)",
                            fontSize: "11px",
                          }}
                        >
                          Username
                        </span>

                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {user.username}
                        </strong>
                      </div>
                    )}
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      className="bs-logout"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      aria-label="Log out of your account"
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "9px",
                        cursor: "pointer",
                      }}
                    >
                      <span aria-hidden="true">↗</span>
                      <span>Logout</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main workspace */}
        <div
          className={`bs-workspace${
            activePage === "assistant"
              ? " assistant-active"
              : ""
          }`}
        >
          <div className="bs-content-column">
            {/* Page content continues in Part 4 */}

            {/* Overview page */}
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

            {/* My Bookshelf page */}
            {activePage === "bookshelf" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-bookshelf-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <h1 id="bs-bookshelf-title">My Bookshelf</h1>
                    <p className="bs-page-description">
                      Your saved books and reading progress.
                    </p>
                  </div>

                  <button
                    className="bs-text-button"
                    type="button"
                    onClick={() => navigateTo("discover")}
                  >
                    Find books{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>

                <div className="bs-feature-content">
                  {bookshelf}
                </div>
              </section>
            )}

            {/* Discover Books page */}
            {activePage === "discover" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-discover-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <h1 id="bs-discover-title">
                      Discover Books
                    </h1>

                    <p className="bs-page-description">
                      Search the catalog for your next great read.
                    </p>
                  </div>
                </div>

                <div className="bs-feature-content">
                  {discover}
                </div>
              </section>
            )}

            {/* Recommendations page */}
            {activePage === "recommendations" && (
              <section
                className="bs-page bs-section"
                aria-labelledby="bs-recommendations-title"
              >
                <div className="bs-section-heading">
                  <div>
                    <h1 id="bs-recommendations-title">
                      Your Recommendations
                    </h1>

                    <p className="bs-page-description">
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
                      recommendationMode === "content"
                        ? "is-selected"
                        : ""
                    }
                    aria-pressed={
                      recommendationMode === "content"
                    }
                    onClick={() =>
                      setRecommendationMode("content")
                    }
                  >
                    <span aria-hidden="true">▤</span>
                    Content-based
                  </button>

                  <button
                    type="button"
                    className={
                      recommendationMode === "ai"
                        ? "is-selected"
                        : ""
                    }
                    aria-pressed={
                      recommendationMode === "ai"
                    }
                    onClick={() =>
                      setRecommendationMode("ai")
                    }
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

            {/* Footer and AI Assistant continue in Part 5 */}

            {/* Footer */}
            <footer className="bs-footer">
              <span>
                © 2026 Bookshelf PoweredAI. All rights reserved.
              </span>
            </footer>
          </div>

          {/* Floating AI Assistant */}
          <aside
            ref={assistantPanelRef}
            id="bs-research-panel"
            className={`bs-research-column${
              assistantMinimized ? " is-minimized" : ""
            }${
              assistantPosition ? " bs-assistant-positioned" : ""
            }`}
            style={
              assistantPosition
                ? {
                    left: `${assistantPosition.left}px`,
                    top: `${assistantPosition.top}px`,
                    right: "auto",
                    bottom: "auto",
                  }
                : undefined
            }
            aria-label="AI research assistant"
          >
            <div
              className="bs-research-heading bs-assistant-drag-handle"
              onPointerDown={startAssistantDrag}
              onPointerMove={moveAssistantDrag}
              onPointerUp={stopAssistantDrag}
              onPointerCancel={stopAssistantDrag}
            >
              <div>
                <span className="bs-eyebrow">
                  YOUR AI COMPANION
                </span>

                <h2>AI Assistant</h2>
              </div>

              <button
                type="button"
                className="bs-assistant-minimize-button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={() => {
                  assistantDragRef.current = null;
                  setAssistantMinimized(true);
                }}
                aria-label="Minimize AI Assistant"
                title="Minimize AI Assistant"
              >
                <span aria-hidden="true">−</span>
              </button>
            </div>

            <div className="bs-research-body">
              <p className="bs-research-description">
                Ask questions, explore ideas, and research books
                with AI.
              </p>

              {researchAssistant}
            </div>
          </aside>
        </div>

        {/* Reopen minimized AI Assistant */}
        {assistantMinimized && (
          <button
            ref={assistantLauncherRef}
            type="button"
            className="bs-assistant-reopen bs-assistant-launcher-glow"
            style={
              launcherPosition
                ? { left: `${launcherPosition.left}px`, top: `${launcherPosition.top}px`, right: "auto", bottom: "auto" }
                : undefined
            }
            onPointerDown={startLauncherDrag}
            onPointerMove={moveLauncherDrag}
            onPointerUp={stopLauncherDrag}
            onPointerCancel={stopLauncherDrag}
            onClick={() => {
              if (suppressLauncherClickRef.current) {
                suppressLauncherClickRef.current = false;
                return;
              }
              setAssistantMinimized(false);
            }}
            aria-label="Open AI Assistant"
            title="Open AI Assistant"
          >
            <span aria-hidden="true">✧</span>
            <span>AI Assistant</span>
          </button>
        )}
      </main>
    </div>
  );
}
