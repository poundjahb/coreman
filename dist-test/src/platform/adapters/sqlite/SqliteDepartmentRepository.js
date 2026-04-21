function rowToDepartment(row) {
    return { ...row, isActive: Boolean(row["isActive"]) };
}
export class SqliteDepartmentRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const row = this.db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
        return row ? rowToDepartment(row) : null;
    }
    async findAll() {
        return this.db.prepare("SELECT * FROM departments").all().map(rowToDepartment);
    }
    async save(department) {
        this.db.prepare(`INSERT OR REPLACE INTO departments (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`).run({
            ...department,
            isActive: department.isActive ? 1 : 0
        });
    }
    async delete(id) {
        this.db.prepare("DELETE FROM departments WHERE id = ?").run(id);
    }
}
