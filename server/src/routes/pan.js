/**
 * USTC Pan 路由
 * 提供 USTC Pan 分享文件的下载链接重定向服务
 */

const express = require('express');
const router = express.Router();
const { getOrFetchDownloadLink } = require('../services/panUstcService');
const { requireAuth } = require('../middleware/auth');
const { RegistrationSubmission } = require('../models');

/**
 * GET /api/pan?ustc=:hash
 * 获取 USTC Pan 分享文件的真实下载链接并重定向
 * 
 * 查询参数:
 *   - ustc: USTC Pan 分享链接的 hash (必需)
 * 
 * 响应:
 *   - 成功: 302 重定向到真实下载链接
 *   - 失败: 返回错误信息 JSON
 * 
 * 示例:
 *   GET /api/pan?ustc=abc123def456
 */
router.get('/', async (req, res) => {
    try {
        const { ustc } = req.query;

        // 验证参数
        if (!ustc) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: ustc'
            });
        }

        // 验证 hash 格式（只允许字母和数字）
        if (!/^[a-zA-Z0-9]+$/.test(ustc)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid hash format. Only alphanumeric characters are allowed.'
            });
        }

        console.log(`[PanRoute] Request received for hash: ${ustc}`);

        // 获取下载链接（优先从缓存）
        const downloadUrl = await getOrFetchDownloadLink(ustc);

        // 302 重定向到真实下载链接
        console.log(`[PanRoute] Redirecting to: ${downloadUrl}`);
        res.redirect(302, downloadUrl);

    } catch (error) {
        console.error('[PanRoute] Error:', error);
        
        // 返回错误信息
        res.status(500).json({
            success: false,
            message: 'Failed to get download link',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

/**
 * GET /api/pan/status
 * 健康检查端点
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'USTC Pan Download Service',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/pan/proceedings
 * 获取会议论文集列表（需要用户登录且有有效注册）
 * 
 * 响应:
 *   - 成功: 200 返回论文集列表（不含 URL）
 *   - 未登录: 401 错误
 *   - 无有效注册: 403 错误
 *   - 未配置: 503 错误
 */
router.get('/proceedings', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // 检查用户是否有至少一个可用的注册（已批准且未退款）
        const validRegistration = await RegistrationSubmission.findOne({
            where: {
                userId: userId,
                status: 'approved',
                is_refunded: false
            }
        });

        if (!validRegistration) {
            console.log(`[PanRoute] User ${userId} has no valid registration for proceedings list`);
            return res.status(403).json({
                success: false,
                message: 'You need at least one approved registration to download proceedings'
            });
        }

        // 从文件读取 proceedings 列表
        const fs = require('fs');
        const path = require('path');
        const proceedingsPath = path.join(__dirname, '../../database/proceedings.json');
        
        if (!fs.existsSync(proceedingsPath)) {
            console.log('[PanRoute] proceedings.json file not found');
            return res.status(503).json({
                success: false,
                message: 'Proceedings are not yet published and are still being prepared.'
            });
        }

        const proceedingsData = JSON.parse(fs.readFileSync(proceedingsPath, 'utf8'));
        
        if (!proceedingsData || proceedingsData.length === 0) {
            console.log('[PanRoute] proceedings.json is empty');
            return res.status(503).json({
                success: false,
                message: 'Proceedings are not yet published and are still being prepared.'
            });
        }

        console.log(`[PanRoute] Proceedings list request from user ${userId}, registration: ${validRegistration.id}`);

        // 返回列表（不包含 URL，只包含 name 和 id）
        const proceedingsList = proceedingsData.map((item, index) => ({
            id: index,
            name: item.name
        }));

        res.json({
            success: true,
            proceedings: proceedingsList
        });

    } catch (error) {
        console.error('[PanRoute] Proceedings list error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get proceedings list',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});

/**
 * GET /api/pan/proceedings/:id
 * 获取指定论文集的下载链接（需要用户登录且有有效注册）
 * 
 * 参数:
 *   - id: 论文集在列表中的索引
 * 
 * 响应:
 *   - 成功: 200 返回下载链接
 *   - 未登录: 401 错误
 *   - 无有效注册: 403 错误
 *   - 未找到: 404 错误
 */
router.get('/proceedings/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const proceedingId = parseInt(req.params.id);
        
        // 检查用户是否有至少一个可用的注册（已批准且未退款）
        const validRegistration = await RegistrationSubmission.findOne({
            where: {
                userId: userId,
                status: 'approved',
                is_refunded: false
            }
        });

        if (!validRegistration) {
            console.log(`[PanRoute] User ${userId} has no valid registration for proceedings download`);
            return res.status(403).json({
                success: false,
                message: 'You need at least one approved registration to download proceedings'
            });
        }

        // 从文件读取 proceedings 列表
        const fs = require('fs');
        const path = require('path');
        const proceedingsPath = path.join(__dirname, '../../database/proceedings.json');
        
        if (!fs.existsSync(proceedingsPath)) {
            console.log('[PanRoute] proceedings.json file not found');
            return res.status(503).json({
                success: false,
                message: 'Proceedings are not yet published and are still being prepared.'
            });
        }

        const proceedingsData = JSON.parse(fs.readFileSync(proceedingsPath, 'utf8'));
        
        if (!proceedingsData || proceedingsData.length === 0) {
            console.log('[PanRoute] proceedings.json is empty');
            return res.status(503).json({
                success: false,
                message: 'Proceedings are not yet published and are still being prepared.'
            });
        }

        // 检查 ID 是否有效
        if (isNaN(proceedingId) || proceedingId < 0 || proceedingId >= proceedingsData.length) {
            console.log(`[PanRoute] Invalid proceeding ID: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: 'Proceeding not found'
            });
        }

        const proceeding = proceedingsData[proceedingId];
        
        // 从 URL 中提取 hash
        const urlMatch = proceeding.url.match(/\/share\/index\/([a-zA-Z0-9]+)$/);
        if (!urlMatch) {
            console.error(`[PanRoute] Invalid URL format for proceeding ${proceedingId}: ${proceeding.url}`);
            return res.status(500).json({
                success: false,
                message: 'Invalid proceeding URL format'
            });
        }
        
        const proceedingsHash = urlMatch[1];

        console.log(`[PanRoute] Proceeding download request: user ${userId}, proceeding ${proceedingId} (${proceeding.name})`);

        // 获取下载链接（优先从缓存）
        const downloadUrl = await getOrFetchDownloadLink(proceedingsHash);

        // 返回 200 和下载链接
        console.log(`[PanRoute] Returning download URL for proceeding ${proceedingId}`);
        res.json({
            success: true,
            downloadUrl: downloadUrl,
            name: proceeding.name
        });

    } catch (error) {
        console.error('[PanRoute] Proceeding download error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get proceeding download link',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});




module.exports = router;
