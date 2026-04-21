export class InMemoryCorrespondenceRepository {
    constructor(initial = []) {
        this.store = [...initial];
    }
    async findById(id) {
        return this.store.find((c) => c.id === id) ?? null;
    }
    async findAll() {
        return [...this.store];
    }
    async findByBranch(branchId) {
        return this.store.filter((c) => c.branchId === branchId);
    }
    async save(correspondence) {
        const existing = this.store.findIndex((c) => c.id === correspondence.id);
        if (existing !== -1) {
            this.store[existing] = correspondence;
        }
        else {
            this.store.push(correspondence);
        }
    }
    async update(id, changes) {
        const index = this.store.findIndex((c) => c.id === id);
        if (index !== -1) {
            this.store[index] = { ...this.store[index], ...changes };
        }
    }
}
