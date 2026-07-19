const request = require('../../utils/request');

Page({
    data: {
        record: null,
        riskIcon: '',
        riskLevelClass: '',
        recommendations: [],
        createTime: '',
        keyMissCount: 0,
        keyCount: 0,
        riskThreshold: 0,
        loading: true
    },

    onLoad(options) {
        const recordId = options.recordId;
        if (!recordId) {
            wx.showToast({ title: '参数错误', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '加载报告...' });
        request.get('/api/answer/report/' + recordId).then(data => {
            wx.hideLoading();
            const icons = { low: '✅', medium: '⚠️', high: '🔴' };
            const child = data.child || {};
            const keyMissCount = data.keyMissCount || 0;
            const keyCount = data.keyCount || 0;
            const riskThreshold = data.riskThreshold || 3;

            this.setData({
                record: {
                    ...data,
                    childName: child.name || '未知',
                    childAvatar: child.avatar || '👶',
                    answerCount: (data.answers || []).length
                },
                riskIcon: icons[data.riskLevel] || '❓',
                riskLevelClass: data.riskLevel || 'low',
                recommendations: data.recommendations || [],
                createTime: (data.createTime || '').slice(0, 16).replace('T', ' '),
                keyMissCount,
                keyCount,
                riskThreshold,
                loading: false
            });
        }).catch(() => {
            wx.hideLoading();
            this.setData({ loading: false });
        });
    },

    goHistory() { wx.navigateTo({ url: '/pages/history/history' }); },
    goReferral() { wx.switchTab({ url: '/pages/referral/referral' }); }
});
