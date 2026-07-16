const app = getApp();

Page({
    data: {
        id: null,
        hospital: null,
        loading: true,
        showBooking: false,
        childList: [],
        bookingType: '门诊',
        bookingTypeIndex: 0,
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
        // 从后端 API 获取儿童列表
        app.request({ url: '/api/child/list', method: 'GET' }).then(res => {
            if (res.data && res.data.code === 0) {
                const apiList = res.data.data || [];
                this.setData({ childList: apiList });
                return;
            }
            this.loadLocalFallback();
        }).catch(() => {
            this.loadLocalFallback();
        });
    },

    loadLocalFallback() {
        // 后端无数据时，从本地存储兜底
        const localChildren = wx.getStorageSync('as_children') || [];
        const globalChildren = app.globalData.children || [];
        const merged = localChildren.length > 0 ? localChildren : globalChildren;
        this.setData({ childList: merged });
    },

    // ========== 预约弹窗 ==========

    onBook() {
        const token = wx.getStorageSync('token');
        if (!token && !app.globalData.isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        // 双重保险：先检查页面 childList，再检查全局+本地存储
        let children = this.data.childList || [];
        if (children.length === 0) {
            children = app.globalData.children || [];
        }
        if (children.length === 0) {
            children = wx.getStorageSync('as_children') || [];
        }

        if (children.length === 0) {
            wx.showToast({ title: '请先添加儿童信息', icon: 'none' });
            return;
        }

        // 确保 childList 已同步到页面数据
        if (!this.data.childList || this.data.childList.length === 0) {
            this.setData({ childList: children });
        }

        this.setData({ showBooking: true });
    },

    onCloseBooking() {
        this.setData({ showBooking: false });
    },

    preventClose() {
        // 阻止事件冒泡到遮罩层，不做任何操作
    },

    onBookingTypeChange(e) {
        const idx = parseInt(e.detail.value);
        this.setData({
            bookingTypeIndex: idx,
            bookingType: this.data.bookingTypes[idx]
        });
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
                setTimeout(() => wx.redirectTo({ url: '/pages/my/appointments/index' }), 1200);
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
