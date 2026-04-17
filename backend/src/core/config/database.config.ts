import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    // ✅ Prisma connection pool configuration for high concurrency
    // Default pool size is num_physical_cpus * 2 + 1
    // For production with high load, we increase this significantly
    
    const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '100', 10);
    const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '30', 10);
    
    // Build connection string with pool settings
    const databaseUrl = process.env.DATABASE_URL || '';
    const separator = databaseUrl.includes('?') ? '&' : '?';
    const urlWithPool = `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&connect_timeout=30`;

    return new PrismaClient({
        datasources: {
            db: {
                url: urlWithPool
            }
        },
        log: [
            // Query logging enabled for debugging (with sampling in production)
            { 
                level: 'query', 
                emit: 'event',
            },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
        ],
    });

    // Log slow queries only (> 1 second)
    prisma.$on('query' as never, (e: any) => {
        if (e.duration > 1000) {
            console.warn(`⚠️ Slow Query (${e.duration}ms):`, e.query);
        }
    });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

// Log connection pool configuration
console.log(`📊 Database Connection Pool: ${process.env.DATABASE_CONNECTION_LIMIT || '100'} connections`);
