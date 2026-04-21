export class InMemoryNotificationService {
    constructor() {
        this.sent = [];
    }
    async send(payload) {
        this.sent.push(payload);
    }
}
