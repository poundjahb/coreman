export class SqliteCorrespondenceRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const row = this.db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);
        return row ?? null;
    }
    async findAll() {
        return this.db.prepare("SELECT * FROM correspondences").all();
    }
    async findByBranch(branchId) {
        return this.db
            .prepare("SELECT * FROM correspondences WHERE branchId = ?")
            .all(branchId);
    }
    async save(correspondence) {
        this.db
            .prepare(`INSERT OR REPLACE INTO correspondences
          (id, reference, subject, direction, branchId, departmentId, registeredById,
           recipientId, actionOwnerId, status, receivedDate, dueDate, createdAt, updatedAt)
         VALUES
          (@id, @reference, @subject, @direction, @branchId, @departmentId, @registeredById,
           @recipientId, @actionOwnerId, @status, @receivedDate, @dueDate, @createdAt, @updatedAt)`)
            .run(correspondence);
    }
    async update(id, changes) {
        const sets = Object.keys(changes)
            .map((k) => `${k} = @${k}`)
            .join(", ");
        this.db.prepare(`UPDATE correspondences SET ${sets} WHERE id = @id`).run({ ...changes, id });
    }
}
