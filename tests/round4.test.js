// 第四輪：固定分支測試（職分、受洗聖餐、救恩觀、新故事的觸發條件、反事實不覆蓋紀錄、不卡住）
// 用法：node tests/round4.test.js path/to/index.html   （需要 jsdom）
const { JSDOM } = require('jsdom'); const fs = require('fs');
const file = process.argv[2] || 'index.html';
const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { runScripts: 'dangerously', url: 'https://x/' });
const w = dom.window, d = w.document, errs = [];
w.addEventListener('error', e => errs.push(e.message));
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {};
w.HTMLCanvasElement.prototype.getContext = () => null;
const E = s => w.eval(s);
const res = []; const ok = (name, cond, info = '') => res.push(`${cond ? '✓' : '✗'} ${name}${cond ? '' : '  ' + info}`);
// 設定一個角色：國家、傳統、宗派、性別、婚姻、信仰狀態
const setup = ({ c = 'US', trad = 'protestant', denom = 'presby', sex = 'm', wed = false, cfam = true, ph = 'believer', a = 30, worship = null }) => E(`start();stop();me.country=DATA.countries.find(x=>x.id==='${c}');me.group=me.country.people_groups.slice().sort((a,b)=>b.population-a.population)[0];me.sex='${sex}';me.parentReligion='${cfam ? 'christian' : 'other'}';me.parentLabel='${cfam ? trad : 'unaffiliated'}';me.trad='${trad}';if('${trad}'==='protestant')setDenom(me,'${denom}');${worship ? `me.worship='${worship}';` : ''}phase='${ph}';firstAge=8;faithAge=${ph === 'believer' ? 12 : 'null'};age=${a};me.partnerAt=${wed ? 25 : 'null'};ministry=newMinistry();`);

// 1、5 職分分支：各傳統、男女、已婚未婚
const PK = [['catholic', 'm', false, 'priest'], ['catholic', 'm', true, 'deacon'], ['catholic', 'f', false, 'nun'], ['catholic', 'f', true, 'catechist'],
  ['orthodox', 'm', false, 'priest'], ['orthodox', 'm', true, 'priest'], ['orthodox', 'f', false, 'nun'], ['orthodox', 'f', true, 'lay'],
  ['lds', 'm', true, 'bishop'], ['lds', 'f', true, 'rs'], ['protestant', 'f', false, 'pastor']];
for (const [trad, sex, wed, want] of PK) { setup({ trad, sex, wed }); const o = E('pastorOpt()'); ok(`職分：${trad} ${sex === 'm' ? '男' : '女'}${wed ? '已婚' : '未婚'} → ${want}`, o && o[3] === want, JSON.stringify(o)); }
setup({ trad: 'protestant', denom: 'baptist', sex: 'f' }); E('me.sbc=true'); ok('職分：美南浸信會女性不會被派為主任牧師', E('pastorOpt()[3]') === 'minister');
setup({ trad: 'orthodox', sex: 'm', wed: false }); ok('東正教文字不再說「神父要在晉鐸前結婚，你選擇了獨身」', !/要在晉鐸前結婚，你選擇了獨身/.test(E('pastorOpt()[2]')));
setup({ trad: 'lds', sex: 'm', wed: true }); ok('摩門教主教標示為不支薪的召喚', /不支薪/.test(E('pastorOpt()[2]')) && E("(ministry.pk='bishop', MIN_TIER('pastor'))") === '平信徒的召喚');
setup({ trad: 'catholic', sex: 'm', wed: true }); ok('天主教終身執事和神父分開', E("(ministry.pk='deacon', PASTOR_NAME.deacon)") === '終身執事' && E("PASTOR_NAME.priest") === '神父');

// 2 受洗：嬰兒洗禮傳統的信徒家庭，不會在青少年時「第一次受洗」
for (const [trad, denom, re] of [['catholic', null, /領洗/], ['orthodox', null, /領洗/], ['protestant', 'lutheran', /堅信禮/], ['protestant', 'presby', /堅信禮/]]) {
  setup({ trad, denom: denom || 'presby', a: 14 }); ok(`受洗文字：${denom || trad} 信徒家庭 → 堅振／堅信禮`, re.test(E("softText(GROWTH_EVENTS.find(e=>e.id==='baptized'))")));
}
setup({ trad: 'protestant', denom: 'baptist', a: 14 }); ok('受洗文字：浸信會照常「你受洗了」', E("softText(GROWTH_EVENTS.find(e=>e.id==='baptized'))") === '你受洗了。');
setup({ trad: 'catholic', cfam: false, a: 30 }); ok('受洗文字：成人歸信天主教照常受洗', E("softText(GROWTH_EVENTS.find(e=>e.id==='baptized'))") === '你受洗了。');
// 聖餐情節依傳統換場景
setup({ trad: 'protestant' }); const sp = E("val(ARCS.th_sacr.S.start.scene)"); setup({ trad: 'catholic' }); const sc = E("val(ARCS.th_sacr.S.start.scene)");
ok('聖餐情節：新教在彌撒、天主教在新教教會，場景不同', /天主教堂/.test(sp) && /新教教會/.test(sc));
setup({ trad: 'lds' }); ok('聖餐情節不會出現在摩門教角色', !E('ARCS.th_sacr.who()'));

// 3 救恩觀兩層，每題都有「我還不確定」
ok('救恩論、末世論分成兩題，都有「我還不確定」', E('SAVE_Q[1].includes("我還不確定") && FATE_Q[1].includes("我還不確定")'));
ok('結局說明分兩層', (E('hellPanel(true)').match(/<h4>/g) || []).length === 2);
ok('傳統題目都有不確定的選項', E("Object.values(TRAD_INFO).every(T=>T.q.every(q=>q[1].some(o=>/還在想|不確定/.test(o))))"));

// 4 神學立場不等於政治立場：政教情節不綁定宗派或靈恩
ok('講台與選舉的情節不依神學傾向觸發', !/soter|isCharis|denom|worship/.test(E('ARCS.th_pulpit.who.toString()')));

// 6 不會引用不存在的配偶或孩子
const poolSrc = E('JSON.stringify(Object.values(POOL_ARCS).map(A=>Object.values(A.S).map(s=>[typeof s.text==="function"?s.text.toString():s.text,typeof s.scene==="function"?s.scene.toString():s.scene,s.opts,s.alts])))');
ok('新故事不引用配偶、孩子', !/\{pwife|你的配偶|你的孩子|你太太|你先生/.test(poolSrc));

// 7 真實教會故事的觸發條件
const mvWho = (id, o) => { setup(o); return E(`ARCS.${id}.who()`); };
ok('IHOP：美國新教信徒可觸發', mvWho('ihop_1', { c: 'US', a: 20 }));
ok('IHOP：天主教不觸發', !mvWho('ihop_1', { c: 'US', trad: 'catholic', a: 20 }));
ok('Hillsong：唱聖詩的教會不觸發', !mvWho('hs_1', { worship: 'hymn', a: 20 }) && mvWho('hs_1', { worship: 'praise', a: 20 }));
ok('Bethel：不是信徒不觸發', !mvWho('bt_1', { ph: 'decline', cfam: false, worship: 'praise', a: 20 }));
ok('真實教會故事都有虛構說明', E('Object.values(POOL_ARCS).filter(A=>A.label).every(A=>MV_INFO[A.label])') && /角色與情節為虛構/.test(E('MV_LABEL')));

// 8、9、10、11、15 強制跑完每條新故事：不卡住、分支依選擇走、反事實不寫進人生紀錄
const ids = E('Object.keys(POOL_ARCS)'); let stuck = 0, altInLog = 0, branchDiff = 0, cfShown = 0;
for (const id of ids) {
  const logs = [];
  for (const pickIdx of [0, 1]) {
    setup({ c: 'US', denom: 'pente', worship: 'praise', a: 32 });
    E(`arc={id:'${id}',s:ARCS['${id}'].S.pre?'pre':'start',wait:0,victims:0,f:{},cast:makeCast()};arcUsed.add('${id}');`);
    let g = 0;
    while (d.getElementById('end').hidden && g++ < 1500) {
      const box = d.querySelector('#choiceSlot .choice');
      if (box) { const bt = [...box.querySelectorAll('button')]; bt[Math.min(pickIdx, bt.length - 1)].click(); E('stop()'); continue; }
      E('tick(); stop();');
    }
    if (g >= 1500) stuck++;
    const log = [...d.querySelectorAll('#log li')].map(li => li.textContent).join('|');
    logs.push(log);
    const alts = E(`(ARCS['${id}'].S.start.alts||[]).map(a=>a.replace(/^如果[^：]*：/,'').slice(0,12))`);
    if (alts.some(a => a && log.includes(a))) altInLog++;
    if (d.getElementById('cfBox')) cfShown++;
  }
  if (logs[0] !== logs[1]) branchDiff++;
}
ok(`新故事 ${ids.length} 條都能跑完，不會卡住`, stuck === 0, `stuck ${stuck}`);
ok('不同選擇會走到不同的後續', branchDiff >= ids.length - 3, `${branchDiff}/${ids.length}`);
ok('「另一種選擇」的文字不會寫進人生紀錄', altInLog === 0, `${altInLog}`);
ok('結局頁有「如果當時選了另一條路呢？」', cfShown >= ids.length);

// 14 互動卡片：議題說明預設收合，不擋選項
setup({ c: 'US', denom: 'pente', worship: 'praise', a: 32 });
E(`arc={id:'th_spirit',s:'start',wait:0,victims:0,f:{},cast:makeCast()};arcUsed.add('th_spirit');arcYear();`);
const why = d.querySelector('#choiceSlot details.why');
ok('議題說明在選擇卡片裡，預設收合', why && !why.open && d.querySelectorAll('#choiceSlot .opts button').length === 3);

ok('沒有 JS 錯誤', errs.length === 0, errs.slice(0, 3).join(' / '));
console.log(res.join('\n')); const fail = res.filter(r => r.startsWith('✗')).length;
console.log(`\n${res.length - fail}/${res.length} 通過`); process.exit(fail ? 1 : 0);
