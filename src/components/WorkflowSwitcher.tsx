import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getWorkflowRoute, WORKFLOW_LOOKUP, type WorkflowConfig, type WorkflowId } from "../data/workflows";

type Props = {
  currentWorkflowId: WorkflowId;
  workflows: WorkflowConfig[];
  className?: string;
  variant?: "panel" | "overlay";
};

export default function WorkflowSwitcher({
  currentWorkflowId,
  workflows,
  className = "",
  variant = "panel",
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const switcherWorkflows = useMemo(() => {
    if (workflows.some((workflow) => workflow.id === currentWorkflowId)) return workflows;
    const current = WORKFLOW_LOOKUP[currentWorkflowId];
    return current ? [...workflows, current] : workflows;
  }, [workflows, currentWorkflowId]);

  const currentWorkflow =
    switcherWorkflows.find((workflow) => workflow.id === currentWorkflowId) ??
    WORKFLOW_LOOKUP[currentWorkflowId];

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? switcherWorkflows.length * 36 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      minWidth: rect.width,
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      zIndex: 9999,
    });
  }, [switcherWorkflows.length]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, updatePosition]);

  function handlePick(workflowId: WorkflowId) {
    if (workflowId === currentWorkflowId) {
      setOpen(false);
      return;
    }
    setOpen(false);
    navigate(getWorkflowRoute(workflowId));
  }

  const triggerClass =
    variant === "overlay"
      ? `inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-200 ${
          open ? "border-slate-300 ring-1 ring-slate-200/80" : ""
        }`
      : `inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 ${
          open ? "border-[#1A1A1A]" : "border-slate-200"
        }`;

  const menu = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      {switcherWorkflows.map((workflow) => {
        const selected = workflow.id === currentWorkflowId;
        return (
          <button
            key={workflow.id}
            type="button"
            onClick={() => handlePick(workflow.id)}
            className={`flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left text-xs transition ${
              selected ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="min-w-0 truncate">{workflow.title}</span>
            {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
      >
        <span className="max-w-[min(220px,40vw)] truncate">{currentWorkflow?.title ?? "Workflow"}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
