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
