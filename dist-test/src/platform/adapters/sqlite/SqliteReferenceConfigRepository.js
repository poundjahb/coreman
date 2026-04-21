function rowToConfig(row) {
    return { ...row, isActive: Boolean(row["isActive"]) };
}
export class SqliteReferenceConfigRepository {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        return this.db.prepare("SELECT * FROM reference_configs").all().map(rowToConfig);
    }
    async findActive() {
        return this.db
            .prepare("SELECT * FROM reference_configs WHERE isActive = 1")
            .all().map(rowToConfig);
    }
}
