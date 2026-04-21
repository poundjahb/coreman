export class InMemoryReferenceConfigRepository {
    constructor(initial = []) {
        this.store = [...initial];
    }
    async findAll() {
        return [...this.store];
    }
    async findActive() {
        return this.store.filter((c) => c.isActive);
    }
}
