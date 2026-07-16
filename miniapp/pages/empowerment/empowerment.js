const RES = require('../../utils/data.js').EMPOWERMENT_RESOURCES || [];
Page({
    data: { resources: RES },
    onTap(e) { wx.showToast({ title: (e.currentTarget.dataset.title||'') + '——即将上线！', icon: 'none', duration: 2000 }); }
});
