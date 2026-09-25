import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
const { useQuestStore } = await server.ssrLoadModule("/src/lib/questodoro/store.ts");

function installClock(start) {
  let now = start;
  const real = Date.now;
  Date.now = () => now;
  return {
    get now() {
      return now;
    },
    advance(ms) {
      now += ms;
    },
    restore() {
      Date.now = real;
    },
  };
}

test("work clock and side missions tick apart", () => {
  const clock = installClock(1_700_000_000_000);
  try {
    const api = useQuestStore.getState();
    api.armDrill();
    api.start();
    api.startMission("m-drops");
    api.startMission("m-stretch");
    api.startMission("m-water");
    api.startMission("m-focus");

    const started = useQuestStore.getState();
    assert.equal(started.missionRuns.length, 3);
    assert.equal(started.banner, "MAX 3 SIDE MISSIONS LIVE.");
    const order = started.missionRuns.map((run) => run.id);
    assert.deepEqual(order, ["m-drops", "m-stretch", "m-water"]);
    const mainEndsAt = started.endsAt;
    assert.equal(started.phase, "work");
    assert.equal(started.runState, "running");

    while (clock.now < mainEndsAt) {
      clock.advance(250);
      const live = useQuestStore.getState();
      live.tickClock(clock.now);
      live.tickMissions(clock.now);
      const next = useQuestStore.getState();
      if (next.phase === "work") {
        assert.equal(next.endsAt, mainEndsAt);
        assert.ok(next.remainingMs > 0);
        assert.deepEqual(
          next.missionRuns.map((run) => run.id),
          order,
        );
        for (const run of next.missionRuns) {
          assert.equal(run.runState, "running");
          assert.ok(Math.abs(run.remainingMs - (run.endsAt - clock.now)) < 250);
          assert.notEqual(run.endsAt, next.endsAt);
        }
      }
    }

    const atWorkEnd = useQuestStore.getState();
    assert.equal(atWorkEnd.phase, "break");
    assert.equal(atWorkEnd.runState, "running");
    assert.equal(atWorkEnd.remainingMs, 20_000);
    assert.equal(atWorkEnd.endsAt, clock.now + 20_000);
    assert.equal(atWorkEnd.missionRuns.length, 3);
    assert.deepEqual(
      atWorkEnd.missionRuns.map((run) => run.id),
      order,
    );
    for (const run of atWorkEnd.missionRuns) {
      assert.equal(run.runState, "running");
      assert.ok(run.remainingMs > 1000, `${run.id} still has time`);
    }
    const breakEndsAt = atWorkEnd.endsAt;

    clock.advance(2000);
    useQuestStore.getState().tickClock(clock.now);
    useQuestStore.getState().tickMissions(clock.now);
    const midBreak = useQuestStore.getState();
    assert.equal(midBreak.phase, "break");
    assert.equal(midBreak.endsAt, breakEndsAt);
    assert.equal(midBreak.remainingMs, 18_000);
    assert.equal(midBreak.missionRuns.length, 3);
    assert.deepEqual(
      midBreak.missionRuns.map((run) => run.id),
      order,
    );

    const water = midBreak.missionRuns.find((run) => run.id === "m-water");
    clock.advance(water.endsAt - clock.now);
    useQuestStore.getState().tickMissions(clock.now);
    const afterWater = useQuestStore.getState();
    assert.equal(afterWater.phase, "break");
    assert.equal(afterWater.runState, "running");
    assert.equal(afterWater.endsAt, breakEndsAt);
    assert.ok(afterWater.remainingMs > 10_000);
    assert.deepEqual(
      afterWater.missionRuns.map((run) => run.id),
      ["m-drops", "m-stretch"],
    );
    assert.ok(afterWater.completedIds.includes("m-water"));
    assert.equal(afterWater.lastMissionXp, 4);
    assert.equal(afterWater.sideXpToday, 4);

    const before = useQuestStore.getState();
    const clockSnapshot = {
      phase: before.phase,
      runState: before.runState,
      remainingMs: before.remainingMs,
      endsAt: before.endsAt,
    };
    clock.advance(500);
    useQuestStore.getState().tickMissions(clock.now);
    const afterSideOnly = useQuestStore.getState();
    assert.deepEqual(
      {
        phase: afterSideOnly.phase,
        runState: afterSideOnly.runState,
        remainingMs: afterSideOnly.remainingMs,
        endsAt: afterSideOnly.endsAt,
      },
      clockSnapshot,
    );
  } finally {
    clock.restore();
  }
});

after(async () => {
  await server.close();
});
