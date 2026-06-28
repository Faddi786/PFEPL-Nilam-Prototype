import { useCallback, useEffect, useRef, useState } from "react";

export function useDropdownOpen() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        close();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  function onRootMouseEnter() {
    setOpen(true);
  }

  function onRootMouseLeave() {
    if (!pinned) {
      setOpen(false);
    }
  }

  function onButtonClick() {
    if (pinned) {
      close();
    } else {
      setPinned(true);
      setOpen(true);
    }
  }

  return {
    open,
    rootRef,
    onRootMouseEnter,
    onRootMouseLeave,
    onButtonClick,
  };
}
