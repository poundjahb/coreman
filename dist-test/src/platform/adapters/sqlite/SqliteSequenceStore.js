export class SqliteSequenceStore {
    constructor(db) {
        this.db = db;
    }
    next(key) {
        this.db
            .prepare(`INSERT INTO sequences (key, value) VALUES (?, 1)
         ON CONFLICT(key) DO UPDATE SET value = value + 1`)
            .run(key);
        const row = this.db
            .prepare("SELECT value FROM sequences WHERE key = ?")
            .get(key);
        return row.value;
    }
}
