const app = getApp();
Page({
    data: { phone: '', code: '', password: '', confirm: '', agree: false },
    onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
    onCodeInput(e) { this.setData({ code: e.detail.value }); },
    onPwdInput(e) { this.setData({ password: e.detail.value }); },
    onConfirmInput(e) { this.setData({ confirm: e.detail.value }); },
    toggleAgree() { this.setData({ agree: !this.data.agree }); },
    sendCode() {
        if (!this.data.phone || this.data.phone.length !== 11) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return; }
        wx.showToast({ title: '验证码已发送（演示模式：123456）', icon: 'none' });
    },
    doRegister() {
        const { phone, code, password, confirm, agree } = this.data;
        if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return; }
        if (code !== '123456') { wx.showToast({ title: '验证码错误（演示验证码：123456）', icon: 'none' }); return; }
        if (!password || password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
        if (password !== confirm) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
        if (!agree) { wx.showToast({ title: '请先同意服务协议', icon: 'none' }); return; }
        if (!app.globalData.users) app.globalData.users = [];
        if (app.globalData.users.find(u => u.phone === phone)) { wx.showToast({ title: '该手机号已注册', icon: 'none' }); return; }
        const user = { id: 'U' + Date.now(), phone, password, createTime: new Date().toISOString() };
        app.globalData.users.push(user); app.globalData.currentUser = user; app.globalData.isLoggedIn = true; app.saveToStorage();
        wx.showToast({ title: '注册成功！', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    },
    goLogin() { wx.navigateBack(); }
});
