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


// 回報的案例：印度、穆斯林家庭、信主後成為修女
setup({ c: 'IN', trad: 'orthodox', sex: 'f', cfam: false, a: 30 }); E("me.group=me.country.people_groups.find(g=>/孟加拉/.test(g.primary_language||'')||true);st={done:{}};stats={persecution:0,growth:0};");
E("setRole('pastor'); ministry.pk='nun';");
ok('還沒受洗就開始服事，會先補上受洗', E('!!(st.done&&st.done.baptized)') && /受洗|領洗/.test([...d.querySelectorAll('#log li')].map(l=>l.textContent).join('')));
ok('修女不會因信仰「失去了工作」', !/失去了工作/.test(E("softText(PERSECUTION_EVENTS.find(e=>e.id==='job_loss'))")));
ok('修女的服事事件不提講台', !E("JSON.stringify(MIN_EVENTS[minKey('pastor')])").includes('講台'));
setup({ c: 'IN', trad: 'orthodox', sex: 'f', cfam: false, a: 30 }); E("me.parentLabel='muslim'");
const pn = E("(()=>{const o=[];for(let i=0;i<30;i++){arc={cast:null};o.push(makeCast().pastor)}return o.join(',')})()");
ok('穆斯林家庭的主角，神父不會叫穆罕默德', !/穆罕默德|阿里|伊姆蘭/.test(pn), pn.slice(0, 60));
ok('台灣以外不會出現 113 專線', !/113/.test(E('val(HELP_NOTE.abuse)')));
setup({ c: 'IN', trad: 'orthodox', a: 30 }); ok('東正教不會出現「長執會」', !/長執會/.test(E("localize('長執會把事情壓了下來')")));

// 歸信者進哪個傳統：東正教只在以基督徒為主的族群，或俄羅斯、衣索比亞
const convTrad = (cc, test) => E(`(()=>{const c=DATA.countries.find(x=>x.id==='${cc}');const gs=c.people_groups.filter(${test});const n={catholic:0,protestant:0,orthodox:0};for(let i=0;i<800;i++){const p={country:c,group:gs[i%gs.length],parentReligion:'other',parentLabel:'other'};assignTrad(p);n[p.trad]++}return n})()`);
ok('印度穆斯林、印度教族群的歸信者不會進東正教', convTrad('IN', "g=>g.christian_pct<50").orthodox === 0);
ok('印度的敘利亞基督徒族群可以是東正教', convTrad('IN', "g=>/敘利亞基督徒/.test(g.name)").orthodox > 0);
ok('埃及、伊朗的穆斯林族群歸信者不會進東正教', convTrad('EG', "g=>g.christian_pct<50").orthodox === 0 && convTrad('IR', "g=>g.christian_pct<50").orthodox === 0);
ok('俄羅斯、衣索比亞的歸信者可以進東正教', convTrad('RU', "g=>g.christian_pct<50").orthodox > 0 && convTrad('ET', "g=>g.christian_pct<50").orthodox > 0);

// 新教宗派：有資料的國家依真實比例
const den = cc => E(`(()=>{const c=DATA.countries.find(x=>x.id==='${cc}'),n={};for(let i=0;i<3000;i++){const p={country:c,group:c.people_groups[0],parentReligion:'christian',parentLabel:'protestant'};assignTrad(p);n[p.denom]=(n[p.denom]||0)+1}return n})()`);
{ const b = den('BR'), k = den('KR'), g = den('DE'), u = den('GB');
  ok('巴西：五旬節派最多（約八成）', b.pente / 3000 > 0.7);
  ok('韓國：長老會最多（約七成）', k.presby / 3000 > 0.65);
  ok('德國：信義宗與聯合教會占絕大多數', g.lutheran / 3000 > 0.95);
  ok('英國：聖公會最多', u.anglican / 3000 > 0.65); }

// 穆斯林相關：從伊斯蘭研究角度的修正
const famRel = (cc, re) => E(`(()=>{const c=DATA.countries.find(x=>x.id==='${cc}');const g=c.people_groups.find(g=>${re}.test(g.name));const n={};for(let i=0;i<500;i++){const r=familyReligion({country:c,group:g});n[r]=(n[r]||0)+1}return n})()`);
ok('印度的印度教種姓族群，幾乎不會是穆斯林家庭', (famRel('IN', '/雅達夫人（薩德戈普）/').muslim || 0) < 20);
ok('「無法更改宗教身分」不會出現在印尼、土耳其、奈及利亞', ['ID', 'TR', 'NG'].every(cc => !E(`fits(PERSECUTION_EVENTS.find(e=>e.id==='id_religion'),{sex:'f',country:DATA.countries.find(x=>x.id==='${cc}'),parentReligion:'muslim',group:{}},30)`)));
ok('「無法更改宗教身分」會出現在埃及的穆斯林背景信徒', E(`fits(PERSECUTION_EVENTS.find(e=>e.id==='id_religion'),{sex:'f',country:DATA.countries.find(x=>x.id==='EG'),parentReligion:'muslim',group:{}},30)`) !== false);
setup({ c: 'NG', trad: 'protestant', a: 30 }); ok('基督徒家庭出身被攻擊，不會被說「背叛族人」', !/背叛/.test(E("crossScene('attacked')")));
ok('穆斯林女性的週五不會寫成去清真寺聚禮', E("muslimScenes({country:DATA.countries.find(x=>x.id==='PK'),sex:'f'})").every(s => !/你跟著大家去清真寺聚禮/.test(s[2])));
ok('中國穆斯林家庭的片段反映未成年人的限制', E("muslimScenes({country:DATA.countries.find(x=>x.id==='CN'),sex:'m'})").some(s => /未成年人/.test(s[2])));

// 印度教相關
ok('族群名稱不再用職業標註種姓', E("DATA.countries.filter(c=>['IN','PK','BD'].includes(c.id)).every(c=>c.people_groups.every(g=>!/皮革匠|洗衣匠|理髮匠|陶匠|榨油匠/.test(g.name)))"));
ok('印度的 Pasi 不再譯成和祆教徒同名的「帕西人」', E("!DATA.countries.find(c=>c.id==='IN').people_groups.some(g=>g.name==='帕西人（印度教）')"));
E("start();stop();me.country=DATA.countries.find(c=>c.id==='IN');me.group=me.country.people_groups.find(g=>/賈特人（錫克教）/.test(g.name));me.parentReligion='other';me.parentLabel='other';");
ok('錫克教家庭顯示為錫克教，不是民間信仰', E('relName(me)') === '錫克教' && E('relPhrase(me)') === '信錫克教');
ok('印度的國家說明寫出法律的正式名稱和支持者的理由', /宗教自由法/.test(E("PARADOX.IN[0]")) && /支持這些法律的人/.test(E("PARADOX.IN[0]")));

// 天主教相關
setup({ trad: 'catholic', sex: 'm', a: 40 });
ok('天主教用語：天主、聖神、祈禱', E("localize('你為朋友禱告，求聖靈幫助，相信神會帶領')") === '你為朋友祈禱，求聖神幫助，相信天主會帶領');
ok('天主教用語不誤換神父、神學、神蹟、精神', E("localize('神父說神蹟很少，要有精神')") === '神父說神蹟很少，要有精神');
ok('天主教面板用「天主」', !/神的恩典/.test(E('TRAD_INFO.catholic.bg[0]')) && /天主的恩典/.test(E('TRAD_INFO.catholic.bg[0]')));
E("arc={id:'scandal',s:'h3',wait:0,victims:0,f:{},cast:makeCast()}");
ok('天主教神父出事：由主教調動，不會自己另立教會', /主教/.test(E("val(ARCS.scandal.S.h3.text)")) && /調到/.test(E("val(ARCS.scandal.S.fe1.text)")));
ok('天主教神父的醜聞不寫成「外遇」', !/外遇/.test(E("val(ARCS.scandal.S.b2.text)")));
ok('天主教傳教士不用回國募款，沒有孩子不會出現傳教士子女', E("(arc={id:'mission',s:'trial',wait:0,victims:0,f:{},cast:makeCast()},me.childAt=null,ARCS.mission.S.trial.opts.filter(o=>['mk','funds'].includes(o[1])).every(o=>val(o[0])===0))"));
ok('沒有配偶的人，認錯之後不會出現「你的配偶陪你」', E("(me.partnerAt=null,ARCS.abuse.S.confEcho.opts.find(o=>o[1]==='ce2'))") && E("val(ARCS.abuse.S.confEcho.opts.find(o=>o[1]==='ce2')[0])") === 0);
ok('彌撒裡的邀請不說新教徒「沒有領洗」', !/沒有領洗加入天主教/.test(E("(me.trad='protestant',val(ARCS.th_sacr.S.start.scene))")));

// 東正教相關
const tk = cc => E(`(me.trad='orthodox',me.country=DATA.countries.find(x=>x.id==='${cc}'),tradKey())`);
ok('伊朗、土耳其的東正教歸到東方正統教會（亞美尼亞）', tk('IR') === 'oriental' && tk('TR') === 'oriental');
ok('伊拉克歸到東方亞述教會', tk('IQ') === 'assyrian' && !!E("TRAD_INFO.assyrian.bg.length"));
ok('俄羅斯仍是東正教', tk('RU') === 'eastern');
ok('東方正統教會不再說「都相信成神」', !E("TRAD_INFO.oriental.bg.join('')").includes('都相信「成神」'));
setup({ trad: 'orthodox', a: 40 }); ok('東正教用語：領洗、聖神、祈禱', E("localize('你受洗後為他禱告，求聖靈幫助')") === '你領洗後為他祈禱，求聖神幫助');
E("arc={id:'scandal',s:'h3',wait:0,victims:0,f:{},cast:makeCast()}");
ok('東正教神父出事：由主教調動', /主教/.test(E("val(ARCS.scandal.S.h3.text)")));

ok('沒有 JS 錯誤', errs.length === 0, errs.slice(0, 3).join(' / '));
console.log(res.join('\n')); const fail = res.filter(r => r.startsWith('✗')).length;
console.log(`\n${res.length - fail}/${res.length} 通過`); process.exit(fail ? 1 : 0);
