// events.js：聽見福音後的抉擇，以及信主後的人生事件 v0.1
// 依賴 gospel.js 的 person 結構：{ country, group, parentReligion, sex }
// 事件文字只寫發生了什麼，不描寫暴力畫面。標 help: true 的事件，畫面上要一併顯示求助與代禱資源。

// ── 抉擇點 ─────────────────────────────────────────────
// 玩家自己選；同時出生的另外四個人（NPC）用這裡的機率自動選。
// NPC 的回應率是設計假設：身邊有信徒群體可以加入時，回應的人比較多。
const CHOICES = {
  respond: { label: '回應', desc: '你決定跟隨耶穌。' },
  wait:    { label: '想再看看', desc: '你把聽到的放在心裡。之後可能還會再遇到。' },
  decline: { label: '不接受', desc: '你覺得這跟你沒有關係。' },
};

function npcChoice(person, E, rand = Math.random) {
  const respond = Math.min(0.35, 0.04 + 1.5 * E);
  const r = rand();
  if (r < respond) return 'respond';
  if (r < respond + 0.45) return 'wait';
  return 'decline';
}

// 選了「想再看看」或「不接受」之後，每年再次聽見的機率是第一次的這個倍數
const REHEAR_FACTOR = { wait: 0.6, decline: 0.25 };

// ── 信主後的事件 ────────────────────────────────────────
// once: true 的是持續狀態（例如必須藏聖經），一生只觸發一次；其他可以重複發生。
// sphere 對應 WWL 六大面向；base 是該面向滿分（16.667）時每年發生的機率。
// 實際機率 = base × (分數 / 16.667)^2，壓力中等的國家會明顯少很多。
// lowPressure 事件只在不在迫害名單上的國家觸發，用固定機率。
const PERSECUTION_EVENTS = [
  // 私人生活
  { id: 'hide_bible', once: true, sphere: 'private', base: 0.30, text: '你必須把聖經藏起來，只敢在沒人的時候讀。' },
  { id: 'secret_prayer', once: true, sphere: 'private', base: 0.25, text: '你不能讓任何人看到你禱告，連手機裡的經文都要刪掉。' },
  { id: 'discovered', once: true, sphere: 'private', base: 0.08, text: '有人發現了你的信仰，你開始擔心接下來會發生什麼事。' },
  // 家庭生活
  { id: 'family_oppose', once: true, sphere: 'family', base: 0.30, text: '家人強烈反對你的信仰，要你放棄。' },
  { id: 'family_expel', once: true, sphere: 'family', base: 0.06, text: '你被趕出家門，家族和你斷絕關係。' },
  { id: 'forced_marriage', once: true, sphere: 'family', base: 0.04, sex: 'f', minAge: 14, maxAge: 30, noPartner: true, text: '家人安排你嫁給一個不是基督徒的人，你沒有拒絕的餘地。' },
  { id: 'child_custody', once: true, sphere: 'family', base: 0.02, minAge: 25, needsChild: true, text: '因為你的信仰，你失去了孩子的監護權。' },
  // 社區生活
  { id: 'isolated', once: true, sphere: 'community', base: 0.25, text: '鄰居開始疏遠你，有些店家不再賣東西給你。' },
  { id: 'job_loss', sphere: 'community', base: 0.050, minAge: 18, text: '你因為信仰失去了工作。' },
  { id: 'school_bullied', sphere: 'community', base: 0.06, maxAge: 18, text: '你在學校被同學和老師針對。' },
  // 國家生活
  { id: 'id_religion', once: true, sphere: 'national', base: 0.20, minAge: 16, muslimMajority: true, text: '在法律上，你的宗教身分仍登記為原本的宗教，沒辦法更改。' },
  { id: 'summoned', sphere: 'national', base: 0.04, minAge: 16, text: '你被警方傳喚問話。' },
  { id: 'detained', sphere: 'national', base: 0.015, minAge: 16, help: true, text: '你被拘留，沒有經過審判。' },
  { id: 'flee_country', once: true, sphere: 'national', base: 0.015, minAge: 18, text: '你決定離開自己的國家。' },
  // 教會生活
  { id: 'no_church', once: true, sphere: 'church', base: 0.30, text: '附近沒有可以公開聚會的教會，只能在家裡和少數人偷偷聚。' },
  { id: 'church_closed', sphere: 'church', base: 0.040, text: '你聚會的地方被關閉了。' },
  { id: 'raid', sphere: 'church', base: 0.025, help: true, text: '你們的聚會被突襲，有幾個人被帶走。' },
  // 暴力
  { id: 'attacked', sphere: 'violence', base: 0.02, help: true, text: '你因為信仰遭到攻擊，受了傷。' },
  { id: 'home_destroyed', sphere: 'violence', base: 0.01, help: true, text: '你的村子被襲擊，家園被毀，你被迫逃離。' },
  { id: 'kidnapped', sphere: 'violence', base: 0.003, help: true, text: '你身邊有人被綁架了。' },
  // 死亡另外處理，見 MARTYRDOM
];

// 不在名單上的國家：壓力不大，但仍有真實的掙扎
const LOW_PRESSURE_EVENTS = [
  { id: 'ancestor', once: true, countries: ['TW', 'KR', 'JP', 'CN'], prob: 0.15, text: '家裡祭祖拜拜的時候，你不知道該怎麼面對長輩的期待。' },
  { id: 'family_cold', once: true, prob: 0.05, text: '家人不太理解你的新信仰，關係變得有點冷。' },
  { id: 'church_hurt', once: true, minAge: 16, prob: 0.03, text: '你在教會裡受了傷，有一陣子不想再去。' },
  { id: 'burnout', once: true, minAge: 20, prob: 0.03, text: '你服事得很累，開始懷疑自己為什麼還在這裡。' },
  { id: 'doubt', once: true, minAge: 14, prob: 0.04, text: '你經歷了一段很長的信仰懷疑期。' },
];

// 正向事件：每個人都可能發生，機率受教會生活壓力和聖經狀態影響
const GROWTH_EVENTS = [
  { id: 'baptized', once: true, prob: 0.4, openPower: 2, text: '你受洗了。' },
  { id: 'found_church', once: true, prob: 0.35, openPower: 3, text: '你找到了一群可以一起聚會的弟兄姊妹。' },
  { id: 'read_bible', once: true, prob: 0.15, needsBible: true, text: '你第一次用自己的母語把整本新約讀完。' },
  { id: 'share_faith', prob: 0.08, text: '你把福音告訴了一個朋友。' },
  { id: 'lead_to_faith', prob: 0.02, text: '有一個人因為你而信了耶穌。' },
];

// 因信仰被殺：用 WWL 2026 的數字校準。一年約 4,849 人，大多集中在暴力分數高的國家。
// 每年機率 = 3e-5 × (暴力分數 / 16.667)^4。奈及利亞一年約 3,000 多名基督徒因信仰被殺、基督徒約一億多人，換算約 3e-5，壓力中等的國家幾乎為 0。
const MARTYRDOM = { base: 3e-5, power: 4, help: true, text: '你因為信仰失去了生命。' };

// ── 每年的事件判定 ──────────────────────────────────────
function scoreRatio(country, sphere) {
  const s = country.wwl && country.wwl.spheres;
  return s ? s[sphere] / 16.667 : 0;
}

// 族群本身的基督徒比例：同一個國家裡，身在基督徒為主的族群和身在少數，處境差很多
const SCOPE = {
  scarcity: ['hide_bible', 'secret_prayer', 'no_church'],
  social: ['discovered', 'family_oppose', 'family_expel', 'forced_marriage', 'child_custody', 'isolated', 'job_loss', 'school_bullied', 'id_religion'],
};
function christianShare(person) {
  const g = person.group.christian_pct ?? person.country.christian_pct ?? 0;
  return Math.min(1, Math.max(0, g / 100));
}
function countryShare(person) { return Math.min(1, (person.country.religion_pct?.christian ?? 0) / 100); }
function minorityFactor(ev, person) {
  // 附近有沒有教會：族群和國家整體取比較高的那個（族群裡基督徒少，城裡仍可能有教會）
  const c = ev.id === 'no_church' ? Math.max(christianShare(person), countryShare(person)) : christianShare(person);
  if (SCOPE.scarcity.includes(ev.id)) return Math.pow(1 - c, 2); // 基督徒多的地方，不缺教會和聖經
  if (SCOPE.social.includes(ev.id)) return 1 - c;                // 家人和鄰居多半也是基督徒
  // 國家管控和暴力常常就是衝著基督徒社群來的；但基督徒過半的族群裡，壓力多半只落在少數人（改信者、教會領袖）身上
  return c < 0.5 ? 1 - 0.5 * c : 1.5 * (1 - c);
}

// 只有改信的人才會遇到的事：從小在基督徒家庭長大，家人本來就是基督徒
const CONVERT_ONLY = ['family_oppose', 'family_expel', 'forced_marriage', 'child_custody', 'id_religion', 'family_cold', 'ancestor'];

// 中國：在三自教會或家庭教會聚會，教會生活和國家層面的事件機率不同
// 估計比例約三自四成、家庭教會六成（FDD 2025 整理的 2010 年估計），0.4 × 0.4 + 0.6 × 1.4 = 1，全國總量不變
// 「附近沒有可以公開聚會的教會」不會發生在三自教會的人身上，家庭教會 × 1.67 補回
const CN_CHURCH_FACTOR = {
  tspm: { raid: 0.4, church_closed: 0.4, summoned: 0.4, detained: 0.4, no_church: 0 },
  house: { raid: 1.4, church_closed: 1.4, summoned: 1.4, detained: 1.4, no_church: 1.67 },
};
function cnChurchFactor(ev, person) {
  if (person.country.id !== 'CN' || person.emigrated || !person.cnChurch) return 1;
  return CN_CHURCH_FACTOR[person.cnChurch][ev.id] ?? 1;
}

function bibleAvailable(group) {
  return ['full', 'nt'].includes(group.bible_status);
}

function fits(ev, person, age) {
  if (ev.sex && ev.sex !== person.sex) return false;
  if (ev.minAge != null && age < ev.minAge) return false;
  if (ev.maxAge != null && age > ev.maxAge) return false;
  if (ev.countries && !ev.countries.includes(person.country.id)) return false;
  // 宗教身分無法在法律上更改，只在穆斯林佔多數的國家出現（Pew 2020）
  if (ev.muslimMajority && (person.country.religion_pct?.muslim ?? 0) <= 50) return false;
  if (person.parentReligion === 'christian' && CONVERT_ONLY.includes(ev.id)) return false;
  // 能不能公開聚會、要不要把聖經藏起來，要看國家整體：
  // 基督徒過半的國家，到處都有公開的教會，不會出現「附近沒有可以公開聚會的教會」
  // 從小在基督徒家庭長大的人，只有在信仰本身幾乎不被允許的國家（WWL 該面向分數 15 以上）才需要偷偷聚會、把聖經藏起來
  const sc = person.country.wwl && person.country.wwl.spheres, born = person.parentReligion === 'christian';
  if (ev.id === 'no_church' && (countryShare(person) >= 0.5 || (born && sc && sc.church < 15))) return false;
  if ((ev.id === 'hide_bible' || ev.id === 'secret_prayer') && born && sc && sc.private < 15) return false;
  // 失去監護權：這一生要有孩子，而且孩子已經出生
  if (ev.needsChild && (person.childAt == null || age <= person.childAt)) return false;
  // 被安排婚姻：已經遇到想共度一生的人之後就不會出現
  if (ev.noPartner && person.partnerAt != null && age >= person.partnerAt) return false;
  // 離開自己的國家之後，原本國家的國家層面事件不再出現
  if (person.emigrated && ev.sphere === 'national') return false;
  // 沒去教會的期間，不會遇到聚會被關閉、被突襲這類教會生活事件
  if (person.dechurched && ev.sphere === 'church') return false;
  // 在基督徒過半的族群裡長大的基督徒，不太會被鄰居排擠或擔心信仰被發現
  if (person.parentReligion === 'christian' && ['isolated', 'discovered'].includes(ev.id) && christianShare(person) >= 0.5) return false;
  return true;
}

// 回傳這一年發生的事件陣列；state 用來記住 once 事件和是否已過世
function believerYear(person, age, state, rand = Math.random) {
  const out = [];
  const c = person.country;
  state.done = state.done || {};

  if (c.wwl && c.wwl.spheres) {
    for (const ev of PERSECUTION_EVENTS) {
      if (!fits(ev, person, age) || (ev.once && state.done[ev.id])) continue;
      const p = ev.base * Math.pow(scoreRatio(c, ev.sphere), 2) * minorityFactor(ev, person) * cnChurchFactor(ev, person);
      if (rand() < p) {
        out.push(ev); if (ev.once) state.done[ev.id] = true;
        if (ev.id === 'flee_country') person.emigrated = true;
        if (ev.id === 'forced_marriage') person.partnerAt = age;
      }
    }
    const pm = MARTYRDOM.base * Math.pow(scoreRatio(c, 'violence'), MARTYRDOM.power) * (1 - 0.7 * christianShare(person));
    if (rand() < pm) { out.push({ id: 'martyred', ...MARTYRDOM }); state.dead = true; return out; }
  } else {
    for (const ev of LOW_PRESSURE_EVENTS) {
      if (!fits(ev, person, age) || (ev.once && state.done[ev.id])) continue;
      if (rand() < ev.prob) { out.push(ev); if (ev.once) state.done[ev.id] = true; }
    }
  }

  // 教會受限的程度：國家的教會生活壓力，但在基督徒為主的族群裡，教會本來就在身邊
  const churchOpen = 1 - 0.8 * scoreRatio(c, 'church') * (1 - christianShare(person));
  for (const ev of GROWTH_EVENTS) {
    if (ev.once && state.done[ev.id]) continue;
    if (ev.needsBible && !bibleAvailable(person.group)) continue;
    const p = ev.prob * Math.pow(churchOpen, ev.openPower ?? 1);
    if (rand() < p) { out.push(ev); if (ev.once) state.done[ev.id] = true; }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { CHOICES, npcChoice, REHEAR_FACTOR, PERSECUTION_EVENTS, LOW_PRESSURE_EVENTS, GROWTH_EVENTS, MARTYRDOM, believerYear };
