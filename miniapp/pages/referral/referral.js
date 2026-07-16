const app = getApp();

Page({
    data: {
        viewMode: 'list',
        selectedGrades: ['A', 'B', 'C', 'D'],
        loading: true,
        errorMsg: '',
        groupedList: [],
        hospitalList: [],
        markers: [],
        userLat: 39.9042,
        userLng: 116.4074,
        showPaymentModal: false
    },

    onLoad() {
        this.fetchData();
    },

    // ========== 定位 + 数据获取 ==========

    fetchData() {
        this.setData({ loading: true, errorMsg: '' });
        wx.getLocation({
            type: 'wgs84',
            success: (res) => {
                this.setData({ userLat: res.latitude, userLng: res.longitude });
                this.requestRecommend(res.latitude, res.longitude);
            },
            fail: () => {
                this.setData({ userLat: 39.9042, userLng: 116.4074 });
                this.requestRecommend(39.9042, 116.4074);
            }
        });
    },

    requestRecommend(lat, lng) {
        if (lat == null) lat = this.data.userLat;
        if (lng == null) lng = this.data.userLng;
        const { selectedGrades } = this.data;
        let params = `latitude=${lat}&longitude=${lng}`;
        // 全选(4个) 或 全取消(0个) 时不传 gradeFilter，请求全部
        if (selectedGrades.length > 0 && selectedGrades.length < 4) {
            params += `&gradeFilter=${selectedGrades.join(',')}`;
        }
        app.request({
            url: `/api/referral/recommend?${params}`,
            method: 'GET',
            timeout: 10000
        }).then(res => {
            if (res.data && res.data.code === 0) {
                const list = res.data.data || [];
                this.setData({
                    hospitalList: list,
                    groupedList: this.groupByCity(list),
                    markers: this.buildMarkers(list),
                    loading: false
                });
            } else {
                this.setData({ errorMsg: res.data?.message || '服务异常', loading: false });
            }
        }).catch(() => {
            this.setData({ errorMsg: '网络请求失败', loading: false });
        });
    },

    onRelocate() {
        this.fetchData();
    },

    onRetry() {
        this.fetchData();
    },

    // ========== 多选标签筛选 ==========

    onGradeTap(e) {
        const grade = e.currentTarget.dataset.grade;
        if (!grade) {
            console.error('❌ 严重错误：点击标签未获取到 data-grade，请检查 WXML 中的 data-grade 属性！');
            return;
        }

        let current = this.data.selectedGrades;
        let index = current.indexOf(grade);
        let newGrades = [];

        if (index !== -1) {
            newGrades = current.filter(item => item !== grade);
            console.log('✅ 取消选中:', grade, '当前数组变为:', newGrades);
        } else {
            newGrades = [...current, grade];
            console.log('✅ 选中:', grade, '当前数组变为:', newGrades);
        }

        this.setData({ selectedGrades: newGrades }, () => {
            this.requestRecommend();
        });
        this.setData({ _forceRender: Date.now() });
    },

    // ========== 视图切换 ==========

    onToggleView() {
        const next = this.data.viewMode === 'list' ? 'map' : 'list';
        this.setData({ viewMode: next });
    },

    onToggleViewFromGrid(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ viewMode: mode || 'list' });
    },

    // ========== 列表操作 ==========

    groupByCity(list) {
        const grouped = {};
        list.forEach(function(item) {
            const city = item.city || '其他城市';
            if (!grouped[city]) grouped[city] = [];
            grouped[city].push(item);
        });
        return Object.entries(grouped).map(function(entry) {
            return { city: entry[0], institutions: entry[1] };
        });
    },

    buildMarkers(list) {
        const self = this;
        return list.map(function(h) {
            return {
                id: h.id,
                latitude: h.lat || self.data.userLat,
                longitude: h.lng || self.data.userLng,
                title: h.name,
                callout: { content: h.name + '\n' + h.gradeLabel + '\n距离' + h.distance + 'km', display: 'BYCLICK' },
                iconPath: '/assets/icons/marker.png',
                width: 30, height: 30
            };
        });
    },

    onCardTap(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/referral-detail/referral-detail?id=' + id });
    },

    onCallPhone(e) {
        const phone = e.currentTarget.dataset.phone;
        if (phone) wx.makePhoneCall({ phoneNumber: phone.replace(/[-\s]/g, '') });
    },

    // ========== 底部功能矩阵 ==========

    onSmartMatch() {
        wx.showToast({ title: '已为您智能匹配最佳机构', icon: 'success' });
        this.fetchData();
    },

    onOneClickAppointment() {
        wx.showToast({ title: '请选择机构后预约', icon: 'none' });
    },

    onExpertVideo() {
        this.setData({ showPaymentModal: true });
    },

    onClosePaymentModal() {
        this.setData({ showPaymentModal: false });
    },

    onConfirmPayment() {
        this.setData({ showPaymentModal: false });
        app.request({
            url: '/api/referral/payment/create',
            method: 'POST',
            data: {}
        }).then(function(res) {
            if (res.data && res.data.code === 0) {
                wx.showToast({ title: '支付成功！专家将尽快联系您', icon: 'success', duration: 2000 });
            } else {
                wx.showToast({ title: '支付失败，请重试', icon: 'none' });
            }
        }).catch(function() {
            wx.showToast({ title: '模拟支付成功！专家将尽快联系您', icon: 'success', duration: 2000 });
        });
    }
});
