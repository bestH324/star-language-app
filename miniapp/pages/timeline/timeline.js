const request = require('../../utils/request');

Page({
    data: {
        events: [],
        loading: true
    },

    onShow() {
        this._loadTimeline();
    },

    _loadTimeline() {
        this.setData({ loading: true });
        request.get('/api/user/timeline').then(events => {
            const mapped = (events || []).map(e => {
                // 按类型映射图标
                let iconEmoji = '●';
                switch (e.type) {
                    case 'register':        iconEmoji = '🌟'; break;
                    case 'first_screening': iconEmoji = '✅'; break;
                    case 'screening':       iconEmoji = '🔍'; break;
                    case 'referral':        iconEmoji = '🏥'; break;
                    case 'retest':          iconEmoji = '🔄'; break;
                }

                // 格式化日期
                let dateDisplay = '';
                if (e.date) {
                    const d = String(e.date);
                    if (d.length >= 10) dateDisplay = d.substring(0, 10);
                    else dateDisplay = d;
                }

                // 按类型映射圆点颜色类
                let dotClass = 'dot-default';
                switch (e.type) {
                    case 'register':        dotClass = 'dot-primary'; break;
                    case 'first_screening': dotClass = 'dot-success'; break;
                    case 'screening':       dotClass = 'dot-info';    break;
                    case 'referral':        dotClass = 'dot-warning'; break;
                    case 'retest':          dotClass = 'dot-accent';  break;
                }

                // 风险等级颜色
                let riskColor = '#27AE60';
                if (e.riskLevel === 'high') riskColor = '#E74C3C';
                else if (e.riskLevel === 'medium') riskColor = '#F39C12';

                return {
                    ...e,
                    iconEmoji,
                    dateDisplay,
                    dotClass,
                    riskColor
                };
            });

            this.setData({ events: mapped, loading: false });
        }).catch(() => {
            this.setData({ loading: false });
            wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
        });
    }
});
