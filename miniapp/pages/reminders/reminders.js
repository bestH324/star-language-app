const request = require('../../utils/request');

Page({
    data: {
        reminders: [],
        loading: true
    },

    onShow() {
        this._fetch();
    },

    _fetch() {
        this.setData({ loading: true });
        request.get('/api/user/reminders').then(data => {
            const list = (data || []).map(r => ({
                id: r.id,
                type: r.reminder_type,
                reason: r.trigger_reason || '',
                scheduledDays: r.scheduled_days,
                status: r.status,
                sentAt: r.sent_at ? r.sent_at.slice(0, 16).replace('T', ' ') : '',
                createTime: r.create_time ? r.create_time.slice(0, 16).replace('T', ' ') : '',
                childName: r.child_name || '宝宝',
                childAvatar: r.child_avatar || '👶',
                icon: this._typeIcon(r.reminder_type),
                title: this._typeTitle(r.reminder_type),
                statusText: r.status === 'sent' ? '已推送' : r.status === 'pending' ? '待推送' : r.status
            }));
            this.setData({ reminders: list, loading: false });
        }).catch(() => {
            this.setData({ loading: false });
        });
    },

    _typeIcon(type) {
        const icons = {
            'first_screening': '🔔',
            'high_risk_followup': '⚠️',
            'retest': '📋'
        };
        return icons[type] || '💬';
    },

    _typeTitle(type) {
        const titles = {
            'first_screening': '筛查提醒',
            'high_risk_followup': '就医提醒',
            'retest': '复测提醒'
        };
        return titles[type] || '消息提醒';
    }
});
