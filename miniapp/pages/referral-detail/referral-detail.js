const app = getApp();

Page({
    data: {
        id: null,
        hospital: null,
        loading: true,
        showBooking: false,
        childList: [],
        bookingType: '门诊',
        bookingTypes: ['门诊', '线下评估', '康复体验课'],
        bookingTime: '',
        bookingChildIndex: 0
    },

    onLoad(options) {
        const id = options.id;
        this.setData({ id });
        this.loadDetail(id);
        this.loadChildren();
    },

    loadDetail(id) {
        this.setData({ loading: true });
        app.request({
            url: `/api/referral/hospital/${id}`,
            method: 'GET'
        }).then(res => {
            if (res.data && res.data.code === 0) {
                this.setData({ hospital: res.data.data, loading: false });
            } else {
                wx.showToast({ title: '机构不存在', icon: 'none' });
                setTimeout(() => wx.navigateBack(), 1500);
            }
        }).catch(() => {
            wx.showToast({ title: '网络错误', icon: 'none' });
            this.setData({ loading: false });
        });
    },

    loadChildren() {
        if (!app.globalData.isLoggedIn) return;
        app.request({ url: '/api/child/list', method: 'GET' }).then(res => {
            if (res.data && res.data.code === 0) {
                this.setData({ childList: res.data.data || [] });
            }
        }).catch(() => {});
    },

    // ========== 预约弹窗 ==========

    onBook() {
        if (!app.globalData.isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }
        if (!this.data.childList || this.data.childList.length === 0) {
            wx.showToast({ title: '请先添加儿童信息', icon: 'none' });
            return;
        }
        this.setData({ showBooking: true });
    },

    onCloseBooking() {
        this.setData({ showBooking: false });
    },

    onBookingTypeChange(e) {
        this.setData({ bookingType: this.data.bookingTypes[e.detail.value] });
    },

    onBookingTimeChange(e) {
        this.setData({ bookingTime: e.detail.value });
    },

    onChildChange(e) {
        this.setData({ bookingChildIndex: e.detail.value });
    },

    onSubmitBooking() {
        const { bookingTime, bookingChildIndex, bookingType, hospital, childList } = this.data;
        if (!bookingTime) { wx.showToast({ title: '请选择预约时间', icon: 'none' }); return; }
        const child = childList[bookingChildIndex];
        if (!child) { wx.showToast({ title: '请选择儿童', icon: 'none' }); return; }
        app.request({
            url: '/api/referral/appointment',
            method: 'POST',
            data: {
                childId: child.id,
                hospitalId: this.data.id,
                hospitalName: hospital.name,
                type: bookingType,
                appointmentTime: bookingTime
            }
        }).then(res => {
            if (res.data && res.data.code === 0) {
                this.setData({ showBooking: false });
                wx.showToast({ title: '预约提交成功', icon: 'success' });
                setTimeout(() => wx.redirectTo({ url: '/pages/appointment-record/appointment-record' }), 1200);
            } else {
                wx.showToast({ title: res.data?.message || '预约失败', icon: 'none' });
            }
        }).catch(() => {
            wx.showToast({ title: '网络错误，请重试', icon: 'none' });
        });
    },

    onCallPhone() {
        const phone = this.data.hospital?.phone;
        if (phone) wx.makePhoneCall({ phoneNumber: phone.replace(/[-\s]/g, '') });
    },

    onBack() {
        wx.navigateBack();
    }
});
