/* =========================================================================
   接舷單挑 · game/constants.js
   All the numbers, in one place, with no imports — so the rules module above
   it and the tests below it can both reason about the fight without a browser.
   ========================================================================= */

/* 三個部位：上部 / 中部 / 下部 --------------------------------------------- */
export const PARTS = { UPPER: 'upper', MID: 'mid', LOWER: 'lower' };
export const PART_ORDER = [PARTS.UPPER, PARTS.MID, PARTS.LOWER];
export const PART_LABEL = { upper: '上部', mid: '中部', lower: '下部' };
export const PART_HINT = { upper: '頭頸與肩', mid: '胸腹與腰', lower: '雙腿與下盤' };

/* 攻擊：部位 · 傷害 · 命中率 ---------------------------------------------- */
/* accuracy is the chance a clean (un-blocked) strike actually lands: without it
   「低命中」 would be a promise the game never keeps. */
export const ATTACKS = {
  thrust: { id: 'thrust', name: '上部劈刺', part: PARTS.UPPER, damage: 22, accuracy: 0.62, tag: '高傷 · 中命中', note: '直取咽喉' },
  slash: { id: 'slash', name: '中部橫斬', part: PARTS.MID, damage: 15, accuracy: 0.88, tag: '中傷 · 高命中', note: '腰際橫掃' },
  cleave: { id: 'cleave', name: '下部力劈', part: PARTS.LOWER, damage: 30, accuracy: 0.45, tag: '極高傷 · 低命中', note: '斷其下盤' },
  feint: { id: 'feint', name: '虛招', part: PARTS.MID, damage: 0, accuracy: 0.98, tag: '無傷 · 欺敵', note: '誘敵開門', feint: true },
};
export const ATTACK_ORDER = ['thrust', 'slash', 'cleave', 'feint'];

/* 防守：三路專守（對上部位必定格擋）與全力防守（全部位中等格擋率） ------- */
export const DEFENCES = {
  guardUpper: { id: 'guardUpper', name: '防守上部', part: PARTS.UPPER, allOut: false },
  guardMid: { id: 'guardMid', name: '防守中部', part: PARTS.MID, allOut: false },
  guardLower: { id: 'guardLower', name: '防守下部', part: PARTS.LOWER, allOut: false },
  allOut: { id: 'allOut', name: '全力防守', part: null, allOut: true, tag: '全部位中等格擋' },
};
export const DEFENCE_ORDER = ['guardUpper', 'guardMid', 'guardLower', 'allOut'];

/* 裝備：面板上顯示的，同時也是真的有用的 -------------------------------- */
export const GEAR = {
  player: {
    title: '皇家海軍 上尉',
    ship: '無畏號',
    weapon: { name: '海軍軍刀', damage: 0, note: '輕快銳利' },
    helm: { name: '船長三角帽', allOut: 0.05, note: '指揮若定' },
    armour: { name: '鎖子甲', flat: 2, note: '抵銷皮肉傷' },
  },
  enemy: {
    title: '紅鬍子 海盜',
    ship: '海鴉號',
    weapon: { name: '海盜彎刀', damage: 2, note: '沉重開山' },
    helm: { name: '猩紅頭巾', allOut: 0, note: '毫無畏懼' },
    armour: { name: '硬化皮甲', flat: 1, note: '粗糙耐砍' },
  },
};

/* 規則參數 ---------------------------------------------------------------- */
export const RULES = {
  maxHp: 100,
  blockReduction: 0.8,       // 格擋減傷 80%
  allOutBlock: 0.45,         // 全力防守：全部位中等格擋率
  helmBlockBonus: true,      // 頭盔提高全力防守成功率
  offBalanceBlockCut: 0.2,   // 被虛招騙到：格擋率 -20%
  offBalanceDamageUp: 0.25,  // 被虛招騙到：下一擊多受 25% 傷害
  minDamage: 1,              // 擦到也有 1 點
};

/* 動畫節奏（毫秒）：狀態機用它們排程，UI 用它們對齊 --------------------- */
export const TIMING = {
  resolve: 1150,       // RESOLVING 鎖定時間：動畫與音效都在這之內跑完
  impact: 320,         // 揮擊動畫到命中的那一刻
  enemyPrepare: 900,   // 敵人「蓄勢待發」的先聲
};
