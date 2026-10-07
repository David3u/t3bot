import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { McpServer } from "effect/ai";
import { BotService } from "../../../bots/BotService.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import { toolkitRegistration } from "../../McpHttpServer.ts";
import * as BotHandlers from "./handlers.ts";
import { BotToolkit } from "./tools.ts";

it.effect("registers the bot tools before the server accepts requests", () =>
  Effect.gen(function* () {
    const context = yield* Layer.build(
      toolkitRegistration(BotToolkit, BotHandlers.layer).pipe(
        Layer.provideMerge(McpServer.McpServer.layer),
        Layer.provide(
          Layer.mergeAll(
            Layer.mock(BotService)({ list: Effect.succeed([]) }),
            Layer.mock(ThreadManagementService.ThreadManagementService)({}),
          ),
        ),
      ),
    );
    const server = Context.get(context, McpServer.McpServer);
    expect(server.tools.map(({ tool }) => tool.name).toSorted()).toEqual([
      "t3_bot_create",
      "t3_bot_list",
      "t3_bot_update",
    ]);
  }),
);
