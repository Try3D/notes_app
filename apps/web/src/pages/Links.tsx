import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { linksAtom, addLinkAtom, deleteLinkAtom, reorderLinksAtom, loadingAtom } from "../store";
import WavyTitle from "../components/WavyTitle";
import type { Link } from "@eisenhower/shared";

export default function Links() {
  const links = useAtomValue(linksAtom);
  const loading = useAtomValue(loadingAtom);
  const addLink = useSetAtom(addLinkAtom);
  const deleteLink = useSetAtom(deleteLinkAtom);
  const reorderLinks = useSetAtom(reorderLinksAtom);

  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleAddLink = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setSaving(true);

    try {
      let normalizedUrl = url;
      let title = url;
      let favicon = "";

      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        normalizedUrl = urlObj.toString();
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
        title = urlObj.hostname;
      } catch {}

      addLink({ url: normalizedUrl, title, favicon });
      setUrlInput("");
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddLink();
    } else if (e.key === "Escape") {
      setShowModal(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    setDraggedLinkId(linkId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", linkId);
  };

  const handleDragEnd = () => {
    setDraggedLinkId(null);
    setDragOverId(null);
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedLinkId && draggedLinkId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetLink: Link) => {
    e.preventDefault();

    if (!draggedLinkId || draggedLinkId === targetLink.id) {
      handleDragEnd();
      return;
    }

    const draggedIndex = links.findIndex((l) => l.id === draggedLinkId);
    const targetIndex = links.findIndex((l) => l.id === targetLink.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    const draggedLink = links[draggedIndex];
    const newLinks = [...links];
    newLinks.splice(draggedIndex, 1);
    newLinks.splice(targetIndex, 0, draggedLink);

    reorderLinks(newLinks.map((l) => l.id));
    handleDragEnd();
  };

  if (loading) {
    return (
      <>
        <header>
          <WavyTitle>Links</WavyTitle>
        </header>
        <div className="empty-state">Loading...</div>
      </>
    );
  }

  return (
    <>
      <header>
        <WavyTitle>Links</WavyTitle>
      </header>

      <div className="links-container">
        <div className="links-list">
          {links.length === 0 ? (
            <div className="empty-state">
              No links yet. Add one to get started!
            </div>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className={`link-item ${dragOverId === link.id ? "drag-over" : ""} ${draggedLinkId === link.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, link.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, link.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, link)}
              >
                <span className="drag-handle">⋮⋮</span>
                {link.favicon && (
                  <img src={link.favicon} alt="" className="link-favicon" />
                )}
                <a
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-info"
                >
                  <span className="link-title">{link.title}</span>
                  <span className="link-url">{link.url}</span>
                </a>
                <div className="link-actions">
                  <button
                    className="delete-btn-small"
                    onClick={() => deleteLink(link.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <button className="add-link-btn" onClick={() => setShowModal(true)}>
          + Add Link
        </button>
      </div>

      <div
        className={`modal ${showModal ? "open" : ""}`}
        onClick={() => setShowModal(false)}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Add Link</h3>
            <button onClick={() => setShowModal(false)}>&#10005;</button>
          </div>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste URL here..."
            autoFocus
          />
          <div className="modal-footer">
            <button
              className="save-btn"
              onClick={handleAddLink}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="cancel-btn" onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
