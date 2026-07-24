var request = require('../../utils/request');

Page({
    data: {
        events: [],
        empty: false,
        loading: true
    },

    onShow: function () {
        this._loadTimeline();
    },

    _loadTimeline: function () {
        var self = this;
        self.setData({ loading: true });
        request.get('/api/user/timeline').then(function (events) {
            events = events || [];
            var list = [];
            var prevDate = '';

            for (var i = 0; i < events.length; i++) {
                var e = events[i];

                var iconEmoji = '●';
                if (e.type === 'register') iconEmoji = '🌟';
                else if (e.type === 'first_screening') iconEmoji = '✅';
                else if (e.type === 'screening') iconEmoji = '🔍';
                else if (e.type === 'referral') iconEmoji = '🏥';
                else if (e.type === 'retest') iconEmoji = '🔄';
                else if (e.type === 'missed_questionnaire') iconEmoji = '⏭';

                var dotClass = 'dot-default';
                if (e.type === 'register') dotClass = 'dot-primary';
                else if (e.type === 'first_screening') dotClass = 'dot-success';
                else if (e.type === 'screening') dotClass = 'dot-info';
                else if (e.type === 'referral') dotClass = 'dot-warning';
                else if (e.type === 'retest') dotClass = 'dot-accent';
                else if (e.type === 'missed_questionnaire') dotClass = 'dot-danger';

                var dateDisplay = '';
                if (e.date) {
                    dateDisplay = String(e.date).substring(0, 10);
                }

                var showDateLabel = (dateDisplay !== '' && dateDisplay !== prevDate);
                prevDate = dateDisplay;

                var showLine = (i < events.length - 1);
                var isMissed = (e.type === 'missed_questionnaire');

                list.push({
                    _id: i,
                    type: e.type,
                    title: e.title || '',
                    description: e.description || '',
                    iconEmoji: iconEmoji,
                    dotClass: dotClass,
                    dateDisplay: dateDisplay,
                    showDateLabel: showDateLabel,
                    showLine: showLine,
                    isMissed: isMissed
                });
            }

            self.setData({ events: list, empty: list.length === 0, loading: false });
        }).catch(function () {
            self.setData({ loading: false, empty: true });
            wx.showToast({ title: '加载失败', icon: 'none' });
        });
    }
});
