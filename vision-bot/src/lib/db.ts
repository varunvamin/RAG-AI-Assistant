import { neon } from '@neondatabase/serverless';

// During next build, process.env.DATABASE_URL might not be set.
// We provide a dummy fallback to prevent the build from crashing during static collection.
const dbUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost/dummy';

export const sql = neon(dbUrl);
