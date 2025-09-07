// 首页功能脚本

document.addEventListener('DOMContentLoaded', function() {
    // 为用户注册按钮添加事件监听器
    const userPortalBtn = document.getElementById('user-portal-btn');
    if (userPortalBtn) {
        userPortalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showUserPortal();
        });
    }
});

function showUserPortal() {
    alert('用户注册功能请使用前端应用访问。\n\n如果您是管理员，请点击"管理员登录"。');
}
