export class InMemoryBranchRepository {
    constructor(initial = []) {
        this.store = [...initial];
    }
    async findById(id) {
        return this.store.find((b) => b.id === id) ?? null;
    }
    async findAll() {
        return [...this.store];
    }
    async save(branch) {
        const index = this.store.findIndex((item) => item.id === branch.id);
        if (index >= 0) {
            this.store[index] = branch;
            return;
        }
        this.store.push(branch);
    }
    async delete(id) {
        const index = this.store.findIndex((item) => item.id === id);
        if (index >= 0) {
            this.store.splice(index, 1);
        }
    }
}
