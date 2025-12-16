# Server: Notifications migration

This note explains how to apply the notification trigger migration that was added to the repository.

1. Generate a Prisma migration (optional if you prefer to use the provided migration folder):

```bash
cd server
npx prisma migrate dev --create-only --name add_notification_triggers
# open the generated migration's migration.sql and paste the trigger SQL if needed
```

2. If you added the migration SQL directly (this repo includes a migration at `prisma/migrations/20251216000000_add_notification_triggers/migration.sql`), apply migrations:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

3. Before applying migrations, ensure server code uses `recipient` relation on `Notification` (this repo's Prisma schema already uses `recipientId` and `recipient`). If you have code that referenced the old relation name, update it first.

4. Run the server locally and verify notifications are created for the relevant events (create an announcement, create assignment, grade a submission, reply to comment/post).
