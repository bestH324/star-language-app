const request = require('../../utils/request');

Page({
    data: { isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' },

    onShow() {
        const token = wx.getStorageSync('token');
        if (!token) {
            this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
            return;
        }
        request.get('/api/user/profile').then(user => {
            this.setData({
                isLoggedIn: true,
                avatar: user.avatar || '👤',
                nickname: user.nickname || '用户' + (user.phone || '').slice(-4),
                phoneText: user.phone || ''
            });
        }).catch(() => {
            wx.removeStorageSync('token');
            this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
        });
    },

    handleProfileClick() {
        if (!this.data.isLoggedIn) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        wx.showModal({
            title: '修改昵称',
            editable: true,
            placeholderText: '请输入新昵称',
            content: this.data.nickname,
            success: (res) => {
                if (res.confirm && res.content) {
                    const newNickname = res.content.trim();
                    if (newNickname && newNickname !== this.data.nickname) {
                        this._updateNickname(newNickname);
                    }
                }
            }
        });
    },

    _updateNickname(nickname) {
        wx.showLoading({ title: '保存中...' });
        request.post('/api/user/profile', { nickname }).then(user => {
            wx.hideLoading();
            this.setData({
                nickname: user.nickname || nickname,
                avatar: user.avatar || this.data.avatar
            });
            wx.showToast({ title: '修改成功', icon: 'success' });
        }).catch(() => {
            wx.hideLoading();
        });
    },

    goChildManage() {
        if (!this.data.isLoggedIn) { wx.navigateTo({ url: '/pages/login/login' }); return; }
        wx.navigateTo({ url: '/pages/child-manage/child-manage' });
    },

    goHistory() {
        if (!this.data.isLoggedIn) { wx.navigateTo({ url: '/pages/login/login' }); return; }
        wx.navigateTo({ url: '/pages/history/history' });
    },

    goAbout() { wx.navigateTo({ url: '/pages/about/about' }); },

    showPrivacy() {
        wx.showModal({
            title: '隐私政策',
            content: '本平台重视您的隐私保护：\n1. 信息收集：我们仅收集为提供筛查服务所必需的信息。\n2. 信息使用：收集的信息仅用于提供筛查评估和生成报告。\n3. 信息共享：未经您的明确同意，我们不会将您的信息分享给第三方。',
            showCancel: false, confirmText: '我知道了', confirmColor: '#6B1D5E'
        });
    },

    doLogout() {
        wx.showModal({
            title: '退出登录',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    request.post('/api/user/logout').catch(() => {});
                    wx.removeStorageSync('token');
                    this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
                }
            }
        });
    }
});
