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

    // 微信订阅消息模板ID配置
    // 需在微信公众平台（mp.weixin.qq.com）「功能 → 订阅消息」中申请以下模板后，
    // 将实际模板ID替换下方占位符即可启用推送。
    subscribeTemplateIds: {
        // 未筛查提醒：注册后第7天/30天/60天提醒用户完成首次筛查
        firstScreening: '',   // 示例模板名：筛查提醒  字段：宝宝姓名、提醒内容、提醒时间
        // 高风险就医提醒：高风险筛查结果后提醒就医
        highRiskFollowup: '', // 示例模板名：就诊提醒  字段：宝宝姓名、风险等级、温馨提示
        // 月龄复测提醒：达到下一问卷月龄时提醒复测
        retest: ''            // 示例模板名：复测提醒  字段：宝宝姓名、适用量表、建议时间
    },

    onLaunch() {
        // 从本地存储恢复数据
        this.loadFromStorage();
    },

    /**
     * 请求微信订阅消息授权
     * 注意：wx.requestSubscribeMessage 必须由用户点击行为（tap）触发，
     * 因此请在页面按钮事件中调用此方法，不要在 onLaunch/onShow 中调用。
     *
     * @param {string[]} types 要订阅的消息类型，可选值：'firstScreening' | 'highRiskFollowup' | 'retest'
     *                        不传则订阅全部已配置模板ID的消息类型
     * @returns {Promise<object>} 返回授权结果，{ accepted: string[], rejected: string[] }
     */
    requestSubscribeMessage(types) {
        const allIds = this.subscribeTemplateIds;
        // 筛选已配置模板ID的消息类型
        let ids = [];
        if (types && types.length > 0) {
            ids = types.map(t => allIds[t]).filter(Boolean);
        } else {
            ids = Object.values(allIds).filter(Boolean);
        }
        if (ids.length === 0) {
            console.log('[订阅消息] 尚未配置模板ID，跳过。请在微信公众平台申请后填入 app.js 的 subscribeTemplateIds');
            return Promise.resolve({ accepted: [], rejected: [], skipped: true });
        }
        return new Promise((resolve) => {
            wx.requestSubscribeMessage({
                tmplIds: ids,
                success(res) {
                    // res 格式：{ [tmplId]: 'accept' | 'reject' | 'ban' }
                    const accepted = [];
                    const rejected = [];
                    Object.entries(res).forEach(([id, status]) => {
                        if (status === 'accept') accepted.push(id);
                        else rejected.push(id);
                    });
                    console.log('[订阅消息] 授权结果 - 接受:', accepted.length, '拒绝:', rejected.length);
                    resolve({ accepted, rejected });
                },
                fail(err) {
                    console.log('[订阅消息] 授权失败:', err);
                    resolve({ accepted: [], rejected: [], error: err });
                }
            });
        });
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
