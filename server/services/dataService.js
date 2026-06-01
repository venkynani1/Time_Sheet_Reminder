// Shares the Prisma PostgreSQL client and verifies database connectivity.
const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

module.exports = { checkDatabaseConnection, prisma };
