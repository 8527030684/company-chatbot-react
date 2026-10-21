import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

// Drag a PDF anywhere on the page to upload it
export default function DropOverlay({ onDrop }) {
  const [active, setActive] = useState(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop; // always call the latest handler

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");

    const enter = (e) => {
      if (!hasFiles(e)) return;
      depth++;
      setActive(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const over = (e) => hasFiles(e) && e.preventDefault();
    const drop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setActive(false);
      const file = [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (file) onDropRef.current(file);
    };

    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="drop-overlay">
      <div className="drop-card">
        <Icon name="upload" size={30} />
        <strong>Drop your PDF here</strong>
        <span>It will be added to the knowledge base</span>
      </div>
    </div>
  );
}
