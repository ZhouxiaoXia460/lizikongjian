// 小屋 3.0 JS 补丁 A：户型系统 + 家具库扩充
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let n = 0;
const CRLF = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
function rep(oldStr, newStr, tag) {
    oldStr = CRLF(oldStr); newStr = CRLF(newStr);
    if (!html.includes(oldStr)) { console.error('✗ 未找到: ' + tag); process.exit(1); }
    if (html.split(oldStr).length > 2) { console.error('✗ 不唯一: ' + tag); process.exit(1); }
    html = html.replace(oldStr, newStr);
    n++;
    console.log('✓ ' + tag);
}

// ============ 1. ISO_SPACES 数组 → 对象 + ISO_HOUSES ============
rep(
`    const ISO_SPACES = [ // 【新增空间】
        { key: 'f1', tag: '1F', name: '客厅与厨房', zones: [ { name: '客厅', c0: 0, c1: 6, r0: 0, r1: 6, mat: 'wood' }, { name: '厨房', c0: 7, c1: 11, r0: 0, r1: 6, mat: 'tile' } ], dividers: [6.5] },
        { key: 'f2', tag: '2F', name: '卧室与卫浴', zones: [ { name: '卧室', c0: 0, c1: 6, r0: 0, r1: 6, mat: 'wood' }, { name: '卫浴', c0: 7, c1: 11, r0: 0, r1: 6, mat: 'tile' } ], dividers: [6.5] },
        { key: 'gaming', tag: '副楼', name: '电竞房', zones: [ { name: '电竞房', c0: 0, c1: 11, r0: 0, r1: 6, mat: 'carpet' } ], dividers: [] }
    ];`,
`    const ISO_SPACES = { // 【空间定义】全部户型共享；outdoor = 户外场地（无墙体，画栅栏）；win = 窗型（tall 落地飘窗 / std 标准 / small 小屋窗）
        f1: { tag: '1F', name: '客厅厨房', win: 'tall', balcony: true, zones: [ { name: '客厅', c0: 0, c1: 6, r0: 0, r1: 6, mat: 'wood' }, { name: '厨房', c0: 7, c1: 11, r0: 0, r1: 6, mat: 'tile' } ], dividers: [6.5] },
        f2: { tag: '2F', name: '卧室卫浴', win: 'std', zones: [ { name: '卧室', c0: 0, c1: 6, r0: 0, r1: 6, mat: 'wood' }, { name: '卫浴', c0: 7, c1: 11, r0: 0, r1: 6, mat: 'tile' } ], dividers: [6.5] },
        gaming: { tag: '副楼', name: '电竞房', win: 'std', zones: [ { name: '电竞房', c0: 0, c1: 11, r0: 0, r1: 6, mat: 'carpet' } ], dividers: [] },
        garden: { tag: '院子', name: '我的花园', outdoor: true, zones: [
            { name: '木台', c0: 8, c1: 11, r0: 0, r1: 3, mat: 'wood' },
            { name: '小径', c0: 3, c1: 6, r0: 5, r1: 6, mat: 'stone' },
            { name: '草坪', c0: 0, c1: 11, r0: 0, r1: 6, mat: 'grass' }
        ], dividers: [] },
        flat: { tag: '平层', name: '温馨平层', win: 'std', zones: [
            { name: '客厅', c0: 0, c1: 5, r0: 0, r1: 6, mat: 'wood' },
            { name: '餐厨', c0: 6, c1: 8, r0: 0, r1: 6, mat: 'tile' },
            { name: '卧室', c0: 9, c1: 11, r0: 0, r1: 6, mat: 'wood' }
        ], dividers: [5.5, 8.5] },
        cot: { tag: '主屋', name: '小屋主厅', win: 'small', zones: [
            { name: '客厅', c0: 0, c1: 7, r0: 0, r1: 6, mat: 'wood' },
            { name: '卧室角', c0: 8, c1: 11, r0: 0, r1: 6, mat: 'carpet' }
        ], dividers: [7.5] },
        studio: { tag: '开间', name: '开间公寓', win: 'tall', balcony: true, zones: [
            { name: '睡眠区', c0: 0, c1: 3, r0: 0, r1: 6, mat: 'carpet' },
            { name: '起居区', c0: 4, c1: 8, r0: 0, r1: 6, mat: 'wood' },
            { name: '厨房角', c0: 9, c1: 11, r0: 0, r1: 6, mat: 'tile' }
        ], dividers: [] }
    };
    const ISO_HOUSES = [ // 【搬家】dx：-1 左侧建筑 / 0 主楼 / 1 右侧建筑；floors 自下而上叠放
        { key: 'loft', icon: '🏡', label: 'LOFT 复式', desc: '双层主楼 · 电竞副楼 · 花园', layout: [{ dx: -1, floors: ['garden'] }, { dx: 0, floors: ['f1', 'f2'] }, { dx: 1, floors: ['gaming'] }] },
        { key: 'flat', icon: '🏠', label: '小平层', desc: '一层小家 · 客厅餐厨卧室', layout: [{ dx: -1, floors: ['garden'] }, { dx: 0, floors: ['flat'] }] },
        { key: 'cottage', icon: '🏘', label: '带院小屋', desc: '温馨主屋 · 大花园', layout: [{ dx: 0, floors: ['cot'] }, { dx: 1, floors: ['garden'] }] },
        { key: 'studio', icon: '🏢', label: '开间公寓', desc: '一体化小家 · 落地窗阳台', layout: [{ dx: 0, floors: ['studio'] }] }
    ];
    function _isoHouse() { return ISO_HOUSES.find(h => h.key === (isoState && isoState.houseKey)) || ISO_HOUSES[0]; }
    function _isoHouseSpaces() { const ks = []; _isoHouse().layout.forEach(s => s.floors.forEach(k => { if (ks.indexOf(k) < 0) ks.push(k); })); return ks; }`,
'ISO_SPACES → 对象 + ISO_HOUSES');

// ============ 2. FURN_DEF 追加 43 件新家具 ============
rep(
`        // 地毯
        rug3: { name: '大地毯', parts: [PL(0, 0, 1.25, 0.85, C.blueL), PL(0, 0, 0.95, 0.62, C.blue), PL(0, 0, 0.6, 0.38, C.blueL)] }
    };`,
`        // 地毯
        rug3: { name: '大地毯', parts: [PL(0, 0, 1.25, 0.85, C.blueL), PL(0, 0, 0.95, 0.62, C.blue), PL(0, 0, 0.6, 0.38, C.blueL)] },
        // —— 餐厨（新增）——
        fridge: { name: '双开门冰箱', parts: [PB(0, 0, 0.56, 0.5, 42, C.white), PB(0, 0, 0.6, 0.54, 3, C.steel), PB(0, 0.26, 0.48, 0.04, 38, C.blueL), PB(0, -0.21, 0.48, 0.04, 24, C.blueL), PB(0.21, 0.16, 0.035, 0.1, 36, C.steel), PB(0.21, -0.26, 0.035, 0.1, 22, C.steel), PE('🧲', -54, 10)] },
        stove: { name: '灶台', parts: [PB(0, 0, 0.94, 0.5, 22, C.cream), PB(0, -0.1, 0.86, 0.36, 3, C.dark, 22), PB(-0.2, -0.1, 0.26, 0.2, 2, C.steel, 25), PB(0.22, -0.1, 0.26, 0.2, 2, C.steel, 25), PB(0, 0.24, 0.9, 0.06, 4, C.wood), PE('🍳', -36, 12)] },
        kcounter: { name: '料理台', parts: [PB(0, 0, 1.0, 0.52, 20, C.mint), PB(0, -0.02, 1.04, 0.56, 3, C.mintD), PB(0, 0.12, 0.4, 0.3, 4, C.blueL, 20), PB(0, 0.2, 0.5, 0.05, 2, C.steel, 24), PE('🥕', -34, 11)] },
        ktable: { name: '厨房中岛', parts: [PB(0, 0, 1.3, 0.7, 22, C.cream), PB(0, 0, 1.36, 0.76, 3, C.woodD), PB(0, 0.08, 0.9, 0.4, 3, C.wood, 22), PE('🍲', -38, 13)] },
        coffee: { name: '咖啡机', parts: [PB(0, 0, 0.34, 0.28, 16, C.dark), PB(0, 0, 0.38, 0.32, 2, C.steel), PB(0, 0.05, 0.2, 0.14, 4, C.steel, 8), PB(0, 0.05, 0.12, 0.1, 5, C.white, 5), PE('☕', -26, 10)] },
        barstool: { name: '吧台椅', parts: [PC(0, 0, 0.05, 22, C.woodD), PL(0, 0, 0.22, 0.16, C.pink, 22), PB(0, 0, 0.3, 0.04, 2, C.woodD, 6)] },
        kshelf: { name: '厨房置物架', parts: [PB(-0.4, 0, 0.06, 0.3, 40, C.woodD), PB(0.4, 0, 0.06, 0.3, 40, C.woodD), PB(0, 0, 0.84, 0.3, 3, C.wood), PB(0, 0, 0.84, 0.3, 3, C.wood, 20), PB(0, 0, 0.84, 0.3, 3, C.wood, 36), PB(-0.2, 0.02, 0.1, 0.14, 9, C.blueL, 23), PB(0.18, 0.02, 0.1, 0.14, 9, C.mint, 23), PE('🍯', -52, 11)] },
        // —— 地面铺装（新增，可整片拼铺）——
        floorWood: { name: '木地板片', parts: [PB(0, 0, 0.96, 0.96, 1.4, C.wood)] },
        floorTile: { name: '白瓷砖片', parts: [PB(0, 0, 0.96, 0.96, 1.4, C.white), PB(0, 0, 0.72, 0.72, 1.8, C.blueL)] },
        floorChecker: { name: '格纹地垫', parts: [PB(0, 0, 0.96, 0.96, 1.4, C.pinkL), PB(-0.24, -0.24, 0.44, 0.44, 1.8, C.mint), PB(0.24, 0.24, 0.44, 0.44, 1.8, C.mint)] },
        floorRose: { name: '玫瑰纹毯', parts: [PL(0, 0, 0.62, 0.44, C.pinkL), PL(0, 0, 0.4, 0.28, C.pink), PL(0, 0, 0.18, 0.12, C.pinkL)] },
        floorDeck: { name: '户外木甲板', parts: [PB(0, 0, 0.96, 0.96, 1.4, C.wood), PB(0, -0.3, 0.9, 0.14, 1.8, C.woodD), PB(0, 0.3, 0.9, 0.14, 1.8, C.woodD)] },
        // —— 墙饰（新增，靠后墙摆放即上墙）——
        wpic: { name: '奶油挂画', wall: true, parts: [PB(0, 0, 0.72, 0.06, 28, C.white, 34), PB(0, 0, 0.58, 0.05, 20, C.pinkL, 38), PB(0, 0, 0.4, 0.04, 8, C.pink, 43)] },
        wpic2: { name: '风景挂画', wall: true, parts: [PB(0, 0, 0.66, 0.06, 24, C.woodD, 34), PB(0, 0, 0.54, 0.05, 18, C.blueL, 37), PE('⛰️', -52, 11)] },
        wclock: { name: '复古挂钟', wall: true, parts: [PB(0, 0, 0.4, 0.06, 22, C.white, 38), PE('🕰️', -48, 13)] },
        wreath: { name: '小花环', wall: true, parts: [PE('🌿', -46, 17), PE('🌸', -50, 9)] },
        garland: { name: '彩旗串', wall: true, parts: [PB(0, 0, 0.96, 0.04, 2.5, C.woodD, 52), PB(-0.3, 0, 0.12, 0.1, 7, C.pink, 45), PB(0, 0, 0.12, 0.1, 7, C.blueL, 45), PB(0.3, 0, 0.12, 0.1, 7, C.mint, 45)] },
        wshelf: { name: '壁挂隔板', wall: true, parts: [PB(0, 0, 0.7, 0.14, 3, C.wood, 38), PE('🧸', -50, 11)] },
        wmirror: { name: '壁挂圆镜', wall: true, parts: [PC(0, 0, 0.2, 2, C.woodD, 36), PL(0, 0, 0.16, 0.11, C.blueL, 38)] },
        // —— 小物件（新增）——
        teaset: { name: '下午茶组', parts: [PC(0, 0, 0.2, 3, C.woodD), PB(0, 0, 0.44, 0.3, 2, C.wood, 3), PC(-0.08, 0.02, 0.06, 5, C.white, 5), PC(0.1, 0.02, 0.05, 4, C.pinkL, 5), PE('🫖', -22, 11)] },
        photof: { name: '桌面相框', parts: [PB(0, 0, 0.24, 0.1, 16, C.white), PB(0, 0, 0.18, 0.06, 11, C.pink, 5), PB(0, -0.05, 0.22, 0.04, 3, C.wood)] },
        jewelry: { name: '首饰盒', parts: [PB(0, 0, 0.3, 0.24, 10, C.pink), PB(0, 0, 0.34, 0.28, 2.5, C.pinkD), PE('💎', -20, 10)] },
        bookopen: { name: '摊开的书', parts: [PB(0, 0, 0.4, 0.3, 2.5, C.cream), PB(-0.1, 0, 0.18, 0.26, 1.5, C.white, 2.5), PB(0.1, 0, 0.18, 0.26, 1.5, C.white, 2.5)] },
        cat: { name: '打盹猫咪', parts: [PL(0, 0, 0.3, 0.22, C.pinkL, 2), PE('🐱', -14, 15)] },
        goldfish: { name: '金鱼缸', parts: [PC(0, 0, 0.16, 10, C.glass), PL(0, 0, 0.13, 0.09, C.water, 10), PE('🐠', -12, 9)] },
        fan: { name: '小风扇', parts: [PC(0, 0, 0.13, 3, C.woodD), PC(0, 0, 0.025, 14, C.woodD, 3), PL(0, 0, 0.16, 0.11, C.blueL, 17), PE('🍃', -26, 9)] },
        // —— 绿植补充（新增）——
        sunflower: { name: '向日葵', parts: [PC(0, 0, 0.12, 10, C.wood), PE('🌻', -32, 15)] },
        tulips: { name: '郁金香盆', parts: [PC(0, 0, 0.12, 9, C.pinkD), PE('🌷', -26, 12)] },
        bonsai: { name: '小盆景', parts: [PC(0, 0, 0.13, 7, C.white), PE('🌳', -22, 14)] },
        // —— 户外 / 花园（新增）——
        fenceW: { name: '白栅栏段', parts: [PB(-0.34, 0, 0.07, 0.07, 24, C.white), PB(0.34, 0, 0.07, 0.07, 24, C.white), PB(0, 0, 0.9, 0.05, 3, C.white, 15), PB(0, 0, 0.9, 0.05, 3, C.white, 7)] },
        umbrella: { name: '遮阳伞', parts: [PC(0, 0, 0.05, 3, C.woodD), PC(0, 0, 0.025, 50, C.woodD, 3), PL(0, 0, 0.62, 0.4, C.pinkL, 54), PL(0, 0, 0.36, 0.22, C.pink, 54)] },
        swing: { name: '秋千架', parts: [PB(-0.5, 0, 0.07, 0.07, 40, C.wood), PB(0.5, 0, 0.07, 0.07, 40, C.wood), PB(0, 0, 1.06, 0.06, 3, C.woodD, 40), PB(-0.04, 0, 0.03, 0.03, 16, C.steel, 37), PB(0.04, 0, 0.03, 0.03, 16, C.steel, 37), PB(0, 0, 0.36, 0.16, 3, C.wood, 21)] },
        hammock: { name: '吊床', parts: [PB(-0.55, 0, 0.07, 0.07, 30, C.woodD), PB(0.55, 0, 0.07, 0.07, 30, C.woodD), PL(0, 0, 0.5, 0.3, C.mint, 18)] },
        lounge: { name: '庭院躺椅', parts: [PB(0, 0.14, 0.36, 0.09, 9, C.woodD), PB(0, -0.2, 0.36, 0.09, 20, C.woodD), PL(0, 0.06, 0.34, 0.2, C.pinkL, 12), PL(0, -0.16, 0.3, 0.16, C.pinkL, 26)] },
        bbq: { name: '烧烤架', parts: [PB(-0.22, -0.14, 0.06, 0.06, 12, C.dark), PB(0.22, -0.14, 0.06, 0.06, 12, C.dark), PB(-0.22, 0.16, 0.06, 0.06, 12, C.dark), PB(0.22, 0.16, 0.06, 0.06, 12, C.dark), PB(0, 0, 0.62, 0.44, 8, C.dark, 12), PB(0, 0, 0.56, 0.38, 2, C.steel, 20), PE('🔥', -32, 12)] },
        pond: { name: '小池塘', parts: [PL(0, 0, 0.66, 0.46, C.mintD), PL(0, 0, 0.5, 0.34, C.water), PE('🪷', -8, 11)] },
        glamp: { name: '草坪灯', lamp: true, parts: [PC(0, 0, 0.1, 3, C.woodD), PC(0, 0, 0.025, 20, C.woodD, 3), PC(0, 0, 0.09, 7, C.butter, 23)] },
        birdhouse: { name: '小鸟屋', parts: [PC(0, 0, 0.035, 28, C.woodD), PB(0, 0, 0.28, 0.22, 16, C.wood, 28), PB(0, 0, 0.34, 0.24, 3, C.woodD, 44), PB(0, 0.1, 0.07, 0.05, 5, C.dark, 33), PE('🐦', -52, 10)] },
        fountain: { name: '小喷泉', parts: [PC(0, 0, 0.44, 8, C.blueL), PL(0, 0, 0.4, 0.28, C.water, 8), PC(0, 0, 0.08, 14, C.white, 8), PL(0, 0, 0.18, 0.12, C.water, 22), PE('💦', -32, 12)] },
        bench: { name: '庭院长椅', parts: [PB(-0.4, -0.12, 0.06, 0.06, 10, C.woodD), PB(0.4, -0.12, 0.06, 0.06, 10, C.woodD), PB(-0.4, 0.16, 0.06, 0.06, 10, C.woodD), PB(0.4, 0.16, 0.06, 0.06, 10, C.woodD), PB(0, 0.02, 0.94, 0.3, 4, C.wood, 10), PB(0, -0.2, 0.94, 0.08, 10, C.wood, 14)] },
        mailbox: { name: '小邮箱', parts: [PC(0, 0, 0.04, 16, C.woodD), PB(0, 0, 0.3, 0.2, 12, C.pinkD, 16), PB(0, 0, 0.34, 0.22, 3, C.pink, 28), PE('✉️', -40, 10)] },
        flowerarch: { name: '花拱门', parts: [PB(-0.42, 0, 0.07, 0.07, 46, C.white), PB(0.42, 0, 0.07, 0.07, 46, C.white), PL(0, 0, 0.48, 0.14, C.mint, 48), PE('🌸', -56, 15)] },
        veggie: { name: '小菜畦', parts: [PB(0, 0, 0.8, 0.5, 8, C.wood), PB(0, 0, 0.86, 0.56, 2.5, C.woodD), PE('🥬', -20, 13)] }
    };`,
'FURN_DEF +43 件');

// ============ 3. FURN_LIB 分类重组 ============
rep(
`    const FURN_LIB = [
        { cat: 'living', label: '🛋 客厅', keys: ['sofa2', 'sofa1', 'tea', 'tvstand', 'dining', 'chair1', 'bookshelf', 'flamp', 'stable', 'decor', 'desk1', 'foldscreen', 'bookstack'] },
        { cat: 'bed', label: '🛏 卧室', keys: ['bed2', 'bed1', 'ward', 'dresser', 'nstand', 'rug1', 'lamp1', 'bean', 'rack', 'cushions'] },
        { cat: 'bath', label: '🛁 卫浴', keys: ['bathtub', 'sink', 'toilet', 'shower', 'bcab', 'shelf2', 'mat2', 'towel', 'duck', 'aroma'] },
        { cat: 'deco', label: '🎀 装饰', keys: ['easel', 'starlamp', 'candles', 'teddy2', 'rug2', 'mirror2', 'musicbox', 'aroma2', 'stringlight', 'trophy', 'doll2', 'lantern', 'clock1', 'rocker', 'stairs'] },
        { cat: 'plant', label: '🪴 绿植', keys: ['plantL', 'plantS', 'vine', 'palm', 'grassp', 'flowerbed', 'cactus', 'vase', 'lily', 'sapling'] },
        { cat: 'game', label: '🎮 电竞', keys: ['gdesk', 'gchair', 'monitor', 'pcbox', 'gpink', 'arcade', 'keyboard', 'headset', 'ringlight', 'figurine'] },
        { cat: 'rug', label: '🧶 地毯', keys: ['rug1', 'rug2', 'rug3', 'mat2'] }
    ];`,
`    const FURN_LIB = [
        { cat: 'living', label: '🛋 客厅', keys: ['sofa2', 'sofa1', 'tea', 'tvstand', 'bookshelf', 'flamp', 'stable', 'decor', 'desk1', 'foldscreen', 'mirror2', 'rocker', 'clock1'] },
        { cat: 'bed', label: '🛏 卧室', keys: ['bed2', 'bed1', 'ward', 'dresser', 'nstand', 'lamp1', 'bean', 'rack', 'cushions', 'teddy2', 'doll2'] },
        { cat: 'kitchen', label: '🍽 餐厨', keys: ['dining', 'chair1', 'fridge', 'stove', 'kcounter', 'ktable', 'coffee', 'barstool', 'kshelf'] },
        { cat: 'bath', label: '🛁 卫浴', keys: ['bathtub', 'sink', 'toilet', 'shower', 'bcab', 'shelf2', 'mat2', 'towel', 'duck', 'aroma'] },
        { cat: 'plant', label: '🪴 绿植', keys: ['plantL', 'plantS', 'vine', 'palm', 'grassp', 'flowerbed', 'cactus', 'vase', 'lily', 'sapling', 'sunflower', 'tulips', 'bonsai'] },
        { cat: 'floor', label: '🧶 地面铺装', keys: ['rug1', 'rug2', 'rug3', 'floorWood', 'floorTile', 'floorChecker', 'floorRose', 'floorDeck'] },
        { cat: 'wall', label: '🖼 墙饰', keys: ['wpic', 'wpic2', 'wclock', 'wreath', 'garland', 'wshelf', 'wmirror'] },
        { cat: 'deco', label: '🎀 装饰', keys: ['easel', 'starlamp', 'candles', 'musicbox', 'aroma2', 'stringlight', 'trophy', 'lantern', 'stairs'] },
        { cat: 'small', label: '🍬 小物件', keys: ['teaset', 'photof', 'jewelry', 'bookopen', 'bookstack', 'cat', 'goldfish', 'fan'] },
        { cat: 'game', label: '🎮 电竞', keys: ['gdesk', 'gchair', 'monitor', 'pcbox', 'gpink', 'arcade', 'keyboard', 'headset', 'ringlight', 'figurine'] },
        { cat: 'garden', label: '🌿 户外', keys: ['fenceW', 'umbrella', 'swing', 'hammock', 'lounge', 'bbq', 'pond', 'glamp', 'birdhouse', 'fountain', 'bench', 'mailbox', 'flowerarch', 'veggie'] }
    ];`,
'FURN_LIB 分类重组');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 A 完成，共 ' + n + ' 处 ✓');
