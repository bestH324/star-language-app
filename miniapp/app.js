// 星语 · 孤独症早期支持平台 — 小程序入口
App({
    globalData: {
        isLoggedIn: false,
        isAdminLoggedIn: false,
        currentUser: null,
        children: [],
        screeningHistory: [],
        adminAccounts: [
            { username: 'admin', password: 'admin123' }
        ],
        // 当前筛查状态
        screening: {
            childId: null,
            currentQuestionIndex: 0,
            answers: {},
            totalScore: 0,
            riskLevel: '',
            startTime: null
        }
    },

    onLaunch() {
        // 从本地存储恢复数据
        this.loadFromStorage();
    },

    loadFromStorage() {
        try {
            const users = wx.getStorageSync('as_users');
            const history = wx.getStorageSync('as_history');
            const children = wx.getStorageSync('as_children');
            const currentUser = wx.getStorageSync('as_currentUser');
            const adminLoggedIn = wx.getStorageSync('as_adminLoggedIn');

            if (users) this.globalData.users = users;
            else this.globalData.users = [];
            if (history) this.globalData.screeningHistory = history;
            if (children) this.globalData.children = children;
            if (adminLoggedIn) this.globalData.isAdminLoggedIn = adminLoggedIn;
            if (currentUser) {
                this.globalData.currentUser = currentUser;
                this.globalData.isLoggedIn = true;
            }
        } catch (e) {
            console.warn('数据加载失败', e);
        }
    },

    saveToStorage() {
        try {
            wx.setStorageSync('as_users', this.globalData.users || []);
            wx.setStorageSync('as_history', this.globalData.screeningHistory);
            wx.setStorageSync('as_children', this.globalData.children);
            wx.setStorageSync('as_adminLoggedIn', this.globalData.isAdminLoggedIn);
            if (this.globalData.currentUser) {
                wx.setStorageSync('as_currentUser', this.globalData.currentUser);
            } else {
                wx.removeStorageSync('as_currentUser');
            }
        } catch (e) {
            wx.showToast({ title: '存储空间不足', icon: 'none' });
        }
    }
});
