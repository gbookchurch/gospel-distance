// 用法：node tests/life-audit.js 250 index.html（HARD=1 只抽迫害前 30 名的國家）
// 人生一致性稽核：逐段人生檢查前後矛盾
const {JSDOM}=require('jsdom');const fs=require('fs');
const file=process.argv[3]||'index.html';
const dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',url:'https://x/'});
const w=dom.window,d=w.document;const errs=[];w.addEventListener('error',e=>errs.push(e.message));
w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
const hard=process.env.HARD; if(hard) w.eval(`(()=>{const o=birth;window.birth=function(D){let p;do{p=o(D)}while(!(p.country.wwl.rank&&p.country.wwl.rank<=30));return p;}})()`);
w.eval(`window.__cx=[];const _c=crossroad;window.crossroad=function(r,id){__cx.push([age,id]);return _c(r,id)};`);
const T=k=>w.eval(`(PERSECUTION_EVENTS.find(e=>e.id==='${k}')||{}).text`);
const PERS=w.eval('PERSECUTION_EVENTS.map(e=>e.text)');
const MINEV=w.eval('Object.values(MIN_EVENTS).flat(2)');
const bad={};const add=(k,v)=>{(bad[k]=bad[k]||[]).push(v)};let cxHist={};const N=+(process.argv[2]||200);
for(let i=0;i<N;i++){w.eval('start();stop();__cx=[];');let g=0;
 while(d.getElementById('end').hidden&&g++<2000){const box=d.querySelector('#choiceSlot .choice');if(box){const bt=[...box.querySelectorAll('button')];(process.env.BIAS&&bt.find(b=>/答應|接下|修院|神學院|神父|修會|全職|傳教|宣教|繼續跟隨|回應/.test(b.textContent))||bt[Math.floor(Math.random()*bt.length)]).click();w.eval('stop()');continue;}w.eval('tick(); stop();');}
 const L=[...d.querySelectorAll('#log li')].map(li=>[+li.querySelector('.a').textContent.replace(/\D/g,''),li.querySelector('.t').textContent]).reverse();
 const S=w.eval('({c:me.country.id,sex:me.sex,partner:me.partnerAt,child:me.childAt,celib:!!me.celibate,trad:me.trad,cx:__cx.slice()})');
 const at=re=>L.filter(x=>re.test(x[1])).map(x=>x[0]);
 const tag=`${S.c}${S.trad?'/'+S.trad:''}`;
 // 1 逃離國家之後，還在原地被迫害
 const fled=at(/^你決定離開自己的國家/)[0];
 if(fled!=null){const after=L.filter(x=>x[0]>fled&&PERS.includes(x[1])&&!/離開自己的國家/.test(x[1]));if(after.length)add('逃離後還在原地被迫害',`${tag} ${fled}歲逃離，之後：${after.slice(0,2).map(x=>x[0]+'歲'+x[1].slice(0,10)).join('、')}`);}
 // 2 同一件迫害事件重複
 for(const k of ['home_destroyed','family_expel','kidnapped']){const n=at(new RegExp('^'+T(k).slice(0,8))).length;if(n>1)add('同一件大事重複發生',`${tag} ${T(k).slice(0,12)}×${n}`);}
 // 3 失去工作：退休年紀以後、或全職服事中
 for(const a of at(/^你因為信仰失去了工作/)){if(a>65)add('退休年紀以後還失業',`${tag} ${a}歲`);}
 // 4 全職神職、修女之後的家庭事件
 const vow=at(/成為修女|晉鐸成為神父|發願成為修女/)[0];
 if(vow!=null){for(const x of L.filter(x=>x[0]>vow&&/趕出家門|安排你嫁給|你遇到了想共度一生|第一個孩子出生|抱到孫子|監護權/.test(x[1])))add('守獨身之後出現家庭、婚姻事件',`${tag} ${vow}歲發願，${x[0]}歲：${x[1].slice(0,14)}`);}
 // 5 被趕出家門的年紀
 for(const a of at(/^你被趕出家門/)){if(a>55)add('老年才被趕出家門',`${tag} ${a}歲`);}
 // 6 十字路口次數
 cxHist[S.cx.length]=(cxHist[S.cx.length]||0)+1; if(S.cx.length>=3)add('十字路口三次以上',`${tag} ${S.cx.map(x=>x[0]+'歲'+x[1]).join('、')}`);
 // 7 受洗重複
 const bap=at(/^你受洗了|^你嬰兒時就領洗|^你小時候受過洗/);if(bap.length>1)add('受洗兩次',`${tag} ${bap.join(',')}`);
 // 8 服事事件出現在沒有服事、或離開信仰之後
 const leaveA=at(/^你決定不再信了|^你不再去教會/);const roleEnd=at(/的位置退了下來|辭去了|交給年輕的修女/);
 const reServe=at(/你開始固定服事|你就留下來了|你開始帶領一群人|你被選為|成為牧師|晉鐸|成為修女|宣教士|傳教士|你被召喚|全職傳道|全職同工/);
 const minAfter=L.filter(x=>MINEV.includes(x[1])&&(leaveA.some(a=>x[0]>a&&!at(/重新相信|回到了教會|回到教會|又走進了教會/).some(r=>r>a&&r<=x[0]))||roleEnd.some(a=>x[0]>a&&!reServe.some(r=>r>a&&r<=x[0]))));
 // 8b 沒在服事卻「服事得很累」
 for(const a of at(/^你服事得很累/)){const lastStart=Math.max(-1,...reServe.filter(r=>r<=a));const lastEnd=Math.max(-1,...[...roleEnd,...at(/你想先停下來|不再去教會|不再信了/)].filter(r=>r<a));if(lastStart<0||lastEnd>=lastStart)add('沒在服事卻服事得很累',`${tag} ${a}歲`);}
 if(minAfter.length)add('服事事件出現在卸任或離開之後',`${tag} ${minAfter[0][0]}歲 ${minAfter[0][1].slice(0,14)}`);
 // 9 決定跟隨耶穌兩次（中間沒有離開）
 if(at(/^你決定跟隨耶穌/).length>1)add('重複決志',`${tag}`);
 // 10 提到不存在的配偶、孩子
 for(const x of L){if(/你的配偶|配偶問你/.test(x[1])&&!(S.partner!=null&&S.partner<=x[0]))add('提到不存在的配偶',`${tag} ${x[0]}歲 ${x[1].slice(0,16)}`);if(/^你的孩子|教自己的孩子|孩子長大以後問你|孩子說跟你不熟/.test(x[1])&&!(S.child!=null&&S.child<=x[0]))add('提到不存在的孩子',`${tag} ${x[0]}歲 ${x[1].slice(0,16)}`);}
 // 11 在學校的事件超過 18 歲；兒童事件太晚
 for(const x of L){if(/在學校被同學和老師針對/.test(x[1])&&x[0]>18)add('成年後在學校被霸凌',`${tag} ${x[0]}`);}
 // 12 同一年的事件太多（同一歲超過 6 則，不含備註）
 const per={};for(const x of L){if(/^(信仰的背景|真實的故事|說明|小提醒|如果你)/.test(x[1]))continue;per[x[0]]=(per[x[0]]||0)+1;}for(const [a,n] of Object.entries(per))if(n>=7)add('同一年發生太多事',`${tag} ${a}歲 ${n}則`);
 // 13 殉道、死亡後還有事件（不含結語）
 if(i%50===0)w.localStorage.clear();
}
console.log('十字路口次數分布',JSON.stringify(cxHist));
for(const [k,v] of Object.entries(bad).sort((a,b)=>b[1].length-a[1].length))console.log(`【${k}】${v.length} 次  例：${v.slice(0,3).join(' ｜ ')}`);
console.log('errs',errs.slice(0,3));process.exit(0);
