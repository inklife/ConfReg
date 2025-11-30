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
 * 获取会议论文集下载链接（需要用户登录且有有效注册）
 * 
 * 响应:
 *   - 成功: 200 返回下载链接
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
            console.log(`[PanRoute] User ${userId} has no valid registration for proceedings download`);
            return res.status(403).json({
                success: false,
                message: 'You need at least one approved registration to download proceedings'
            });
        }

        // 从环境变量获取 proceedings hash
        const proceedingsHash = process.env.CONFREG_PROCEEDINGS;
        
        if (!proceedingsHash || proceedingsHash.trim() === '') {
            console.log('[PanRoute] CONFREG_PROCEEDINGS environment variable is not configured');
            return res.status(503).json({
                success: false,
                message: 'Proceedings are not yet published and are still being prepared.'
            });
        }

        console.log(`[PanRoute] Proceedings request from user ${userId}, registration: ${validRegistration.id}`);

        // 获取下载链接（优先从缓存）
        const downloadUrl = await getOrFetchDownloadLink(proceedingsHash.trim());

        // 返回 200 和下载链接
        console.log(`[PanRoute] Returning download URL: ${downloadUrl}`);
        res.json({
            success: true,
            downloadUrl: downloadUrl
        });

    } catch (error) {
        console.error('[PanRoute] Proceedings error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to get proceedings download link',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
});




module.exports = router;
