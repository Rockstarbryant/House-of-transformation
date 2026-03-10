// server/routes/communicationRoutes.js
const express = require('express');
const ctrl    = require('../controllers/communicationController');
const { protect }      = require('../middleware/supabaseAuth');
const { requireAdmin } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[COMMUNICATION-ROUTES] Initializing...');

// All routes require auth + admin
router.use(protect, requireAdmin);

// ── Meta ─────────────────────────────────────────────────────────────────────
router.get('/users',                ctrl.getUsers);
router.get('/roles',                ctrl.getRoles);
router.get('/users/role/:roleId',   ctrl.getUsersByRole);

// ── Named routes MUST come before /:id ───────────────────────────────────────
router.get('/stats',                ctrl.getStats);
router.get('/templates',            ctrl.getTemplates);
router.post('/templates',           ctrl.createTemplate);
router.put('/templates/:id',        ctrl.updateTemplate);
router.delete('/templates/:id',     ctrl.deleteTemplate);

// ── Send ─────────────────────────────────────────────────────────────────────
router.post('/send',                ctrl.sendCommunication);

// ── History ──────────────────────────────────────────────────────────────────
router.get('/',                     ctrl.getCommunications);
router.get('/:id',                  ctrl.getCommunication);
router.delete('/:id',               ctrl.deleteCommunication);

console.log('[COMMUNICATION-ROUTES] Routes registered');

module.exports = router;