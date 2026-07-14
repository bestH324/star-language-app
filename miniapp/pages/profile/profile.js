const app = getApp();

Page({
    data: { isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' },
    onShow() {
        const g = app.globalData;
        if (g.isLoggedIn && g.currentUser) {
            this.setData({
                isLoggedIn: true, avatar: '👤',
                nickname: g.currentUser.nickname || '用户' + g.currentUser.phone.slice(-4),
                phoneText: g.currentUser.phone
            });
        } else {
            this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
        }
    },
    handleProfileClick() {
        if (!this.data.isLoggedIn) wx.navigateTo({ url: '/pages/login/login' });
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
                    app.globalData.isLoggedIn = false;
                    app.globalData.currentUser = null;
                    app.globalData.children = [];
                    app.saveToStorage();
                    this.setData({ isLoggedIn: false, avatar: '👤', nickname: '未登录', phoneText: '点击登录' });
                }
            }
        });
    }
});
