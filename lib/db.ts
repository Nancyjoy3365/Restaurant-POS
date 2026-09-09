import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_SERVER!,
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: true,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const promise = new sql.ConnectionPool(config).connect().catch((err: unknown) => {
      poolPromise = null;
      throw err;
    });
    poolPromise = promise;
  }
  return poolPromise;
}

export { sql };
