const app = getApp();
Page({
    data: { phone: '', code: '', countdown: 0 },
    onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
    onCodeInput(e) { this.setData({ code: e.detail.value }); },
    sendCode() {
        const phone = this.data.phone.trim();
        if (!phone || phone.length !== 11 || !/^1\d{10}$/.test(phone)) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return; }
        this.setData({ countdown: 60 });
        const timer = setInterval(() => { const c = this.data.countdown - 1; this.setData({ countdown: c }); if (c <= 0) clearInterval(timer); }, 1000);
        wx.request({ url: app.globalData.apiBaseUrl + '/api/user/send-code', method: 'POST', data: { phone } });
        wx.showToast({ title: '验证码已发送（演示模式：123456）', icon: 'none', duration: 2000 });
    },
    doLogin() {
        const { phone, code } = this.data;
        if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return; }
        if (!code) { wx.showToast({ title: '请输入验证码', icon: 'none' }); return; }
        wx.request({
            url: app.globalData.apiBaseUrl + '/api/user/login',
            method: 'POST',
            data: { phone, code },
            success: (res) => {
                if (res.data && res.data.code === 0) {
                    const resp = res.data.data;
                    app.globalData.token = resp.token;
                    app.globalData.currentUser = resp;
                    app.globalData.isLoggedIn = true;
                    app.globalData.users = app.globalData.users || [];
                    const exists = app.globalData.users.find(u => u.phone === phone);
                    if (!exists) app.globalData.users.push({ id: resp.userId || resp.id, phone, createTime: new Date().toISOString() });
                    app.saveToStorage();
                    wx.showToast({ title: '登录成功！', icon: 'success' });
                    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
                } else {
                    // 演示模式兜底
                    if (code === '123456') {
                        this.demoLogin(phone);
                    } else {
                        wx.showToast({ title: res.data?.message || '验证码错误', icon: 'none' });
                    }
                }
            },
            fail: () => {
                if (code === '123456') {
                    this.demoLogin(phone);
                } else {
                    wx.showToast({ title: '网络错误（演示验证码：123456）', icon: 'none' });
                }
            }
        });
    },
    demoLogin(phone) {
        if (!app.globalData.users) app.globalData.users = [];
        let user = app.globalData.users.find(u => u.phone === phone);
        if (!user) { user = { id: 'U' + Date.now(), phone, createTime: new Date().toISOString() }; app.globalData.users.push(user); }
        app.globalData.currentUser = user;
        app.globalData.isLoggedIn = true;
        // 本地模拟 token
        app.globalData.token = 'demo-token-' + Date.now();
        app.saveToStorage();
        wx.showToast({ title: '登录成功（演示模式）！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    },
    doWechatLogin() {
        const mockUser = { id: 'WX' + Date.now(), phone: '138****8888', nickname: '微信用户', createTime: new Date().toISOString() };
        app.globalData.currentUser = mockUser;
        app.globalData.isLoggedIn = true;
        app.globalData.token = 'wx-demo-token-' + Date.now();
        app.saveToStorage();
        wx.showToast({ title: '微信登录成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    },
    goRegister() { wx.navigateTo({ url: '/pages/register/register' }); }
});
