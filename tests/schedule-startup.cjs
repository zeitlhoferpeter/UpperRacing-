// Run: node tests/schedule-startup.cjs (requires Playwright and an installed browser).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const turn = (start, group = 'A') => ({ start, end: start.slice(0, 3) + '20', group, type: 'turn', title: 'Gruppe ' + group });
const days = { Freitag: [turn('09:00')], Samstag: [turn('10:00')], Sonntag: [turn('11:00')] };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  let passed = 0;
  try {
    async function scenario(name, options, verify) {
      const ctx = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'Europe/Berlin' });
      try {
        await ctx.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.hostname !== 'audit.local') return route.abort();
          const file = path.join(root, decodeURIComponent(url.pathname).replace(/^\/UpperRacing-\//, '') || 'index.html');
          if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
          return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
        });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.clock.setFixedTime(new Date(options.now || '2026-10-04T06:00:00Z'));
        await page.addInitScript(seed => {
          if (window !== window.top || localStorage.getItem('__seeded')) return;
          localStorage.setItem('__seeded', '1');
          for (const [key, value] of Object.entries(seed)) if (value !== null) localStorage.setItem(key, value);
        }, {
          upper_schedule_days: JSON.stringify(options.days || days),
          upper_schedule_activeday: options.active === undefined ? 'Freitag' : options.active,
          upper_preview_schedule_date: options.search === undefined ? '2026-10-02' : options.search,
          upper_schedule_mygroup: 'A'
        });
        async function opened() {
          await page.waitForSelector('#previewFrame.ready');
          return page.frames().find(f => f.parentFrame());
        }
        await page.goto('http://audit.local/UpperRacing-/');
        const frame = await opened();
        await verify(page, frame, opened);
        assert.deepEqual(errors, [], 'no JavaScript errors');
        console.log('PASS', name); passed++;
      } finally { await ctx.close(); }
    }
    const active = frame => frame.evaluate(() => localStorage.getItem('upper_schedule_activeday'));
    const scheduleText = frame => frame.locator('#pageSchedule').innerText();
    await scenario('Sunday startup, visible header, manual selection and restart', {}, async (page, frame, opened) => {
      assert.equal(await active(frame), 'Sonntag', 'today selected before app becomes visible');
      assert.match(await scheduleText(frame), /Tagesplan \(Sonntag\)/);
      assert.match(await frame.locator('.preview-race-side').innerText(), /11:00/);
      assert.match(await frame.locator('#headerRaceScheduleWidget').innerText(), /11:00/);
      await page.waitForTimeout(1200);
      assert.equal(await active(frame), 'Sonntag', 'old search date must not override today later');
      assert.equal(await frame.evaluate(() => localStorage.getItem('upper_preview_schedule_date')), '2026-10-02');
      await frame.evaluate(() => { switchScheduleDay('Samstag'); initScheduleModule(); });
      await page.waitForTimeout(1200);
      assert.equal(await active(frame), 'Samstag', 'manual selection survives timers and reinitialization');
      assert.match(await frame.locator('.preview-race-side').innerText(), /10:00/);
      await page.reload(); frame = await opened();
      assert.equal(await active(frame), 'Sonntag');
      assert.match(await frame.locator('.preview-race-side').innerText(), /11:00/);
    });
    await scenario('no matching day retains saved selection', { days: { Freitag: days.Freitag, Samstag: days.Samstag }, active: 'Samstag' }, async (page, frame) => {
      await page.waitForTimeout(1200);
      assert.equal(await active(frame), 'Samstag');
      assert.match(await scheduleText(frame), /Tagesplan \(Samstag\)/);
      assert.match(await frame.locator('.preview-race-side').innerText(), /10:00/);
    });
    await scenario('unnamed days retain saved selection', { days: { 'Tag 1': days.Freitag, 'Tag 2': days.Samstag }, active: 'Tag 2' }, async (page, frame) => {
      await page.waitForTimeout(600);
      assert.equal(await active(frame), 'Tag 2');
    });
    await scenario('invalid selection keeps existing first-day fallback', { days: { Freitag: days.Freitag, Samstag: days.Samstag }, active: 'missing' }, async (page, frame) => {
      assert.match(await scheduleText(frame), /Tagesplan \(Freitag\)/);
      assert.match(await frame.locator('.preview-race-side').innerText(), /09:00/);
    });
    await scenario('empty schedule starts without errors', { days: {}, active: null }, async (page, frame) => {
      assert.match(await scheduleText(frame), /Tag 1/);
    });
    await scenario('local Sunday just after midnight, while UTC is Saturday', { now: '2026-10-03T22:05:00Z', search: '2026-10-10' }, async (page, frame) => {
      assert.equal(await active(frame), 'Sonntag');
      assert.match(await frame.locator('.preview-race-side').innerText(), /11:00/);
    });
    await scenario('missing saved selection and search date', { active: null, search: null }, async (page, frame) => {
      assert.equal(await active(frame), 'Sonntag');
    });
    await scenario('active Sunday turn uses Sunday countdown', { now: '2026-10-04T09:05:00Z' }, async (page, frame) => {
      assert.equal(await active(frame), 'Sonntag');
      assert.match(await frame.locator('#headerRaceScheduleWidget').innerText(), /15:00/);
      assert.match(await frame.locator('#headerRaceScheduleWidget').getAttribute('class'), /preview-own-active/);
    });
    await scenario('changing search date during use retains existing selection behavior', {}, async (page, frame) => {
      await frame.waitForSelector('#previewScheduleMore', { state: 'attached' });
      await frame.evaluate(() => document.getElementById('previewScheduleMore').click());
      await frame.evaluate(() => {
        const input = document.getElementById('previewScheduleDate');
        input.value = '2026-10-03';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await frame.waitForFunction(() => localStorage.getItem('upper_schedule_activeday') === 'Samstag');
      assert.match(await scheduleText(frame), /Tagesplan \(Samstag\)/);
    });
    console.log(`${passed} scenarios passed.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
