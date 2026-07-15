const app = getApp();
const request = require('../../utils/request');

Page({
    data: { loginMode: 'code', phone: '', code: '', password: '', countdown: 0 },

    switchTab(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ loginMode: mode });
    },

    onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
    onCodeInput(e) { this.setData({ code: e.detail.value }); },
    onPasswordInput(e) { this.setData({ password: e.detail.value }); },

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

    doLogin() {
        const { loginMode, phone, code, password } = this.data;
        if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return; }

        let params = {};
        if (loginMode === 'password') {
            if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return; }
            params = { phone, password };
        } else {
            if (!code) { wx.showToast({ title: '请输入验证码', icon: 'none' }); return; }
            params = { phone, code };
        }

        wx.showLoading({ title: '登录中...' });
        request.post('/api/user/login', params).then(data => {
            wx.hideLoading();
            wx.setStorageSync('token', data.token);
            app.globalData.currentUser = data;
            app.globalData.isLoggedIn = true;
            wx.showToast({ title: '登录成功！', icon: 'success' });
            setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
        }).catch(() => {
            wx.hideLoading();
        });
    },

    doWechatLogin() {
        wx.login({
            success: (res) => {
                if (!res.code) {
                    wx.showToast({ title: '微信授权失败', icon: 'none' });
                    return;
                }
                wx.showLoading({ title: '登录中...' });
                request.post('/api/user/wx-login', { code: res.code }).then(data => {
                    wx.hideLoading();
                    wx.setStorageSync('token', data.token);
                    app.globalData.currentUser = data;
                    app.globalData.isLoggedIn = true;
                    wx.showToast({ title: '微信登录成功！', icon: 'success' });
                    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
                }).catch(() => {
                    wx.hideLoading();
                });
            },
            fail: () => {
                wx.showToast({ title: '微信登录失败', icon: 'none' });
            }
        });
    },

    goRegister() { wx.navigateTo({ url: '/pages/register/register' }); }
});
