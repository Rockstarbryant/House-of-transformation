// server/middleware/maintenanceMiddleware.js
/**
 * Maintenance Mode Middleware
 * Blocks non-admin users when maintenance mode is enabled
 * Admins can still access all APIs
 */
const maintenanceMiddleware = async (req, res, next) => {
  try {
    // Skip maintenance check for public endpoints
    if (req.path === '/api/settings/public') {
      console.log('[MAINTENANCE] Skipping check for public settings');
      return next();
    }

    // Skip maintenance check for auth routes
    if (req.path.startsWith('/api/auth')) {
      console.log('[MAINTENANCE] Skipping check for auth routes');
      return next();
    }

    // If no user authenticated, skip this middleware
    // (will be caught by auth protection middleware later)
    if (!req.user) {
      console.log('[MAINTENANCE] No authenticated user - skipping maintenance check');
      return next();
    }

    console.log(`[MAINTENANCE] Checking maintenance for ${req.method} ${req.path}`);

    // REQUIRE database here (after app is initialized)
    const Settings = require('../server/models/Settings');

    // Fetch maintenance settings
    const settings = await Settings.getSettings();
    const maintenanceEnabled = settings?.maintenanceMode?.enabled;

    console.log('[MAINTENANCE] Maintenance enabled:', maintenanceEnabled);

    // If maintenance mode is NOT enabled, continue
    if (!maintenanceEnabled) {
      console.log('[MAINTENANCE] Maintenance disabled - allowing access');
      return next();
    }

    // MAINTENANCE IS ENABLED - Check if user is admin
    console.log('[MAINTENANCE] ⚠️ Maintenance mode is ACTIVE');

    // Check if user is admin - admins bypass maintenance
    const userRole = req.user.role?.name || req.user.role || 'user';
    console.log('[MAINTENANCE] User role:', userRole);

    if (userRole === 'admin') {
      console.log('[MAINTENANCE] ✅ Admin user detected - BYPASSING maintenance');
      return next();
    }

    // Check if user's IP is in allowed IPs list
    if (settings.maintenanceMode.allowedIPs && settings.maintenanceMode.allowedIPs.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      console.log('[MAINTENANCE] Client IP:', clientIP);
      
      if (settings.maintenanceMode.allowedIPs.includes(clientIP)) {
        console.log('[MAINTENANCE] ✅ IP in whitelist - allowing access');
        return next();
      }
    }

    // Non-admin user during maintenance - BLOCK
    console.log(`[MAINTENANCE] ❌ Non-admin user (${userRole}) - BLOCKING with 503`);
    
    return res.status(503).json({
      success: false,
      message: settings.maintenanceMode.message || 'Site is under maintenance',
      maintenanceMode: {
        enabled: true,
        message: settings.maintenanceMode.message,
        estimatedTime: settings.maintenanceMode.estimatedTime
      }
    });

  } catch (error) {
    console.error('[MAINTENANCE] Error:', error);
    // On error, fail open (allow request)
    console.log('[MAINTENANCE] Error occurred - allowing request to proceed');
    next();
  }
};

module.exports = maintenanceMiddleware;