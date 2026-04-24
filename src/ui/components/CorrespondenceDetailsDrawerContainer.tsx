import type { Correspondence } from "../../domain/correspondence";
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

function formatDirection(direction: Correspondence["direction"]): string {
  return direction === "INCOMING" ? "Incoming" : "Outgoing";
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

export function CorrespondenceDetailsDrawerContainer(props: CorrespondenceDetailsDrawerContainerProps): JSX.Element {
  const { opened, onClose, correspondence } = props;

  return (
    <CorrespondenceDetailsDrawer
      opened={opened}
      onClose={onClose}
      reference={correspondence?.reference ?? ""}
      subject={correspondence?.subject ?? ""}
      direction={correspondence ? formatDirection(correspondence.direction) : undefined}
      status={correspondence?.status}
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
      fields={[
        { label: "Sender Reference", value: correspondence?.senderReference ?? "-" },
        { label: "Received Date", value: formatDate(correspondence?.receivedDate) },
        { label: "Due Date", value: formatDate(correspondence?.dueDate) },
        { label: "Branch", value: correspondence?.branchName ?? correspondence?.branchId ?? "" },
        { label: "Department", value: correspondence?.departmentName ?? correspondence?.departmentId ?? "" },
        { label: "Receptionist", value: correspondence?.receptionistName ?? correspondence?.registeredById ?? "" },
        { label: "Recipient", value: correspondence?.recipientName ?? correspondence?.recipientId ?? "" },
        { label: "Action Owner", value: correspondence?.actionOwnerName ?? correspondence?.actionOwnerId ?? "" }
      ]}
    />
  );
}