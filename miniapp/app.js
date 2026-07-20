// 星语 · 孤独症早期支持平台 — 小程序入口
App({
    globalData: {
        baseUrl: 'http://localhost:8081',
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
    },

    request(config) {
        const self = this;
        return new Promise((resolve, reject) => {
            const token = wx.getStorageSync('token') || '';
            wx.request({
                url: self.globalData.baseUrl + config.url,
                method: config.method || 'GET',
                data: config.data,
                timeout: config.timeout || 10000,
                header: {
                    'Content-Type': 'application/json',
                    'X-Token': token
                },
                success(res) { resolve(res); },
                fail(err) { reject(err); }
            });
        });
    },

    /** 下载文件（带鉴权），返回临时文件路径 */
    downloadFile(url) {
        const self = this;
        return new Promise((resolve, reject) => {
            const token = wx.getStorageSync('token') || '';
            wx.downloadFile({
                url: self.globalData.baseUrl + url,
                header: { 'X-Token': token },
                success(res) {
                    if (res.statusCode === 200) {
                        resolve(res.tempFilePath);
                    } else if (res.statusCode === 401) {
                        wx.removeStorageSync('token');
                        wx.showToast({ title: '登录已过期', icon: 'none' });
                        reject(new Error('unauthorized'));
                    } else {
                        wx.showToast({ title: '文件下载失败(' + res.statusCode + ')', icon: 'none' });
                        reject(new Error('download failed'));
                    }
                },
                fail(err) {
                    wx.showToast({ title: '网络异常，请检查连接', icon: 'none' });
                    reject(err);
                }
            });
        });
    }
});
