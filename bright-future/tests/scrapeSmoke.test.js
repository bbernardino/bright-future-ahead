import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchData } from '../src/scrape.js';

test('fetchData returns climate matrices from NASA POWER API', async () => {
    const result = await fetchData(-79.3832, 43.6532);

    assert.equal(Array.isArray(result.temp), true, 'temp should be an array of days');
    assert.equal(Array.isArray(result.precip), true, 'precip should be an array of days');
    assert.equal(Array.isArray(result.years), true, 'years should be an array');

    assert.equal(result.temp.length, 366, 'temp should cover every day of the year');
    assert.equal(result.precip.length, 366, 'precip should cover every day of the year');
    assert.ok(result.years.length > 0, 'years should include at least one entry');

    assert.equal(result.temp[0].length, result.years.length, 'temp matrix width should match years length');
    assert.equal(result.precip[0].length, result.years.length, 'precip matrix width should match years length');

    const sampleTempRow = result.temp.find((row) => row.some((value) => value !== null));
    assert.ok(sampleTempRow, 'expected at least one temperature reading');
    const sampleTempValue = sampleTempRow.find((value) => value !== null);
    assert.equal(typeof sampleTempValue, 'number', 'temperature readings should be numbers');

    const samplePrecipRow = result.precip.find((row) => row.some((value) => value !== null));
    assert.ok(samplePrecipRow, 'expected at least one precipitation reading');
    const samplePrecipValue = samplePrecipRow.find((value) => value !== null);
    assert.equal(typeof samplePrecipValue, 'number', 'precipitation readings should be numbers');

    const firstYear = result.years[0];
    const lastYear = result.years[result.years.length - 1];
    const currentYear = new Date().getUTCFullYear();
    assert.ok(firstYear >= 1981, 'data should not precede 1981');
    assert.ok(lastYear <= currentYear, 'data should not exceed current year');
    console.log(result.temp);
});
