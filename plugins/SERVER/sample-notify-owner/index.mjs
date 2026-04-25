export const metadata = {
  pluginKey: "sample-notify-owner",
  name: "Sample Notify Owner",
  description: "Demonstration plugin that sends a basic owner notification for correspondence and assignment triggers.",
  version: "1.0.0",
  apiVersion: "1.0",
  platformTarget: "SERVER",
  supportedTriggers: ["CORRESPONDENCE_CREATED", "ASSIGNMENT_CREATED"],
  entryFile: "index.mjs",
  enabledByDefault: true
};

function resolveNotification(context, correspondence) {
  const triggerCode = context.trigger.code;
  const recipientId = correspondence?.recipientId
    ?? correspondence?.actionOwnerId
    ?? context.context.assigneeUserId
    ?? context.actorId;

  if (triggerCode === "ASSIGNMENT_CREATED") {
    const deadline = context.context.deadline ?? "No deadline";
    return {
      recipientId,
      subject: `Assignment created for ${correspondence?.referenceNumber ?? context.correspondenceId}`,
      body: [
        "A workflow plugin processed a new assignment.",
        `Correspondence: ${correspondence?.referenceNumber ?? context.correspondenceId}`,
        `Deadline: ${deadline}`,
        `Assigned user: ${context.context.assigneeUserId ?? recipientId}`
      ].join("\n")
    };
  }

  return {
    recipientId,
    subject: `Correspondence ${correspondence?.referenceNumber ?? context.correspondenceId} captured`,
    body: [
      "A workflow plugin processed a new correspondence.",
      `Reference: ${correspondence?.referenceNumber ?? context.correspondenceId}`,
      `Subject: ${correspondence?.subject ?? context.context.subject ?? "N/A"}`,
      `Trigger: ${triggerCode}`
    ].join("\n")
  };
}

export async function execute(context) {
  const correspondence = context.resources.correspondences.find(context.correspondenceId) ?? {};
  const notification = resolveNotification(context, correspondence);

  await context.resources.notifications.send({
    ...notification,
    correspondenceId: context.correspondenceId
  });

  context.resources.audit.append({
    eventType: "AGENT_RESPONSE",
    status: "SUCCESS",
    payload: {
      pluginKey: metadata.pluginKey,
      triggerCode: context.trigger.code,
      recipientId: notification.recipientId,
      subject: notification.subject
    }
  });

  return {
    delivered: true,
    triggerCode: context.trigger.code,
    recipientId: notification.recipientId
  };
}