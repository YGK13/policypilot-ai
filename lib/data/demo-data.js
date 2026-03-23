// =============================================================================
// DEMO DATA — Employees and Documents
// 8 employees across different states, 10 documents with varied types
// =============================================================================

// ============ DEMO EMPLOYEES ============
// 8 employees spanning CA, NY, TX, IL, CO, WA, MA, NJ
const DEMO_EMPLOYEES = [
  {
    id: "EMP001",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@company.com",
    department: "Design",
    location: "San Francisco, CA",
    state: "California",
    tenure: 2.5,
    manager: "John Smith",
    title: "Senior Product Designer",
    ptoBalance: 14,
    sickBalance: 7,
    status: "Active"
  },
  {
    id: "EMP002",
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@company.com",
    department: "Engineering",
    location: "New York, NY",
    state: "New York",
    tenure: 4.2,
    manager: "Sarah Lee",
    title: "Staff Software Engineer",
    ptoBalance: 18,
    sickBalance: 9,
    status: "Active"
  },
  {
    id: "EMP003",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@company.com",
    department: "Sales",
    location: "Austin, TX",
    state: "Texas",
    tenure: 1.1,
    manager: "David Wilson",
    title: "Account Executive",
    ptoBalance: 8,
    sickBalance: 5,
    status: "Active"
  },
  {
    id: "EMP004",
    firstName: "Robert",
    lastName: "Johnson",
    email: "robert.johnson@company.com",
    department: "Finance",
    location: "Chicago, IL",
    state: "Illinois",
    tenure: 6.3,
    manager: "Lisa Park",
    title: "VP Finance",
    ptoBalance: 22,
    sickBalance: 10,
    status: "Active"
  },
  {
    id: "EMP005",
    firstName: "Maria",
    lastName: "Rodriguez",
    email: "maria.rodriguez@company.com",
    department: "HR",
    location: "Denver, CO",
    state: "Colorado",
    tenure: 3.0,
    manager: "James Kim",
    title: "HR Business Partner",
    ptoBalance: 16,
    sickBalance: 8,
    status: "Active"
  },
  {
    id: "EMP006",
    firstName: "David",
    lastName: "Park",
    email: "david.park@company.com",
    department: "Engineering",
    location: "Seattle, WA",
    state: "Washington",
    tenure: 5.1,
    manager: "Sarah Lee",
    title: "Engineering Manager",
    ptoBalance: 20,
    sickBalance: 10,
    status: "Active"
  },
  {
    id: "EMP007",
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah.williams@company.com",
    department: "Marketing",
    location: "Boston, MA",
    state: "Massachusetts",
    tenure: 1.8,
    manager: "Tom Brown",
    title: "Marketing Manager",
    ptoBalance: 12,
    sickBalance: 6,
    status: "Active"
  },
  {
    id: "EMP008",
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@company.com",
    department: "Legal",
    location: "Newark, NJ",
    state: "New Jersey",
    tenure: 3.5,
    manager: "Lisa Park",
    title: "Senior Counsel",
    ptoBalance: 17,
    sickBalance: 8,
    status: "Active"
  }
];

// ============ DEMO DOCUMENTS ============
// 10 documents: mix of pdf, docx, gdoc across Federal + state supplements
const DEMO_DOCS = [
  {
    id: "DOC001",
    name: "Employee Handbook 2026",
    type: "pdf",
    size: "2.4 MB",
    uploaded: "2026-01-15",
    status: "Active",
    category: "General",
    jurisdictions: ["Federal"],
    version: "4.2",
    pages: 87
  },
  {
    id: "DOC002",
    name: "California Supplement",
    type: "pdf",
    size: "890 KB",
    uploaded: "2026-02-01",
    status: "Active",
    category: "State Supplement",
    jurisdictions: ["California"],
    version: "2.1",
    pages: 24
  },
  {
    id: "DOC003",
    name: "Benefits Guide 2026",
    type: "pdf",
    size: "3.1 MB",
    uploaded: "2026-01-10",
    status: "Active",
    category: "Benefits",
    jurisdictions: ["Federal"],
    version: "1.0",
    pages: 42
  },
  {
    id: "DOC004",
    name: "Remote Work Policy",
    type: "docx",
    size: "156 KB",
    uploaded: "2025-11-20",
    status: "Active",
    category: "Workplace",
    jurisdictions: ["Federal"],
    version: "3.0",
    pages: 8
  },
  {
    id: "DOC005",
    name: "Anti-Harassment Training",
    type: "pdf",
    size: "5.2 MB",
    uploaded: "2025-09-01",
    status: "Active",
    category: "Compliance",
    jurisdictions: ["Federal", "California", "New York"],
    version: "2.0",
    pages: 34
  },
  {
    id: "DOC006",
    name: "NY Pay Transparency Compliance",
    type: "pdf",
    size: "420 KB",
    uploaded: "2026-01-20",
    status: "Active",
    category: "State Supplement",
    jurisdictions: ["New York"],
    version: "1.1",
    pages: 12
  },
  {
    id: "DOC007",
    name: "401(k) Plan Document",
    type: "pdf",
    size: "1.8 MB",
    uploaded: "2025-12-15",
    status: "Active",
    category: "Benefits",
    jurisdictions: ["Federal"],
    version: "5.0",
    pages: 56
  },
  {
    id: "DOC008",
    name: "Code of Conduct",
    type: "pdf",
    size: "980 KB",
    uploaded: "2025-10-01",
    status: "Active",
    category: "Compliance",
    jurisdictions: ["Federal"],
    version: "3.1",
    pages: 18
  },
  {
    id: "DOC009",
    name: "Colorado EPEWA Compliance Guide",
    type: "docx",
    size: "210 KB",
    uploaded: "2026-02-10",
    status: "Draft",
    category: "State Supplement",
    jurisdictions: ["Colorado"],
    version: "0.9",
    pages: 10
  },
  {
    id: "DOC010",
    name: "Expense & Travel Policy",
    type: "gdoc",
    size: "—",
    uploaded: "2026-01-05",
    status: "Active",
    category: "Workplace",
    jurisdictions: ["Federal"],
    version: "2.5",
    pages: 14
  }
];

export { DEMO_EMPLOYEES, DEMO_DOCS };
