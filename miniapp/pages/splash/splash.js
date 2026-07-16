// 启动页
const app = getApp();
Page({
    onLoad() {
        // 已登录则直接进首页
        if (app.globalData.isLoggedIn) {
            wx.switchTab({ url: '/pages/index/index' });
        }
    },
    goToLogin() {
        wx.navigateTo({ url: '/pages/login/login' });
    },
    goToHome() {
        wx.switchTab({ url: '/pages/index/index' });
    }
});
