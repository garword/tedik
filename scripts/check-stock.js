const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStock() {
    const products = await prisma.product.findMany({
        where: { name: { contains: 'Netflix' } },
        include: {
            category: true,
            variants: {
                include: {
                    stocks: true
                }
            }
        }
    });

    console.log(JSON.stringify(products, null, 2));
}

checkStock().catch(console.error).finally(() => prisma.$disconnect());
