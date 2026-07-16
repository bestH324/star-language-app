const app = getApp();
Page({
    data: { username: '', password: '' },
    onU(e) { this.setData({ username: e.detail.value }); },
    onP(e) { this.setData({ password: e.detail.value }); },
    async doLogin() {
        const { username, password } = this.data;
        if (!username || !password) {
            wx.showToast({ title: '请输入账号和密码', icon: 'none' });
            return;
        }
        try {
            const res = await app.request({
                url: '/api/admin/login',
                method: 'POST',
                data: { username, password }
            });
            if (res.data.code === 0) {
                wx.setStorageSync('token', res.data.data.token);
                app.globalData.isAdminLoggedIn = true;
                app.saveToStorage();
                wx.showToast({ title: '登录成功', icon: 'success' });
                setTimeout(() => wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' }), 500);
            } else {
                wx.showToast({ title: res.data.message || '登录失败', icon: 'none' });
            }
        } catch (e) {
            wx.showToast({ title: '网络错误，请检查后端是否启动', icon: 'none', duration: 2500 });
        }
    }
});
