const express = require('express');
const { AttendeeTransfer, RegistrationSubmission, User } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Root route - redirect to transfer-requests for backward compatibility
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  // Redirect to the full transfer-requests endpoint with default status=pending
  const params = new URLSearchParams(req.query);
  if (!params.has('status')) {
    params.set('status', 'pending');
  }
  
  // Forward the request to the transfer-requests handler
  req.url = `/transfer-requests?${params.toString()}`;
  req.query = Object.fromEntries(params);
  
  // Get the transfer-requests handler and call it
  const transferRequestsHandler = router.stack.find(layer => 
    layer.route && layer.route.path === '/transfer-requests' && layer.route.methods.get
  );
  
  if (transferRequestsHandler) {
    return transferRequestsHandler.route.stack[0].handle(req, res);
  }
  
  // Fallback
  res.redirect(302, `/admin/transfers/transfer-requests?${params.toString()}`);
});

// Get all transfer requests with pagination and filtering
router.get('/transfer-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { Op } = require('sequelize');
    
    // Build where clause
    const where = {};
    if (status) {
      where.status = status;
    }

    // Build include with search conditions
    const includeConditions = [
      {
        model: RegistrationSubmission,
        as: 'registration',
        where: search ? {
          [Op.or]: [
            { '$registration.user.fullname$': { [Op.like]: `%${search}%` } },
            { '$registration.user.email$': { [Op.like]: `%${search}%` } }
          ]
        } : {},
        required: !!search, // 如果有搜索条件，必须匹配
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'fullname', 'email']
          }
        ]
      },
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'fullname', 'email']
      },
      {
        model: User,
        as: 'processor',
        attributes: ['id', 'fullname', 'email'],
        required: false
      }
    ];

    const { count, rows: transfers } = await AttendeeTransfer.findAndCountAll({
      where,
      include: includeConditions,
      order: [['requestTime', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: transfers,
      pagination: {
        current: parseInt(page),
        total: totalPages,
        count: transfers.length,
        totalRecords: count
      }
    });

  } catch (error) {
    console.error('Get transfer requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get specific transfer request details
router.get('/transfer-requests/:transferId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transferId } = req.params;

    const transfer = await AttendeeTransfer.findByPk(transferId, {
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'fullname', 'email']
            }
          ]
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'fullname', 'email']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'fullname', 'email'],
          required: false
        }
      ]
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found'
      });
    }

    res.json({
      success: true,
      data: transfer
    });

  } catch (error) {
    console.error('Get transfer request details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process transfer request (approve/reject)
router.put('/transfer-requests/:transferId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transferId } = req.params;
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const transfer = await AttendeeTransfer.findByPk(transferId, {
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration'
        }
      ]
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found'
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transfer request has already been processed'
      });
    }

    // Update transfer status
    transfer.status = action === 'approve' ? 'approved' : 'rejected';
    transfer.processedBy = req.session.userId;
    transfer.processTime = new Date();
    transfer.adminNotes = adminNotes || '';

    await transfer.save();

    // If approved, update the registration with new attendee information
    if (action === 'approve') {
      const registration = transfer.registration;
      registration.name = transfer.newAttendee.name;
      registration.email = transfer.newAttendee.email;
      registration.phone = transfer.newAttendee.phone;
      registration.affiliation = transfer.newAttendee.affiliation;
      
      await registration.save();
    }

    res.json({
      success: true,
      message: `Transfer request ${action}d successfully`,
      data: {
        transferId: transfer.id,
        action,
        status: transfer.status
      }
    });

  } catch (error) {
    console.error('Process transfer request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Re-review transfer request (reset to pending status)
router.post('/transfer-requests/:transferId/re-review', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transferId } = req.params;

    const transfer = await AttendeeTransfer.findByPk(transferId, {
      include: [
        {
          model: RegistrationSubmission,
          as: 'registration'
        }
      ]
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found'
      });
    }

    if (transfer.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transfer request is already pending review'
      });
    }

    // Reset to pending status for re-review
    transfer.status = 'pending';
    transfer.processedBy = null;
    transfer.processTime = null;
    transfer.adminNotes = '';

    await transfer.save();

    // If the transfer was previously approved, we might need to revert the registration changes
    // However, this is complex because we don't store the original attendee info
    // For now, we'll just reset the transfer status and let the admin decide again

    res.json({
      success: true,
      message: 'Transfer request has been reset to pending status for re-review',
      data: {
        transferId: transfer.id,
        status: transfer.status
      }
    });

  } catch (error) {
    console.error('Re-review transfer request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get transfer statistics
router.get('/transfer-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests
    ] = await Promise.all([
      AttendeeTransfer.count(),
      AttendeeTransfer.count({ where: { status: 'pending' } }),
      AttendeeTransfer.count({ where: { status: 'approved' } }),
      AttendeeTransfer.count({ where: { status: 'rejected' } })
    ]);

    res.json({
      success: true,
      data: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests
      }
    });

  } catch (error) {
    console.error('Get transfer stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
