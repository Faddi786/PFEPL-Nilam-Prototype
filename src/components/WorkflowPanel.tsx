import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getVisiblePanelWorkflows, getWorkflowRoute } from "../data/workflows";

export default function WorkflowPanel() {
  const navigate = useNavigate();
  const panelWorkflows = getVisiblePanelWorkflows();

  return (
    <div className="space-y-1">
      {panelWorkflows.map((workflow) => (
        <button
          key={workflow.id}
          type="button"
          onClick={() => navigate(getWorkflowRoute(workflow.id))}
          className="group flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
        >
          <span className="text-xs font-medium text-[#1A1A1A]">{workflow.title}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-slate-700" />
        </button>
      ))}
    </div>
  );
}
