import { assert, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ProjectId, type Project } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ProjectService from "../project/ProjectService.ts";
import * as ManagedProjectFolders from "../project/ManagedProjectFolders.ts";
import { BotService, layer } from "./BotService.ts";

const withBots = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs.makeTempDirectoryScoped();
  const projects: Project[] = [];
  const dependencies = Layer.mergeAll(
    Layer.mock(ProjectService.ProjectService)({
      update: (input) =>
        Effect.sync(() => {
          const index = projects.findIndex((item) => item.id === input.projectId);
          const project = projects[index]!;
          const updated = { ...project, title: input.title ?? project.title };
          projects[index] = updated;
          return updated;
        }),
      getById: (id) =>
        Effect.sync(() => Option.fromNullishOr(projects.find((project) => project.id === id))),
      snapshot: Effect.sync(() => ({ projects, updatedAt: "2026-10-06T00:00:00.000Z" })),
    }),
    Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
      namedProjectsRoot: root,
      createNamedProject: ({ name }) =>
        Effect.gen(function* () {
          const workspaceRoot = `${root}/${projects.length}`;
          yield* fs.makeDirectory(workspaceRoot).pipe(Effect.orDie);
          const project: Project = {
            id: ProjectId.make(`bot-${projects.length}`),
            title: name,
            workspaceRoot,
            defaultModelSelection: null,
            scripts: [],
            createdAt: "2026-10-06T00:00:00.000Z",
            updatedAt: "2026-10-06T00:00:00.000Z",
            deletedAt: null,
          };
          projects.push(project);
          return { projectId: project.id, workspaceRoot };
        }),
    }),
  );
  return yield* BotService.pipe(Effect.provide(layer.pipe(Layer.provide(dependencies))));
});

it.effect("keeps bots and memory distinct across managed workspaces", () =>
  Effect.gen(function* () {
    const bots = yield* withBots;
    const atlas = yield* bots.create({ name: "Atlas", avatar: "🔎", role: "Research" });
    const milo = yield* bots.create({ name: "Milo", avatar: "🗓️", role: "Plan my day" });
    assert.notEqual(atlas.workspaceRoot, milo.workspaceRoot);
    const updated = yield* bots.update({
      projectId: atlas.projectId,
      expectedRevision: 0,
      ...atlas.profile,
      memory: "Use metric units.",
    });
    assert.equal(updated.profile.revision, 1);
    const stored = yield* bots.list;
    assert.equal(stored.length, 2);
    assert.equal(
      stored.find((bot) => bot.projectId === atlas.projectId)?.profile.memory,
      "Use metric units.",
    );
    assert.equal(stored.find((bot) => bot.projectId === milo.projectId)?.profile.memory, "");
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("rejects stale and concurrent edits without losing the accepted memory", () =>
  Effect.gen(function* () {
    const bots = yield* withBots;
    const bot = yield* bots.create({ name: "Atlas", avatar: "🔎", role: "Research" });
    const results = yield* Effect.forEach(
      ["First device", "Second device"],
      (memory) =>
        Effect.result(
          bots.update({ projectId: bot.projectId, expectedRevision: 0, ...bot.profile, memory }),
        ),
      { concurrency: "unbounded" },
    );
    const success = results.find((result) => result._tag === "Success");
    const failure = results.find((result) => result._tag === "Failure");
    assert.equal(success?._tag, "Success");
    assert.equal(failure?._tag === "Failure" ? failure.failure._tag : null, "BotConflictError");
    const stored = (yield* bots.list)[0];
    assert.equal(stored?.profile.revision, 1);
    assert.equal(
      stored?.profile.memory,
      success?._tag === "Success" ? success.success.profile.memory : null,
    );
  }).pipe(Effect.provide(NodeServices.layer)),
);

it.effect("returns a recoverable error for a missing bot", () =>
  Effect.gen(function* () {
    const bots = yield* withBots;
    const result = yield* Effect.result(
      bots.update({
        projectId: ProjectId.make("gone"),
        expectedRevision: 0,
        name: "Gone",
        avatar: "🤖",
        role: "",
        memory: "",
        archived: false,
        pinned: false,
        skills: [],
      }),
    );
    assert.equal(result._tag === "Failure" ? result.failure._tag : null, "BotNotFoundError");
  }).pipe(Effect.provide(NodeServices.layer)),
);
