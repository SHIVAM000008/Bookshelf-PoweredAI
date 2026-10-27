
import { useEffect, useState } from "react";

// API helper for communicating with our Express backend.
// It automatically includes authentication cookies.
import { apiRequest } from "./lib/api";

// Application styles.
import "./App.css";

// Main dashboard components.
import Bookshelf from "./components/Bookshelf";
import DiscoverBooks from "./components/DiscoverBooks";
import Recommendations from "./components/Recommendations";
import AIRecommendations from "./components/AIRecommendations";

function App() {
  // ============================================================
  // 1. AUTHENTICATION STATE
  // ============================================================

  // Stores the currently logged-in user.
  // null means no authenticated user is available.
  const [user, setUser] = useState(null);

  // Controls whether the authentication form shows
  // "login" or "register".
  const [mode, setMode] = useState("login");

  // Shared form state for login and registration.
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Prevents duplicate requests and displays loading states.
  const [loading, setLoading] = useState(true);

  // Displays authentication-related errors.
  const [error, setError] = useState("");

  // ============================================================
  // 2. BOOKSHELF REFRESH STATE
  // ============================================================

  // This value changes whenever a book is added from
  // Discover Books or Recommendations.
  //
  // Changing the key on <Bookshelf /> causes React to remount
  // the component, which reloads books from our backend.
  //
  // This is a simple MVP solution. Later, we can replace it
  // with a shared data hook to preserve filters and search.
  const [bookshelfVersion, setBookshelfVersion] = useState(0);

  // Shared callback passed to components that can save books.
  function handleBookAdded() {
    setBookshelfVersion((version) => version + 1);
  }

  // ============================================================
  // 3. RESTORE EXISTING LOGIN SESSION
  // ============================================================

  // Runs once when the application first loads.
  //
  // The browser sends the HttpOnly authentication cookie.
  // Our backend validates the cookie and returns the user.
  //
  // This keeps users logged in after refreshing the page,
  // as long as their session is still valid.
  useEffect(() => {
    async function checkSession() {
      try {
        const data = await apiRequest("/auth/me");
        setUser(data.user);
      } catch {
        // Missing or expired session: show login form.
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  // ============================================================
  // 4. HANDLE LOGIN AND REGISTRATION
  // ============================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Use the correct endpoint for the selected form.
      const endpoint =
        mode === "register" ? "/auth/register" : "/auth/login";

      // Registration needs name, email, and password.
      // Login needs only email and password.
      const payload =
        mode === "register"
          ? form
          : {
              email: form.email,
              password: form.password,
            };

      // Send credentials to the backend.
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Save the authenticated user in React state.
      // This automatically switches to the dashboard.
      setUser(data.user);

      // Clear sensitive form values after successful login.
      setForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // 5. HANDLE LOGOUT
  // ============================================================

  async function handleLogout() {
    setError("");
    setLoading(true);

    try {
      // Backend clears the authentication cookie.
      await apiRequest("/auth/logout", {
        method: "POST",
      });

      // Remove user from React state.
      // The application returns to the login screen.
      setUser(null);

      // Reset dashboard refresh state for the next session.
      setBookshelfVersion(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // 6. INITIAL LOADING SCREEN
  // ============================================================

  // Wait until the initial authentication check finishes.
  // This prevents briefly displaying the login form
  // to users who already have a valid session.
  if (loading && !user) {
    return (
      <main className="auth-container">
        Loading...
      </main>
    );
  }

  // ============================================================
  // 7. AUTHENTICATED USER DASHBOARD
  // ============================================================

  if (user) {
    return (
      <main className="auth-container">
        <section className="auth-card">
          {/* Dashboard heading */}
          <h1>Bookshelf PoweredAI</h1>

          <h2>Welcome, {user.name}!</h2>

          <p>You are successfully logged in.</p>
          <p>Email: {user.email}</p>

          {/* ================================================
              MY BOOKSHELF

              Displays books saved in MongoDB.
              Supports adding, editing, deleting,
              searching, and filtering books.

              The key changes when a catalog or
              recommended book is successfully saved.
          ================================================= */}
          <Bookshelf key={bookshelfVersion} />

          {/* ================================================
              DISCOVER BOOKS

              Searches the Open Library catalog.

              After a successful save, this component
              calls handleBookAdded() to refresh the shelf.
          ================================================= */}
          <DiscoverBooks
            onBookAdded={handleBookAdded}
          />

          {/* ================================================
              PERSONALIZED RECOMMENDATIONS

              Loads recommendations from:
              GET /api/recommendations

              Recommendations are based on the user's
              saved genres, reading status, and interests.

              Users can save recommended books directly
              to their personal bookshelf.
          ================================================= */}
          <Recommendations onBookAdded={handleBookAdded} />
          <AIRecommendations onBookAdded={handleBookAdded} />

          {/* Authentication-related error messages */}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? "Please wait..." : "Log out"}
          </button>
        </section>
      </main>
    );
  }

  // ============================================================
  // 8. LOGIN AND REGISTRATION SCREEN
  // ============================================================

  // Rendered only when the user is not authenticated.
  return (
    <main className="auth-container">
      <section className="auth-card">
        <h1>Bookshelf PoweredAI</h1>

        <h2>
          {mode === "login"
            ? "Welcome back"
            : "Create account"}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name is required only during registration. */}
          {mode === "register" && (
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                required
                maxLength={80}
              />
            </label>
          )}

          {/* Email is required for both forms. */}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              required
            />
          </label>

          {/* Password is required for both forms. */}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              required
              minLength={
                mode === "register" ? 12 : undefined
              }
            />
          </label>

          {/* Display login or registration errors. */}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          {/* Submit authentication form. */}
          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Register"}
          </button>
        </form>

        {/* Switch between login and registration. */}
        <p>
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}
          {" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(
                mode === "login" ? "register" : "login"
              );
              setError("");
            }}
          >
            {mode === "login" ? "Register" : "Log in"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default App;
