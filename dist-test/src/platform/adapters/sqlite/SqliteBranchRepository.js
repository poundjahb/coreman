function rowToBranch(row) {
    return { ...row, isActive: Boolean(row["isActive"]) };
}
export class SqliteBranchRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const row = this.db.prepare("SELECT * FROM branches WHERE id = ?").get(id);
        return row ? rowToBranch(row) : null;
    }
    async findAll() {
        return this.db.prepare("SELECT * FROM branches").all().map(rowToBranch);
    }
    async save(branch) {
        this.db.prepare(`INSERT OR REPLACE INTO branches (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`).run({
            ...branch,
            isActive: branch.isActive ? 1 : 0
        });
    }
    async delete(id) {
        this.db.prepare("DELETE FROM branches WHERE id = ?").run(id);
    }
}
