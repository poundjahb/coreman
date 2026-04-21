export class InMemoryUserRepository {
    constructor(initial = []) {
        this.store = [...initial];
    }
    async findById(id) {
        return this.store.find((u) => u.id === id) ?? null;
    }
    async findAll() {
        return [...this.store];
    }
    async findByBranch(branchId) {
        return this.store.filter((u) => u.branchId === branchId);
    }
    async save(user) {
        const index = this.store.findIndex((item) => item.id === user.id);
        if (index >= 0) {
            this.store[index] = user;
            return;
        }
        this.store.push(user);
    }
    async delete(id) {
        const index = this.store.findIndex((item) => item.id === id);
        if (index >= 0) {
            this.store.splice(index, 1);
        }
    }
}
