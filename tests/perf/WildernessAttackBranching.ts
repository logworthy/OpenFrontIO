import { dirname } from "path";
import { fileURLToPath } from "url";
import { AttackExecution } from "../../src/core/execution/AttackExecution";
import { SpawnExecution } from "../../src/core/execution/SpawnExecution";
import { PlayerInfo, PlayerType } from "../../src/core/game/Game";
import { setup } from "../util/Setup";

const DECISION_TICKS = [10, 20, 30] as const;
const PERCENT_CHOICES = [0, 1, 10, 20, 30] as const;
const EVAL_TICK = 40;

type Path = [number, number, number];

type Result = {
  path: Path;
  troopsAttackingTick40: number;
  reserveTroopsTick40: number;
  totalAreaTick40: number;
};

function allPaths(): Path[] {
  const paths: Path[] = [];
  for (const a of PERCENT_CHOICES) {
    for (const b of PERCENT_CHOICES) {
      for (const c of PERCENT_CHOICES) {
        paths.push([a, b, c]);
      }
    }
  }
  return paths;
}

async function runPath(path: Path): Promise<Result> {
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
  );

  game.addExecution(
    new SpawnExecution(
      "wilderness_branching_perf",
      playerInfo,
      game.ref(100, 100),
    ),
  );

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  const player = game.player("player_1");

  const decisionsByTick = new Map<number, number>([
    [DECISION_TICKS[0], path[0]],
    [DECISION_TICKS[1], path[1]],
    [DECISION_TICKS[2], path[2]],
  ]);

  for (let simTick = 1; simTick <= EVAL_TICK; simTick++) {
    const pct = decisionsByTick.get(simTick);
    if (pct !== undefined && pct > 0) {
      const requestedTroops = Math.floor((player.troops() * pct) / 100);
      if (requestedTroops > 0) {
        game.addExecution(
          new AttackExecution(
            requestedTroops,
            player,
            game.terraNullius().id(),
          ),
        );
      }
    }

    game.executeNextTick();
  }

  const troopsAttackingTick40 = player
    .outgoingAttacks()
    .reduce((sum, attack) => sum + attack.troops(), 0);

  return {
    path,
    troopsAttackingTick40,
    reserveTroopsTick40: player.troops(),
    totalAreaTick40: player.numTilesOwned(),
  };
}

function toCSV(results: Result[]): string {
  const header =
    "p10,p20,p30,troops_attacking_tick40,reserve_troops_tick40,total_area_tick40";
  const lines = results.map((r) =>
    [
      r.path[0],
      r.path[1],
      r.path[2],
      r.troopsAttackingTick40,
      r.reserveTroopsTick40,
      r.totalAreaTick40,
    ].join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

const originalLog = console.log;
const originalError = console.error;
console.log = () => {};
console.error = () => {};

const start = performance.now();
const results: Result[] = [];

for (const path of allPaths()) {
  results.push(await runPath(path));
}

const elapsedMs = performance.now() - start;
const elapsedSec = elapsedMs / 1000;
const averageMs = elapsedMs / results.length;

console.log = originalLog;
console.error = originalError;

const csv = toCSV(results);
process.stdout.write(csv);
process.stderr.write(
  `Simulated ${results.length} paths in ${elapsedSec.toFixed(2)}s (${averageMs.toFixed(2)}ms/path)\n`,
);
