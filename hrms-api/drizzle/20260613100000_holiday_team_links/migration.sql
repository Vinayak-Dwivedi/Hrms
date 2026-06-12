-- Holiday ↔ Calendar (Team) many-to-many.
--
-- Before: each holiday was tied to exactly one calendar via holidays.calendar_id.
-- After:  a holiday can belong to many calendars (now thought of as "teams")
--         and one calendar can have many holidays — same as before.
--
-- A holiday in N teams is one row in `holidays` plus N rows in this link
-- table. Editing the holiday once updates it everywhere; untick a team and
-- only that link row goes away.
--
-- We don't drop holidays.calendar_id yet — keeps existing reads working
-- during deploy. Once everything reads from the link table we can remove
-- the column in a follow-up migration.

CREATE TABLE IF NOT EXISTS "holiday_team_links" (
  "holiday_id" integer NOT NULL REFERENCES "holidays"("id") ON DELETE CASCADE,
  "calendar_id" integer NOT NULL REFERENCES "holiday_calendars"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("holiday_id", "calendar_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_holiday_team_links_calendar"
  ON "holiday_team_links" ("calendar_id");--> statement-breakpoint

-- Backfill: every existing (holiday, calendar) pairing becomes a link row.
INSERT INTO "holiday_team_links" ("holiday_id", "calendar_id")
SELECT "id", "calendar_id"
FROM "holidays"
WHERE "calendar_id" IS NOT NULL
ON CONFLICT DO NOTHING;
