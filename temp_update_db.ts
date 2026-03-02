import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'footer_config' } });
    if (setting && setting.value.includes('/info/blog')) {
        const newValue = setting.value.replace(/\/info\/blog/g, '/blog');
        await prisma.siteSetting.update({
            where: { key: 'footer_config' },
            data: { value: newValue }
        });
        console.log('Updated DB footer_config successfully');
    } else {
        console.log('No update needed for DB footer_config');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
