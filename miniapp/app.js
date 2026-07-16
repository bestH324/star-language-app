// 星语 · 孤独症早期支持平台 — 小程序入口
App({
    globalData: {
        apiBaseUrl: 'http://192.168.31.8:8081',
        token: null,
        isLoggedIn: false,
        isAdminLoggedIn: false,
        currentUser: null,
        children: [],
        screeningHistory: [],
        adminAccounts: [
            { username: 'admin', password: 'admin123' }
        ],
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
        this.loadFromStorage();
    },

    loadFromStorage() {
        try {
            const users = wx.getStorageSync('as_users');
            const history = wx.getStorageSync('as_history');
            const children = wx.getStorageSync('as_children');
            const currentUser = wx.getStorageSync('as_currentUser');
            const adminLoggedIn = wx.getStorageSync('as_adminLoggedIn');
            const token = wx.getStorageSync('as_token');

            if (users) this.globalData.users = users;
            else this.globalData.users = [];
            if (history) this.globalData.screeningHistory = history;
            if (children) this.globalData.children = children;
            if (adminLoggedIn) this.globalData.isAdminLoggedIn = adminLoggedIn;
            if (token) this.globalData.token = token;
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
            if (this.globalData.token) {
                wx.setStorageSync('as_token', this.globalData.token);
            } else {
                wx.removeStorageSync('as_token');
            }
            if (this.globalData.currentUser) {
                wx.setStorageSync('as_currentUser', this.globalData.currentUser);
            } else {
                wx.removeStorageSync('as_currentUser');
            }
        } catch (e) {
            wx.showToast({ title: '存储空间不足', icon: 'none' });
        }
    },

    /** 带 token 的请求封装 */
    request(options) {
        const app = this;
        const header = options.header || {};
        if (app.globalData.token) {
            header['X-Token'] = app.globalData.token;
        }
        const url = options.url.startsWith('http') ? options.url : app.globalData.apiBaseUrl + options.url;
        return new Promise((resolve, reject) => {
            wx.request({
                ...options,
                url,
                header,
                success(res) {
                    if (res.statusCode === 401) {
                        wx.showToast({ title: '请先登录', icon: 'none' });
                        app.globalData.isLoggedIn = false;
                        app.globalData.token = null;
                        app.saveToStorage();
                        reject(new Error('未登录'));
                        return;
                    }
                    resolve(res);
                },
                fail(err) { reject(err); }
            });
        });
    }
});
