// 固定人生測試：12 種結局，檢查終章、摘要、分享文字、分享卡結語、追思館、比較是否一致
// 用法：node tests/endings.test.js path/to/index.html   （需要 jsdom）
const { JSDOM } = require('jsdom'); const fs = require('fs');
const file = process.argv[2] || 'index.html';
const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { runScripts: 'dangerously', url: 'https://x/' });
const w = dom.window, d = w.document;
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {};
w.HTMLCanvasElement.prototype.getContext = () => null;
const J = (age, kind) => `{age:${age},kind:'${kind}'}`;
// [名稱, 國家, 基督徒家庭, 狀態設定, 是否殉道, 期望]
const CASES = [
  ['1 一生沒有接觸福音', 'JP', false, `firstAge=null;faithAge=null;phase='unheard';journey=[];`, false, { first: null, faith: null, ep: /沒有機會清楚認識/, card: /從來沒有機會接觸福音/, notEp: /拒絕|跟隨耶穌/ }],
  ['2 接觸過，沒有成為基督徒', 'TW', false, `firstAge=22;faithAge=null;phase='decline';channel={age:22,short:'同事',id:'coworker'};journey=[];`, false, { first: 22, faith: null, ep: /最後沒有選擇成為基督徒/, card: /22 歲第一次接觸到福音/ }],
  ['3 基督徒家庭，沒有接受信仰', 'US', true, `firstAge=3;faithAge=null;phase='decline';journey=[];`, false, { first: 3, faith: null, ep: /基督徒家庭長大，最後沒有選擇/, card: /3 歲第一次接觸到福音/ }],
  ['4 接觸福音後選擇相信', 'KR', false, `firstAge=19;faithAge=19;phase='believer';channel={age:19,short:'營會',id:'camp'};journey=[${J(19,'faith')}];`, false, { first: 19, faith: 19, ep: /19 歲決定跟隨耶穌/, card: /19 歲接觸到福音，也決定跟隨耶穌/ }],
  ['5 信主後一直維持信仰', 'BR', false, `firstAge=12;faithAge=16;phase='believer';channel={age:12,short:'同學',id:'classmate'};journey=[${J(16,'faith')}];`, false, { first: 12, faith: 16, ep: /16 歲決定跟隨耶穌/, card: /12 歲接觸到福音，16 歲決定跟隨耶穌/ }],
  ['6 離開教會，仍然相信', 'TW', false, `firstAge=8;faithAge=25;phase='dechurched';journey=[${J(25,'faith')},${J(50,'dechurch')}];`, false, { first: 8, faith: 25, ep: /50 歲離開了教會/, card: /仍然相信耶穌/, notEp: /放下了信仰/, sum: /離開教會/ }],
  ['7 信主後放下信仰', 'DE', false, `firstAge=14;faithAge=17;phase='left';journey=[${J(17,'faith')},${J(33,'leave')}];`, false, { first: 14, faith: 17, ep: /33 歲放下了信仰/, card: /後來放下了信仰/ }],
  ['8 放下信仰，後來重新相信', 'US', false, `firstAge=10;faithAge=18;phase='believer';journey=[${J(18,'faith')},${J(30,'leave')},${J(45,'return_faith')}];`, false, { first: 10, faith: 18, ep: /曾經離開，後來又回來/, sum: /重新回到信仰/ }],
  ['9 離開教會，後來回到教會', 'PH', false, `firstAge=9;faithAge=20;phase='believer';journey=[${J(20,'faith')},${J(28,'dechurch')},${J(36,'return_church')}];`, false, { first: 9, faith: 20, ep: /曾經離開，後來又回來/, sum: /回到教會/ }],
  ['10 因信仰失去生命', 'NG', false, `firstAge=15;faithAge=15;phase='believer';st={dead:true};journey=[${J(15,'faith')}];`, true, { first: 15, faith: 15, ep: /因為信仰/, card: /因為信仰提早走完/, sum: /因信仰離世/ }],
  ['11 經歷信仰壓力，沒有放棄', 'IN', false, `firstAge=20;faithAge=21;phase='believer';stats={persecution:3,growth:0};journey=[${J(21,'faith')}];`, false, { first: 20, faith: 21, ep: /3 次因信仰而來的壓力/, notEp: /失去了生命|提早走完/ }],
  ['12 從小接觸，成年後才信主', 'TW', true, `firstAge=4;faithAge=27;phase='believer';journey=[${J(27,'faith')}];`, false, { first: 4, faith: 27, ep: /27 歲決定跟隨耶穌/, card: /4 歲接觸到福音，27 歲決定跟隨耶穌/ }],
];
let fail = 0; const report = [];
w.localStorage.clear();
CASES.forEach(([name, cc, cfam, set, mart, E], i) => {
  w.eval(`start();stop();me.country=DATA.countries.find(c=>c.id==='${cc}');me.group=me.country.people_groups.slice().sort((a,b)=>b.population-a.population)[0];me.parentReligion='${cfam ? 'christian' : 'other'}';me.parentLabel='${cfam ? 'protestant' : 'unaffiliated'}';assignTrad(me);me.lifespan=70;age=70;channel=null;stats={persecution:0,growth:0};st={};highlights=[];arcEnds=[];ministry=newMinistry();${set}`);
  w.eval(`finish(${mart})`);
  const ep = [...d.querySelectorAll('#epitaph p')].map(p => p.textContent).join('');
  const sum = Object.fromEntries([...d.querySelectorAll('#summary div')].map(x => [x.querySelector('dt').textContent, x.querySelector('dd').textContent]));
  const card = w.eval(`cardLine(70, ${mart})`), share = w.eval(`shareText(70, ${mart})`);
  const lives = JSON.parse(w.localStorage.getItem('gospel-distance-lives')), L = lives[lives.length - 1];
  const mem = w.eval(`lifeSummary(${JSON.stringify(L)})`);
  const errs = [];
  if (L.firstAge !== E.first || L.faithAge !== E.faith) errs.push('追思館年齡不一致');
  const fa = sum['第一次接觸福音'];
  if (E.first === null ? !/一生沒有機會/.test(fa) : !fa.startsWith(E.first + ' 歲')) errs.push('摘要首次接觸：' + fa);
  if (E.first !== null && !mem.includes(E.first + ' 歲接觸到福音')) errs.push('追思館首次接觸：' + mem);
  if (E.ep && !E.ep.test(ep)) errs.push('終章缺：' + E.ep);
  if (E.notEp && E.notEp.test(ep)) errs.push('終章不該有：' + E.notEp);
  if (E.card && !E.card.test(card)) errs.push('分享卡結語：' + card);
  if (!share.includes(card)) errs.push('分享文字沒有和分享卡同一句');
  if (E.sum && !E.sum.test(sum['信仰選擇'] + mem)) errs.push('摘要／追思館缺：' + E.sum);
  if (E.faith === null && /信主/.test(mem)) errs.push('追思館寫成信主');
  if (!mart && /因信仰離世/.test(mem + sum['信仰選擇'])) errs.push('沒有殉道卻寫成殉道');
  if (errs.length) fail++;
  report.push(`${errs.length ? '✗' : '✓'} ${name}\n  終章：${ep}\n  摘要：${fa}｜${sum['信仰選擇']}\n  分享卡：${card}\n  追思館：${mem}${errs.length ? '\n  問題：' + errs.join('；') : ''}`);
});
console.log(report.join('\n\n')); console.log(`\n${CASES.length - fail}/${CASES.length} 通過`);
process.exit(fail ? 1 : 0);
