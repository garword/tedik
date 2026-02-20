import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

async function checkUser() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });

    try {
        const rs = await client.execute("SELECT username, email, role FROM User");
        console.log("USERS IN DB:", rs.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.close();
    }
}

checkUser();
