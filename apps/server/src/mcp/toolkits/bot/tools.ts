import { Bot, BotCreateInput, BotUpdateInput, OrchestratorMcpFailure } from "@t3tools/contracts";
import { Tool, Toolkit } from "effect/ai";
import * as Schema from "effect/Schema";
import { BotService } from "../../../bots/BotService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";

const BotListTool = Tool.make("t3_bot_list", {
  description:
    "List the persistent bots on this environment, including their roles, memory, workspace bindings, and profile revisions.",
  parameters: Tool.EmptyParams,
  success: Schema.Struct({ bots: Schema.Array(Bot) }),
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    BotService,
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
  ],
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);
const BotCreateTool = Tool.make("t3_bot_create", {
  description:
    "Create a persistent bot and its managed workspace. Each call creates a bot; retain its projectId and use t3_thread_launch to start a conversation only when requested.",
  parameters: BotCreateInput,
  success: Bot,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    BotService,
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
  ],
}).annotate(Tool.Destructive, true);
const BotUpdateTool = Tool.make("t3_bot_update", {
  description:
    "Save a bot's role, avatar, memory, skills, pinned status, or hidden status. Read t3_bot_list first and pass expectedRevision to avoid overwriting another device's changes. Hiding does not pause routines. Keep secrets out of memory.",
  parameters: BotUpdateInput,
  success: Bot,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    BotService,
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
  ],
}).annotate(Tool.Destructive, true);

export const BotToolkit = Toolkit.make(BotListTool, BotCreateTool, BotUpdateTool);
