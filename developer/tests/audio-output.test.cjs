const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createEmulator } = require('./emulator-harness.cjs');

async function start(model = '128K') {
    const e = createEmulator(undefined, { audio: true });
    await e.evaluate(`loadBuiltInModel('${model}')`);
    return e;
}

function near(actual, expected, tolerance = 1e-7) {
    assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be near ${expected}`);
}

for (const model of ['48K', '128K']) {
    test(`${model}: idle menu buffers stay exactly silent through delayed frames and underruns`, async () => {
        const e = await start(model);
        assert.ok(e.evaluate('audioCtx.lastBuffer.getChannelData(0).every(sample => sample === 0)'));
        e.frames(200); // Run the real ROM to its idle screen.
        const result = e.evaluate(`(() => {
            let buffers = 0, underruns = 0, peak = 0;
            const delays = [1 / 60, 1 / 60, 0.12, 0.02, 0.08, 1 / 60];
            for (let frame = 0; frame < 120; frame++) {
                audioCtx.currentTime += delays[frame % delays.length];
                const count = audioCtx.starts.length;
                const late = nextAudioTime <= audioCtx.currentTime;
                loop();
                if (audioCtx.starts.length === count) continue;
                buffers++;
                if (late) underruns++;
                for (const sample of audioCtx.lastBuffer.getChannelData(0)) {
                    peak = Math.max(peak, Math.abs(sample));
                }
            }
            return { buffers, underruns, peak };
        })()`);
        assert.ok(result.buffers > 60);
        assert.ok(result.underruns >= 20);
        assert.equal(result.peak, 0);
    });
}

for (const [name, beeper, ayLevel] of [
    ['held beeper', 1, 0], ['constant AY channels', 0, 15], ['combined constant levels', 1, 15]
]) {
    test(`${name}: DC decays continuously across frames and clamps to zero`, async () => {
        const e = await start();
        const result = e.evaluate(`(() => {
            const events = [[7, 63], [8, ${ayLevel}], [9, ${ayLevel}], [10, ${ayLevel}]]
                .map(([register, value]) => ({ t: 0, register, value }));
            const first = synthesizeAudioFrame([{ t: 0, val: ${beeper} }], events);
            const second = synthesizeAudioFrame([], []);
            let settled;
            for (let frame = 0; frame < 10; frame++) settled = synthesizeAudioFrame([], []);
            return { first: first[0], end: first.at(-1), next: second[0],
                secondEnd: second.at(-1), settled: settled.every(sample => sample === 0) };
        })()`);
        near(result.first, beeper + (ayLevel ? 0.5 : 0));
        // A 20 Hz blocker decays over sample time, never restarts or removes a frame mean.
        near(result.end, result.first * Math.exp(-2 * Math.PI * 20 * 881 / 44100));
        near(result.next, result.end * Math.exp(-2 * Math.PI * 20 / 44100));
        assert.ok(result.secondEnd > 0 && result.secondEnd < result.next);
        assert.equal(result.settled, true);
    });
}

test('a held AY envelope settles to silence without changing its held chip level', async () => {
    const e = await start();
    const result = e.evaluate(`(() => {
        const events = [[7, 63], [8, 16], [11, 1], [13, 13]]
            .map(([register, value]) => ({ t: 0, register, value }));
        const attack = synthesizeAudioFrame([], events);
        let settled;
        for (let frame = 0; frame < 12; frame++) settled = synthesizeAudioFrame([], []);
        return { peak: Math.max(...attack), level: ayChip.sample(0),
            settled: settled.every(sample => sample === 0) };
    })()`);
    assert.ok(result.peak > 0.1);
    assert.equal(result.level, 1 / 3);
    assert.equal(result.settled, true);
});

test('beeper edges retain their timing and unit amplitude, including across frame boundaries', async () => {
    const e = await start('48K');
    const result = e.evaluate(`(() => {
        const frame = getFrameTStates();
        const rising = synthesizeAudioFrame([{ t: frame / 2, val: 1 }], []);
        const falling = synthesizeAudioFrame([{ t: 0, val: 0 }], []);
        return { before: rising.slice(0, 440).every(sample => sample === 0),
            edge: rising[440], end: rising.at(-1), falling: falling[0] };
    })()`);
    assert.equal(result.before, true);
    assert.equal(result.edge, 1); // Original -0.5 -> +0.5 transition amplitude.
    near(result.falling - result.end * Math.exp(-2 * Math.PI * 20 / 44100), -1);
});

test('a sustained 1 kHz beeper remains audible and centered after filtering', async () => {
    const e = await start('48K');
    const result = e.evaluate(`(() => {
        const events = Array.from({ length: 40 }, (_, i) => ({
            t: i * getFrameTStates() / 40, val: (i + 1) % 2
        }));
        let data;
        for (let frame = 0; frame < 20; frame++) data = synthesizeAudioFrame(events, []);
        return { rms: Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length),
            mean: data.reduce((sum, v) => sum + v, 0) / data.length,
            edges: data.filter((v, i) => i && Math.abs(v - data[i - 1]) > 0.9).length };
    })()`);
    assert.ok(result.rms > 0.45 && result.rms < 0.55);
    assert.ok(Math.abs(result.mean) < 0.001);
    assert.equal(result.edges, 39);
});

for (const [name, registers] of [
    ['tone', [[0, 100], [7, 62], [8, 15]]],
    ['noise', [[6, 3], [7, 55], [8, 15]]],
    ['repeating envelope', [[7, 63], [8, 16], [11, 100], [13, 14]]]
]) {
    test(`AY ${name} remains audible in scheduled buffers`, async () => {
        const e = await start();
        const result = e.evaluate(`(() => {
            ayLog = ${JSON.stringify(registers)}.map(([register, value]) => ({ t: 0, register, value }));
            processAudioFrame([]);
            ayLog = [];
            let energy = 0, samples = 0;
            for (let frame = 0; frame < 30; frame++) {
                audioCtx.currentTime += 0.02;
                processAudioFrame([]);
                if (frame < 10) continue;
                for (const value of audioCtx.lastBuffer.getChannelData(0)) {
                    energy += value * value;
                    samples++;
                }
            }
            return Math.sqrt(energy / samples);
        })()`);
        assert.ok(result > 0.02, `Expected audible ${name}, RMS=${result}`);
    });
}

test('startup and underrun recovery add 40 ms; ordinary buffers stay contiguous', async () => {
    const e = await start();
    near(e.evaluate('audioCtx.starts[0]'), 0.04);
    for (const delay of [0.02, 0.025, 0.015]) {
        const previousEnd = e.evaluate('nextAudioTime');
        e.evaluate(`audioCtx.currentTime += ${delay}; processAudioFrame([])`);
        near(e.evaluate('audioCtx.starts.at(-1)'), previousEnd);
    }
    for (const delay of [0, 0.12, 0.5]) {
        e.evaluate(`audioCtx.currentTime = nextAudioTime + ${delay}; processAudioFrame([])`);
        near(e.evaluate('audioCtx.starts.at(-1) - audioCtx.currentTime'), 0.04);
        const end = e.evaluate('nextAudioTime');
        near(e.evaluate('nextAudioTime - audioCtx.currentTime'), 0.06);
        e.evaluate('audioCtx.currentTime += 0.02; processAudioFrame([])');
        near(e.evaluate('audioCtx.starts.at(-1)'), end);
    }
});

for (const refreshRate of [60, 120]) {
    test(`${refreshRate} Hz callbacks preserve approximately 50 CPU frames per second and a bounded queue`, async () => {
        const e = await start();
        const result = e.evaluate(`(() => {
            let cpuFrames = 0;
            const interrupt = z80.interrupt.bind(z80);
            z80.interrupt = (...args) => { cpuFrames++; return interrupt(...args); };
            const initialBuffers = audioCtx.starts.length;
            for (let tick = 0; tick < ${refreshRate * 2}; tick++) {
                audioCtx.currentTime += 1 / ${refreshRate};
                loop();
            }
            return { cpuFrames, buffers: audioCtx.starts.length - initialBuffers,
                queued: nextAudioTime - audioCtx.currentTime,
                contiguous: audioCtx.starts.every((time, i, starts) =>
                    !i || Math.abs(time - starts[i - 1] - 0.02) < 1e-9) };
        })()`);
        assert.ok(result.cpuFrames >= 99 && result.cpuFrames <= 103, result.cpuFrames);
        assert.equal(result.buffers, result.cpuFrames);
        assert.ok(result.queued >= 0.04 && result.queued <= 0.1 + 1e-9);
        assert.equal(result.contiguous, true);
    });
}

test('suspension advances the CPU and chip/filter state without queueing stale buffers', async () => {
    const e = await start();
    const result = e.evaluate(`(() => {
        synthesizeAudioFrame([{ t: 0, val: 1 }], []);
        audioCtx.state = 'suspended';
        nextAudioTime = 100;
        const startCount = audioCtx.starts.length;
        let cpuFrames = 0;
        const interrupt = z80.interrupt.bind(z80);
        z80.interrupt = (...args) => { cpuFrames++; return interrupt(...args); };
        for (let frame = 0; frame < 20; frame++) loop();
        return { cpuFrames, addedBuffers: audioCtx.starts.length - startCount,
            settled: synthesizeAudioFrame([], []).every(sample => sample === 0) };
    })()`);
    assert.equal(result.cpuFrames, 20);
    assert.equal(result.addedBuffers, 0);
    assert.equal(result.settled, true);
    e.evaluate('audioCtx.currentTime = nextAudioTime + 1; audioCtx.state = "running"; loop()');
    near(e.evaluate('audioCtx.starts.at(-1) - audioCtx.currentTime'), 0.04);
});

test('reset and machine switches clear DC history and restart with scheduling lead', async () => {
    const e = await start();
    for (const action of ['resetSystem()', "loadBuiltInModel('48K')", "loadBuiltInModel('128K')"]) {
        assert.ok(e.evaluate('synthesizeAudioFrame([{ t: 0, val: 1 }], []).at(-1)') > 0.01);
        await e.evaluate(action);
        assert.ok(e.evaluate('audioCtx.lastBuffer.getChannelData(0).every(sample => sample === 0)'));
        assert.ok(e.evaluate('synthesizeAudioFrame([], []).every(sample => sample === 0)'));
        near(e.evaluate('audioCtx.starts.at(-1) - audioCtx.currentTime'), 0.04);
    }
});
