(function () {
  const ITEMS = [
    { key: 'noodles', label: 'Instant Noodles' },
    { key: 'hotdog', label: 'Hotdog' },,
    { key: 'softdrink', label: 'Soft Drink' },
    { key: 'juice', label: 'Juice' },
    { key: 'junkfood', label: 'Junk Food' },
    { key: 'chocolate', label: 'Chocolate' }
  ];

  const TICK_PATH = 'M4 12.5l4.5 4.5L20 6';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

  function startOfWeek(d) {
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1 - day);
    return addDays(d, diff);
  }

  const today = new Date();
  const todayKey = dateKey(today);

  document.getElementById('todayLabel').textContent =
    today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // ---- render checklist ----
  const list = document.getElementById('checklist');
  ITEMS.forEach(item => {
    const li = document.createElement('li');
    li.className = 'check-item';
    li.innerHTML =
      '<input type="checkbox" id="chk-' + item.key + '" data-key="' + item.key + '">' +
      '<label for="chk-' + item.key + '" class="box"><svg viewBox="0 0 24 24"><path class="tick" d="' + TICK_PATH + '"/></svg></label>' +
      '<label for="chk-' + item.key + '" class="item-label">' + item.label + '</label>';
    list.appendChild(li);
  });

  // ---- storage helpers ----
  // Requires window.storage (get/set/delete/list) to be available in the host environment.
  // Falls back to an in-memory store if it isn't, so the UI still works in plain browsers.
  const memoryFallback = {};
  const hasRealStorage = typeof window.storage !== 'undefined';

  async function safeGet(key) {
    try {
      if (hasRealStorage) {
        const r = await window.storage.get(key, false);
        return r ? JSON.parse(r.value) : null;
      }
      return memoryFallback[key] ? JSON.parse(memoryFallback[key]) : null;
    } catch (e) {
      return null;
    }
  }

  async function safeSet(key, value) {
    try {
      if (hasRealStorage) {
        await window.storage.set(key, JSON.stringify(value), false);
      } else {
        memoryFallback[key] = JSON.stringify(value);
      }
    } catch (e) {
      console.error('storage set failed', e);
    }
  }

  function defaultEntry() {
    const e = { water: false, weight: null };
    ITEMS.forEach(i => e[i.key] = false);
    return e;
  }

  let todayEntry = defaultEntry();

  function updateStreakDisplay(n) {
    document.getElementById('streakNum').textContent = n;
  }

  function updateCheckedCount() {
    const n = ITEMS.filter(i => todayEntry[i.key]).length;
    document.getElementById('checkedCount').textContent = n + ' marked';
  }

  function applyEntryToUI() {
    ITEMS.forEach(i => {
      const el = document.getElementById('chk-' + i.key);
      if (el) el.checked = !!todayEntry[i.key];
    });
    document.getElementById('waterToggle').checked = !!todayEntry.water;
    updateCheckedCount();
  }

  async function saveToday() {
    await safeSet('entries:' + todayKey, todayEntry);
    updateCheckedCount();
    await refreshWeekAndStreak();
  }

  ITEMS.forEach(item => {
    document.getElementById('chk-' + item.key).addEventListener('change', (e) => {
      todayEntry[item.key] = e.target.checked;
      saveToday();
    });
  });

  document.getElementById('waterToggle').addEventListener('change', (e) => {
    todayEntry.water = e.target.checked;
    saveToday();
  });

  document.getElementById('weightSave').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('weightInput').value);
    if (isNaN(val)) return;
    todayEntry.weight = val;
    document.getElementById('weightInput').value = '';
    await saveToday();
  });

    document.getElementById('heightSave').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('heightInput').value);
    if (isNaN(val)) return;
    todayEntry.height = val;
    document.getElementById('heightInput').value = '';
    await saveToday();
  });

  async function refreshWeekAndStreak() {
    const weekStart = startOfWeek(today);
    let noodles = 0, softdrink = 0, hotdog = 0, juice = 0, junkfood = 0, chocolate = 0, waterDays = 0;
    let firstWeight = null, lastWeight = null;
    let firstHeight = null, lastHeight = null;

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d > today) continue;
      const k = dateKey(d);
      const entry = (k === todayKey) ? todayEntry : await safeGet('entries:' + k);
      if (!entry) continue;
      if (entry.noodles) noodles++;
      if (entry.softdrink) softdrink++;
      if (entry.hotdog) hotdog++;
      if (entry.juice) juice++;
      if (entry.junkfood) junkfood++;
      if (entry.chocolate) chocolate++;
      if (entry.water) waterDays++;
      if (typeof entry.weight === 'number') {
        if (firstWeight === null) firstWeight = entry.weight;
        lastWeight = entry.weight;
      }
      if (typeof entry.height === 'number') {
        if (firstHeight === null) firstHeight = entry.height;
        lastHeight = entry.height;
      }
    }

    document.getElementById('sumNoodles').textContent = noodles;
    document.getElementById('sumSoftdrink').textContent = softdrink;
    document.getElementById('sumHotdog').textContent = hotdog;
    document.getElementById('sumJuice').textContent = juice;
    document.getElementById('sumJunkfood').textContent = junkfood;
    document.getElementById('sumChocolate').textContent = chocolate;
    document.getElementById('sumWater').textContent = waterDays;

    const track = document.getElementById('weightTrack');
    if (firstWeight !== null && lastWeight !== null) {
      if (firstWeight === lastWeight) {
        track.innerHTML = firstWeight.toFixed(1) + ' kg <span class="arrow">steady</span>';
      } else {
        const dir = lastWeight < firstWeight ? 'down' : 'up';
        const arrow = lastWeight < firstWeight ? '↓' : '↑';
        track.innerHTML = firstWeight.toFixed(1) + ' <span class="arrow">→</span> ' + lastWeight.toFixed(1) + ' kg <span class="arrow ' + dir + '">' + arrow + '</span>';
      }
    } else {
      track.textContent = 'No entries yet this week';
    }
    
    const heightTrack = document.getElementById('heightTrack');
    if (firstHeight !== null && lastHeight !== null) {
      if (firstHeight === lastHeight) {
        heightTrack.innerHTML = firstHeight.toFixed(1) + ' cm <span class="arrow">steady</span>';
      } else {
        const dir = lastHeight < firstHeight ? 'down' : 'up';
        const arrow = lastHeight < firstHeight ? '↓' : '↑';
        heightTrack.innerHTML = firstHeight.toFixed(1) + ' <span class="arrow">→</span> ' + lastHeight.toFixed(1) + ' cm <span class="arrow ' + dir + '">' + arrow + '</span>';
      }
    } else {
      heightTrack.textContent = 'No entries yet this week';
    }

    // streak: consecutive days ending today with better choices === false
    let streak = 0;
    let cursor = new Date(today);
    for (let i = 0; i < 400; i++) {
      const k = dateKey(cursor);
      const entry = (k === todayKey) ? todayEntry : await safeGet('entries:' + k);
      if (k === todayKey) {
        if (!entry.softdrink) { streak++; cursor = addDays(cursor, -1); continue; }
        else { break; }
      }
      if (!entry) break;
      if (entry.softdrink) break;
      streak++;
      cursor = addDays(cursor, -1);
    }
    updateStreakDisplay(streak);
  }

  async function init() {
    const existing = await safeGet('entries:' + todayKey);
    if (existing) { todayEntry = Object.assign(defaultEntry(), existing); }
    applyEntryToUI();
    await refreshWeekAndStreak();
  }

  init();
})();