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
        wx.showToast({ title: '验证码已发送（演示模式：123456）', icon: 'none', duration: 2000 });
    },
    doLogin() {
        const { phone, code } = this.data;
        if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return; }
        if (!code) { wx.showToast({ title: '请输入验证码', icon: 'none' }); return; }
        if (code !== '123456') { wx.showToast({ title: '验证码错误（演示验证码：123456）', icon: 'none' }); return; }
        if (!app.globalData.users) app.globalData.users = [];
        let user = app.globalData.users.find(u => u.phone === phone);
        if (!user) { user = { id: 'U' + Date.now(), phone, createTime: new Date().toISOString() }; app.globalData.users.push(user); }
        app.globalData.currentUser = user; app.globalData.isLoggedIn = true; app.saveToStorage();
        wx.showToast({ title: '登录成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    },
    doWechatLogin() {
        const mockUser = { id: 'WX' + Date.now(), phone: '138****8888', nickname: '微信用户', createTime: new Date().toISOString() };
        app.globalData.currentUser = mockUser; app.globalData.isLoggedIn = true; app.saveToStorage();
        wx.showToast({ title: '微信登录成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    },
    goRegister() { wx.navigateTo({ url: '/pages/register/register' }); }
});
