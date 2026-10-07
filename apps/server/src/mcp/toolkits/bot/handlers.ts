import { OrchestratorMcpFailure, type BotError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import { BotService } from "../../../bots/BotService.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { BotToolkit } from "./tools.ts";

const botFailure = (error: BotError) =>
  new OrchestratorMcpFailure({
    code: error._tag === "BotOperationError" ? "orchestration_error" : "invalid_request",
    message: error.message,
  });

export const layer = McpToolAccess.toLayer(BotToolkit, {
  t3_bot_list: McpToolAccess.reads(() =>
    BotService.pipe(
      Effect.flatMap((bots) => bots.list),
      Effect.map((bots) => ({ bots })),
      Effect.mapError(botFailure),
    ),
  ),
  t3_bot_create: McpToolAccess.writesEnvironment((input) =>
    BotService.pipe(
      Effect.flatMap((bots) => bots.create(input)),
      Effect.mapError(botFailure),
    ),
  ),
  t3_bot_update: McpToolAccess.writesEnvironment((input) =>
    BotService.pipe(
      Effect.flatMap((bots) => bots.update(input)),
      Effect.mapError(botFailure),
    ),
  ),
});
