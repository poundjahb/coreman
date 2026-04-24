import { useEffect, useMemo, useState } from "react";
import type { Correspondence } from "../../domain/correspondence";
import type { CorrespondenceTaskAssignment } from "../../domain/correspondenceAction";
import type { CorrespondenceAuditEvent } from "../../platform/contracts/ICorrespondenceAuditLogRepository";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { runtimeHostAdapter, runtimePlatformTarget } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawer } from "./CorrespondenceDetailsDrawer";

type CorrespondenceWithDisplayNames = Correspondence & {
  branchName?: string;
  departmentName?: string;
  receptionistName?: string;
  recipientName?: string;
  actionOwnerName?: string;
};

interface CorrespondenceDetailsDrawerContainerProps {
  opened: boolean;
  onClose: () => void;
  correspondence: CorrespondenceWithDisplayNames | null;
}

function getApiBaseUrl(): string {
  const fromEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }

  return "http://localhost:3001";
}

function formatDate(value: Date | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatSizeLabel(bytes: number | undefined): string | undefined {
  if (typeof bytes !== "number") {
    return undefined;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function resolveUserId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") {
      const normalized = id.trim();
      return normalized.length > 0 ? normalized : undefined;
    }
  }

  return undefined;
}

export function CorrespondenceDetailsDrawerContainer(props: CorrespondenceDetailsDrawerContainerProps): JSX.Element {
  const { opened, onClose, correspondence } = props;
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map());
  const [branchesById, setBranchesById] = useState<Map<string, Branch>>(new Map());
  const [departmentsById, setDepartmentsById] = useState<Map<string, Department>>(new Map());
  const [actionDefinitionsById, setActionDefinitionsById] = useState<Map<string, string>>(new Map());
  const [linkedActions, setLinkedActions] = useState<CorrespondenceTaskAssignment[]>([]);
  const [auditEntries, setAuditEntries] = useState<CorrespondenceAuditEvent[]>([]);

  useEffect(() => {
    let active = true;

    async function loadLookups(): Promise<void> {
      try {
        const [users, branches, departments, actionDefinitions] = await Promise.all([
          runtimeHostAdapter.users.findAll(),
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.actionDefinitions.findAll()
        ]);

        if (!active) {
          return;
        }

        setUsersById(new Map(users.map((item) => [item.id, item])));
        setBranchesById(new Map(branches.map((item) => [item.id, item])));
        setDepartmentsById(new Map(departments.map((item) => [item.id, item])));
        setActionDefinitionsById(new Map(actionDefinitions.map((item) => [item.id, item.label])));
      } catch {
        if (!active) {
          return;
        }

        setUsersById(new Map());
        setBranchesById(new Map());
        setDepartmentsById(new Map());
        setActionDefinitionsById(new Map());
      }
    }

    void loadLookups();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLinkedData(): Promise<void> {
      if (!correspondence?.id) {
        setLinkedActions([]);
        setAuditEntries([]);
        return;
      }

      try {
        const [actions, audits] = await Promise.all([
          runtimeHostAdapter.taskAssignments.findByCorrespondence(correspondence.id),
          runtimeHostAdapter.correspondenceAuditLog.findByCorrespondence(correspondence.id)
        ]);

        if (!active) {
          return;
        }

        setLinkedActions(actions);
        setAuditEntries(audits);
      } catch {
        if (!active) {
          return;
        }

        setLinkedActions([]);
        setAuditEntries([]);
      }
    }

    void loadLinkedData();

    return () => {
      active = false;
    };
  }, [correspondence?.id]);

  const recipientUser = useMemo(
    () => (correspondence?.recipientId ? usersById.get(correspondence.recipientId) : undefined),
    [correspondence?.recipientId, usersById]
  );

  const recipientName = recipientUser?.fullName ?? "-";
  const recipientBranch = recipientUser
    ? branchesById.get(recipientUser.branchId)?.code ?? "-"
    : "-";
  const recipientDepartment = recipientUser
    ? departmentsById.get(recipientUser.departmentId)?.code ?? "-"
    : "-";
  const receivedByUserId = runtimePlatformTarget === "SERVER"
    ? resolveUserId(correspondence?.createBy)
    : correspondence?.registeredById;
  const receivedByName = receivedByUserId
    ? usersById.get(receivedByUserId)?.fullName ?? receivedByUserId
    : "-";

  const actionRows = linkedActions.map((assignment) => ({
    id: assignment.id,
    label: actionDefinitionsById.get(assignment.actionDefinitionId) ?? assignment.actionDefinitionId,
    assignee: usersById.get(assignment.assigneeUserId)?.fullName ?? assignment.assigneeUserId,
    deadline: formatDate(assignment.deadline),
    status: assignment.status,
    description: assignment.description
  }));

  const auditRows = auditEntries.map((entry) => ({
    id: entry.id,
    eventType: entry.eventType,
    status: entry.status,
    createdAt: entry.createdAt.toISOString().slice(0, 19).replace("T", " "),
    createdBy: usersById.get(entry.createdById)?.fullName ?? entry.createdById,
    details: entry.errorMessage ?? entry.payloadJson
  }));

  const displayedReference = correspondence?.direction === "INCOMING"
    ? correspondence.senderReference?.trim() || correspondence.reference
    : correspondence?.reference ?? "";

  return (
    <CorrespondenceDetailsDrawer
      opened={opened}
      onClose={onClose}
      reference={displayedReference}
      subject={correspondence?.subject ?? ""}
      status={correspondence?.status}
      summary={correspondence?.summary ?? ""}
      sender={correspondence?.fromTo ?? ""}
      organisation={correspondence?.organisation ?? ""}
      correspondenceDate={formatDate(correspondence?.correspondenceDate)}
      receivedDate={formatDate(correspondence?.receivedDate)}
      dueDate={formatDate(correspondence?.dueDate)}
      receivedBy={receivedByName}
      recipient={recipientName}
      branch={recipientBranch}
      department={recipientDepartment}
      attachments={correspondence?.attachmentFileName ? [
        {
          name: correspondence.attachmentFileName,
          url: `${getApiBaseUrl()}/api/correspondences/${encodeURIComponent(correspondence.id)}/attachments/download`,
          previewUrl: correspondence.attachmentMimeType === "application/pdf"
            ? `${getApiBaseUrl()}/api/correspondences/${encodeURIComponent(correspondence.id)}/attachments/preview`
            : undefined,
          sizeLabel: formatSizeLabel(correspondence.attachmentSizeBytes)
        }
      ] : []}
      actions={actionRows}
      audits={auditRows}
    />
  );
}