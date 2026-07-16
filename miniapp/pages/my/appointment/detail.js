const app = getApp();

Page({
    data: {
        id: null,
        detail: null,
        loading: true
    },

    onLoad(options) {
        const id = options.id;
        this.setData({ id });
        this.loadDetail(id);
    },

    loadDetail(id) {
        this.setData({ loading: true });
        app.request({
            url: '/api/referral/appointments',
            method: 'GET'
        }).then(res => {
            if (res.data && res.data.code === 0) {
                const list = res.data.data || [];
                const detail = list.find(item => String(item.id) === String(id)) || list[0] || null;
                this.setData({ detail, loading: false });
            } else {
                this.loadFallback(id);
            }
        }).catch(() => {
            this.loadFallback(id);
        });
    },

    loadFallback(id) {
        // 模拟数据兜底
        const mockList = [
            { id: 1, hospital_name: '北京大学第六医院', child_name: '小明', type: '门诊', appointment_time: '2026-07-20', status: '已确认' },
            { id: 2, hospital_name: '天津市安定医院', child_name: '小红', type: '线下评估', appointment_time: '2026-07-22', status: '待确认' }
        ];
        const detail = mockList.find(item => String(item.id) === String(id)) || null;
        this.setData({ detail, loading: false });
    },

    handleBack() {
        wx.navigateBack();
    }
});
