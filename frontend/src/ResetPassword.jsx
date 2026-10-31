import React, { useState } from "react";

const AUTH_API = "http://localhost:5000/api/auth";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset link is missing its token. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${AUTH_API}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to reset password. Please try again."
        );
      }

      setCompleted(true);
      setMessage(data.message || "Password reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#f3f4f6",
      fontFamily: "Arial, sans-serif",
      boxSizing: "border-box",
    },
    card: {
      width: "100%",
      maxWidth: "420px",
      padding: "32px",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "16px",
      boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
      boxSizing: "border-box",
    },
    logo: {
      width: "48px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#111827",
      color: "#ffffff",
      borderRadius: "12px",
      fontSize: "22px",
      fontWeight: "bold",
      marginBottom: "22px",
    },
    heading: {
      margin: "0 0 10px",
      color: "#111827",
      fontSize: "27px",
    },
    description: {
      margin: "0 0 24px",
      color: "#6b7280",
      fontSize: "14px",
      lineHeight: 1.6,
    },
    label: {
      display: "block",
      marginBottom: "8px",
      color: "#374151",
      fontSize: "14px",
      fontWeight: 600,
    },
    input: {
      width: "100%",
      padding: "12px 13px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "15px",
      outline: "none",
      boxSizing: "border-box",
      marginBottom: "18px",
    },
    button: {
      width: "100%",
      padding: "13px 16px",
      background: "#111827",
      color: "#ffffff",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: 600,
      cursor: "pointer",
      marginTop: "4px",
    },
    alert: {
      padding: "12px",
      borderRadius: "8px",
      fontSize: "14px",
      lineHeight: 1.5,
      marginBottom: "18px",
      overflowWrap: "anywhere",
    },
    footer: {
      textAlign: "center",
      marginTop: "22px",
      color: "#6b7280",
      fontSize: "14px",
    },
    link: {
      color: "#111827",
      fontWeight: 600,
      textDecoration: "none",
    },
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>F</div>

        <h1 style={styles.heading}>
          {completed ? "Password updated" : "Reset password"}
        </h1>

        <p style={styles.description}>
          {completed
            ? "Your FileVault password has been changed. You can now sign in using your new password."
            : "Choose a new password for your FileVault account. Your reset link is valid for 15 minutes."}
        </p>

        {message && (
          <div
            role="status"
            style={{
              ...styles.alert,
              background: "#ecfdf5",
              color: "#065f46",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              ...styles.alert,
              background: "#fef2f2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {!completed && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="new-password" style={styles.label}>
              New password
            </label>

            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={8}
              required
              style={styles.input}
            />

            <label htmlFor="confirm-password" style={styles.label}>
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              minLength={8}
              required
              style={styles.input}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#4b5563",
                fontSize: "13px",
                marginBottom: "16px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              Show passwords
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <a href="/" style={styles.link}>
            Back to login
          </a>
        </div>
      </section>
    </main>
  );
}
