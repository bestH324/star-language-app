const app = getApp();
Page({
    data: { username: '', password: '' },
    onU(e) { this.setData({ username: e.detail.value }); },
    onP(e) { this.setData({ password: e.detail.value }); },
    doLogin() {
        const { username, password } = this.data;
        const admins = app.globalData.adminAccounts || [{ username: 'admin', password: 'admin123' }];
        if (admins.find(a => a.username === username && a.password === password)) {
            app.globalData.isAdminLoggedIn = true; app.saveToStorage();
            wx.showToast({ title: '管理员登录成功', icon: 'success' });
            setTimeout(() => wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' }), 500);
        } else {
            wx.showToast({ title: '账号或密码错误（演示：admin/admin123）', icon: 'none', duration: 2500 });
        }
    }
});
