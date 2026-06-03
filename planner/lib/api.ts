/**
 * Typisierter Client für die Planner-API.
 *
 * Spiegelt die Pydantic-Schemas aus planner/api/app/schemas/project.py.
 * Basis-URL aus NEXT_PUBLIC_API_BASE_URL; lokal Default localhost:8000.
 * Kein Frontend spricht je direkt mit Cosmos — nur über diese API.
 */

export type ProjectNature = "concept" | "technical" | "hybrid-concept-tech";
// v0.4 — Projekt-Taxonomie: Top-Level-Radio + Subtyp.
export type ProjectType = "it" | "non-it";
export type ProjectSubtype =
  | "software-app" | "ai-ml-agentic" | "data-analytics" | "cloud-infra"
  | "integration" | "cybersecurity" | "prototype-mvp" | "automation-rpa"
  | "concept-strategy" | "compliance-governance" | "org-change" | "process-design"
  | "enablement" | "market-research" | "documentation-audit" | "procurement-vendor";
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
  project_type: ProjectType | null;
  project_subtype: ProjectSubtype | null;
  project_nature: ProjectNature | null;
  target_platform: TargetPlatform | null;
  understanding_summary: string | null;
  // v0.9 — Preference-Drift-Guard: AEGIRA-internes Projekt? + Preferences aktiv?
  aegira_internal: boolean | null;
  use_preferences: boolean;
  created_at: string;
  updated_at: string | null;
  status: ProjectStatus;
  current_iteration: number;
  plan_hash: string | null;
  gate1_approved_at: string | null;
  guardrails_cleared_at: string | null;
  // v0.6 — geführtes Plan-DONE-Gate (Schritt 6a); 6b-Aktivitätsstufe entfällt.
  milestones_done_at: string | null;
  gate2_approved_at: string | null;
  approved_plan_version: number | null;
  gate3_approved_at: string | null;
  harness_zip_sha256: string | null;
  context_sources: ContextSource[];
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
}

export interface UpdateUnderstandingRequest {
  project_type?: ProjectType;
  project_subtype?: ProjectSubtype;
  project_nature?: ProjectNature;
  target_platform?: TargetPlatform;
  understanding_summary?: string;
  // v0.9 — Preference-Drift-Guard.
  aegira_internal?: boolean;
  use_preferences?: boolean;
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

// --- Schritt 6: Plan -------------------------------------------------------

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

// v0.6 — Aktivitäten & Personentage entfernt: der Plan endet auf Meilenstein-
// Ebene; die konkrete Arbeit übernehmen die Agenten autonom.
export interface Milestone {
  id: string;
  name: string;
  phase_id: string;
  stream_code: string;
  planned_date: string;
  predecessors: string[];
  ampel: RiskAmpel;
  responsibilities: Responsibility[];
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

// v0.6 — geführte Edit-Operationen (Schritt 6a, nur Meilensteine).
export type EditOp = "add" | "update" | "delete" | "reorder";

export interface MilestoneOp {
  op: EditOp;
  id?: string;
  name?: string;
  planned_date?: string;
  order?: string[];
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
  // v0.5 — qualitative Gesamtrisiko-Begründung (Klartext).
  risk_narrative: string;
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

export interface MilestonePatch {
  id: string;
  name?: string;
  planned_date?: string;
}

export interface PlanRevisionRequest {
  milestones?: MilestonePatch[];
  risks?: RiskPatch[];
  note?: string;
}

// --- Schritt 8/9: Harness (BAUEN + Export, Gate 3) -------------------------

export type HarnessNodeKind =
  | "orchestrator" | "worker" | "evaluator" | "hitl" | "router";
export type HarnessStatus = "draft" | "compiled";
export type StagePattern =
  | "chain" | "section" | "route" | "vote" | "evaluator-optimizer";
export type ReviseKind =
  | "sequence" | "parallel" | "skill" | "tool" | "agent" | "layout" | "stage-pattern"
  | "model-strategy" | "autonomy";
export type ModelStrategy = "balanced" | "economy" | "premium";
// v0.9 — Autonomie-/Reifegrad-Stufe (1–4). Koppelt Permission-Modus + HITL-Dichte.
export type AutonomyLevel = 1 | 2 | 3 | 4;

// v0.4 — Subagent-Katalog (Tool-Typ + Risk, Modell-Tiering).
export type ToolType = "data" | "action" | "orchestration";
export type ToolRisk = "low" | "medium" | "high";
export interface ToolSpec { name: string; type: ToolType; risk: ToolRisk; irreversible?: boolean; }
export type AgentClass =
  | "control" | "worker-it" | "worker-concept" | "quality" | "human";
export interface CatalogAgent {
  id: string;
  label: string;
  klass: AgentClass;
  kind: HarnessNodeKind;
  model: string;
  description: string;
  mission: string;
  responsibility: string;
  skills: string[];
  tools: ToolSpec[];
  applies: string[];
  subtypes: string[];
}
export interface Guardrail { id: string; label: string; kind: string; desc: string; }

export interface AgentSpec {
  id: string;
  role: string;
  name: string;
  kind: HarnessNodeKind;
  mission: string;
  description?: string;
  responsibility?: string;
  tasks: string[];
  skills: string[];
  tools: string[];
  hitl: boolean;
  model: string;
}

export interface HarnessNode {
  id: string;
  label: string;
  kind: HarnessNodeKind;
  agent_id: string | null;
  hitl: boolean;
  depends_on: string[];
  stage: number;
  pattern: StagePattern;
}

export interface ArtifactRef {
  path: string;
  kind: string;
  sha256: string;
  size_bytes: number;
}

export interface HarnessFinding {
  severity: "info" | "warn" | "fail";
  rule: string;
  message: string;
}

/** Eine entpackte Harness-Datei (Pfad relativ zum Root) mit Textinhalt. */
export interface HarnessFile {
  path: string;
  content: string;
}

/** Entpackte Repräsentation des Harness — für „Speichern unter" (unzipped). */
export interface HarnessFileMap {
  root: string;
  zip_name: string;
  zip_sha256: string | null;
  files: HarnessFile[];
}

/** v0.6 — ein vom Anwender importierter echter Skill (unveränderte SKILL.md). */
export interface SkillImport {
  name: string;
  content: string;
}

// --- v0.7 — Skill-Repository (kuratiert, klassifiziert) --------------------

export type SkillTrustTier =
  | "anthropic-vetted" | "aegira-certified" | "world-top" | "community" | "experimental";

/** Ein kuratierter, klassifizierter Skill aus dem Repository (docs/15 §4.1). */
export interface CatalogSkill {
  catalog_id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  source: string;
  trust_tier: SkillTrustTier;
  license: string | null;
  domain: string;
  project_types: string[];
  subtypes: string[];
  agent_ids: string[];
  version: string;
  released_at: string | null;
  updated_at: string | null;
  deprecated: boolean;
  required_tools: string[];
  required_mcps: string[];
  model_tier: string | null;
  risk: "low" | "medium" | "high";
  has_scripts: boolean;
  content_sha256: string | null;
  content: string | null;
}

/** Empfehlungen je erkanntem Agenten-Set: vorselektiert vs. angeboten. */
export interface RecommendedSkills {
  preselected: CatalogSkill[];
  offered: CatalogSkill[];
}

export interface HarnessGraph {
  id: string;
  projectId: string;
  plan_version: number;
  plan_hash: string;
  status: HarnessStatus;
  iteration: number;
  // v0.9 — Autonomie-/Reifegrad-Stufe (1–4); steuert defaultMode + HITL-Dichte.
  autonomy_level: AutonomyLevel;
  agents: AgentSpec[];
  nodes: HarnessNode[];
  imported_skills: SkillImport[];
  // v0.7 — aus dem Repository gewählte Skills (Trust-Tier, Herkunft, sha256).
  catalog_skills: CatalogSkill[];
  hitl_points: string[];
  artifacts: ArtifactRef[];
  findings: HarnessFinding[];
  zip_name: string;
  zip_sha256: string | null;
  created_at: string;
  compiled_at: string | null;
}

export interface ReviseCommand {
  command: ReviseKind;
  nodes?: string[];
  agent_id?: string;
  skill?: string;
  // v0.6 — unveränderter SKILL.md-Inhalt beim echten Skill-Import.
  skill_content?: string;
  // v0.7 — Auswahl aus dem Repository (statt Freitext) + HITL-Gate-Quittung.
  catalog_id?: string;
  confirm_gate?: boolean;
  tool?: string;
  remove?: boolean;
  op?: "add" | "update" | "delete";
  agent?: Partial<AgentSpec>;
  note?: string;
  // v0.4 — Canvas: layout setzt Stage je Agent; stage-pattern setzt Stage-Muster.
  stages?: Record<string, number>;
  stage?: number;
  pattern?: StagePattern;
  strategy?: ModelStrategy;
  // v0.9 — autonomy: setzt die Reifegrad-/Autonomie-Stufe (1–4) des Harness.
  autonomy_level?: AutonomyLevel;
}

// --- Multi-User-Auth (Registrierung + E-Mail-Bestätigung + TOTP-2FA) -------

/** Registrierungs-Ergebnis. `verify_url` nur im Dev-Stub-Mailmodus gesetzt. */
export interface RegisterResult {
  status: string;
  verify_url: string | null;
}

export type LoginStatus = "totp_enroll" | "totp_required";

/** Faktor-1-Antwort: zweiter Faktor nötig; beim ersten Mal mit QR zum Enrollment. */
export interface LoginResponse {
  status: LoginStatus;
  otpauth_uri: string | null;
  qr_svg: string | null; // data:image/svg+xml;base64,…
  issuer: string | null;
  account: string | null;
}

/** Faktor-1+2 erfolgreich: signiertes Session-Token + Ablauf (Unix-Sekunden). */
export interface UnlockResult {
  status: string;
  token: string;
  expires_at: number;
  is_admin: boolean;
}

export interface SessionState {
  valid: boolean;
  email: string | null;
  is_admin: boolean;
}

/** Admin-Sicht eines Katalog-Skills inkl. Freigabe-Status (v0.8). */
export interface SkillAdminView {
  skill: CatalogSkill;
  released: boolean;
  custom: boolean;
}

/** Nutzer-Sicht im Adminbereich (ohne Geheimnisse). */
export interface AdminUser {
  email: string;
  email_verified: boolean;
  totp_enrolled: boolean;
  is_admin: boolean;
  disabled: boolean;
  created_at: string;
  last_login_at: string | null;
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
    // Immer frische Daten — verhindert stale Listen/Status (z. B. nach Löschungen
    // oder einer Region-Migration) durch Browser-/Next-Caching.
    cache: "no-store",
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
  // --- Multi-User-Auth ------------------------------------------------------
  /** Selbst-Registrierung. Verschickt einen Magic-Link (Dev-Stub: verify_url gesetzt). */
  authRegister: (email: string, password: string): Promise<RegisterResult> =>
    request<RegisterResult>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** Bestätigt die E-Mail über den Magic-Link-Token. */
  authVerify: (token: string): Promise<{ status: string; email: string }> =>
    request<{ status: string; email: string }>("/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  /** Bestätigungs-Mail erneut anfordern. */
  authResend: (email: string): Promise<{ status: string; verify_url: string | null }> =>
    request<{ status: string; verify_url: string | null }>("/v1/auth/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /** Faktor 1 (Email+Passwort). 401 falsch · 403 unbestätigt/gesperrt. */
  authLogin: (email: string, password: string): Promise<LoginResponse> =>
    request<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** Faktor 1+2 (Email+Passwort+TOTP-Code) → Session-Token. ApiError(401) sonst. */
  authUnlock: (email: string, password: string, code: string): Promise<UnlockResult> =>
    request<UnlockResult>("/v1/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ email, password, code }),
    }),

  /** Prüft ein Session-Token (Reload „noch angemeldet?"). */
  authSession: (token: string): Promise<SessionState> =>
    request<SessionState>("/v1/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // --- Adminbereich (Bearer-Token eines Admins) -----------------------------
  adminListUsers: (token: string): Promise<AdminUser[]> =>
    request<AdminUser[]>("/v1/auth/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminUserAction: (
    token: string,
    email: string,
    action: "disable" | "enable" | "reset-2fa",
  ): Promise<AdminUser> =>
    request<AdminUser>(`/v1/auth/admin/users/${encodeURIComponent(email)}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminDeleteUser: (token: string, email: string): Promise<{ status: string }> =>
    request<{ status: string }>(`/v1/auth/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // --- v0.8: Admin-Skill-Freigabeliste -------------------------------------
  adminListSkills: (token: string): Promise<SkillAdminView[]> =>
    request<SkillAdminView[]>("/v1/auth/admin/skills", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminSkillSetReleased: (
    token: string,
    catalogId: string,
    released: boolean,
  ): Promise<SkillAdminView> =>
    request<SkillAdminView>(
      `/v1/auth/admin/skills/${encodeURIComponent(catalogId)}/${released ? "release" : "block"}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    ),

  adminAddSkill: (
    token: string,
    body: {
      catalog_id: string;
      slug: string;
      title: string;
      description: string;
      content?: string;
      domain?: string;
      agent_ids?: string[];
      trust_tier?: string;
      has_scripts?: boolean;
    },
  ): Promise<SkillAdminView> =>
    request<SkillAdminView>("/v1/auth/admin/skills", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  adminDeleteSkill: (token: string, catalogId: string): Promise<{ status: string }> =>
    request<{ status: string }>(`/v1/auth/admin/skills/${encodeURIComponent(catalogId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  listProjects: (): Promise<Project[]> => request<Project[]>("/v1/projects"),

  getProject: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}`),

  createProject: (body: CreateProjectRequest): Promise<Project> =>
    request<Project>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Schritt 4 — Titel/Beschreibung ändern (nur vor Gate 1). */
  updateProject: (
    id: string,
    body: { title?: string; description?: string },
  ): Promise<Project> =>
    request<Project>(`/v1/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** Schritt 4 — Projekt als Vorlage duplizieren (Gates zurückgesetzt). */
  duplicateProject: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/duplicate`, { method: "POST" }),

  /** Schritt 4 — Projekt löschen (Backend-DELETE, mit UI-Bestätigung aufrufen). */
  deleteProject: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/v1/projects/${id}`, { method: "DELETE" });
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

  // --- Schritt 6a: geführter Plan-Wizard (v0.6, nur Meilensteine) ----------
  editMilestones: (id: string, ops: MilestoneOp[]): Promise<Plan> =>
    request<Plan>(`/v1/projects/${id}/plan/milestones/op`, {
      method: "POST",
      body: JSON.stringify(ops),
    }),

  milestonesDone: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/plan/milestones/done`, { method: "POST" }),

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

  /**
   * Schritt 2a (Variante b) — verbindet einen Dropbox-Ordner und liest ihn ein.
   * Ohne gesetzte Dropbox-Secrets wirft das einen ApiError 501 (ehrlicher Blocker).
   */
  importDropboxFolder: (id: string, path: string): Promise<ContextSource[]> =>
    request<ContextSource[]>(
      `/v1/projects/${id}/context/cloud/dropbox/import?path=${encodeURIComponent(path)}`,
      { method: "POST" },
    ),

  // --- Schritt 8/9: Harness ------------------------------------------------

  /** Schritt 8 — kompiliert den freigegebenen Plan (Gate 2) zu einem Harness. */
  compileHarness: (id: string): Promise<HarnessGraph> =>
    request<HarnessGraph>(`/v1/projects/${id}/harness`, { method: "POST" }),

  getHarness: (id: string): Promise<HarnessGraph> =>
    request<HarnessGraph>(`/v1/projects/${id}/harness`),

  /** v0.4 — Subagent-Katalog (Vorlagen für „Agent definieren" im Canvas). */
  getCatalog: (): Promise<CatalogAgent[]> =>
    request<CatalogAgent[]>(`/v1/catalog/agents`),

  /** v0.4 — Guardrail-Schicht (Trust-Layer, Katalog). */
  getCatalogGuardrails: (): Promise<Guardrail[]> =>
    request<Guardrail[]>(`/v1/catalog/guardrails`),

  /** v0.7 — vollständiger Skill-Katalog (klassifiziert, mit Trust-Tier). */
  getSkills: (): Promise<CatalogSkill[]> => request<CatalogSkill[]>(`/v1/skills`),

  /** v0.7 — Empfehlungen je erkanntem Agenten-Set (vorselektiert vs. angeboten). */
  getRecommendedSkills: (agentIds: string[]): Promise<RecommendedSkills> =>
    request<RecommendedSkills>(
      `/v1/skills/recommended?agents=${encodeURIComponent(agentIds.join(","))}`,
    ),

  /** Schritt 8 — Kommando anwenden (Sequenz/Parallel/Skill/Agent-CRUD). */
  reviseHarness: (id: string, body: ReviseCommand): Promise<HarnessGraph> =>
    request<HarnessGraph>(`/v1/projects/${id}/harness/revise`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Schritt 9 — Gate 3: friert den Harness ein, berechnet den Zip-Hash. */
  approveHarness: (id: string): Promise<Project> =>
    request<Project>(`/v1/projects/${id}/harness/approve`, { method: "POST" }),

  /** Schritt 9 — Download-URL des signierten Zips (StreamingResponse). */
  harnessDownloadUrl: (id: string): string =>
    `${API_BASE}/v1/projects/${id}/harness/download`,

  /** Schritt 9 — die signierte Zip als Blob (für „Speichern unter…" via Picker). */
  harnessZipBlob: async (id: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/v1/projects/${id}/harness/download`, {
      cache: "no-store",
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText || "Download fehlgeschlagen");
    return res.blob();
  },

  /** Schritt 9 — der Harness entpackt als Datei-Map (für „Speichern unter", unzipped). */
  getHarnessFiles: (id: string): Promise<HarnessFileMap> =>
    request<HarnessFileMap>(`/v1/projects/${id}/harness/files`),

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
