// =============================================================================
// HRIS / ATS / COMMUNICATION CONNECTOR DEFINITIONS
// Each connector has OAuth fields, webhook support, field mapping capabilities
// Categories: hris (10), ats (6), communication (3), storage (3),
//             identity (3), devops (2), billing (1) = 28 total
// =============================================================================

const CONNECTORS = {
  // ============ HRIS — 10 connectors ============
  hris: [
    {
      id: "bamboohr", name: "BambooHR", color: "#73C41D", category: "HRIS",
      desc: "SMB-focused HRIS with employee data, benefits, time-off",
      fields: ["apiKey", "subdomain"],
      syncFields: ["employees", "departments", "timeOff", "benefits"],
      webhooks: true, oauth: false, pricing: "Included"
    },
    {
      id: "workday", name: "Workday", color: "#005CB9", category: "HRIS",
      desc: "Enterprise HCM for large organizations",
      fields: ["tenantUrl", "clientId", "clientSecret", "refreshToken"],
      syncFields: ["workers", "organizations", "compensation", "benefits", "timeOff"],
      webhooks: true, oauth: true, pricing: "Enterprise"
    },
    {
      id: "adp", name: "ADP Workforce Now", color: "#D0271D", category: "HRIS",
      desc: "Payroll, HR, benefits, talent management",
      fields: ["clientId", "clientSecret", "orgCode"],
      syncFields: ["employees", "payroll", "benefits", "timeAttendance"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "gusto", name: "Gusto", color: "#F45D48", category: "HRIS",
      desc: "Modern payroll, benefits, HR for SMBs",
      fields: ["apiToken", "companyId"],
      syncFields: ["employees", "payroll", "benefits", "timeOff"],
      webhooks: true, oauth: true, pricing: "Included"
    },
    {
      id: "rippling", name: "Rippling", color: "#FED42B", category: "HRIS",
      desc: "Unified workforce platform — HR, IT, Finance",
      fields: ["apiKey", "companyId"],
      syncFields: ["employees", "departments", "compensation", "devices", "apps"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "namely", name: "Namely", color: "#2E86AB", category: "HRIS",
      desc: "Mid-market HR, payroll, benefits",
      fields: ["apiToken", "subdomain"],
      syncFields: ["employees", "departments", "timeOff", "performance"],
      webhooks: false, oauth: true, pricing: "Included"
    },
    {
      id: "ukg", name: "UKG Pro", color: "#6D28D9", category: "HRIS",
      desc: "Enterprise HCM, workforce management",
      fields: ["apiKey", "tenantUrl", "username", "password"],
      syncFields: ["employees", "scheduling", "timekeeping", "benefits"],
      webhooks: true, oauth: false, pricing: "Enterprise"
    },
    {
      id: "paylocity", name: "Paylocity", color: "#00263E", category: "HRIS",
      desc: "Cloud-based payroll and HCM",
      fields: ["clientId", "clientSecret", "companyId"],
      syncFields: ["employees", "payroll", "benefits", "timeLabor"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "personio", name: "Personio", color: "#4CAF50", category: "HRIS",
      desc: "European HR platform for SMEs",
      fields: ["clientId", "clientSecret", "partnerId"],
      syncFields: ["employees", "absences", "attendances", "documents"],
      webhooks: true, oauth: true, pricing: "Included"
    },
    {
      id: "hibob", name: "HiBob", color: "#FF6F61", category: "HRIS",
      desc: "Modern HRIS for mid-size companies",
      fields: ["apiToken", "serviceUserId"],
      syncFields: ["employees", "timeOff", "documents", "payroll"],
      webhooks: true, oauth: false, pricing: "Included"
    }
  ],

  // ============ ATS — 6 connectors ============
  ats: [
    {
      id: "greenhouse", name: "Greenhouse", color: "#3B8427", category: "ATS",
      desc: "Structured hiring for growing companies",
      fields: ["apiKey"],
      syncFields: ["candidates", "jobs", "applications", "scorecards"],
      webhooks: true, oauth: false, pricing: "Included"
    },
    {
      id: "lever", name: "Lever", color: "#4B7BEC", category: "ATS",
      desc: "Modern ATS + CRM for talent teams",
      fields: ["apiKey"],
      syncFields: ["opportunities", "candidates", "postings", "interviews"],
      webhooks: true, oauth: true, pricing: "Included"
    },
    {
      id: "ashby", name: "Ashby", color: "#6C5CE7", category: "ATS",
      desc: "All-in-one recruiting platform",
      fields: ["apiKey"],
      syncFields: ["candidates", "jobs", "applications", "interviews"],
      webhooks: true, oauth: false, pricing: "Included"
    },
    {
      id: "workable", name: "Workable", color: "#1CA7FF", category: "ATS",
      desc: "AI-powered recruiting software",
      fields: ["subdomain", "apiKey"],
      syncFields: ["candidates", "jobs", "stages"],
      webhooks: true, oauth: false, pricing: "Included"
    },
    {
      id: "breezyhr", name: "BreezyHR", color: "#00BCD4", category: "ATS",
      desc: "End-to-end recruiting software",
      fields: ["email", "password", "companyId"],
      syncFields: ["candidates", "positions", "pipelines"],
      webhooks: true, oauth: false, pricing: "Included"
    },
    {
      id: "jazzhr", name: "JazzHR", color: "#FF9800", category: "ATS",
      desc: "Affordable ATS for SMBs",
      fields: ["apiKey"],
      syncFields: ["applicants", "jobs", "activities"],
      webhooks: false, oauth: false, pricing: "Included"
    }
  ],

  // ============ COMMUNICATION — 3 connectors ============
  communication: [
    {
      id: "slack", name: "Slack", color: "#4A154B", category: "Communication",
      desc: "Team messaging — bot responds in channels/DMs",
      fields: ["botToken", "signingSecret", "appId"],
      syncFields: ["channels", "users", "messages"],
      webhooks: true, oauth: true, pricing: "Included"
    },
    {
      id: "teams", name: "Microsoft Teams", color: "#6264A7", category: "Communication",
      desc: "Enterprise collaboration — bot cards & responses",
      fields: ["appId", "appPassword", "tenantId"],
      syncFields: ["teams", "channels", "users"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "gmail", name: "Gmail / Google Workspace", color: "#EA4335", category: "Communication",
      desc: "Email-based HR inquiries with auto-response",
      fields: ["clientId", "clientSecret", "refreshToken"],
      syncFields: ["emails", "contacts", "calendar"],
      webhooks: true, oauth: true, pricing: "Included"
    }
  ],

  // ============ STORAGE — 3 connectors ============
  storage: [
    {
      id: "gdrive", name: "Google Drive", color: "#0F9D58", category: "Storage",
      desc: "Store and sync policy documents from Drive",
      fields: ["clientId", "clientSecret", "folderId"],
      syncFields: ["files", "folders", "permissions"],
      webhooks: true, oauth: true, pricing: "Included"
    },
    {
      id: "sharepoint", name: "SharePoint", color: "#0078D4", category: "Storage",
      desc: "Enterprise document management integration",
      fields: ["tenantId", "clientId", "clientSecret", "siteUrl"],
      syncFields: ["documents", "libraries", "sites"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "dropbox", name: "Dropbox Business", color: "#0061FF", category: "Storage",
      desc: "Cloud file storage for policy documents",
      fields: ["accessToken", "teamMemberId"],
      syncFields: ["files", "folders", "teamFolders"],
      webhooks: true, oauth: true, pricing: "Included"
    }
  ],

  // ============ IDENTITY / SSO — 3 connectors ============
  identity: [
    {
      id: "okta", name: "Okta", color: "#007DC1", category: "Identity / SSO",
      desc: "Enterprise identity & SSO provider",
      fields: ["domain", "clientId", "clientSecret"],
      syncFields: ["users", "groups", "apps"],
      webhooks: true, oauth: true, pricing: "Enterprise"
    },
    {
      id: "azuread", name: "Azure AD / Entra", color: "#0078D4", category: "Identity / SSO",
      desc: "Microsoft identity platform for SSO",
      fields: ["tenantId", "clientId", "clientSecret"],
      syncFields: ["users", "groups", "applications"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "googlews", name: "Google Workspace", color: "#4285F4", category: "Identity / SSO",
      desc: "Google-based SSO and directory sync",
      fields: ["clientId", "clientSecret", "domain"],
      syncFields: ["users", "groups", "orgUnits"],
      webhooks: true, oauth: true, pricing: "Included"
    }
  ],

  // ============ DEVOPS — 2 connectors ============
  devops: [
    {
      id: "github", name: "GitHub", color: "#24292e", category: "DevOps",
      desc: "Sync employee profiles with GitHub org membership",
      fields: ["personalAccessToken", "orgName"],
      syncFields: ["members", "teams", "repos"],
      webhooks: true, oauth: true, pricing: "Professional+"
    },
    {
      id: "jira", name: "Jira", color: "#0052CC", category: "DevOps",
      desc: "HR ticket escalation to Jira projects",
      fields: ["domain", "email", "apiToken", "projectKey"],
      syncFields: ["issues", "projects", "users"],
      webhooks: true, oauth: true, pricing: "Professional+"
    }
  ],

  // ============ BILLING — 1 connector ============
  billing: [
    {
      id: "stripe", name: "Stripe", color: "#635BFF", category: "Billing",
      desc: "Subscription billing and payment processing",
      fields: ["publishableKey", "secretKey", "webhookSecret"],
      syncFields: ["subscriptions", "invoices", "customers"],
      webhooks: true, oauth: false, pricing: "Platform"
    }
  ]
};

// ============ Flatten all connectors for easy lookup ============
const ALL_CONNECTORS = Object.values(CONNECTORS).flat();

export { CONNECTORS, ALL_CONNECTORS };
export default CONNECTORS;
