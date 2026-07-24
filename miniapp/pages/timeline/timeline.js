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
            const list = (events || []).map(function (e, index, arr) {
                // 类型 -> 图标
                var iconEmoji = '●';
                switch (e.type) {
                    case 'register':              iconEmoji = '🌟'; break;
                    case 'first_screening':       iconEmoji = '✅'; break;
                    case 'screening':             iconEmoji = '🔍'; break;
                    case 'referral':              iconEmoji = '🏥'; break;
                    case 'retest':                iconEmoji = '🔄'; break;
                    case 'missed_questionnaire':  iconEmoji = '⏭️'; break;
                }

                // 类型 -> 圆点颜色类
                var dotClass = 'dot-default';
                switch (e.type) {
                    case 'register':              dotClass = 'dot-primary'; break;
                    case 'first_screening':       dotClass = 'dot-success'; break;
                    case 'screening':             dotClass = 'dot-info';    break;
                    case 'referral':              dotClass = 'dot-warning'; break;
                    case 'retest':                dotClass = 'dot-accent';  break;
                    case 'missed_questionnaire':  dotClass = 'dot-danger';  break;
                }

                // 风险颜色
                var riskColor = '#27AE60';
                if (e.riskLevel === 'high') riskColor = '#E74C3C';
                else if (e.riskLevel === 'medium') riskColor = '#F39C12';

                // 日期格式化
                var dateDisplay = '';
                if (e.date) {
                    var ds = String(e.date);
                    dateDisplay = ds.length >= 10 ? ds.substring(0, 10) : ds;
                }

                // 日期标签是否显示（第一个事件 或 与前一个事件的日期不同）
                var showDateLabel = index === 0;
                if (!showDateLabel && index > 0) {
                    showDateLabel = dateDisplay !== arr[index - 1].dateDisplay;
                }

                // 状态文本（避免 WXML 嵌套三元）
                var statusText = '';
                if (e.status) {
                    if (e.status === 'sent') statusText = '已推送';
                    else if (e.status === 'pending') statusText = '待推送';
                    else statusText = e.status;
                }

                // 状态样式类
                var statusClass = '';
                if (e.status === 'sent' || e.status === 'confirmed') {
                    statusClass = 'status-ok';
                } else if (e.status) {
                    statusClass = 'status-pending';
                }

                // 是否有得分（避免 WXML !== undefined）
                var hasScore = (e.totalScore !== null && e.totalScore !== undefined);

                // 是否为最后一项（控制连接线显示）
                var isLast = index >= arr.length - 1;

                return {
                    type: e.type,
                    title: e.title || '',
                    description: e.description || '',
                    iconEmoji: iconEmoji,
                    dotClass: dotClass,
                    riskColor: riskColor,
                    dateDisplay: dateDisplay,
                    showDateLabel: showDateLabel,
                    statusText: statusText,
                    statusClass: statusClass,
                    hasScore: hasScore,
                    totalScore: e.totalScore,
                    riskText: e.riskText || '',
                    riskLevel: e.riskLevel || '',
                    hospitalName: e.hospitalName || '',
                    appointmentTime: e.appointmentTime || '',
                    isLast: isLast
                };
            });

            this.setData({ events: list, loading: false });
        }).catch(function () {
            this.setData({ loading: false });
            wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
        }.bind(this));
    }
});
