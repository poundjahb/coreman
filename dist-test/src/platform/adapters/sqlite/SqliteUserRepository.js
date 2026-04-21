function rowToUser(row) {
    return {
        ...row,
        isActive: Boolean(row["isActive"]),
        canLogin: Boolean(row["canLogin"]),
        canOwnActions: Boolean(row["canOwnActions"]),
        roles: JSON.parse(row["roles"])
    };
}
export class SqliteUserRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
        return row ? rowToUser(row) : null;
    }
    async findAll() {
        return this.db.prepare("SELECT * FROM users").all().map(rowToUser);
    }
    async findByBranch(branchId) {
        return this.db.prepare("SELECT * FROM users WHERE branchId = ?").all(branchId).map(rowToUser);
    }
    async save(user) {
        this.db.prepare(`INSERT OR REPLACE INTO users
        (id, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`).run({
            ...user,
            isActive: user.isActive ? 1 : 0,
            canLogin: user.canLogin ? 1 : 0,
            canOwnActions: user.canOwnActions ? 1 : 0,
            roles: JSON.stringify(user.roles)
        });
    }
    async delete(id) {
        this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
    }
}
