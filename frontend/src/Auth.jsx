import { useState } from "react";

const AUTH_API = "http://localhost:5000/api/auth";

function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.59a2 2 0 002.83 2.83" />
      <path d="M9.88 5.09A10.8 10.8 0 0112 4.9c5 0 8.5 4.1 9.5 7.1a11.8 11.8 0 01-3.05 4.43" />
      <path d="M6.61 6.61A12.2 12.2 0 002.5 12c1 3 4.5 7.1 9.5 7.1a10.6 10.6 0 004.2-.86" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-7.1 9.5-7.1 9.5 7.1 9.5 7.1-3.5 7.1-9.5 7.1S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const switchMode = (newMode) => {
    setMode(newMode);
    setMessage("");
    setError("");
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // FORGOT PASSWORD
      if (mode === "forgot") {
        const response = await fetch(
          `${AUTH_API}/forgot-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to send reset link."
          );
        }

        setMessage(
          data.message ||
            "If an account exists with this email, a reset link will be sent."
        );

        return;
      }

      // LOGIN OR SIGNUP
      const endpoint = mode === "login" ? "login" : "signup";

      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };

      const response = await fetch(
        `${AUTH_API}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      if (mode === "signup") {
        setMessage("Account created! You can now log in.");
        setMode("login");
        setName("");
        setPassword("");
        setShowPassword(false);
      } else {
        onLogin(data);
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isForgotMode = mode === "forgot";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/">
          <span className="brand-icon">F</span>
          FileVault
        </a>

        <span className="eyebrow">
          YOUR PERSONAL FILE SPACE
        </span>

        <h1>
          {isForgotMode
            ? "Forgot password?"
            : mode === "login"
              ? "Welcome back"
              : "Create your account"}
        </h1>

        <p className="auth-description">
          {isForgotMode
            ? "Enter your email address and we'll send you a password reset link."
            : mode === "login"
              ? "Log in to continue to your files."
              : "Sign up to get started with FileVault."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                minLength={2}
                maxLength={50}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {!isForgotMode && (
            <label>
              Password
              <div className="password-input-wrapper">
                <input
                  className="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </label>
          )}

          {mode === "login" && (
            <div className="forgot-password-row">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {message && (
            <div className="notice success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}

          <button
            className="upload-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isForgotMode
                ? "Send reset link"
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          {isForgotMode
            ? "Remember your password?"
            : mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

          <button
            type="button"
            onClick={() =>
              switchMode(
                isForgotMode
                  ? "login"
                  : mode === "login"
                    ? "signup"
                    : "login"
              )
            }
          >
            {isForgotMode
              ? "Log in"
              : mode === "login"
                ? "Sign up"
                : "Log in"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default Auth;
