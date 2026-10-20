// gospel.js：「第一次聽見福音」的機率模型 v0.1
// 用法：瀏覽器或 Node 都能跑。所有 TUNING 參數是設計假設，不是統計資料，之後可以調。

const TUNING = {
  // 身邊信徒帶來的接觸強度：福音派會主動分享，名義基督徒影響較弱
  evangelicalWeight: 1.0,
  nominalWeight: 0.08,
  // 把「身邊信徒比例」換成一年內遇到的機率，k 越大越容易遇到
  contactK: 0.5,
  // 南亞缺福音派資料時，用基督徒比例的這個倍數推估
  evangelicalFallbackRatio: 0.2,
  // 媒體管道（聖經、福音影片、廣播、網路）每年的基本機率，依母語聖經狀態
  mediaByBible: { full: 0.006, nt: 0.005, portions: 0.0025, started: 0.0008, none: 0.0004, null: 0.001 },
  // 家裡是基督徒：每年都會聽到，幾乎一定在 3 到 6 歲之間
  christianHomeStartAge: 3,
  christianHomeYearly: 0.6,
};

// 年齡曲線：童年低，青少年到大學（同學、營會、留學）最高，中年後下降
function ageFactor(age) {
  if (age < 5) return 0.15;
  if (age < 12) return 0.6;
  if (age < 18) return 1.2;
  if (age < 26) return 1.4;
  if (age < 40) return 1.0;
  if (age < 60) return 0.7;
  return 0.5;
}

// 迫害讓公開傳福音變難：教會生活和國家層面的壓力會壓低接觸機率
function restriction(country) {
  const s = country.wwl && country.wwl.spheres;
  if (!s) return 1;
  const pressure = (s.church + s.national) / (2 * 16.667); // 0~1
  return 1 - 0.92 * Math.pow(pressure, 1.5); // 北韓這種滿分壓力只剩 8%，壓力中等時影響較溫和
}

function groupEvangelical(group, country) {
  if (group.evangelical_pct != null && !country.evangelical_pct_note) return group.evangelical_pct / 100;
  const c = (group.christian_pct ?? country.christian_pct ?? 0) / 100;
  return c * TUNING.evangelicalFallbackRatio;
}

// 某一年（age 歲）第一次聽見福音的機率
function yearlyHearProb(person, age) {
  const { country, group, parentReligion } = person;
  if (parentReligion === 'christian') {
    return age >= TUNING.christianHomeStartAge ? TUNING.christianHomeYearly : 0;
  }
  const E = groupEvangelical(group, country);
  const C = Math.max(0, (group.christian_pct ?? 0) / 100 - E);
  const exposure = TUNING.evangelicalWeight * E + TUNING.nominalWeight * C;
  const contact = 1 - Math.exp(-TUNING.contactK * exposure * 10);
  const media = TUNING.mediaByBible[group.bible_status ?? 'null'];
  const r = restriction(country);
  const p = (contact * r + media * r) * ageFactor(age);
  return Math.min(p, 0.95);
}

// 跑一生：回傳第一次聽見的年齡，沒聽見回傳 null
function simulateFirstHearing(person, lifespan, rand = Math.random) {
  for (let age = 0; age <= lifespan; age++) {
    if (rand() < yearlyHearProb(person, age)) return age;
  }
  return null;
}

// 加權抽籤
function pickWeighted(items, weightFn, rand = Math.random) {
  const total = items.reduce((s, x) => s + weightFn(x), 0);
  let t = rand() * total;
  for (const x of items) { t -= weightFn(x); if (t <= 0) return x; }
  return items[items.length - 1];
}

// 出生：國家依出生數、族群依人口、父母宗教依 Pew（族群若有基督徒比例則用族群的）
function birth(data, rand = Math.random) {
  const country = pickWeighted(data.countries, c => c.births_per_year, rand);
  const group = pickWeighted(country.people_groups, g => g.population, rand);
  // 國家總量用 Pew（表面可見的比例），族群間的高低差用 Joshua Project 調整
  const rel = country.christian_pct ? (group.christian_pct ?? country.christian_pct) / country.christian_pct : 1;
  const pChristian = Math.min(0.98, country.religion_pct.christian / 100 * rel);
  const parentReligion = rand() < pChristian ? 'christian' : 'other';
  const sex = rand() < 0.512 ? 'm' : 'f';
  return { country, group, parentReligion, sex };
}

if (typeof module !== 'undefined') module.exports = { TUNING, ageFactor, restriction, yearlyHearProb, simulateFirstHearing, birth, pickWeighted };
