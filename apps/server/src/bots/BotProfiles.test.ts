import { assert, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { BOT_PROFILE_PATH, BotProfile, formatBotContext } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { readBotProfile, writeBotProfile } from "./BotProfiles.ts";

const profile: BotProfile = {
  version: 1,
  name: "Atlas",
  avatar: "🔎",
  role: "Research with sources.",
  memory: "I prefer short reports.",
  archived: false,
  pinned: false,
  skills: [],
  revision: 0,
  updatedAt: "2026-10-06T00:00:00.000Z",
};

it.effect("persists bot memory across fresh reads and preserves a complete replacement", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* fs.makeTempDirectoryScoped();
    assert.equal(yield* readBotProfile(root), null);
    yield* writeBotProfile(root, profile);
    assert.deepEqual(yield* readBotProfile(root), profile);
    const revised = { ...profile, memory: "Use metric units.", revision: 1 };
    yield* writeBotProfile(root, revised);
    assert.deepEqual(yield* readBotProfile(root), revised);
    assert.equal(yield* fs.exists(`${root}/${BOT_PROFILE_PATH}.tmp`), false);
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("does not silently discard corrupt bot memory", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fs.makeTempDirectoryScoped();
    yield* fs.makeDirectory(path.join(root, ".t3bot"));
    yield* fs.writeFileString(path.join(root, BOT_PROFILE_PATH), '{"version":99}');
    const result = yield* Effect.result(readBotProfile(root));
    assert.equal(result._tag, "Failure");
  }).pipe(Effect.provide(NodeServices.layer)),
);

it("supplies the same role and memory independently of a provider's native history", () => {
  const context = formatBotContext(profile);
  assert.include(context, "Research with sources.");
  assert.include(context, "I prefer short reports.");
  assert.include(context, "current instructions take priority");
  assert.notInclude(formatBotContext({ ...profile, memory: "" }), "Saved user preferences");
});

it("supplies enabled workflows and omits disabled workflows across harnesses", () => {
  const context = formatBotContext({
    ...profile,
    skills: [
      {
        name: "Briefing",
        instructions: "Include a source for every factual claim.",
        enabled: true,
      },
      {
        name: "Legacy workflow",
        instructions: "Never deliver this disabled instruction.",
        enabled: false,
      },
    ],
  });
  assert.include(context, "Briefing");
  assert.include(context, "Include a source for every factual claim.");
  assert.notInclude(context, "Never deliver this disabled instruction.");
});
