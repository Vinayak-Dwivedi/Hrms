export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "HRMS API — Employee Onboarding",
    version: "0.3.0",
    description:
      "Employee onboarding, HR admin verification, audit, and reporting.",
  },
  tags: [
    { name: "Employee Profile" },
    { name: "Documents" },
    { name: "Onboarding Submit" },
    { name: "HR Onboarding Admin" },
  ],
  paths: {
    "/api/employee/profile": {
      get: {
        tags: ["Employee Profile"],
        summary: "Get aggregated employee onboarding profile",
        responses: { "200": { description: "Profile payload" } },
      },
      put: {
        tags: ["Employee Profile"],
        summary: "Upsert employee onboarding profile",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Updated profile" } },
      },
    },
    "/api/employee/onboarding/submit": {
      post: {
        tags: ["Onboarding Submit"],
        summary: "Submit onboarding for HR review",
        responses: { "200": { description: "Onboarding submitted" } },
      },
    },
    "/api/hrms/employees": {
      get: {
        tags: ["HR Onboarding Admin"],
        summary: "List employees with onboarding filters",
        responses: { "200": { description: "Paginated employees" } },
      },
    },
    "/api/hrms/employees/{id}/onboarding": {
      get: {
        tags: ["HR Onboarding Admin"],
        summary: "Onboarding timeline for employee",
        responses: { "200": { description: "Timeline" } },
      },
    },
    "/api/hrms/onboarding/documents/{id}/verify": {
      post: {
        tags: ["HR Onboarding Admin"],
        summary: "Verify employee document",
        responses: { "200": { description: "Verified" } },
      },
    },
    "/api/hrms/onboarding/documents/{id}/reject": {
      post: {
        tags: ["HR Onboarding Admin"],
        summary: "Reject employee document",
        responses: { "200": { description: "Rejected" } },
      },
    },
    "/api/hrms/onboarding/employees/{id}/approve": {
      post: {
        tags: ["HR Onboarding Admin"],
        summary: "Approve completed onboarding",
        responses: { "200": { description: "Completed" } },
      },
    },
    "/api/hrms/onboarding/reports/completion-stats": {
      get: {
        tags: ["HR Onboarding Admin"],
        summary: "Onboarding completion statistics",
        responses: { "200": { description: "Stats" } },
      },
    },
    "/api/hrms/onboarding/audit-logs": {
      get: {
        tags: ["HR Onboarding Admin"],
        summary: "Query audit logs",
        responses: { "200": { description: "Audit log page" } },
      },
    },
    "/api/documents/upload": {
      post: {
        tags: ["Documents"],
        summary: "Upload an employee document",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  documentType: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Document metadata" } },
      },
    },
    "/api/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Download a document by ID",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "File stream" } },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete a document by ID",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
  },
};
