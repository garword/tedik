import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { config } from "dotenv";

config(); // Load .env file

async function main() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    }

    console.log("Connecting to Turso...");
    const client = createClient({ url, authToken });

    console.log("Reading migrate.sql...");
    const sql = readFileSync("migrate.sql", "utf-8");

    // Split into individual statements to handle each one and ignore "already exists" errors safely
    const statements = sql
        .replace(/--.*/g, "") // remove comments
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (const stmt of statements) {
        try {
            await client.execute(stmt + ";");
        } catch (e) {
            if (
                e.message &&
                (e.message.includes("already exists") || e.message.includes("duplicate column"))
            ) {
                // Safe to ignore if table already exists in a fresh setup that we might be re-running
                console.log(`[SKIPPED] ${stmt.substring(0, 50)}... (Already exists)`);
            } else {
                console.error(`[ERROR] Failed to execute: ${stmt}`);
                throw e;
            }
        }
    }

    console.log("✅ Migration applied to Turso successfully!");
}

main().catch((err) => {
    console.error("Migration script failed:", err);
    process.exit(1);
});
