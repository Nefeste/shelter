// Маршрут поездки (docs/specs/2026-11-bike-weekend.md, §4): этапы по минутам вместо дней дома.
// Скорость — от дороги, груза, ветра и дождя; привалы и обед; прокол, поломка, клещ, падение;
// вода и еда по часам езды; ночь у озера. Неудача — сход с маршрута: свернули к станции, за семьёй
// приехали; никто не пострадал всерьёз. Целые числа; случайность — только ветви зерна.
import type { Good, Risk, Scenario, Solution } from '../content/types';
import { Rng } from './core/rng';
import type { DayLog, EvacReason, Outcome, Shortage, StageLog } from './days';
import { type PrepState, type World, packed } from './prep';

/** Решения, которые работают в поездке: выбранные и законченные (что не пришло — `works` ниже). */
function activeRide(w: World, s: PrepState): Solution[] {
  const out: Solution[] = [];
  for (const sid of Object.values(s.chosen)) {
    const sol = w.solution(sid);
    if (sol.beforeEvent && !s.done.includes(sid)) continue;
    out.push(sol);
  }
  return out;
}

/** Груз на взрослый велосипед, граммы: всё уложенное, вода во флягах и бутылках, мелочи. */
export function loadPerAdultG(w: World, s: PrepState, waterDl: number): number {
  const sc = w.scenario(s.scenario);
  const r = sc.ride!;
  let g = r.baseKg * 1000 + waterDl * 100;
  for (const p of packed(w, s)) {
    const good = w.good(p.good);
    // вода в бутылках — отдельно, по тому, сколько её сейчас
    const mass = good.provides?.waterDl ? (good.massG ?? 0) - good.provides.waterDl * 100 : (good.massG ?? 0);
    g += Math.max(0, mass) * p.qty;
  }
  const shares = ridersOf(sc).reduce((n, p) => n + r.share[p.kind], 0);
  return Math.floor((g * r.share.adult) / shares);
}

/** Кто едет: `ride.riders` из семьи; нет списка — все. */
export function ridersOf(sc: Scenario): Scenario['family'] {
  const ids = sc.ride?.riders;
  return ids ? sc.family.filter(p => ids.includes(p.id)) : sc.family;
}

/**
 * Бревет (правила ACP, ст. 10): во сколько закрывается КП на `km` от старта — `start` плюс
 * `closeBaseMin` и путь по быстрой скорости на первых `fastKm`, дальше — по медленной от нуля
 * (на 60 км обе дают одно время). Округление — до минуты.
 */
export function controlClose(b: NonNullable<NonNullable<Scenario['ride']>['brevet']>, startMin: number, km: number): number {
  const min = km <= b.fastKm ? b.closeBaseMin + (km * 600) / b.fastKmh10 : (km * 600) / b.slowKmh10;
  return startMin + Math.round(min);
}

/** На сколько процентов медленнее с таким грузом; за спиной — порог ниже, наклон круче. */
export function slowPct(sc: Scenario, loadG: number, onBack: boolean): number {
  const r = sc.ride!;
  const k = onBack ? r.backFactor : 1;
  const over = loadG - Math.floor((r.lightKg * 1000) / k);
  if (over <= 0) return 0;
  return Math.min(r.slowMaxPct, Math.floor((over * r.slowPctPerKg * k) / 1000));
}

/** Минуты в движении: км × 60 / (скорость км/ч). Скорость — ×10 и проценты. */
function movingMin(km: number, speed10: number): number {
  return Math.ceil((km * 600) / Math.max(1, speed10));
}

const has = (goods: Good[], f: (g: Good) => boolean) => goods.some(f);

/** Литры «под рукой»: сумки на руле и раме; карман рюкзака — только когда рюкзак за спиной. */
export function handLitres(w: World, pack: { good: string; qty: number }[], onBack: boolean): number {
  let l = 0;
  for (const p of pack) {
    const bag = w.good(p.good).bag;
    if (!bag?.handL || (bag.slot === 'back' && !onBack)) continue;
    l += bag.handL * p.qty;
  }
  return l;
}

/**
 * Маршрут. `misses[этап]` — сколько раз в «моменте» этапа достали не то: столько раз минуты
 * поиска (`costMin`) прибавляются к этапу. Случайность от них не зависит.
 */
export function runRide(w: World, s: PrepState, seed: number, misses: readonly number[] = []): Outcome {
  const sc = w.scenario(s.scenario);
  const r = sc.ride!;
  const rng = Rng.seeded(seed).fork('ride');
  const sols = activeRide(w, s);
  const late = s.bought.filter(p => p.arrivesDay >= sc.prepDays).map(p => p.good);
  const lateSet = new Set(late);
  const unfinished = Object.values(s.chosen).filter(sid => w.solution(sid).beforeEvent && !s.done.includes(sid));
  // решение, чей товар не пришёл (велосипед не забрали из мастерской), своей защиты не даёт
  const works = (sol: Solution) => !sol.goods.some(g => lateSet.has(g.good));

  const pack = packed(w, s).filter(p => !lateSet.has(p.good));
  const goods = pack.map(p => w.good(p.good));
  const count = (f: (g: Good) => boolean) => pack.reduce((n, p) => n + (f(w.good(p.good)) ? p.qty : 0), 0);

  const onBack = sols.some(x => x.onBack);
  const buried = sols.some(x => x.buried);
  // под рукой: сколько литров достать на ходу и что туда легло — сначала дождевики, потом остальное
  let handL = handLitres(w, pack, onBack);
  let ponchoAtHand = false;
  const ponchos = count(g => g.rain === 'people');
  if (ponchos && !buried) {
    const need = pack.filter(p => w.good(p.good).rain === 'people').reduce((n, p) => n + Math.max(1, w.good(p.good).volumeL) * p.qty, 0);
    if (need <= handL) { ponchoAtHand = true; handL -= need; }
  }
  const gearDry = has(goods, g => g.rain === 'gear');
  const front = has(goods, g => g.bikeLight === 'front' || g.bikeLight === 'head');
  const rear = has(goods, g => g.bikeLight === 'rear' || g.bikeLight === 'reflect');
  const anyLight = front || rear;
  const canBoil = has(goods, g => !!g.boils) && has(goods, g => !!g.cooks);
  const cooking = has(goods, g => !!g.cooks);

  // фляги и бутылки: ёмкость, вода в начале — полные фляги и купленная вода
  const flaskDl = pack.reduce((n, p) => n + (w.good(p.good).flaskDl ?? 0) * p.qty, 0);
  const bottleDl = pack.reduce((n, p) => n + (w.good(p.good).provides?.waterDl ?? 0) * p.qty, 0);
  const capDl = flaskDl + bottleDl;
  let water = capDl;
  // еда: калории всего уложенного, крупа — только если есть на чём варить; ловушка портит долю
  let kcal = 0;
  for (const p of pack) {
    const g = w.good(p.good);
    if (g.needsCooking && !cooking) continue;
    kcal += (g.provides?.kcal ?? 0) * p.qty;
  }
  for (const sol of sols) {
    if (sol.keepsPct === undefined) continue;
    for (const { good, qty } of sol.goods) kcal -= Math.floor(((w.good(good).provides?.kcal ?? 0) * qty * (100 - sol.keepsPct)) / 100);
  }
  kcal = Math.max(0, kcal);
  const startWater = water;
  const startKcal = kcal;

  // беды и защиты — как дома: остаток в процентах после всех защит
  const risks = new Set<Risk>();
  const remains: Partial<Record<Risk, number>> = {};
  for (const sol of sols) for (const x of sol.risks ?? []) risks.add(x);
  for (const sol of sols) {
    if (!works(sol)) continue;
    for (const g of sol.guards ?? []) remains[g.risk] = Math.floor(((remains[g.risk] ?? 100) * (100 - g.stopsPct)) / 100);
  }
  const left = (x: Risk) => remains[x] ?? 100;

  const people = ridersOf(sc);
  const drinkPerH = people.reduce((n, p) => n + r.drinkDlPerH[p.kind], 0);
  const campDl = people.reduce((n, p) => n + r.campDl[p.kind], 0);
  const kcalPerH = people.reduce((n, p) => n + r.kcal[p.kind], 0);
  const campKcal = people.reduce((n, p) => n + r.campKcal[p.kind], 0);

  const rides = r.stages.map((st, i) => ({ st, i })).filter(x => x.st.kind === 'ride');
  // погода: дождь на одном из этапов, ветер на день
  const wx = rng.fork('weather');
  const rainAt = wx.chance(r.rainPct * 100) ? rides[wx.range(0, rides.length - 1)].i : -1;
  const days = Math.max(...r.stages.map(x => x.day)) + 1;
  const wind = Array.from({ length: days }, () => [-r.windPct, 0, r.windPct][wx.range(0, 2)]);
  const nightC = rng.fork('night').range(r.nightC[0], r.nightC[1]);
  // прокол — на этапе, по километрам; поломка, клещ — на одном из этапов, если защита не остановила
  const flats = rng.fork('flat');
  const flatAt = rides.map(x => flats.chance(x.st.km * r.flatPer100 * 100 / 100));
  const flatFixed = rides.map(() => flats.chance((100 - left('flat')) * 100));
  const brk = rng.fork('break');
  const breakAt = brk.chance(left('break') === 100 ? r.breakPct * 100 : Math.floor((r.breakPct * left('break')) / 100) * 100) ? rides[brk.range(0, rides.length - 1)].i : -1;
  const tk = rng.fork('tick');
  const tickBase = risks.has('tick') ? 100 : r.tickPct;
  const tickAt = tk.chance(Math.floor((tickBase * left('tick')) / 100) * 100) ? rides[tk.range(0, rides.length - 1)].i : -1;
  const fl = rng.fork('fall');
  const fallAt = risks.has('fall') ? rides.map(() => fl.chance(r.fallPct * 100)) : rides.map(() => false);
  const stomach = rng.fork('stomach').chance(risks.has('stomach') ? r.stomachPct * 100 : 0);
  // ночью может сесть фонарь; запасные батарейки — защита
  const lightOut = rng.fork('lightout').chance(Math.floor(((r.lightOutPct ?? 0) * left('lightout')) / 100) * 100);
  const vestOn = has(goods, g => g.bikeLight === 'reflect');
  // по правилам бревета (ст. 6) фары и фонари — прочно на велосипеде: налобный не в счёт
  const lamps = has(goods, g => g.bikeLight === 'front') && has(goods, g => g.bikeLight === 'rear');
  const startMin = r.stages.find(x => x.startMin !== undefined)?.startMin ?? 0;
  let kmDone = 0;

  const logs: DayLog[] = [];
  let hardDays = 0;
  let evacuated: Outcome['evacuated'];
  let clock = 0;
  let curDay = -1;
  let rideMinTotal = 0;
  let wetGear = false;

  for (let i = 0; i < r.stages.length; i++) {
    const st = r.stages[i];
    const short: Shortage[] = [];
    let event: DayLog['event'];
    let reason: EvacReason | undefined;
    const log: StageLog = { stage: st.id, kind: st.kind, km: st.km, road: st.road, startMin: clock, endMin: clock, rain: false, wind: 0, slowPct: 0, loadKg: 0 };

    if (st.kind === 'night') {
      // стоянка: вода на вечер и утро (вскипятить или из озера), ужин и завтрак, ночлег
      // вскипятили (или набрали из озера) — хватает и на вечер с утром, и долить всё до утра
      if (canBoil || risks.has('stomach')) water = capDl;
      else if (water >= campDl) water -= campDl;
      else { water = 0; short.push('drink'); }
      if (kcal >= campKcal) kcal -= campKcal;
      else { kcal = 0; short.push('food'); }
      // утепление на человека: палатка на всех и лучшее своё (спальник с ковриком складываются)
      const tent = Math.max(0, ...goods.filter(g => g.id.startsWith('tent')).map(g => g.sleepC ?? 0));
      const own = pack.filter(p => (w.good(p.good).sleepC ?? 0) > 0 && !w.good(p.good).id.startsWith('tent')).reduce((n, p) => n + (w.good(p.good).sleepC ?? 0) * Math.min(p.qty, people.length), 0);
      let warm = tent + Math.floor(own / people.length);
      if (wetGear) warm = tent + Math.floor(own / people.length / 2);
      if (nightC + warm < r.sleepOkC) short.push('cold');
      log.startMin = clock;
      log.endMin = clock;
      logs.push({ day: i, outdoorC: nightC, indoorC: nightC + warm, waterDl: water, kcal, lightH: 0, short, event, ride: log });
      if (short.length) hardDays += 1;
      if (risks.has('co')) reason = 'co';
      else if (stomach) reason = 'stomach';
      if (reason) { evacuated = { day: i, reason }; break; }
      continue;
    }

    if (st.day !== curDay) {
      curDay = st.day;
      clock = st.startMin ?? clock;
    }
    log.startMin = clock;
    // к старту бревета не допускают без света по правилам (ст. 6)
    if (i === 0 && risks.has('rules')) {
      log.endMin = clock;
      logs.push({ day: i, outdoorC: sc.outdoorC[i] ?? 0, indoorC: 0, waterDl: water, kcal, lightH: 0, short: [], event: undefined, ride: log });
      evacuated = { day: i, reason: 'rules' };
      break;
    }
    const rain = i === rainAt;
    log.rain = rain;
    log.wind = wind[st.day];
    const loadG = loadPerAdultG(w, s, water);
    log.loadKg = Math.round(loadG / 1000);
    log.slowPct = slowPct(sc, loadG, onBack);
    let speed = st.road === 'dirt' ? r.speed.dirt : r.speed.asphalt;
    speed = Math.floor((speed * (100 - log.slowPct) * (100 + log.wind)) / 10000);
    if (rain && st.road === 'dirt') speed = Math.floor((speed * r.rainDirtPct) / 100);
    const move = movingMin(st.km, speed);
    let total = move + Math.floor(move / r.restEvery) * r.restMin;

    const ri = rides.findIndex(x => x.i === i);
    if (flatAt[ri]) {
      event = 'flat';
      if (flatFixed[ri]) { total += r.fixMin; log.fixed = true; }
      else { total += r.walkMin; short.push('flat'); }
    }
    if (fallAt[ri]) { event = 'fall'; short.push('fall'); }
    if (i === tickAt) { event = 'tick'; short.push('tick'); }
    // «момент» этапа: самый заметный случай с вещью, которую достают руками
    const flatHappened = flatAt[ri];
    const mo: StageLog['moment'] = flatHappened ? { on: 'flat', ok: !!flatFixed[ri] } : rain ? { on: 'rain', ok: ponchoAtHand } : undefined;
    if (mo && r.moments?.some(m => m.on === mo.on)) log.moment = mo;
    if (rain) {
      event = event ?? 'rain';
      if (!ponchoAtHand) short.push('wet');
      if (!gearDry) wetGear = true;
      if (r.vest ? !lamps : !(front && rear)) {
        if (r.vest) reason = 'rules';
        else short.push('visibility');
      }
    }

    // ошибки в «моменте» — минуты на поиски
    const cost = (on: string) => r.moments?.find(m => m.on === on)?.costMin ?? 0;
    if (log.moment) total += (misses[i] ?? 0) * cost(log.moment.on);

    // вода и еда — по часам в пути
    const drink = Math.ceil((total * drinkPerH) / 60);
    if (water >= drink) water -= drink;
    else { water = 0; short.push('drink'); }
    const eat = Math.ceil((total * kcalPerH) / 60);
    if (kcal >= eat) kcal -= eat;
    else { kcal = 0; short.push('food'); }
    rideMinTotal += total;

    clock += total;
    log.endMin = clock;
    if (st.deadline === 'camp') {
      log.deadlineMin = r.sunsetMin - 120;
      if (clock > r.sunsetMin) {
        if (!anyLight) reason = 'dark';
        else {
          short.push('dark');
          if (!log.moment && r.moments?.some(m => m.on === 'dark')) {
            // в темноте искали фонарь: минуты после заката, к стоянке ещё позже
            log.moment = { on: 'dark', ok: true };
            clock += (misses[i] ?? 0) * cost('dark');
            log.endMin = clock;
          }
        }
      } else if (clock > r.sunsetMin - 120) short.push('late');
    }
    if (st.deadline === 'train') {
      log.deadlineMin = r.trainMin;
      if (clock > r.trainMin) short.push('train');
    }
    // бревет: КП закрывается по правилу ст. 10; опоздал — бревет не засчитан
    kmDone += st.km;
    if (r.brevet && (st.deadline === 'control' || st.deadline === 'finish')) {
      log.deadlineMin = st.deadline === 'finish' ? startMin + r.brevet.totalMin : controlClose(r.brevet, startMin, kmDone);
      if (clock > log.deadlineMin && !reason) reason = 'control';
    }
    // правила ночной езды (ст. 6): после заката — фара, задний фонарь и жилет; иначе сняли
    if (r.vest && clock > r.sunsetMin && !reason) {
      if (!(lamps && vestOn)) reason = 'rules';
      else {
        if (!short.includes('dark')) short.push('dark');
        if (lightOut && !reason) reason = 'rules';
      }
    }
    // помощь в пути запрещена (ст. 7): на первом же КП бревет не засчитан
    if (risks.has('support') && st.deadline === 'control' && !reason) reason = 'support';
    if (i === breakAt) { event = 'break'; reason = 'break'; }
    // без ночёвки расстройство от сырой воды или испорченной еды — на втором этапе
    if (stomach && !r.stages.some(x => x.kind === 'night') && i === rides[Math.min(1, rides.length - 1)].i && !reason) reason = 'stomach';
    if (st.refill) water = capDl;
    if (st.lunchMin) clock += st.lunchMin;

    logs.push({ day: i, outdoorC: sc.outdoorC[i] ?? 0, indoorC: 0, waterDl: water, kcal, lightH: 0, short, event, ride: log });
    if (short.length) hardDays += 1;
    if (reason) { evacuated = { day: i, reason }; break; }
  }

  const traps = Object.values(s.chosen).filter(sid => w.solution(sid).tier === 'trap');
  const rideH = Math.ceil(rideMinTotal / 60);
  return {
    days: logs,
    stayed: evacuated ? evacuated.day : r.stages.length,
    evacuated,
    traps,
    late,
    unfinished,
    start: { waterDl: startWater, kcal: startKcal, lightH: 0, commsDays: 0, sanitationDays: 0 },
    need: { waterDl: rideH * drinkPerH + campDl, drinkDl: rideH * drinkPerH + campDl, kcal: Math.ceil((rideMinTotal * kcalPerH) / 60) + campKcal, lightH: 0, commsDays: 0, sanitationDays: 0 },
    moneyLeft: s.money,
    hardDays,
  };
}
