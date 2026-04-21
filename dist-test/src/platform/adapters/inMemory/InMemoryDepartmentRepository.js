export class InMemoryDepartmentRepository {
    constructor(initial = []) {
        this.store = [...initial];
    }
    async findById(id) {
        return this.store.find((d) => d.id === id) ?? null;
    }
    async findAll() {
        return [...this.store];
    }
    async save(department) {
        const index = this.store.findIndex((item) => item.id === department.id);
        if (index >= 0) {
            this.store[index] = department;
            return;
        }
        this.store.push(department);
    }
    async delete(id) {
        const index = this.store.findIndex((item) => item.id === id);
        if (index >= 0) {
            this.store.splice(index, 1);
        }
    }
}
