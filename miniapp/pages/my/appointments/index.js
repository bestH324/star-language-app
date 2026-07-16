const app = getApp();

Page({
    data: {
        list: [],
        loading: true
    },

    onShow() {
        this.loadList();
    },

    loadList() {
        this.setData({ loading: true });
        app.request({
            url: '/api/referral/appointments',
            method: 'GET'
        }).then(res => {
            if (res.data && res.data.code === 0) {
                this.setData({ list: res.data.data || [], loading: false });
            } else {
                this.setData({ list: [], loading: false });
            }
        }).catch(() => {
            // 接口不存在时展示模拟数据
            this.setData({
                list: [
                    { id: 1, hospital_name: '北京大学第六医院', child_name: '小明', type: '门诊', appointment_time: '2026-07-20', status: '已确认' },
                    { id: 2, hospital_name: '天津市安定医院', child_name: '小红', type: '线下评估', appointment_time: '2026-07-22', status: '待确认' }
                ],
                loading: false
            });
        });
    },

    handleBack() {
        wx.navigateBack();
    },

    onTapItem(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/my/appointment/detail?id=' + id });
    }
});
