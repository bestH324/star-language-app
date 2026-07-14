const INSTITUTIONS = require('../../utils/data.js').REFERRAL_INSTITUTIONS || [];

Page({
    data: { groupedList: [] },
    onLoad() {
        const grouped = {};
        INSTITUTIONS.forEach(inst => {
            if (!grouped[inst.region]) grouped[inst.region] = [];
            grouped[inst.region].push(inst);
        });
        const groupedList = Object.entries(grouped).map(([region, institutions]) => ({
            region, institutions
        }));
        this.setData({ groupedList });
    }
});
