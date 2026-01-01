import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { uuidAtom, tasksAtom, linksAtom, logoutAtom, importDataAtom, deleteAccountAtom } from "../store";
import { useTheme } from "../context/ThemeContext";
import WavyTitle from "../components/WavyTitle";

export default function Settings() {
  const uuid = useAtomValue(uuidAtom);
  const tasks = useAtomValue(tasksAtom);
  const links = useAtomValue(linksAtom);
  const logout = useSetAtom(logoutAtom);
  const importData = useSetAtom(importDataAtom);
  const deleteAccount = useSetAtom(deleteAccountAtom);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark, setTheme } = useTheme();

  const [showUUID, setShowUUID] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleCopyUUID = async () => {
    if (uuid) {
      await navigator.clipboard.writeText(uuid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    const exportData = {
      tasks,
      links,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eisenhower-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setImporting(true);

    try {
      const text = await file.text();
      const result = await importData(text);

      if (result.success) {
        setImportStatus({
          type: "success",
          message: `Imported ${result.tasksImported} tasks and ${result.linksImported} links successfully!`,
        });
      } else {
        setImportStatus({
          type: "error",
          message: result.error || "Import failed",
        });
      }
    } catch {
      setImportStatus({
        type: "error",
        message: "Failed to read file",
      });
    } finally {
      setImporting(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAccount = async () => {
    if (!uuid) return;

    setDeleting(true);

    try {
      await deleteAccount();
      navigate("/login");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const maskedUUID = uuid ? uuid.replace(/./g, "*") : "";

  return (
    <>
      <header>
        <WavyTitle>Settings</WavyTitle>
      </header>

      <div className="settings-container">
        <div className="settings-section">
          <h2>Appearance</h2>
          <p className="settings-description">
            Choose your preferred theme.
          </p>
          <div className="theme-options">
            <button
              className={`theme-option ${!isDark ? "active" : ""}`}
              onClick={() => setTheme(false)}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
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
              Light
            </button>
            <button
              className={`theme-option ${isDark ? "active" : ""}`}
              onClick={() => setTheme(true)}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              Dark
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Your Secret Code</h2>
          <p className="settings-description">
            This is your unique identifier. Keep it safe - it's the only way to
            access your data.
          </p>

          <div className="uuid-display">
            <code>{showUUID ? uuid : maskedUUID}</code>
            <div className="uuid-actions">
              <button
                className="icon-btn"
                onClick={() => setShowUUID(!showUUID)}
                title={showUUID ? "Hide" : "Show"}
              >
                {showUUID ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              <button
                className="icon-btn"
                onClick={handleCopyUUID}
                title="Copy"
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
          </div>
        </div>

        <div className="settings-section">
          <h2>Export Data</h2>
          <p className="settings-description">
            Download all your tasks and links as a JSON file for backup.
          </p>
          <button className="settings-btn" onClick={handleExport}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export as JSON
          </button>
        </div>

        <div className="settings-section">
          <h2>Import Data</h2>
          <p className="settings-description">
            Restore your tasks and links from a previously exported JSON backup
            file. This will replace your current data.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: "none" }}
          />
          <button 
            className="settings-btn" 
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="loading-dots">Importing</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import from JSON
              </>
            )}
          </button>
          {importStatus && (
            <p className={`import-status ${importStatus.type}`}>
              {importStatus.message}
            </p>
          )}
        </div>

        <div className="settings-section">
          <h2>Logout</h2>
          <p className="settings-description">
            Sign out of your account. Your data will remain saved.
          </p>
          <button className="settings-btn" onClick={handleLogout}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>

        <div className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <p className="settings-description">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              className="settings-btn danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete Account
            </button>
          ) : (
            <div className="delete-confirm">
              <p className="warning">
                Are you sure? This will permanently delete all your data.
              </p>
              <div className="delete-confirm-actions">
                <button
                  className="settings-btn danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete Everything"}
                </button>
                <button
                  className="settings-btn secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          Made with{" "}
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="#ef4444"
            stroke="none"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>{" "}
          by{" "}
          <a
            href="https://github.com/try3d"
            target="_blank"
            rel="noopener noreferrer"
          >
            try3d
          </a>
        </div>
      </div>
    </>
  );
}
