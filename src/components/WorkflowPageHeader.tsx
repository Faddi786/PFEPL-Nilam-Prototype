import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import WorkflowSwitcher from "./WorkflowSwitcher";
import type { WorkflowConfig, WorkflowId } from "../data/workflows";

type Props = {
  title: string;
  description?: string;
  backTo?: string;
  currentWorkflowId: WorkflowId;
  workflows: WorkflowConfig[];
};

export default function WorkflowPageHeader({
  title,
  description,
  backTo = "/app",
  currentWorkflowId,
  workflows,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <Link
          to={backTo}
          aria-label="Back"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {title ? (
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[#1A1A1A]">{title}</h1>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
        ) : null}
      </div>

      <WorkflowSwitcher currentWorkflowId={currentWorkflowId} workflows={workflows} />
    </div>
  );
}
