const request = require('../../utils/request');

Page({
    data: { list: [], loading: true },

    onShow() {
        this._loadHistory();
    },

    _loadHistory() {
        this.setData({ loading: true });
        request.get('/api/answer/history').then(list => {
            const mapped = (list || []).map(r => ({
                id: r.id,
                childId: r.child_id,
                childName: r.child_name || '未知',
                childAvatar: r.child_avatar || '👶',
                totalScore: r.total_score,
                riskLevel: r.risk_level,
                riskText: r.risk_level === 'low' ? '低风险' : r.risk_level === 'medium' ? '中风险' : '高风险',
                createTime: r.create_time,
                time: (r.create_time || '').slice(0, 16).replace('T', ' ')
            }));
            this.setData({ list: mapped, loading: false });
        }).catch(() => {
            this.setData({ loading: false });
        });
    },

    viewDetail(e) {
        wx.navigateTo({ url: '/pages/result/result?recordId=' + e.currentTarget.dataset.id });
    },

    goScreening() { wx.switchTab({ url: '/pages/screening/screening' }); }
});
