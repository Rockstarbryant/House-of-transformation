// server/middleware/auditMiddleware.js
const auditService = require('../services/auditService');

const auditMiddleware = (req, res, next) => {
  console.log('🔍 AUDIT MIDDLEWARE:', req.method, req.path);

  // Skip health checks and static files
  if (
    req.path === '/api/health' ||
    req.path === '/' ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/static')
  ) {
    return next();
  }

  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody;

  res.json = function(data) {
    responseBody = data;
    return originalJson(data);
  };

  res.send = function(data) {
    responseBody = data;
    return originalSend(data);
  };

  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const user = req.user;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Parse endpoint
      const { action, resourceType } = parseEndpoint(req);

      console.log('📝 AUDIT:', {
        method: req.method,
        path: req.path,
        action,
        resourceType,
        status: res.statusCode,
        user: user?.email || 'Anonymous'
      });

      // Skip if no action
      if (!action) {
        console.log('⏭️ SKIP: No action detected');
        return;
      }

      // Build audit log data
      const auditData = {
        userId: user?._id || user?.id,
        userEmail: user?.email || req.body?.email,
        userName: user?.name,
        userRole: user?.role,
        action,
        resourceType,
        resourceId: req.params?.id || null,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        statusCode: res.statusCode,
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        metadata: {
          query: req.query,
          params: req.params
        },
        success,
        duration
      };

      // Add resource name from response
      if (responseBody && typeof responseBody === 'object') {
        const resource = responseBody.data || responseBody.user || responseBody.sermon || 
                        responseBody.blog || responseBody.event || responseBody.feedback ||
                        responseBody.volunteer || responseBody.application || responseBody.photo;
        
        if (resource) {
          auditData.resourceId = resource._id || resource.id || auditData.resourceId;
          auditData.resourceName = resource.title || resource.name || resource.fullName;
        }
      }

      // Log asynchronously
      const result = await auditService.log(auditData);
      console.log(result ? '✅ LOGGED' : '❌ LOG FAILED');
    } catch (error) {
      console.error('❌ AUDIT ERROR:', error.message);
    }
  });

  next();
};

/**
 * Parse endpoint to determine action and resource type
 */
function parseEndpoint(req) {
  const path = req.path;
  const method = req.method;

  // Authentication endpoints
  if (path.includes('/auth/login')) {
    return { action: 'auth.login.success', resourceType: 'user' };
  }
  if (path.includes('/auth/signup')) {
    return { action: 'auth.signup.success', resourceType: 'user' };
  }
  if (path.includes('/auth/logout')) {
    return { action: 'auth.logout', resourceType: 'user' };
  }
  if (path.includes('/auth/forgot-password')) {
    return { action: 'auth.password.reset.request', resourceType: 'user' };
  }
  if (path.includes('/auth/reset-password')) {
    return { action: 'auth.password.reset.success', resourceType: 'user' };
  }
  if (path.includes('/verify-email')) {
    return { action: 'auth.email.verify', resourceType: 'user' };
  }

  // User endpoints
  if (path.match(/\/users/)) {
    if (path.includes('/role')) return { action: 'user.role.change', resourceType: 'user' };
    if (path.includes('/bulk')) return { action: 'user.bulk.update', resourceType: 'user' };
    if (method === 'POST') return { action: 'user.create', resourceType: 'user' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'user.update', resourceType: 'user' };
    if (method === 'DELETE') return { action: 'user.delete', resourceType: 'user' };
  }

  // Sermon endpoints
  if (path.match(/\/sermons/)) {
    if (path.includes('/like')) return { action: 'sermon.like', resourceType: 'sermon' };
    if (method === 'POST') return { action: 'sermon.create', resourceType: 'sermon' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'sermon.update', resourceType: 'sermon' };
    if (method === 'DELETE') return { action: 'sermon.delete', resourceType: 'sermon' };
  }

  // Blog endpoints
  if (path.match(/\/blog/)) {
    if (path.includes('/approve')) return { action: 'blog.approve', resourceType: 'blog' };
    if (method === 'POST') return { action: 'blog.create', resourceType: 'blog' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'blog.update', resourceType: 'blog' };
    if (method === 'DELETE') return { action: 'blog.delete', resourceType: 'blog' };
  }

  // Event endpoints
  if (path.match(/\/events/)) {
    if (path.includes('/register')) return { action: 'event.register', resourceType: 'event' };
    if (method === 'POST') return { action: 'event.create', resourceType: 'event' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'event.update', resourceType: 'event' };
    if (method === 'DELETE') return { action: 'event.delete', resourceType: 'event' };
  }

  // Gallery endpoints
  if (path.match(/\/gallery/)) {
    if (path.includes('/like')) return { action: 'gallery.like', resourceType: 'gallery' };
    if (method === 'POST') return { action: 'gallery.upload', resourceType: 'gallery' };
    if (method === 'DELETE') return { action: 'gallery.delete', resourceType: 'gallery' };
  }

  // Livestream endpoints
  if (path.match(/\/livestreams/)) {
    if (path.includes('/archive')) return { action: 'livestream.archive', resourceType: 'livestream' };
    if (method === 'POST') return { action: 'livestream.create', resourceType: 'livestream' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'livestream.update', resourceType: 'livestream' };
    if (method === 'DELETE') return { action: 'livestream.delete', resourceType: 'livestream' };
  }

  // Volunteer endpoints
  if (path.match(/\/volunteers/)) {
    if (path.includes('/apply')) return { action: 'volunteer.apply', resourceType: 'volunteer' };
    if (path.includes('/edit')) return { action: 'volunteer.edit', resourceType: 'volunteer' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'volunteer.approve', resourceType: 'volunteer' };
    if (method === 'DELETE') return { action: 'volunteer.delete', resourceType: 'volunteer' };
  }

  // Feedback endpoints
  if (path.match(/\/feedback/)) {
    if (path.includes('/respond')) return { action: 'feedback.respond', resourceType: 'feedback' };
    if (path.includes('/publish')) return { action: 'feedback.publish', resourceType: 'feedback' };
    if (method === 'POST') return { action: 'feedback.submit', resourceType: 'feedback' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'feedback.update', resourceType: 'feedback' };
    if (method === 'DELETE') return { action: 'feedback.delete', resourceType: 'feedback' };
  }

  // No action detected
  return { action: null, resourceType: null };
}

module.exports = auditMiddleware;