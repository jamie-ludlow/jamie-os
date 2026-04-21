export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export type CanonicalPaperclipRole = 'CEO' | 'Engineer' | 'Designer' | 'QA';

export interface PaperclipCompany {
  id: string;
  name: string;
  slug?: string | null;
}

export interface PaperclipProject {
  id: string;
  companyId: string;
  name: string;
  slug?: string | null;
}

export interface PaperclipAgent {
  id: string;
  companyId: string;
  name: string;
  role: CanonicalPaperclipRole | string;
  title?: string | null;
  status?: string | null;
  reportsTo?: string | null;
  lastHeartbeatAt?: string | null;
}

export interface PaperclipProjectMapping {
  mcProjectId: string;
  paperclipCompanyId: string;
  paperclipProjectId: string | null;
  availableRoles: string[];
}

export interface PaperclipCatalog {
  companies: PaperclipCompany[];
  projects: PaperclipProject[];
  agents: PaperclipAgent[];
  canonicalRoles: CanonicalPaperclipRole[];
  projectMappings: Record<string, PaperclipProjectMapping>;
}

export type ExternalTaskSource = 'paperclip';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string; // Dynamic - loaded from task_statuses table
  priority: 'P1' | 'P2' | 'P3' | 'P4' | null;
  assignee: string | null;
  project_id: string | null;
  start_date?: string | null;
  due_date?: string | null;
  labels?: string[];
  external_source?: ExternalTaskSource | null;
  external_id?: string | null;
  external_url?: string | null;
  external_metadata?: Record<string, unknown> | null;
  external_updated_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  parent_id: string | null;
  subtask_count?: number;
  subtasks_done_count?: number;
  project?: Project | null;
}

export interface Comment {
  id: string;
  task_id: string;
  content: string;
  author: string;
  created_at: string;
}

export interface DocFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  title?: string; // Document title (for files only)
  children?: DocFile[];
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | string | null;
  created_at: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string | null;
  status: 'active' | 'idle';
  current_task: string | null;
  current_session_key: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

// 'backlog' intentionally excluded — merged into 'todo' in UI
export const STATUSES = ['todo', 'doing', 'done'] as const;
export type TaskStatusAll = 'backlog' | 'todo' | 'doing' | 'done';
export const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;

export type PipelineStage =
  | 'manager-review'
  | 'assigned'
  | 'in-progress'
  | 'qa-review'
  | 'approved'
  | 'rejected';

export const PIPELINE_STAGES: PipelineStage[] = [
  'manager-review',
  'assigned',
  'in-progress',
  'qa-review',
  'approved',
  'rejected',
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  'manager-review': 'Manager Review',
  assigned: 'Assigned',
  'in-progress': 'In Progress',
  'qa-review': 'QA Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export interface TokenUsageRecord {
  id: string;
  session_id: string | null;
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  project_id: string | null;
  task_id: string | null;
  context: string | null;
  created_at: string;
}

export interface TokenUsageBreakdown {
  agent?: string;
  model?: string;
  project_id?: string;
  project_name?: string;
  date?: string;
  provider?: string;
  total_tokens: number;
  total_cost: number;
  is_claude_max?: boolean;
}

export interface TokenUsageResponse {
  total_tokens: number;
  total_cost: number;
  breakdown_by_agent: TokenUsageBreakdown[];
  breakdown_by_project: TokenUsageBreakdown[];
  breakdown_by_model: TokenUsageBreakdown[];
  breakdown_by_provider: TokenUsageBreakdown[];
  breakdown_by_day: TokenUsageBreakdown[];
}

export interface Proposal {
  id: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  category: string;
  priority: string;
  status: 'draft' | 'pending_review' | 'modifications_requested' | 'approved' | 'rejected' | 'in_progress' | 'done' | 'request' | 'backlog' | 'shipped' | 'reverted';
  created_by: 'casper' | 'jamie';
  order_index: number;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  // Unified changelog fields
  app: string;
  feedback: string | null;
  reverted: boolean;
  shipped_at: string | null;
  commit_sha: string | null;
}

export interface ProposalComment {
  id: string;
  proposal_id: string;
  content: string;
  author: string;
  created_at: string;
}

// Unified changelog item type (aliases Proposal with cleaner naming)
export type ChangelogItem = Proposal;
export type ChangelogStatus = 'request' | 'backlog' | 'in_progress' | 'shipped' | 'reverted';
