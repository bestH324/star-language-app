const app = getApp();
const request = require('../../utils/request');
const ageUtils = require('../../utils/age');

Page({
    data: {
        list: [], showForm: false, editingId: null, today: '',
        avatars: ['👶', '👦', '👧', '🧒', '🐻', '🐰'],
        form: { name: '', gender: '', birth: '', avatar: '👶', isPremature: false, prematureWeeks: '', city: '' },
        caregiver: { name: '', gender: '', age: '', relationship: '', is_single_parent: '', education: '', income: '' },
        relationOptions: ['母亲', '父亲', '其他'],
        educationOptions: ['初中及以下', '高中/中专', '大专', '本科', '研究生及以上'],
        incomeOptions: ['＜5000元', '5000–9999元', '10000–19999元', '20000–29999元', '≥30000元'],
        showTimeline: false,
        timelineChild: null,
        timelineData: []
    },

    onLoad(options) {
        // 从筛查页“新建宝宝档案”入口跳转而来，自动展开添加表单
        if (options && options.add === '1') {
            this.showForm();
        }
    },

    onShow() {
        const t = new Date();
        const ts = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
        this.setData({ today: ts });
        this._render();
    },

    _render() {
        request.get('/api/child/list').then(children => {
            const list = (children || []).map(c => {
                // MySQL TINYINT(1) 经 JDBC 返回布尔值 true/false，用 == 而非 ===
                const isPremature = c.is_premature == 1 || c.is_premature === true;
                const prematureWeeks = c.premature_weeks || 0;
                const birthDate = c.birth_date;
                const actualMonths = ageUtils.getActualAgeMonths(birthDate);
                const birthGestationalWeeks = isPremature ? (40 - prematureWeeks) : 40;
                const correctedMonths = ageUtils.getAdjustedAgeMonths(actualMonths, birthGestationalWeeks);
                const isCorrected = isPremature && actualMonths < 24 && prematureWeeks > 0;

                return {
                    id: c.id,
                    name: c.name,
                    gender: c.gender,
                    birthDate,
                    avatar: c.avatar || '👶',
                    isPremature,
                    prematureWeeks,
                    city: c.city || '',
                    ageText: ageUtils.monthsToAgeText(actualMonths),
                    correctedAgeText: isCorrected ? ageUtils.monthsToAgeText(correctedMonths) : '',
                    isCorrected,
                    birthFmt: this._fmt(birthDate)
                };
            });
            this.setData({ list });
        }).catch(() => {});
    },

    showForm() {
        this.setData({
            showForm: true, editingId: null,
            form: { name: '', gender: '', birth: '', avatar: '👶', isPremature: false, prematureWeeks: '', city: '' },
            caregiver: { name: '', gender: '', age: '', relationship: '', is_single_parent: '', education: '', income: '' }
        });
    },

    cancelForm() { this.setData({ showForm: false }); },

    onFName(e) { this.setData({ 'form.name': e.detail.value }); },
    onGender(e) { this.setData({ 'form.gender': e.currentTarget.dataset.g }); },
    onDate(e) { this.setData({ 'form.birth': e.detail.value }); },
    onPremature(e) { this.setData({ 'form.isPremature': e.currentTarget.dataset.v }); },
    onPrematureWeeks(e) {
        const v = Number(e.detail.value);
        if (v > 24) {
            wx.showModal({
                title: '提示',
                content: '请填写正确早产周数',
                showCancel: false,
                confirmText: '重新填写',
                success: () => {}
            });
            this.setData({ 'form.prematureWeeks': '' });
            return;
        }
        this.setData({ 'form.prematureWeeks': e.detail.value });
    },
    onCity(e) { this.setData({ 'form.city': e.detail.value }); },
    onAvatar(e) { this.setData({ 'form.avatar': e.currentTarget.dataset.a }); },

    // 照护者信息
    onCgName(e) { this.setData({ 'caregiver.name': e.detail.value }); },
    onCgGender(e) { this.setData({ 'caregiver.gender': e.currentTarget.dataset.g }); },
    onCgAge(e) { this.setData({ 'caregiver.age': e.detail.value }); },
    onCgRelation(e) { const v = this.data.relationOptions[e.detail.value]; this.setData({ 'caregiver.relationship': v }); },
    onCgSingle(e) { this.setData({ 'caregiver.is_single_parent': e.currentTarget.dataset.v }); },
    onCgEducation(e) { const v = this.data.educationOptions[e.detail.value]; this.setData({ 'caregiver.education': v }); },
    onCgIncome(e) { const v = this.data.incomeOptions[e.detail.value]; this.setData({ 'caregiver.income': v }); },

    editChild(e) {
        const id = e.currentTarget.dataset.id;
        const c = this.data.list.find(x => x.id === id);
        if (!c) return;
        this.setData({
            showForm: true, editingId: id,
            form: { name: c.name, gender: c.gender, birth: c.birthDate, avatar: c.avatar || '👶', isPremature: c.isPremature || false, prematureWeeks: c.prematureWeeks || '', city: c.city || '' },
            caregiver: { name: '', gender: '', age: '', relationship: '', is_single_parent: '', education: '', income: '' }
        });
        // 加载已有的照护者信息
        request.get('/api/caregiver/' + id).then(cg => {
            if (cg) {
                this.setData({
                    caregiver: {
                        name: cg.name || '',
                        gender: cg.gender || '',
                        age: cg.age ? String(cg.age) : '',
                        relationship: cg.relationship || '',
                        is_single_parent: cg.is_single_parent || '',
                        education: cg.education || '',
                        income: cg.income || ''
                    }
                });
            }
        }).catch(() => {});
    },

    deleteChild(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该宝宝的信息吗？相关筛查记录也会一并删除。',
            success: (r) => {
                if (!r.confirm) return;
                request.del('/api/child/' + id).then(() => {
                    this._render();
                    wx.showToast({ title: '已删除', icon: 'success' });
                }).catch(() => {});
            }
        });
    },

    saveChild() {
        const { name, gender, birth, avatar, isPremature, prematureWeeks, city } = this.data.form;
        if (!name) { wx.showToast({ title: '请输入宝宝昵称', icon: 'none' }); return; }
        if (!gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return; }
        if (!birth) { wx.showToast({ title: '请选择出生日期', icon: 'none' }); return; }
        if (isPremature && !prematureWeeks) { wx.showToast({ title: '请填写早产周数', icon: 'none' }); return; }
        if (isPremature && Number(prematureWeeks) > 24) {
            wx.showModal({ title: '提示', content: '请填写正确早产周数', showCancel: false, confirmText: '重新填写' });
            return;
        }
        const m = (new Date() - new Date(birth)) / (1000 * 60 * 60 * 24 * 30.44);
        if (m < 11 || m > 60) {
            wx.showToast({ title: '本筛查适用于11-60个月的儿童', icon: 'none', duration: 2500 });
            return;
        }

        wx.showLoading({ title: '保存中...' });
        const payload = { name, gender, birthDate: birth, avatar, isPremature, prematureWeeks: isPremature ? Number(prematureWeeks) : 0, city: city || '' };

        const saveCaregiver = (childId) => {
            const cg = this.data.caregiver;
            console.log('[saveCaregiver] childId=', childId, 'cg=', JSON.stringify(cg));
            if (cg.name || cg.gender || cg.age || cg.relationship || cg.is_single_parent || cg.education || cg.income) {
                const payload = {
                    name: cg.name || null,
                    gender: cg.gender || null,
                    age: cg.age ? Number(cg.age) : null,
                    relationship: cg.relationship || null,
                    is_single_parent: cg.is_single_parent || null,
                    education: cg.education || null,
                    income: cg.income || null
                };
                console.log('[saveCaregiver] sending payload:', JSON.stringify(payload));
                request.post('/api/caregiver/' + childId, payload).then(() => {
                    console.log('[saveCaregiver] success');
                }).catch(err => {
                    console.error('[saveCaregiver] failed:', err);
                });
            } else {
                console.log('[saveCaregiver] skipped - no caregiver data filled');
            }
        };

        if (this.data.editingId) {
            request.put('/api/child/update/' + this.data.editingId, payload).then(() => {
                saveCaregiver(this.data.editingId);
                wx.hideLoading();
                this.setData({ showForm: false });
                this._render();
                wx.showToast({ title: '已更新', icon: 'success' });
            }).catch(() => { wx.hideLoading(); });
        } else {
            request.post('/api/child/add', payload).then((res) => {
                console.log('[saveChild] child/add response:', JSON.stringify(res));
                const childId = res.data && res.data.id ? res.data.id : res.id;
                console.log('[saveChild] extracted childId=', childId);
                if (childId) saveCaregiver(childId);
                wx.hideLoading();
                this.setData({ showForm: false });
                this._render();
                // 新增宝宝后请求订阅消息授权，以便接收后续筛查提醒
                app.requestSubscribeMessage(['firstScreening']);
                wx.showModal({
                    title: '添加成功',
                    content: '宝宝信息已添加，是否立即开始筛查？',
                    confirmText: '去筛查',
                    cancelText: '稍后',
                    confirmColor: '#6B1D5E',
                    success(res) {
                        if (res.confirm) {
                            wx.switchTab({ url: '/pages/screening/screening' });
                        }
                    }
                });
            }).catch(() => { wx.hideLoading(); });
        }
    },

    goScreening(e) {
        const childId = e.currentTarget.dataset.id;
        app.globalData.screening = app.globalData.screening || {};
        app.globalData.screening.childId = childId;
        wx.switchTab({ url: '/pages/screening/screening' });
    },

    // 查看筛查时间轴
    viewTimeline(e) {
        const childId = e.currentTarget.dataset.id;
        const child = this.data.list.find(x => x.id === childId);
        if (!child) return;
        wx.showLoading({ title: '加载中...' });
        request.get('/api/child/' + childId + '/timeline').then(data => {
            wx.hideLoading();
            const timeline = (data || []).map(item => ({
                id: item.id,
                score: item.total_score,
                riskLevel: item.risk_level,
                riskText: this._riskText(item.risk_level),
                riskColor: this._riskColor(item.risk_level),
                time: this._fmtDateTime(item.create_time),
                questionnaire: item.questionnaire_title || '筛查量表'
            }));
            this.setData({ showTimeline: true, timelineChild: child, timelineData: timeline });
        }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '加载失败', icon: 'none' });
        });
    },

    closeTimeline() {
        this.setData({ showTimeline: false, timelineChild: null, timelineData: [] });
    },

    _riskText(level) {
        if (level === 'high') return '高风险';
        if (level === 'medium') return '中风险';
        return '低风险';
    },

    _riskColor(level) {
        if (level === 'high') return '#E74C3C';
        if (level === 'medium') return '#F39C12';
        return '#27AE60';
    },

    _calcMonths(b) {
        if (!b) return 0;
        return ageUtils.getActualAgeMonths(b);
    },

    _monthsToAgeText(m) {
        return ageUtils.monthsToAgeText(m);
    },

    _age(b) {
        return this._monthsToAgeText(this._calcMonths(b));
    },

    _fmt(d) {
        if (!d) return '';
        const dt = new Date(d);
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    },

    _fmtDateTime(d) {
        if (!d) return '';
        const dt = new Date(d);
        const pad = n => String(n).padStart(2, '0');
        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
    }
});
