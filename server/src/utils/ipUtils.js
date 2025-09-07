/**
 * 获取客户端真实IP地址
 * 适用于nginx等反向代理环境
 */
function getRealClientIP(req) {
  // 优先级从高到低检查各种IP头
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  const forwardedFor = req.headers['forwarded-for'];
  const forwardedProto = req.headers['forwarded'];
  
  let clientRealIP = null;
  
  // X-Forwarded-For 可能包含多个IP，格式：client, proxy1, proxy2
  // 第一个通常是真实客户端IP
  if (forwarded) {
    clientRealIP = forwarded.split(',')[0].trim();
  }
  // X-Real-IP 通常由nginx设置
  else if (realIP) {
    clientRealIP = realIP;
  }
  // 其他可能的头
  else if (clientIP) {
    clientRealIP = clientIP;
  }
  else if (forwardedFor) {
    clientRealIP = forwardedFor.split(',')[0].trim();
  }
  // 解析 Forwarded 头（RFC 7239标准格式）
  else if (forwardedProto) {
    const match = forwardedProto.match(/for=([^;,\s]+)/);
    if (match) {
      clientRealIP = match[1].replace(/"/g, '');
    }
  }
  
  // 如果没有找到代理头，使用Express的req.ip
  if (!clientRealIP) {
    clientRealIP = req.ip;
  }
  
  // 清理IPv6映射的IPv4地址
  if (clientRealIP && clientRealIP.startsWith('::ffff:')) {
    clientRealIP = clientRealIP.substring(7);
  }
  
  // 验证IP格式
  if (clientRealIP && !isValidIP(clientRealIP)) {
    console.warn(`Invalid IP detected: ${clientRealIP}, falling back to req.ip: ${req.ip}`);
    clientRealIP = req.ip;
  }
  
  return clientRealIP || req.ip || 'unknown';
}

/**
 * 简单的IP地址格式验证
 */
function isValidIP(ip) {
  // IPv4 正则
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 正则（简化版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * 记录IP获取的调试信息
 */
function logIPDebugInfo(req) {
  console.log('=== IP Debug Info ===');
  console.log('req.ip:', req.ip);
  console.log('req.connection.remoteAddress:', req.connection?.remoteAddress);
  console.log('x-forwarded-for:', req.headers['x-forwarded-for']);
  console.log('x-real-ip:', req.headers['x-real-ip']);
  console.log('x-client-ip:', req.headers['x-client-ip']);
  console.log('forwarded:', req.headers['forwarded']);
  console.log('Real client IP:', getRealClientIP(req));
  console.log('====================');
}

module.exports = {
  getRealClientIP,
  isValidIP,
  logIPDebugInfo
};
