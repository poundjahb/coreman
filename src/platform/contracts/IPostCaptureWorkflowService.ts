import type { WorkflowMode } from "../../config/systemConfig";
import type { Correspondence } from "../../domain/correspondence";
import type { AppUser } from "../../domain/governance";

export interface PostCaptureContext {
  digitalContent?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutePostCaptureWorkflowCommand {
  correspondence: Correspondence;
  actor: AppUser;
  mode: WorkflowMode;
  context?: PostCaptureContext;
}

export interface IPostCaptureWorkflowService {
  execute(command: ExecutePostCaptureWorkflowCommand): Promise<void>;
}