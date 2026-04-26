import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryCorrespondenceTaskAssignmentRepository } from "../src/platform/adapters/inMemory/InMemoryCorrespondenceTaskAssignmentRepository";
import type { CorrespondenceTaskAssignment } from "../src/domain/correspondenceAction";

function createAssignment(overrides: Partial<CorrespondenceTaskAssignment> = {}): CorrespondenceTaskAssignment {
  const now = new Date("2026-04-20T09:00:00.000Z");

  return {
    id: "asg-001",
    correspondenceId: "c-001",
    actionDefinitionId: "act-001",
    description: "Original assignment description",
    assigneeUserId: "u-001",
    ccUserIds: [],
    deadline: new Date("2026-04-30T00:00:00.000Z"),
    status: "ASSIGNED",
    createdAt: now,
    updatedAt: now,
    createdBy: "u-admin",
    updatedBy: "u-admin",
    ...overrides
  };
}

test("task assignment updates capture execution comment and close metadata", async () => {
  const repository = new InMemoryCorrespondenceTaskAssignmentRepository();
  const assignment = createAssignment();

  await repository.save(assignment);

  await repository.update(assignment.id, {
    status: "IN_PROGRESS",
    executionComment: "Started execution",
    updatedBy: "u-worker"
  });

  const inProgress = await repository.findById(assignment.id);
  assert.ok(inProgress);
  assert.equal(inProgress.description, "Original assignment description");
  assert.equal(inProgress.executionComment, "Started execution");
  assert.equal(inProgress.updatedBy, "u-worker");
  assert.ok(inProgress.updatedAt.getTime() >= assignment.updatedAt.getTime());
  assert.equal(inProgress.closedAt, undefined);
  assert.equal(inProgress.closedBy, undefined);

  await repository.update(assignment.id, {
    status: "COMPLETED",
    executionComment: "Completed successfully",
    updatedBy: "u-closer"
  });

  const completed = await repository.findById(assignment.id);
  assert.ok(completed);
  assert.equal(completed.executionComment, "Completed successfully");
  assert.equal(completed.updatedBy, "u-closer");
  assert.equal(completed.closedBy, "u-closer");
  assert.ok(completed.closedAt instanceof Date);

  await repository.update(assignment.id, {
    status: "CANCELED",
    updatedBy: "u-admin"
  });

  const canceled = await repository.findById(assignment.id);
  assert.ok(canceled);
  assert.equal(canceled.closedAt, undefined);
  assert.equal(canceled.closedBy, undefined);
});
