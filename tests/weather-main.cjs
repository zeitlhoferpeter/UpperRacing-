// Run: node tests/weather-main.cjs (requires Playwright and an installed browser).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const fixed = new Date('2026-09-07T08:15:00Z'); // 10:15 at the track.
function fixture(temp = 21, p = 60) {
    const times = Array.from({length: 48}, (_, i) => '2026-09-' + String(7 + Math.floor(i / 24)).padStart(2, '0') + 'T' + String(i % 24).padStart(2, '0') + ':00');
    const quarters = Array.from({length: 16}, (_, i) => '2026-09-07T' + String(10 + Math.floor(i / 4)).padStart(2, '0') + ':' + String(i % 4 * 15).padStart(2, '0'));
    return {utc_offset_seconds: 7200, current: {time: '2026-09-07T10:15', temperature_2m: temp, precipitation: 0, weather_code: 1, is_day: 1},
        hourly: {time: times, temperature_2m: times.map(() => temp), precipitation_probability: times.map(() => p), precipitation: times.map(() => 0), weather_code: times.map(() => 1)},
        minutely_15: {time: quarters, precipitation_probability: quarters.map(() => p), precipitation: quarters.map(() => 0), weather_code: quarters.map(() => 1)}};
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS', name); }
(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
    let server;
    try {
        const ctx = await browser.newContext({serviceWorkers: 'block', timezoneId: 'Asia/Tokyo'});
        ctx.setDefaultTimeout(10000);
        let requests = [], held = null, fail = false, responseData = fixture();
        await ctx.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'api.open-meteo.com') {
                requests.push(url);
                if (held) { const callback = held; held = null; callback(route); return; }
                if (fail) return route.fulfill({status: 503, body: 'Unavailable'});
                return route.fulfill({json: responseData});
            }
            if (url.hostname !== 'audit.local') return route.abort();
            let relative = decodeURIComponent(url.pathname).replace(/^\/UpperRacing-\//, '') || 'index.html';
            const file = path.join(root, relative);
            if (!fs.existsSync(file)) return route.fulfill({status: 404, body: ''});
            return route.fulfill({body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream'});
        });
        const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => {errors.push(e.message); console.log('PAGE ERROR',e.message);});
        page.on('console', msg => {if(msg.text().startsWith('[UpperRacing Wetter]'))console.log(msg.text());});
        await page.clock.setFixedTime(fixed);
        await page.addInitScript(() => {
            if (window === window.top) localStorage.setItem('upper_selected_track', 'most');
            window.__beeps = 0;
            window.AudioContext = class {
                constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
                resume() { return Promise.resolve(); }
                createOscillator() { return {connect(){}, disconnect(){}, frequency:{setValueAtTime(){}}, start(){window.__beeps++;}, stop(){}}; }
                createGain() { return {connect(){}, disconnect(){}, gain:{setValueAtTime(){}, exponentialRampToValueAtTime(){}}}; }
            };
        });
        await page.goto('http://audit.local/UpperRacing-/');
        const frame = page.frames().find(f => f.parentFrame());
        await frame.waitForFunction(() => document.getElementById('weather-temp')?.textContent === '21°C');
        await page.waitForTimeout(1400);
        check('one shared request, saved track, all weather surfaces rendered', () => {
            assert.equal(requests.length, 1); assert.equal(requests[0].searchParams.get('latitude'), '50.51867');
        });
        const state = await frame.evaluate(() => ({info: document.getElementById('weather-info-text').textContent,
            summary: document.getElementById('urTrackdayWeather').textContent, header: document.getElementById('weather-header-widget').className}));
        check('future warning and 60-minute summary', () => { assert.match(state.info, /Ab jetzt: 60%/); assert.match(state.summary, /TRACKDAY-WETTER/); assert.match(state.header, /alert-yellow/); });

        const results = await frame.evaluate(data => {
            const m = upperWeatherMain.logic, now = m.parseTime('2026-09-07T10:15');
            const change = () => JSON.parse(JSON.stringify(data));
            let d = change(); d.hourly.precipitation_probability.fill(0); d.hourly.precipitation_probability[10] = 100;
            const past = m.futureProbability(d, now); d.hourly.precipitation_probability[11] = 85;
            const remainder = m.futureProbability(d, now), exact = m.futureProbability(d, m.parseTime('2026-09-07T11:00'));
            d = change(); d.hourly.precipitation_probability.fill(null); d.minutely_15.precipitation_probability.fill(null);
            const missing = [m.futureProbability(d, now), m.nextHourProbability(d, now)];
            d.minutely_15 = {}; const incomplete = m.summarize60(d, now);
            d = change(); d.minutely_15.precipitation_probability.fill(0); d.minutely_15.precipitation.fill(0);
            d.minutely_15.precipitation[0] = 8; d.minutely_15.precipitation[1] = 8;
            const noPastRain = m.summarize60(d, now);
            d.minutely_15.precipitation.fill(1); const amount = m.summarize60(d, now).total;
            d = change(); d.hourly.precipitation_probability.fill(0);
            d.hourly.precipitation_probability[9] = 95; d.hourly.precipitation_probability[10] = 90; d.hourly.precipitation_probability[16] = 45;
            const critical = m.summarizeDay(d, now).critical;
            d = change(); d.minutely_15.precipitation_probability.fill(0); d.minutely_15.precipitation.fill(0);
            d.minutely_15.precipitation[5] = 2;
            const lateHeavyRain = m.summarize60(d, now);
            d = change(); d.minutely_15.precipitation_probability.fill(0); d.current.precipitation = 0.2;
            const raining = m.summarize60(d, now);
            d.current.precipitation = 0; d.current.weather_code = 95;
            const thunder = m.summarize60(d, now);
            return {past, remainder, exact, missing, incomplete, noPastRain, amount, critical,
                lateHeavyRain, raining, thunder,
                boundaries: [49,50,79,80,90,91].map(m.level), localNow: m.localNow(data), now,
                afterDay: m.futureProbability(data, m.parseTime('2026-09-07T18:01')),
                midnight: m.futureProbability(data, m.parseTime('2026-09-08T00:01'))};
        }, fixture());
        check('Open-Meteo preceding-hour semantics and exact cutoff', () => assert.deepEqual([results.past, results.remainder, results.exact], [0,85,0]));
        check('warning thresholds unchanged', () => assert.deepEqual(results.boundaries, ['none','yellow','yellow','orange','orange','red']));
        check('missing data never represented as 0% or dry', () => {assert.deepEqual(results.missing,[null,null]);assert.match(results.incomplete.message,/unvollständig/);});
        check('past rain excluded; exactly 60 minutes of volume', () => {assert.equal(results.noPastRain.total,0);assert.equal(results.amount,4);});
        check('strongest contiguous critical window retained', () => assert.equal(results.critical,'08–10 Uhr'));
        check('device timezone independent, end of day and midnight', () => {assert.equal(results.localNow,results.now);assert.equal(results.afterDay,0);assert.equal(results.midnight,60);});
        check('rain volume raises severity without inventing an earlier arrival', () => {assert.equal(results.lateHeavyRain.color,'red');assert.match(results.lateHeavyRain.message,/30–60/);});
        check('current rain and thunderstorms keep their red warnings', () => {assert.equal(results.raining.color,'red');assert.match(results.raining.message,/aktuell/);assert.equal(results.thunder.color,'red');});

        await frame.evaluate(() => { window.__changes = 0; const o = new MutationObserver(ms => window.__changes += ms.length); o.observe(document.getElementById('weather-header-widget'), {attributes:true,subtree:true,childList:true}); });
        await page.waitForTimeout(250);
        check('no self-triggering weather observer', () => {});
        assert.equal(await frame.evaluate(() => window.__changes), 0);
        await frame.evaluate(() => {window.openWeatherModal();});
        await page.waitForTimeout(50);
        check('opening modal reuses fresh snapshot', () => assert.equal(requests.length,1));

        let release; held = route => {release = route;};
        await frame.evaluate(() => {trackSelect.value='slovakia'; trackSelect.dispatchEvent(new Event('change',{bubbles:true}));});
        await page.waitForTimeout(100); assert.ok(release);
        responseData = fixture(32,91);
        await frame.evaluate(() => {trackSelect.value='grobnik'; trackSelect.dispatchEvent(new Event('change',{bubbles:true}));});
        await frame.waitForFunction(() => document.getElementById('weather-temp').textContent === '32°C');
        await release.fulfill({json:fixture(5,0)}).catch(() => {}); await page.waitForTimeout(100);
        check('late response cannot overwrite newly selected track', () => {});
        assert.equal(await frame.evaluate(() => document.getElementById('weather-temp').textContent),'32°C');

        await frame.evaluate(() => toggleWeatherSound({checked:true})); await page.waitForTimeout(30);
        const beeps = await frame.evaluate(() => window.__beeps);
        await frame.evaluate(() => upperWeatherMain.refresh());
        check('red sound uses three beeps, no repeated alarm at same level', () => assert.equal(beeps,3));
        assert.equal(await frame.evaluate(() => window.__beeps),3);
        await frame.evaluate(() => toggleWeatherSound({checked:false}));
        responseData = fixture(22,80); await frame.evaluate(() => upperWeatherMain.refresh());
        assert.equal(await frame.evaluate(() => window.__beeps),3);

        fail = true; await frame.evaluate(() => upperWeatherMain.refresh());
        const failed = await frame.evaluate(() => ({info:document.getElementById('weather-info-text').textContent, classes:document.getElementById('weather-header-widget').className, details:document.getElementById('urTrackdayWeather').textContent}));
        check('network failure clears stale warnings and detail data', () => {assert.match(failed.info,/nicht verfügbar/);assert.doesNotMatch(failed.classes,/alert-|weather-pulse/);assert.match(failed.details,/nicht verfügbar/);});
        fail = false;
        responseData = fixture(null,0); responseData.hourly.precipitation_probability.fill(null); responseData.minutely_15 = {};
        await frame.evaluate(() => upperWeatherMain.refresh());
        const partial = await frame.evaluate(() => ({temp:document.getElementById('weather-temp').textContent,info:document.getElementById('weather-info-text').textContent,details:document.getElementById('urTrackdayWeather').textContent}));
        check('partial payload displays unknown temperature and probability', () => {assert.equal(partial.temp,'--°C');assert.match(partial.info,/Ab jetzt: –%/);assert.match(partial.details,/unvollständig/);});
        responseData = fixture(22,80);
        let stalled; held = route => {stalled=route;};
        await frame.evaluate(() => {upperWeatherMain.refresh();});await page.waitForTimeout(50);
        await page.clock.runFor(10050);
        await frame.waitForFunction(()=>document.getElementById('weather-info-text').textContent.includes('nicht verfügbar'));
        check('stalled weather request times out',()=>assert.ok(stalled));
        await stalled.abort().catch(()=>{});
        await frame.evaluate(() => {Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error();}}});toggleWeatherGPS({checked:true});});
        await frame.waitForFunction(() => document.getElementById('weather-temp').textContent === '22°C');
        check('GPS denial falls back to selected track', () => assert.equal(requests.at(-1).searchParams.get('latitude'),'45.38273'));
        await frame.evaluate(() => {Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success){success({coords:{latitude:48.2,longitude:16.3}});}}});});
        await frame.evaluate(() => upperWeatherMain.refresh());
        check('GPS enabled uses live coordinates', () => assert.equal(requests.at(-1).searchParams.get('latitude'),'48.2'));
        await frame.evaluate(() => toggleWeatherGPS({checked:false})); await page.waitForTimeout(50);
        await frame.evaluate(() => setTimeout(() => location.reload(),0));
        await page.waitForTimeout(1000);
        await page.frames().find(f=>f.parentFrame()).waitForFunction(() => !!window.upperWeatherMain && document.getElementById('weather-temp').textContent === '22°C');
        check('weather works after inner-frame reload', () => assert.deepEqual(errors,[]));
        await ctx.close();

        // Real service-worker first-install + offline restart, using only a local server.
        server = http.createServer((req,res) => {
            const relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/UpperRacing-\//,'') || 'index.html';
            const file = path.resolve(root,relative);
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
            res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));
        });
        await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
        const offlineCtx = await browser.newContext();
        await offlineCtx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
        const offlinePage = await offlineCtx.newPage();
        await offlinePage.goto('http://127.0.0.1:' + server.address().port + '/UpperRacing-/');
        await offlinePage.evaluate(async()=>{await navigator.serviceWorker.ready;});
        await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller);
        await offlineCtx.setOffline(true); await offlinePage.reload();
        await offlinePage.waitForFunction(()=>document.getElementById('previewFrame').classList.contains('ready'));
        const offlineFrame = offlinePage.frames().find(f=>f.parentFrame());
        await offlineFrame.waitForFunction(()=>!!window.upperWeatherMain && document.getElementById('weather-info-text').textContent.includes('nicht verfügbar'));
        check('first-install offline restart loads Main and reports unavailable weather',()=>{});
        await offlineCtx.close();
        console.log(passed + ' weather regression checks passed.');
    } finally {
        await browser.close(); if (server) await new Promise(resolve=>server.close(resolve));
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
