const express = require('express');
const router = express.Router();
const {
  getActiveNotice,
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNotice
} = require('../controllers/noticeController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

// ─── PUBLIC ───────────────────────────────────────────────────────────────────
// Fetched by the frontend NoticeBar on every page — no auth needed
router.get('/active', getActiveNotice);

// ─── PROTECTED ────────────────────────────────────────────────────────────────
// Reuse manage:announcements permission — no new permission needed
router.get(
  '/',
  protect,
  requirePermission('manage:announcements'),
  getAllNotices
);

router.post(
  '/',
  protect,
  requirePermission('manage:announcements'),
  createNotice
);

router.put(
  '/:id',
  protect,
  requirePermission('manage:announcements'),
  updateNotice
);

router.patch(
  '/:id/toggle',
  protect,
  requirePermission('manage:announcements'),
  toggleNotice
);

router.delete(
  '/:id',
  protect,
  requirePermission('manage:announcements'),
  deleteNotice
);

module.exports = router;