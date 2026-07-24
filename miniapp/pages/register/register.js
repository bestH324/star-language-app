const app = getApp();
const request = require('../../utils/request');

Page({
    data: { phone: '', code: '', password: '', confirm: '', agree: false, countdown: 0 },

    onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
    onCodeInput(e) { this.setData({ code: e.detail.value }); },
    onPwdInput(e) { this.setData({ password: e.detail.value }); },
    onConfirmInput(e) { this.setData({ confirm: e.detail.value }); },
    toggleAgree() { this.setData({ agree: !this.data.agree }); },

    sendCode() {
        const phone = this.data.phone.trim();
        if (!phone || phone.length !== 11 || !/^1\d{10}$/.test(phone)) {
            wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
            return;
        }
        request.post('/api/user/send-code', { phone }).then(data => {
            this.setData({ countdown: 60 });
            const timer = setInterval(() => {
                const c = this.data.countdown - 1;
                this.setData({ countdown: c });
                if (c <= 0) clearInterval(timer);
            }, 1000);
            wx.showToast({ title: '验证码已发送（演示：' + data.demoCode + '）', icon: 'none', duration: 2000 });
        }).catch(() => {});
    },

    doRegister() {
        const { phone, code, password, confirm, agree } = this.data;
        if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return; }
        if (!code) { wx.showToast({ title: '请输入验证码', icon: 'none' }); return; }
        if (!password || password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
        if (password !== confirm) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
        if (!agree) { wx.showToast({ title: '请先同意服务协议', icon: 'none' }); return; }

        wx.showLoading({ title: '注册中...' });
        request.post('/api/user/register', {
            phone,
            code,
            password,
            passwordConfirm: confirm
        }).then(data => {
            wx.hideLoading();
            wx.setStorageSync('token', data.token);
            app.globalData.currentUser = data;
            app.globalData.isLoggedIn = true;
            wx.showToast({ title: '注册成功！', icon: 'success' });
            setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
        }).catch(() => {
            wx.hideLoading();
        });
    },

    goLogin() { wx.navigateBack(); },

    showServiceAgreement() {
        wx.navigateTo({ url: '/pages/privacy-agreement/privacy-agreement?readonly=1' });
    },

    showPrivacyPolicy() {
        wx.navigateTo({ url: '/pages/privacy-agreement/privacy-agreement?readonly=1' });
    }
});
