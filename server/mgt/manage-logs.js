#!/usr/bin/env node

/**
 * 日志管理工具
 * 用于管理和维护日志文件
 */

const { logger, cleanOldLogs, logDir } = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');

const showHelp = () => {
  console.log(`
日志管理工具

用法:
  node mgt/manage-logs.js <command> [options]

命令:
  info                    显示日志系统信息
  list                    列出所有日志文件
  clean [days]           清理指定天数之前的日志文件 (默认30天)
  size                   显示日志目录大小统计
  tail [lines]           显示最新日志文件的末尾内容 (默认50行)

示例:
  node mgt/manage-logs.js info
  node mgt/manage-logs.js list
  node mgt/manage-logs.js clean 7
  node mgt/manage-logs.js tail 100
`);
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const showInfo = () => {
  console.log('\n=== 日志系统信息 ===');
  console.log(`日志目录: ${logDir}`);
  console.log(`当前日志级别: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`目录存在: ${fs.existsSync(logDir) ? '是' : '否'}`);
  
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    console.log(`日志文件数量: ${files.length}`);
    
    if (files.length > 0) {
      const latestFile = files.sort().reverse()[0];
      console.log(`最新日志文件: ${latestFile}`);
    }
  }
  console.log('==================\n');
};

const listLogs = () => {
  console.log('\n=== 日志文件列表 ===');
  
  if (!fs.existsSync(logDir)) {
    console.log('日志目录不存在');
    return;
  }
  
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const filePath = path.join(logDir, f);
      const stats = fs.statSync(filePath);
      return {
        name: f,
        size: stats.size,
        modified: stats.mtime,
        path: filePath
      };
    })
    .sort((a, b) => b.modified - a.modified);
  
  if (files.length === 0) {
    console.log('没有找到日志文件');
    return;
  }
  
  console.log('文件名'.padEnd(30) + '大小'.padEnd(12) + '修改时间');
  console.log('-'.repeat(60));
  
  files.forEach(file => {
    const name = file.name.padEnd(30);
    const size = formatBytes(file.size).padEnd(12);
    const modified = file.modified.toLocaleString();
    console.log(`${name}${size}${modified}`);
  });
  
  console.log(`\n总计: ${files.length} 个文件`);
  console.log('==================\n');
};

const cleanLogs = (days = 30) => {
  console.log(`\n=== 清理 ${days} 天前的日志文件 ===`);
  
  if (!fs.existsSync(logDir)) {
    console.log('日志目录不存在');
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  console.log(`清理时间点: ${cutoffDate.toLocaleString()}`);
  
  const files = fs.readdirSync(logDir);
  let cleanedCount = 0;
  let cleanedSize = 0;
  
  files.forEach(file => {
    if (file.startsWith('server_') && file.endsWith('.log')) {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        try {
          const size = stats.size;
          fs.unlinkSync(filePath);
          console.log(`已删除: ${file} (${formatBytes(size)})`);
          cleanedCount++;
          cleanedSize += size;
        } catch (error) {
          console.error(`删除失败 ${file}:`, error.message);
        }
      }
    }
  });
  
  if (cleanedCount === 0) {
    console.log('没有需要清理的文件');
  } else {
    console.log(`\n清理完成: ${cleanedCount} 个文件, 节省空间 ${formatBytes(cleanedSize)}`);
  }
  console.log('==================\n');
};

const showSize = () => {
  console.log('\n=== 日志目录大小统计 ===');
  
  if (!fs.existsSync(logDir)) {
    console.log('日志目录不存在');
    return;
  }
  
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const filePath = path.join(logDir, f);
      const stats = fs.statSync(filePath);
      return { name: f, size: stats.size };
    });
  
  if (files.length === 0) {
    console.log('没有找到日志文件');
    return;
  }
  
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const avgSize = totalSize / files.length;
  const largest = files.reduce((max, file) => file.size > max.size ? file : max, files[0]);
  
  console.log(`文件数量: ${files.length}`);
  console.log(`总大小: ${formatBytes(totalSize)}`);
  console.log(`平均大小: ${formatBytes(avgSize)}`);
  console.log(`最大文件: ${largest.name} (${formatBytes(largest.size)})`);
  console.log('==================\n');
};

const tailLog = (lines = 50) => {
  console.log(`\n=== 最新日志内容 (最后 ${lines} 行) ===`);
  
  if (!fs.existsSync(logDir)) {
    console.log('日志目录不存在');
    return;
  }
  
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => ({
      name: f,
      path: path.join(logDir, f),
      modified: fs.statSync(path.join(logDir, f)).mtime
    }))
    .sort((a, b) => b.modified - a.modified);
  
  if (files.length === 0) {
    console.log('没有找到日志文件');
    return;
  }
  
  const latestFile = files[0];
  console.log(`文件: ${latestFile.name}`);
  console.log('-'.repeat(60));
  
  try {
    const content = fs.readFileSync(latestFile.path, 'utf8');
    const allLines = content.split('\n');
    const startIndex = Math.max(0, allLines.length - lines - 1);
    const tailLines = allLines.slice(startIndex).filter(line => line.trim());
    
    tailLines.forEach(line => console.log(line));
    
    if (tailLines.length === 0) {
      console.log('(文件为空)');
    }
  } catch (error) {
    console.error('读取文件失败:', error.message);
  }
  
  console.log('==================\n');
};

// 主程序
const main = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'info':
      showInfo();
      break;
      
    case 'list':
      listLogs();
      break;
      
    case 'clean':
      const days = parseInt(args[1]) || 30;
      cleanLogs(days);
      break;
      
    case 'size':
      showSize();
      break;
      
    case 'tail':
      const lines = parseInt(args[1]) || 50;
      tailLog(lines);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.log('未知命令。使用 --help 查看帮助信息。');
      process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  showInfo,
  listLogs,
  cleanLogs,
  showSize,
  tailLog
};
