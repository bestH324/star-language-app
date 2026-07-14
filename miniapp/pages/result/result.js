const app = getApp();
Page({
    data: { record: null, riskIcon: '', recommendations: [], createTime: '' },
    onLoad(options) {
        const record = (app.globalData.screeningHistory||[]).find(r => r.id === options.recordId);
        if (!record) { wx.showToast({ title: '记录未找到', icon: 'none' }); return; }
        const icons = { low: '✅', medium: '⚠️', high: '🔴' };
        let recs;
        if (record.riskLevel === 'low') recs = ['孩子目前各项指标表现良好，请继续保持关注。','建议每3-6个月进行一次发育监测。','多与孩子互动交流，创造丰富的语言和社交环境。'];
        else if (record.riskLevel === 'medium') recs = ['部分指标需要引起关注，建议进一步观察。','推荐在1-2个月内前往专业机构进行发育评估。','增加亲子互动时间，特别关注社交沟通方面的引导。'];
        else recs = ['筛查结果提示需要高度重视，建议尽快进行专业评估。','请携带本筛查报告前往儿童发育行为专科就诊。','不要过度焦虑，早期发现意味着早期干预的机会。'];
        this.setData({ record, riskIcon: icons[record.riskLevel]||'❓', recommendations: recs, createTime: (record.createTime||'').slice(0,16).replace('T',' ') });
    },
    goHistory() { wx.navigateTo({ url: '/pages/history/history' }); },
    goReferral() { wx.switchTab({ url: '/pages/referral/referral' }); }
});
