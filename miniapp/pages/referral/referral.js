const app = getApp();

Page({
    data: {
        viewMode: 'list',
        gradeList: [
            { grade: 'A', label: 'A级', desc: '三甲', selected: true },
            { grade: 'B', label: 'B级', desc: '二甲', selected: true },
            { grade: 'C', label: 'C级', desc: '社区', selected: true },
            { grade: 'D', label: 'D级', desc: '康复', selected: true }
        ],
        loading: true,
        errorMsg: '',
        groupedList: [],
        regionGroupList: [],
        hospitalList: [],
        markers: [],
        userLat: 39.9042,
        userLng: 116.4074,
        showPaymentModal: false,
        showListMenu: false,
        currentViewMode: 'normal',
        rankList: [],
        showCityPicker: false,
        selectedCity: '全部',
        filteredCityList: [],
        cityList: ['全部', '北京', '上海', '天津', '广州', '成都', '杭州', '南京', '武汉']
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
        const selectedGrades = this.data.gradeList
            .filter(item => item.selected)
            .map(item => item.grade);
        let params = `latitude=${lat}&longitude=${lng}`;
        if (selectedGrades.length > 0 && selectedGrades.length < 4) {
            params += `&gradeFilter=${selectedGrades.join(',')}`;
        }
        const screening = app.globalData.screening || {};
        const childId = screening.childId || screening.lastChildId;
        if (childId) {
            params += `&childId=${childId}`;
        }
        app.request({
            url: `/api/referral/recommend?${params}`,
            method: 'GET',
            timeout: 10000
        }).then(res => {
            if (res.data && res.data.code === 0) {
                const list = res.data.data || [];
                console.log('机构数据已加载：', list.length, '条');
                this.setData({
                    hospitalList: list,
                    groupedList: this.groupByCity(list),
                    regionGroupList: this.buildRegionGroup(list),
                    rankList: this.buildRankList(list),
                    filteredCityList: this.filterByCity(this.data.selectedCity, list),
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
        const index = e.currentTarget.dataset.index;
        const key = 'gradeList[' + index + '].selected';
        this.setData({
            [key]: !this.data.gradeList[index].selected
        }, () => {
            this.requestRecommend();
        });
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

    handleListBrowse() {
        this.setData({ showListMenu: true });
    },

    closeListMenu() {
        this.setData({ showListMenu: false });
    },

    selectViewMode(e) {
        const type = e.currentTarget.dataset.type;
        const hospitals = this.data.hospitalList || [];
        const updates = { currentViewMode: type, showListMenu: false };

        if (type === 'region' && this.data.regionGroupList.length === 0) {
            updates.regionGroupList = this.buildRegionGroup(hospitals);
        }
        if (type === 'rank') {
            updates.rankList = this.buildRankList(hospitals);
        }
        if (type === 'city') {
            updates.filteredCityList = this.filterByCity(this.data.selectedCity, hospitals);
        }

        this.setData(updates);
        console.log('已切换至视图模式：', type, '| 数据条数：',
            type === 'rank' ? (updates.rankList || []).length :
            type === 'city' ? (updates.filteredCityList || []).length :
            hospitals.length);
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

    buildRegionGroup(list) {
        const grouped = {};
        list.forEach(function(item) {
            const region = item.city || '其他城市';
            if (!grouped[region]) grouped[region] = [];
            grouped[region].push(item);
        });
        return Object.entries(grouped).map(function(entry) {
            return { region: entry[0], list: entry[1] };
        });
    },

    buildRankList(list) {
        if (!list || list.length === 0) return [];
        var sorted = [...list].sort(function(a, b) {
            return (b.totalScore || 0) - (a.totalScore || 0);
        });
        console.log('排行生成完成：共', sorted.length, '条，第1名', sorted[0] && sorted[0].name, sorted[0] && sorted[0].totalScore);
        return sorted;
    },

    filterByCity(city, list) {
        if (!list || list.length === 0) return [];
        if (city === '全部') return list;
        var filtered = list.filter(function(item) {
            return item.city === city;
        });
        console.log('城市过滤：', city, '→ 匹配', filtered.length, '条');
        return filtered;
    },

    // ========== 城市选择器 ==========

    openCityPicker() {
        this.setData({ showCityPicker: true });
    },

    closeCityPicker() {
        this.setData({ showCityPicker: false });
    },

    selectCity(e) {
        var city = e.currentTarget.dataset.city;
        var filtered = this.filterByCity(city, this.data.hospitalList);
        this.setData({
            selectedCity: city,
            showCityPicker: false,
            filteredCityList: filtered
        });
        console.log('已切换至城市：', city, '| 数据条数：', filtered.length);
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

    goToMyAppointments() {
        wx.navigateTo({ url: '/pages/appointment-record/appointment-record' });
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
