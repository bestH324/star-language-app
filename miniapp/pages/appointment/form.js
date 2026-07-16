const app = getApp();

Page({
    data: {
        hospitalId: null,
        hospitalName: '',
        bookingTypeIndex: 0,
        bookingTypes: ['门诊', '线下评估', '康复体验课'],
        bookingDate: '',
        contactName: '',
        contactPhone: '',
        submitting: false
    },

    onLoad(options) {
        this.setData({
            hospitalId: options.id || '',
            hospitalName: decodeURIComponent(options.name || '')
        });
    },

    onTypeChange(e) {
        this.setData({ bookingTypeIndex: e.detail.value });
    },

    onDateChange(e) {
        this.setData({ bookingDate: e.detail.value });
    },

    onNameInput(e) {
        this.setData({ contactName: e.detail.value });
    },

    onPhoneInput(e) {
        this.setData({ contactPhone: e.detail.value });
    },

    onSubmit() {
        const { bookingDate, hospitalId, hospitalName, bookingTypeIndex, bookingTypes, submitting } = this.data;
        if (submitting) return;
        if (!bookingDate) { wx.showToast({ title: '请选择预约时间', icon: 'none' }); return; }

        this.setData({ submitting: true });
        wx.showLoading({ title: '提交中...' });

        const bookingType = bookingTypes[bookingTypeIndex];
        const token = wx.getStorageSync('token') || '';

        // 模拟提交
        setTimeout(() => {
            wx.hideLoading();
            this.setData({ submitting: false });
            wx.showToast({ title: '预约提交成功', icon: 'success', duration: 1500 });

            setTimeout(() => {
                wx.redirectTo({ url: '/pages/my/appointments/index' });
            }, 1500);
        }, 800);
    }
});
