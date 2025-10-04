import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchData } from '../src/scrape.js';

test('fetchData logs the parsed NASA payload', async () => {
    const originalFetch = globalThis.fetch;
    const originalConsoleLog = console.log;

    const capturedLogs = [];
    console.log = (...args) => {
        capturedLogs.push(args);
        originalConsoleLog(...args);
    };

    globalThis.fetch = async (url) => ({
        json: async () => ({ ok: true, url }),
    });

    try {
        const result = await fetchData(-79.3832, 43.6532);

        assert.equal(result.ok, true);
        assert.equal(capturedLogs.length, 1);
        assert.equal(capturedLogs[0].length, 1);

        const [payload] = capturedLogs[0];
        assert.equal(payload.ok, true);
        assert.match(payload.url, /power\.larc\.nasa\.gov/);
    } finally {
        globalThis.fetch = originalFetch;
        console.log = originalConsoleLog;
    }
});
