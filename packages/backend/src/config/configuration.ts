export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const defaultOrigins = isProd
    ? [
        'http://localhost',
        'http://localhost:80',
        'http://frontend',
        'http://frontend:80',
        'http://127.0.0.1',
        'http://127.0.0.1:80',
      ]
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:80',
        'http://localhost',
      ];

  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  const finalOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

  return {
    nodeEnv,
    port: (process.env.PORT && parseInt(process.env.PORT, 10)) || 3000,

    storage: {
      type: process.env.STORAGE_TYPE || 'memory',
    },

    rateLimit: {
      maxConcurrent:
        (process.env.MAX_CONCURRENT_REQUESTS &&
          parseInt(process.env.MAX_CONCURRENT_REQUESTS, 10)) ||
        5,
      delayMin: 0,
      delayMax: 10,
    },

    cors: {
      origin: finalOrigins,
    },

    logging: {
      level: process.env.LOG_LEVEL || 'debug',
    },
  };
};
