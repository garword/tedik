/**
 * turso-push.ts
 * 
 * Script untuk sinkronisasi schema Prisma ke database Turso (remote libSQL).
 * Prisma CLI tidak mendukung koneksi langsung ke libSQL, jadi script ini
 * membaca schema dan menjalankan migrasi DDL langsung ke Turso.
 * 
 * Cara pakai:
 *   npx tsx scripts/turso-push.ts
 */

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import * as fs from 'fs';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
    console.log('🔌 Menghubungkan ke Turso:', process.env.TURSO_DATABASE_URL);

    // === Langkah 1: Hasilkan SQL diff dari Prisma
    console.log('\n📋 Membuat SQL dari schema Prisma...');
    try {
        execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > .turso-migrate.sql', {
            stdio: 'pipe'
        });
    } catch (err) {
        console.error('❌ Gagal membuat SQL diff:', err);
        process.exit(1);
    }

    const fullSql = fs.readFileSync('.turso-migrate.sql', 'utf8');
    fs.unlinkSync('.turso-migrate.sql'); // Hapus file temp

    // === Langkah 2: Cek tabel yang sudah ada di Turso
    console.log('\n🔍 Mengecek tabel yang sudah ada di Turso...');
    const existingTablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const existingTables = existingTablesResult.rows.map((r: any) => r.name as string);
    console.log('   Tabel yang ada:', existingTables.join(', ') || 'kosong');

    // === Langkah 3: Ambil hanya CREATE TABLE yang belum ada
    const createTableRegex = /CREATE TABLE "([^"]+)" \([\s\S]+?\);/g;
    const tableSqls: { name: string; sql: string }[] = [];

    let match;
    while ((match = createTableRegex.exec(fullSql)) !== null) {
        const tableName = match[1];
        const tableSql = match[0];
        tableSqls.push({ name: tableName, sql: tableSql });
    }

    console.log(`\n📊 Total tabel dalam schema: ${tableSqls.length}`);

    let created = 0;
    let skipped = 0;

    for (const { name, sql } of tableSqls) {
        if (existingTables.includes(name)) {
            console.log(`   ⏭️  Skip: "${name}" sudah ada`);
            skipped++;
        } else {
            try {
                await client.execute(sql);
                console.log(`   ✅ Dibuat: "${name}"`);
                created++;
            } catch (err: any) {
                if (err.message?.includes('already exists')) {
                    console.log(`   ⏭️  Skip (already exists): "${name}"`);
                    skipped++;
                } else {
                    console.error(`   ❌ Gagal membuat "${name}":`, err.message);
                }
            }
        }
    }

    console.log(`\n🎉 Selesai! Dibuat: ${created}, Dilewati: ${skipped}\n`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
