export const correspondences = [
    {
        id: "c-001",
        reference: "BANK-HQ-OPS-202604-000001",
        subject: "Regulatory request for Q1 compliance returns",
        direction: "Incoming",
        branch: "HQ",
        department: "OPS",
        receptionist: "Reception User",
        recipient: "Recipient User",
        actionOwner: "Action Owner",
        status: "In Progress",
        receivedDate: "2026-04-20",
        dueDate: "2026-04-24"
    },
    {
        id: "c-002",
        reference: "BANK-HQ-FIN-202604-000014",
        subject: "Treasury confirmation memo",
        direction: "Outgoing",
        branch: "HQ",
        department: "FIN",
        receptionist: "Reception User",
        recipient: "Executive Viewer",
        actionOwner: "Action Owner",
        status: "Awaiting Review",
        receivedDate: "2026-04-20",
        dueDate: "2026-04-23"
    },
    {
        id: "c-003",
        reference: "BANK-BRN-02-FIN-202604-000102",
        subject: "Branch audit exception follow-up",
        direction: "Incoming",
        branch: "BRN-02",
        department: "FIN",
        receptionist: "Reception User",
        recipient: "Recipient User",
        actionOwner: "Action Owner",
        status: "New",
        receivedDate: "2026-04-18",
        dueDate: "2026-04-25"
    },
    {
        id: "c-004",
        reference: "BANK-HQ-OPS-202604-000010",
        subject: "Procurement approval dispatch",
        direction: "Outgoing",
        branch: "HQ",
        department: "OPS",
        receptionist: "Reception User",
        recipient: "Recipient User",
        actionOwner: "Action Owner",
        status: "Closed",
        receivedDate: "2026-04-15",
        dueDate: "2026-04-19"
    },
    {
        id: "c-005",
        reference: "BANK-HQ-OPS-202604-000011",
        subject: "Security incident documentation",
        direction: "Incoming",
        branch: "HQ",
        department: "OPS",
        receptionist: "Reception User",
        recipient: "Executive Viewer",
        actionOwner: "Action Owner",
        status: "In Progress",
        receivedDate: "2026-04-14",
        dueDate: "2026-04-21"
    }
];
export const tasks = [
    {
        id: "t-001",
        correspondenceRef: "BANK-HQ-OPS-202604-000001",
        title: "Prepare regulatory response pack",
        owner: "Action Owner",
        status: "In Progress",
        dueDate: "2026-04-24",
        completion: 62
    },
    {
        id: "t-002",
        correspondenceRef: "BANK-HQ-FIN-202604-000014",
        title: "Validate treasury evidence",
        owner: "Action Owner",
        status: "Assigned",
        dueDate: "2026-04-23",
        completion: 25
    },
    {
        id: "t-003",
        correspondenceRef: "BANK-BRN-02-FIN-202604-000102",
        title: "Upload branch audit closure notes",
        owner: "Action Owner",
        status: "Blocked",
        dueDate: "2026-04-22",
        completion: 48
    },
    {
        id: "t-004",
        correspondenceRef: "BANK-HQ-OPS-202604-000010",
        title: "Issue final dispatch confirmation",
        owner: "Action Owner",
        status: "Completed",
        dueDate: "2026-04-19",
        completion: 100
    }
];
