import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Connecting to Turso...', process.env.TURSO_DATABASE_URL);

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const sql = `
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
    `;

    try {
        await client.execute(sql);
        console.log('Table Announcement created successfully.');
    } catch (err: any) {
        if (err.message.includes('already exists')) {
            console.log('Table already exists, skipping.');
        } else {
            console.error('Failed to create table:', err);
        }
    }
}

main();
