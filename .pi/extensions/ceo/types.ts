export type CEOPhase = 'INIT' | 'PLAN' | 'DELEGATE' | 'REVIEW' | 'DECIDE' | 'VERIFY' | 'COMPLETE' | 'ESCALATE';

export interface CEOState {
  sessionId: string;
  goal: string;
  requirements: string;
  state: CEOPhase;
  iteration: number;
  maxIterations: number;
  plan: CEOPlan;
  decisions: CEODecision[];
  worktreeBranch?: string;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface CEOPlan {
  tasks: CEOTask[];
  dependencies: Record<string, string[]>;
}

export interface CEOTask {
  id: string;
  description: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  attempts: number;
  blockedBy: string[];
  expectedOutput: string;
  feedback?: string;
}

export interface CEODecision {
  iteration: number;
  phase: 'PLAN' | 'REVIEW' | 'DECIDE' | 'VERIFY';
  decision: string;
  rationale: string;
  timestamp: string;
}

export interface PlanOutput {
  tasks: Array<{
    id: string;
    description: string;
    agent: string;
    blockedBy: string[];
    expectedOutput: string;
  }>;
  rationale: string;
}

export interface ReviewOutput {
  decisions: Array<{
    taskId: string;
    verdict: 'ACCEPT' | 'RETRY' | 'REDELEGATE' | 'ESCALATE';
    feedback: string;
    newAgent?: string;
  }>;
}

export interface DecideOutput {
  action: 'PLAN' | 'VERIFY' | 'ESCALATE';
  rationale: string;
  progressPercent: number;
}

export interface VerificationOutput {
  goalMet: boolean;
  confidence: number;
  gaps: string[];
  recommendation: 'COMPLETE' | 'ITERATE' | 'ESCALATE';
}

export interface CEOToolParams {
  goal: string;
  requirements?: string;
  resume?: boolean;
  maxIterations?: number;
}
