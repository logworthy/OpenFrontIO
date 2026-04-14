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
const INITIAL_THRESHOLD = 30_000;
const THRESHOLD_STEP = 10_000;
const ATTACK_PERCENT = 10;

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
  tick: number;
  threshold: number;
  troopsBefore: number;
  troopsSent: number;
  troopsAfter: number;
};

async function run() {
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

  let nextThreshold = INITIAL_THRESHOLD;
  const attackEvents: AttackEvent[] = [];

  for (let tick = 1; tick <= SIM_TICKS; tick++) {
    while (player.troops() >= nextThreshold) {
      const troopsBefore = player.troops();
      const troopsSent = Math.floor((troopsBefore * ATTACK_PERCENT) / 100);
      if (troopsSent <= 0) break;

      game.addExecution(
        new AttackExecution(troopsSent, player, game.terraNullius().id()),
      );
      const troopsAfter = troopsBefore - troopsSent;

      attackEvents.push({
        tick,
        threshold: nextThreshold,
        troopsBefore,
        troopsSent,
        troopsAfter,
      });

      nextThreshold += THRESHOLD_STEP;
    }

    game.executeNextTick();
  }

  const troopsAttackingTick600 = player
    .outgoingAttacks()
    .reduce((sum, attack) => sum + attack.troops(), 0);

  const reserveTroopsTick600 = player.troops();
  const totalAreaTick600 = player.numTilesOwned();
  const troopCapTick600 = game.config().maxTroops(player);

  const summaryHeader =
    "strategy,sim_ticks,attacks_sent,troops_attacking_tick600,reserve_troops_tick600,total_area_tick600,troop_cap_tick600";
  const summaryRow = [
    "10pct_when_troops_reach_30k_40k_50k_plus",
    SIM_TICKS,
    attackEvents.length,
    troopsAttackingTick600,
    reserveTroopsTick600,
    totalAreaTick600,
    troopCapTick600,
  ].join(",");

  const eventsHeader = "tick,threshold,troops_before,troops_sent,troops_after";
  const eventsRows = attackEvents.map((e) =>
    [e.tick, e.threshold, e.troopsBefore, e.troopsSent, e.troopsAfter].join(
      ",",
    ),
  );

  process.stdout.write(`${summaryHeader}\n${summaryRow}\n`);
  process.stderr.write(`${eventsHeader}\n${eventsRows.join("\n")}\n`);
}

const originalLog = console.log;
const originalWarn = console.warn;
console.log = () => {};
console.warn = () => {};

await run();

console.log = originalLog;
console.warn = originalWarn;
