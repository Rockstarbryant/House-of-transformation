// server/middleware/auditMiddleware.js
const auditService = require('../services/auditService');

/**
 * Middleware to automatically log all API requests
 * Place this AFTER authentication middleware but BEFORE route handlers
 */
const auditMiddleware = (req, res, next) => {
  // Skip health checks and static files
  if (
    req.path === '/api/health' ||
    req.path === '/' ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/static')
  ) {
    return next();
  }

  // Capture start time for duration calculation
  const startTime = Date.now();

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody;

  // Override res.json
  res.json = function(data) {
    responseBody = data;
    return originalJson(data);
  };

  // Override res.send
  res.send = function(data) {
    responseBody = data;
    return originalSend(data);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const user = req.user;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Determine action and resource type from endpoint
      const { action, resourceType } = parseEndpoint(req);

      // Skip if no meaningful action (like GET requests to list endpoints)
      if (!action) return;

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
          params: req.params,
          body: auditService.sanitizeBody(req.body)
        },
        success,
        duration
      };

      // Add resource name from response if available
      if (responseBody && typeof responseBody === 'object') {
        const resource = responseBody.data || responseBody.user || responseBody.sermon || 
                        responseBody.blog || responseBody.event || responseBody.feedback;
        
        if (resource) {
          auditData.resourceId = resource._id || resource.id || auditData.resourceId;
          auditData.resourceName = resource.title || resource.name || resource.fullName;
        }
      }

      // Log asynchronously (don't wait)
      auditService.log(auditData).catch(err => {
        console.error('Audit log error:', err);
      });
    } catch (error) {
      console.error('Audit middleware error:', error);
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
    return {
      action: req.body?.email ? 'auth.login.attempt' : 'auth.login.failed',
      resourceType: 'user'
    };
  }
  if (path.includes('/auth/signup')) {
    return { action: 'auth.signup.attempt', resourceType: 'user' };
  }
  if (path.includes('/auth/logout')) {
    return { action: 'auth.logout', resourceType: 'user' };
  }
  if (path.includes('/auth/verify')) {
    return { action: 'auth.token.refresh', resourceType: 'user' };
  }
  if (path.includes('/auth/forgot-password')) {
    return { action: 'auth.password.reset.request', resourceType: 'user' };
  }
  if (path.includes('/auth/reset-password')) {
    return { action: 'auth.password.reset.success', resourceType: 'user' };
  }
  if (path.includes('/auth/verify-email')) {
    return { action: 'auth.email.verify', resourceType: 'user' };
  }

  // User endpoints
  if (path.includes('/users')) {
    if (path.includes('/role')) {
      return { action: 'user.role.change', resourceType: 'user' };
    }
    if (path.includes('/bulk')) {
      return { action: 'user.bulk.update', resourceType: 'user' };
    }
    if (method === 'POST') return { action: 'user.create', resourceType: 'user' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'user.update', resourceType: 'user' };
    if (method === 'DELETE') return { action: 'user.delete', resourceType: 'user' };
    return null; // GET requests - don't log
  }

  // Sermon endpoints
  if (path.includes('/sermons')) {
    if (path.includes('/like')) {
      return { action: 'sermon.like', resourceType: 'sermon' };
    }
    if (method === 'POST') return { action: 'sermon.create', resourceType: 'sermon' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'sermon.update', resourceType: 'sermon' };
    if (method === 'DELETE') return { action: 'sermon.delete', resourceType: 'sermon' };
    return null; // GET requests
  }

  // Blog endpoints
  if (path.includes('/blog')) {
    if (path.includes('/approve')) {
      return { action: 'blog.approve', resourceType: 'blog' };
    }
    if (method === 'POST') return { action: 'blog.create', resourceType: 'blog' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'blog.update', resourceType: 'blog' };
    if (method === 'DELETE') return { action: 'blog.delete', resourceType: 'blog' };
    return null;
  }

  // Event endpoints
  if (path.includes('/events')) {
    if (path.includes('/register')) {
      return { action: 'event.register', resourceType: 'event' };
    }
    if (method === 'POST') return { action: 'event.create', resourceType: 'event' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'event.update', resourceType: 'event' };
    if (method === 'DELETE') return { action: 'event.delete', resourceType: 'event' };
    return null;
  }

  // Gallery endpoints
  if (path.includes('/gallery')) {
    if (path.includes('/like')) {
      return { action: 'gallery.like', resourceType: 'gallery' };
    }
    if (method === 'POST') return { action: 'gallery.upload', resourceType: 'gallery' };
    if (method === 'DELETE') return { action: 'gallery.delete', resourceType: 'gallery' };
    return null;
  }

  // Livestream endpoints
  if (path.includes('/livestreams')) {
    if (path.includes('/archive')) {
      return { action: 'livestream.archive', resourceType: 'livestream' };
    }
    if (method === 'POST') return { action: 'livestream.create', resourceType: 'livestream' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'livestream.update', resourceType: 'livestream' };
    if (method === 'DELETE') return { action: 'livestream.delete', resourceType: 'livestream' };
    return null;
  }

  // Volunteer endpoints
  if (path.includes('/volunteers')) {
    if (path.includes('/apply')) {
      return { action: 'volunteer.apply', resourceType: 'volunteer' };
    }
    if (path.includes('/edit')) {
      return { action: 'volunteer.edit', resourceType: 'volunteer' };
    }
    if (method === 'PUT' || method === 'PATCH') {
      return { action: 'volunteer.approve', resourceType: 'volunteer' };
    }
    if (method === 'DELETE') return { action: 'volunteer.delete', resourceType: 'volunteer' };
    return null;
  }

  // Feedback endpoints
  if (path.includes('/feedback')) {
    if (path.includes('/respond')) {
      return { action: 'feedback.respond', resourceType: 'feedback' };
    }
    if (path.includes('/publish')) {
      return { action: 'feedback.publish', resourceType: 'feedback' };
    }
    if (method === 'POST') return { action: 'feedback.submit', resourceType: 'feedback' };
    if (method === 'PUT' || method === 'PATCH') return { action: 'feedback.update', resourceType: 'feedback' };
    if (method === 'DELETE') return { action: 'feedback.delete', resourceType: 'feedback' };
    return null;
  }

  // Default - no logging
  return null;
}

module.exports = auditMiddleware;