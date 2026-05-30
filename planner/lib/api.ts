/**
 * Typisierter Client für die Planner-API.
 *
 * Spiegelt die Pydantic-Schemas aus planner/api/app/schemas/project.py.
 * Basis-URL aus NEXT_PUBLIC_API_BASE_URL; lokal Default localhost:8000.
 * Kein Frontend spricht je direkt mit Cosmos — nur über diese API.
 */

export type ProjectNature = "concept" | "technical" | "hybrid-concept-tech";
export type TargetPlatform =
  | "azure"
  | "aws"
  | "gcp"
  | "on-prem"
  | "hybrid-cloud"
  | "multi-cloud"
  | "claude-code-only";
export type ProjectStatus =
  | "planning"
  | "reviewing"
  | "approved"
  | "compiled"
  | "archived";

export type ContextFormat = "docx" | "md" | "pdf" | "txt" | "pptx" | "xlsx";
export type ContextOrigin = "upload" | "cloud";

// --- Schritt 2a, Phase B: Cloud-Connectoren -------------------------------

export type CloudProvider =
  | "sharepoint"
  | "onedrive"
  | "dropbox"
  | "azure-blob";
export type ConnectorStatus = "configured" | "blocked";

export interface ProviderInfo {
  id: CloudProvider;
  label: string;
  scopes: string[];
  required_env: string[];
  status: ConnectorStatus;
  missing_env: string[];
  note: string;
}

export interface ContextSource {
  id: string;
  filename: string;
  fmt: ContextFormat;
  origin: ContextOrigin;
  source_uri: string | null;
  size_bytes: number;
  content_sha256: string;
  token_estimate: number;
  added_at: string;
  added_by: string;
  frozen_at: string | null;
}

export interface Project {
  id: string;
  tenantId: string;
  owner_user_id: string;
  title: string;
  description: string;
  project_nature: ProjectNature | null;
  target_platform: TargetPlatform | null;
  understanding_summary: string | null;
  created_at: string;
  updated_at: string | null;
  status: ProjectStatus;
  current_iteration: number;
  plan_hash: string | null;
  gate1_approved_at: string | null;
  guardrails_cleared_at: string | null;
  gate2_approved_at: string | null;
  approved_plan_version: number | null;
  context_sources: ContextSource[];
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
}

export interface UpdateUnderstandingRequest {
  project_nature?: ProjectNature;
  target_platform?: TargetPlatform;
  understanding_summary?: string;
}

export type SuggestionKind =
  | "project_nature"
  | "target_platform"
  | "understanding_summary";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  value: string;
  label: string;
  rationale: string;
}

export interface InterviewMessage {
  role: "assistant" | "user";
  content: string;
  suggestions: Suggestion[];
}

export interface InterviewState {
  project_id: string;
  transcript: InterviewMessage[];
  done: boolean;
}

export type GuardrailVerdict = "allowed" | "escalate" | "refused";

export interface GuardrailCategory {
  id: string;
  label: string;
  description: string;
}

export interface GuardrailFlag {
  category_id: string;
  label: string;
  matched_terms: string[];
  severity: "hard" | "soft";
}

export interface GuardrailCheck {
  project_id: string;
  verdict: GuardrailVerdict;
  flags: GuardrailFlag[];
  rationale: string;
  allowed_natures: ProjectNature[];
  forbidden_categories: GuardrailCategory[];
  cleared_at: string | null;
}

// --- Schritt 6: ZGPM-Plan ---------------------------------------------------

export type PVMCode = "A" | "B" | "E" | "e" | "F" | "L" | "I" | "V";
export type RiskAmpel = "rot" | "gelb" | "gruen";
export type ReviewerStatus = "PASS" | "NEEDS_REVISION" | "HARD_FAIL";

export interface Responsibility {
  role: string;
  code: PVMCode;
}

export interface Risk {
  id: string;
  description: string;
  probability: number;
  impact: number;
  ampel: RiskAmpel;
  mitigation: string;
}

export interface Activity {
  id: string;
  description: string;
  effort_pt: number;
  start: string;
  end: string;
  responsibilities: Responsibility[];
}

export interface Milestone {
  id: string;
  name: string;
  phase_id: string;
  stream_code: string;
  planned_date: string;
  predecessors: string[];
  ampel: RiskAmpel;
  responsibilities: Responsibility[];
  activities: Activity[];
  mrl: Risk[];
}

export interface Phase {
  id: string;
  name: string;
  order: number;
}

export interface Stream {
  code: string;
  label: string;
}

export interface TokenBudgetEntry {
  agent: string;
  node: string;
  tokens_estimated: number;
}

export interface ReviewerFinding {
  severity: "info" | "warn" | "fail";
  rule: string;
  message: string;
}

export interface EvidenceSource {
  id: string;
  filename: string;
  fmt: string;
  origin: string;
  content_sha256: string;
  frozen_at: string | null;
}

export interface Plan {
  id: string;
  projectId: string;
  version: number;
  phases: Phase[];
  streams: Stream[];
  milestones: Milestone[];
  prl: Risk[];
  pvm_roles: string[];
  token_budget: TokenBudgetEntry[];
  overall_ampel: RiskAmpel;
  reviewer_status: ReviewerStatus;
  reviewer_findings: ReviewerFinding[];
  reviewer_rounds: number;
  evidence_sources: EvidenceSource[];
  plan_hash: string;
  planausgabedatum: string;
  kontrolliert_durch: string;
  created_at: string;
}

// --- Schritt 7: Review-Patches ---------------------------------------------

export interface RiskPatch {
  id: string;
  description?: string;
  probability?: number;
  impact?: number;
  mitigation?: string;
}

export interface ActivityPatch {
  id: string;
  description?: string;
  effort_pt?: number;
}

export interface MilestonePatch {
  id: string;
  name?: string;
  planned_date?: string;
}

export interface PlanRevisionRequest {
  milestones?: MilestonePatch[];
  activities?: ActivityPatch[];
  risks?: RiskPatch[];
  note?: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string; message?: string };
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  listProjects: (): Promise<Project[]> => request<Project[]>("/v1/projects"),

  getProject: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}`),

  createProject: (body: CreateProjectRequest): Promise<Project> =>
    request<Project>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUnderstanding: (
    id: string,
    body: UpdateUnderstandingRequest,
  ): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/understanding`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  approveUnderstanding: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/approve-understanding`, {
      method: "POST",
    }),

  getGuardrails: (id: string): Promise<GuardrailCheck> =>
    request<GuardrailCheck>(`/v1/projects/${id}/guardrails`),

  clearGuardrails: (
    id: string,
    proceed: boolean,
    note?: string,
  ): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/guardrails/clear`, {
      method: "POST",
      body: JSON.stringify({ proceed, note }),
    }),

  generatePlan: (id: string): Promise<Plan> =>
    request<Plan>(`/v1/projects/${id}/plan`, { method: "POST" }),

  getPlan: (id: string): Promise<Plan> =>
    request<Plan>(`/v1/projects/${id}/plan`),

  listPlanVersions: (id: string): Promise<Plan[]> =>
    request<Plan[]>(`/v1/projects/${id}/plan/versions`),

  revisePlan: (id: string, body: PlanRevisionRequest): Promise<Plan> =>
    request<Plan>(`/v1/projects/${id}/plan/revise`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  approvePlan: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/approve-plan`, { method: "POST" }),

  listContext: (id: string): Promise<ContextSource[]> =>
    request<ContextSource[]>(`/v1/projects/${id}/context`),

  /**
   * Lädt eine Kontext-Datei hoch (multipart). Inhalt wird serverseitig ephemer
   * geparst und verworfen; zurück kommt nur der dauerhafte Quellen-Nachweis.
   */
  uploadContext: async (id: string, file: File): Promise<ContextSource> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/v1/projects/${id}/context`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { detail?: string };
        detail = body.detail ?? detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, detail);
    }
    return (await res.json()) as ContextSource;
  },

  /**
   * Phase B: Listet Cloud-Anbieter mit Konfigurationsstatus. Bis OAuth-App-
   * Registrierung + Secrets gesetzt sind, meldet jeder Provider `blocked`.
   */
  listCloudProviders: (id: string): Promise<ProviderInfo[]> =>
    request<ProviderInfo[]>(`/v1/projects/${id}/context/cloud/providers`),

  /**
   * Phase B: Versucht einen Cloud-Connect. Wirft bis zur Konfiguration einen
   * ApiError mit Status 501 und der fehlenden Konfiguration im Detail.
   */
  connectCloud: (id: string, provider: CloudProvider): Promise<void> =>
    request<void>(
      `/v1/projects/${id}/context/cloud/connect?provider=${provider}`,
      { method: "POST" },
    ),

  deleteContext: async (id: string, sourceId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/v1/projects/${id}/context/${sourceId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { detail?: string };
        detail = body.detail ?? detail;
      } catch {
        /* 204 hat keinen Body */
      }
      throw new ApiError(res.status, detail);
    }
  },

  getInterview: (id: string): Promise<InterviewState> =>
    request<InterviewState>(`/v1/projects/${id}/interview`),

  /**
   * Streamt die nächste Interviewer-Runde (SSE). `onToken` erhält Textstücke
   * während des Streams; aufgelöst wird mit der finalen Nachricht + done-Flag.
   */
  streamInterviewTurn: async (
    id: string,
    message: string,
    onToken: (chunk: string) => void,
  ): Promise<{ message: InterviewMessage; done: boolean }> => {
    const res = await fetch(`${API_BASE}/v1/projects/${id}/interview/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok || !res.body) {
      throw new ApiError(res.status, res.statusText || "stream failed");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let final: { message: InterviewMessage; done: boolean } | null = null;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6)) as {
          token?: string;
          event?: string;
          done?: boolean;
          message?: InterviewMessage;
        };
        if (payload.token) onToken(payload.token);
        if (payload.event === "done" && payload.message) {
          final = { message: payload.message, done: payload.done ?? false };
        }
      }
    }
    if (!final) throw new ApiError(500, "kein Abschluss-Frame im Stream");
    return final;
  },
};
