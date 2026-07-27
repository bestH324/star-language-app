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

    goReminders() {
        if (!this.data.isLoggedIn) { wx.navigateTo({ url: '/pages/login/login' }); return; }
        wx.navigateTo({ url: '/pages/reminders/reminders' });
    },

    goTimeline() {
        if (!this.data.isLoggedIn) { wx.navigateTo({ url: '/pages/login/login' }); return; }
        wx.navigateTo({ url: '/pages/timeline/timeline' });
    },

    goAbout() { wx.navigateTo({ url: '/pages/about/about' }); },

    showPrivacy() {
        wx.navigateTo({ url: '/pages/privacy-agreement/privacy-agreement?readonly=1' });
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
    },

    doDeleteAccount() {
        wx.showModal({
            title: '⚠️ 注销账号',
            content: '此操作不可撤销！\n\n注销后将永久删除：\n• 您的账号\n• 所有宝宝档案\n• 全部筛查记录\n• 所有关联数据\n\n确定要继续吗？',
            confirmText: '确认注销',
            cancelText: '我再想想',
            confirmColor: '#D32F2F',
            success: (res) => {
                if (res.confirm) {
                    this._executeDeleteAccount();
                }
            }
        });
    },

    _executeDeleteAccount() {
        wx.showLoading({ title: '注销中...' });
        request.del('/api/user/account').then(() => {
            wx.hideLoading();
            wx.removeStorageSync('token');
            this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
            wx.showToast({ title: '账号已注销', icon: 'success' });
            setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
        }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '注销失败，请重试', icon: 'none' });
        });
    }
});
