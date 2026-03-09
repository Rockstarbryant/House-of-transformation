/**
 * Redis connection factory for BullMQ.
 *
 * BullMQ requires:
 *   - maxRetriesPerRequest: null   (so the client never short-circuits a blocked command)
 *   - enableReadyCheck: false      (workers should start even before Redis is fully ready)
 *
 * For Render / Railway / Upstash: set REDIS_URL in env vars.
 * For local dev: default is redis://localhost:6379
 */
const IORedis = require('ioredis');

let _connection = null;

/**
 * Returns a shared ioredis connection suitable for BullMQ.
 * Call this once; all queues and workers reuse the same instance.
 */
const getRedisConnection = () => {
  if (_connection) return _connection;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  _connection = new IORedis(url, {
    maxRetriesPerRequest: null,   // REQUIRED by BullMQ
    enableReadyCheck: false,
    // TLS is automatically used when URL starts with rediss://
    ...(url.startsWith('rediss://') && { tls: {} }),
  });

  _connection.on('connect', () => console.log('[Redis] ✅ Connected'));
  _connection.on('ready',   () => console.log('[Redis] ✅ Ready'));
  _connection.on('error',   (e) => console.error('[Redis] ❌ Error:', e.message));
  _connection.on('close',   ()  => console.warn('[Redis] ⚠️  Connection closed'));
  _connection.on('reconnecting', () => console.log('[Redis] 🔄 Reconnecting…'));

  return _connection;
};

module.exports = { getRedisConnection };