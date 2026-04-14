import { dirname } from "path";
import { fileURLToPath } from "url";
import { DefaultConfig } from "../../src/core/configuration/DefaultConfig";
import { AttackExecution } from "../../src/core/execution/AttackExecution";
import { SpawnExecution } from "../../src/core/execution/SpawnExecution";
import {
  Player,
  PlayerInfo,
  PlayerType,
  TerraNullius,
} from "../../src/core/game/Game";
import { setup } from "../util/Setup";
import { UseRealAttackLogic } from "../util/TestConfig";

const SIM_TICKS = 600; // 60s at 100ms/tick

const ATTACK_PERCENTS = [1, 5, 10, 20] as const;
const THRESHOLD_PLANS = [
  { progression: "same", initialThreshold: 30_000, thresholdStep: 10_000 },
  { progression: "doubling", initialThreshold: 30_000, thresholdStep: 20_000 },
  { progression: "halving", initialThreshold: 35_000, thresholdStep: 5_000 },
] as const;

class RealCombatConfig extends UseRealAttackLogic {
  attackTilesPerTick(
    attackTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    numAdjacentTilesWithEnemy: number,
  ): number {
    return DefaultConfig.prototype.attackTilesPerTick.call(
      this,
      attackTroops,
      attacker,
      defender,
      numAdjacentTilesWithEnemy,
    );
  }
}

type AttackEvent = {
  strategy: string;
  progression: (typeof THRESHOLD_PLANS)[number]["progression"];
  attackPercent: number;
  tick: number;
  threshold: number;
  troopsBefore: number;
  troopsSent: number;
  troopsAfter: number;
};

type StrategyResult = {
  strategy: string;
  progression: (typeof THRESHOLD_PLANS)[number]["progression"];
  attackPercent: number;
  simTicks: number;
  attacksSent: number;
  troopsAttackingTick600: number;
  reserveTroopsTick600: number;
  totalTroopsTick600: number;
  totalAreaTick600: number;
  troopCapTick600: number;
};

async function runSingleStrategy(
  progression: (typeof THRESHOLD_PLANS)[number]["progression"],
  initialThreshold: number,
  thresholdStep: number,
  attackPercent: number,
): Promise<{ summary: StrategyResult; events: AttackEvent[] }> {
  const playerInfo = new PlayerInfo(
    "planner",
    PlayerType.Human,
    "client_1",
    "player_1",
  );

  const game = await setup(
    "big_plains",
    {
      bots: 0,
      randomSpawn: false,
      nations: "none",
    },
    [],
    dirname(fileURLToPath(import.meta.url)),
    RealCombatConfig,
  );

  game.addExecution(
    new SpawnExecution(
      "wilderness_threshold_perf",
      playerInfo,
      game.ref(100, 100),
    ),
  );

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  const player = game.player("player_1");

  let nextThreshold = initialThreshold;
  const attackEvents: AttackEvent[] = [];
  const strategy = `${progression}_${attackPercent}pct`;

  for (let tick = 1; tick <= SIM_TICKS; tick++) {
    while (player.troops() >= nextThreshold) {
      const troopsBefore = player.troops();
      const troopsSent = Math.floor((troopsBefore * attackPercent) / 100);
      if (troopsSent <= 0) break;

      game.addExecution(
        new AttackExecution(troopsSent, player, game.terraNullius().id()),
      );
      const troopsAfter = troopsBefore - troopsSent;

      attackEvents.push({
        strategy,
        progression,
        attackPercent,
        tick,
        threshold: nextThreshold,
        troopsBefore,
        troopsSent,
        troopsAfter,
      });

      nextThreshold += thresholdStep;
    }

    game.executeNextTick();
  }

  const troopsAttackingTick600 = player
    .outgoingAttacks()
    .reduce((sum, attack) => sum + attack.troops(), 0);

  const reserveTroopsTick600 = player.troops();
  const totalTroopsTick600 = troopsAttackingTick600 + reserveTroopsTick600;
  const totalAreaTick600 = player.numTilesOwned();
  const troopCapTick600 = game.config().maxTroops(player);

  return {
    summary: {
      strategy,
      progression,
      attackPercent,
      simTicks: SIM_TICKS,
      attacksSent: attackEvents.length,
      troopsAttackingTick600,
      reserveTroopsTick600,
      totalTroopsTick600,
      totalAreaTick600,
      troopCapTick600,
    },
    events: attackEvents,
  };
}

async function run() {
  const summaries: StrategyResult[] = [];
  const events: AttackEvent[] = [];

  for (const {
    progression,
    initialThreshold,
    thresholdStep,
  } of THRESHOLD_PLANS) {
    for (const attackPercent of ATTACK_PERCENTS) {
      const result = await runSingleStrategy(
        progression,
        initialThreshold,
        thresholdStep,
        attackPercent,
      );
      summaries.push(result.summary);
      events.push(...result.events);
    }
  }

  const summaryHeader =
    "strategy,progression,attack_percent,sim_ticks,attacks_sent,troops_attacking_tick600,reserve_troops_tick600,total_troops_tick600,total_area_tick600,troop_cap_tick600";
  const summaryRows = summaries.map((s) =>
    [
      s.strategy,
      s.progression,
      s.attackPercent,
      s.simTicks,
      s.attacksSent,
      s.troopsAttackingTick600,
      s.reserveTroopsTick600,
      s.totalTroopsTick600,
      s.totalAreaTick600,
      s.troopCapTick600,
    ].join(","),
  );

  const eventsHeader =
    "strategy,progression,attack_percent,tick,threshold,troops_before,troops_sent,troops_after";
  const eventsRows = events.map((e) =>
    [
      e.strategy,
      e.progression,
      e.attackPercent,
      e.tick,
      e.threshold,
      e.troopsBefore,
      e.troopsSent,
      e.troopsAfter,
    ].join(","),
  );

  process.stdout.write(`${summaryHeader}\n${summaryRows.join("\n")}\n`);
  process.stderr.write(`${eventsHeader}\n${eventsRows.join("\n")}\n`);
}

const originalLog = console.log;
const originalWarn = console.warn;
console.log = () => {};
console.warn = () => {};

await run();

console.log = originalLog;
console.warn = originalWarn;
