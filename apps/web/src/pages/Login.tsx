import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { API_URL } from "../config";

type View = "main" | "generate" | "enter";

export default function Login() {
  const [view, setView] = useState<View>("main");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { setUUID, generateUUID, isValidUUID } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleGenerate = () => {
    const newUUID = generateUUID();
    setGeneratedCode(newUUID);
    setSaved(false);
    setView("generate");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = async () => {
    if (!saved) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: generatedCode }),
      });

      const result = await response.json();
      if (result.success) {
        setUUID(generatedCode);
        navigate("/");
      } else {
        setError("Failed to register. Please try again.");
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const code = codeInput.trim();

    if (!isValidUUID(code)) {
      setError("Invalid code format. Please check and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const existsRes = await fetch(`${API_URL}/api/exists/${code}`);
      const existsData = await existsRes.json();

      if (!existsData.data?.exists) {
        await fetch(`${API_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: code }),
        });
      }

      setUUID(code);
      navigate("/");
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Note Grid</h1>
        <p className="login-subtitle">Your personal productivity companion</p>

        {view === "main" && (
          <div className="login-view">
            <p>
              This app uses a simple secret code instead of username/password.
              Your code is your identity - keep it safe!
            </p>
            <button className="login-btn primary" onClick={handleGenerate}>
              Generate New Code
            </button>
            <button
              className="login-btn secondary"
              onClick={() => {
                setView("enter");
                setError("");
                setCodeInput("");
              }}
            >
              I Have a Code
            </button>
          </div>
        )}

        {view === "generate" && (
          <div className="login-view">
            <p className="warning">
              This is your secret code. Save it somewhere safe - you won't see
              it again!
            </p>

            <div className="code-display">
              <code>{generatedCode}</code>
              <button
                className="copy-btn"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
              />
              <span>I have saved my code safely</span>
            </label>

            {error && <p className="error-msg">{error}</p>}

            <button
              className="login-btn primary"
              onClick={handleContinue}
              disabled={!saved || loading}
            >
              {loading ? "Setting up..." : "Continue to App"}
            </button>
            <button
              className="login-btn secondary"
              onClick={() => setView("main")}
            >
              Back
            </button>
          </div>
        )}

        {view === "enter" && (
          <div className="login-view">
            <p>Enter your secret code to access your data.</p>

            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />

            {error && <p className="error-msg">{error}</p>}

            <button
              className="login-btn primary"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Checking..." : "Login"}
            </button>
            <button
              className="login-btn secondary"
              onClick={() => setView("main")}
            >
              Back
            </button>
          </div>
        )}
      </div>

      <button
        className="theme-toggle login-theme"
        onClick={toggleTheme}
        title="Toggle theme"
      >
        {isDark ? (
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  );
}
