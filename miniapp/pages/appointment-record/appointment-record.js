const app = getApp();

Page({
    data: {
        records: [],
        loading: true
    },

    onShow() {
        this.loadRecords();
    },

    loadRecords() {
        if (!app.globalData.isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            this.setData({ loading: false });
            return;
        }
        this.setData({ loading: true });
        app.request({
            url: '/api/referral/appointments',
            method: 'GET'
        }).then(res => {
            if (res.data && res.data.code === 0) {
                this.setData({ records: res.data.data || [], loading: false });
            } else {
                this.setData({ loading: false });
            }
        }).catch(() => {
            this.setData({ loading: false });
            wx.showToast({ title: '网络错误', icon: 'none' });
        });
    },

    getStatusClass(status) {
        const map = { '待确认': 's-pending', '已确认': 's-confirmed', '已取消': 's-cancelled', '已完成': 's-done' };
        return map[status] || 's-pending';
    }
});
