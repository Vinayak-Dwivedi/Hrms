-- Offboarding Phase 5 — Exit Documents.
-- Admin HTML templates (with {{tokens}}) and per-case generated documents.
-- New audit enum values are only ADDED here (same-transaction rule).

-- 1. New enum types (idempotent).
DO $$ BEGIN
  CREATE TYPE "exit_document_category_enum" AS ENUM ('HR', 'Finance', 'Employee');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "exit_document_status_enum" AS ENUM ('Generated', 'Sent');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 2. Audit enum values.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_DOCUMENT_GENERATED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_DOCUMENT_SENT';--> statement-breakpoint

-- 3. Tables.
CREATE TABLE IF NOT EXISTS "exit_document_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "category" "exit_document_category_enum" NOT NULL,
  "html_template" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "exit_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL REFERENCES "offboarding_cases"("id") ON DELETE CASCADE,
  "template_id" integer REFERENCES "exit_document_templates"("id") ON DELETE SET NULL,
  "name" varchar(150) NOT NULL,
  "category" "exit_document_category_enum" NOT NULL,
  "rendered_html" text NOT NULL,
  "status" "exit_document_status_enum" NOT NULL DEFAULT 'Generated',
  "generated_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "generated_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "exit_documents_case_template_uq" ON "exit_documents" ("case_id", "template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exit_documents_case" ON "exit_documents" ("case_id");--> statement-breakpoint

-- 4. Seed the standard letter templates (only if the table is empty).
INSERT INTO "exit_document_templates" ("name", "category", "sort_order", "html_template")
SELECT * FROM (VALUES
  ('Relieving Letter', 'HR'::exit_document_category_enum, 1,
   '<h2>Relieving Letter</h2><p>Date: {{currentDate}}</p><p>To Whom It May Concern,</p><p>This is to certify that <b>{{employeeName}}</b> ({{empId}}), {{designation}} in the {{department}} department, was employed with {{companyName}} from {{dateOfJoining}} to {{lastWorkingDate}}.</p><p>{{employeeName}} has been relieved from all duties effective {{lastWorkingDate}}. All company dues are settled and no obligations remain pending.</p><p>We wish them success in their future endeavours.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('Experience Letter', 'HR', 2,
   '<h2>Experience Letter</h2><p>Date: {{currentDate}}</p><p>This is to certify that <b>{{employeeName}}</b> ({{empId}}) worked with {{companyName}} as {{designation}} in the {{department}} department from {{dateOfJoining}} to {{lastWorkingDate}}.</p><p>During this tenure, their conduct and performance were found to be satisfactory.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('Service Certificate', 'HR', 3,
   '<h2>Service Certificate</h2><p>Date: {{currentDate}}</p><p>This certifies that <b>{{employeeName}}</b> ({{empId}}) rendered service to {{companyName}} as {{designation}}, {{department}} department, from {{dateOfJoining}} to {{lastWorkingDate}}.</p><p>Issued on request for official purposes.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('NDA Reminder', 'HR', 4,
   '<h2>Confidentiality Reminder</h2><p>Date: {{currentDate}}</p><p>Dear {{employeeName}},</p><p>As you exit {{companyName}} on {{lastWorkingDate}}, we remind you of your continuing obligations under the Non-Disclosure Agreement you signed. You must not disclose any confidential or proprietary information of the company.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('Gratuity Letter', 'HR', 5,
   '<h2>Gratuity Letter</h2><p>Date: {{currentDate}}</p><p>Dear {{employeeName}},</p><p>This letter confirms the processing of your gratuity in accordance with company policy and applicable law, consequent to your separation effective {{lastWorkingDate}}.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('PF Transfer Letter', 'HR', 6,
   '<h2>Provident Fund Transfer</h2><p>Date: {{currentDate}}</p><p>Dear {{employeeName}},</p><p>Your Provident Fund account maintained during your employment with {{companyName}} (until {{lastWorkingDate}}) is eligible for transfer/withdrawal. Please initiate the transfer to your new establishment via the EPFO portal.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'),
  ('FnF Statement', 'Finance', 7,
   '<h2>Full and Final Settlement Statement</h2><p>Date: {{currentDate}}</p><p>Employee: <b>{{employeeName}}</b> ({{empId}})<br/>Case: {{caseNumber}}<br/>Last Working Day: {{lastWorkingDate}}</p><p>Net Settlement Amount: <b>{{netSettlement}}</b></p><p>This statement summarises the full and final settlement. A detailed breakup of earnings and deductions is available on request.</p><p>Regards,<br/>Finance Department<br/>{{companyName}}</p>'),
  ('Tax Statement', 'Finance', 8,
   '<h2>Tax Statement</h2><p>Date: {{currentDate}}</p><p>Employee: <b>{{employeeName}}</b> ({{empId}})</p><p>This statement summarises tax deducted at source for the financial year up to your last working day ({{lastWorkingDate}}). Form 16 will be issued as per statutory timelines.</p><p>Regards,<br/>Finance Department<br/>{{companyName}}</p>'),
  ('Exit Acknowledgement', 'Employee', 9,
   '<h2>Exit Acknowledgement</h2><p>Date: {{currentDate}}</p><p>I, <b>{{employeeName}}</b> ({{empId}}), acknowledge that my employment with {{companyName}} concludes on {{lastWorkingDate}}. I confirm that I have returned all company property and completed the applicable clearance formalities.</p><p>Signature: ____________________<br/>Date: {{currentDate}}</p>')
) AS seed("name","category","sort_order","html_template")
WHERE NOT EXISTS (SELECT 1 FROM "exit_document_templates");
