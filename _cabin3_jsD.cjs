// 小屋 3.0 JS 补丁 D：函数暴露清单更新
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
    n++; console.log('✓ ' + tag);
}

// 移除已废弃的函数名，加入 3.0 新函数名
rep(
`            'isoUndo', 'isoRedo', 'toggleIsoNight', 'exportIsoShot', 'toggleIsoFocus', 'showIsoAwards', 'closeIsoAwards', 'applyIsoCombo', 'isoSetSlot', 'isoSaveSlot', 'isoCtxAction', 'isoToggleSelected', 'dismissIsoTasks', 'toggleIsoPals',`,
`            'isoUndo', 'isoRedo', 'toggleIsoNight', 'toggleIsoFocus', 'applyIsoCombo', 'isoCtxAction', 'isoToggleSelected', 'toggleIsoPals',
            'isoScaleSelected', 'isoRecycleToggle', 'isoAllRecycle', 'isoToggleSnap', 'isoGotoGarden',
            'openIsoPlans', 'closeIsoPlans', 'isoPlanSaveNew', 'isoPlanLoad', 'isoPlanOverwrite', 'isoPlanRename', 'isoPlanDelete', 'isoPlanExport', 'isoPlanImport', 'isoPlanSetHome',
            'openIsoHouses', 'closeIsoHouses', 'isoMoveHouse',
            'openIsoLight', 'closeIsoLight', 'isoSetLight', 'isoToggleNightFromPanel', 'isoLightPreset', 'isoResetLight',
            'openIsoShotMenu', 'closeIsoShotMenu', 'isoShotExport', 'isoShotAlbumSave', 'openIsoAlbum', 'closeIsoAlbum', 'isoAlbumView', 'isoAlbumDownload', 'isoAlbumDelete',
            'toggleIsoStartup', 'isoZoomSlider',`,
'函数暴露清单更新');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 D 完成，共 ' + n + ' 处 ✓');
