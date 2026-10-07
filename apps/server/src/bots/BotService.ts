import {
  Bot,
  BotCreateInput,
  BotUpdateInput,
  BotError,
  BotOperationError,
  BotConflictError,
  BotNotFoundError,
  CommandId,
} from "@t3tools/contracts";
import * as KeyedLock from "@t3tools/shared/KeyedLock";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ManagedProjectFolders from "../project/ManagedProjectFolders.ts";
import * as ProjectService from "../project/ProjectService.ts";
import { readBotProfile, writeBotProfile } from "./BotProfiles.ts";

export class BotService extends Context.Service<
  BotService,
  {
    readonly list: Effect.Effect<ReadonlyArray<Bot>, BotError>;
    readonly create: (input: typeof BotCreateInput.Type) => Effect.Effect<Bot, BotError>;
    readonly update: (input: typeof BotUpdateInput.Type) => Effect.Effect<Bot, BotError>;
  }
>()("t3/bots/BotService") {}

const make = Effect.gen(function* () {
  const projects = yield* ProjectService.ProjectService;
  const folders = yield* ManagedProjectFolders.ManagedProjectFolders;
  const locks = yield* KeyedLock.make<string>();
  const profileContext = yield* Effect.context<FileSystem.FileSystem | Path.Path>();
  const read = (root: string) => readBotProfile(root).pipe(Effect.provide(profileContext));
  const write = (root: string, profile: Bot["profile"]) =>
    writeBotProfile(root, profile).pipe(Effect.provide(profileContext));

  const list = Effect.gen(function* () {
    const snapshot = yield* projects.snapshot.pipe(
      Effect.mapError((cause) => new BotOperationError({ operation: "list", cause })),
    );
    const bots = yield* Effect.forEach(
      snapshot.projects.filter((project) => project.deletedAt === null),
      (project) =>
        read(project.workspaceRoot).pipe(
          Effect.map((profile) =>
            profile === null
              ? null
              : { projectId: project.id, workspaceRoot: project.workspaceRoot, profile },
          ),
        ),
      { concurrency: 4 },
    );
    return bots.filter((bot) => bot !== null);
  });

  const create = Effect.fn("BotService.create")(function* (input: typeof BotCreateInput.Type) {
    const project = yield* folders
      .createNamedProject({ name: input.name })
      .pipe(Effect.mapError((cause) => new BotOperationError({ operation: "create", cause })));
    const now = yield* DateTime.now;
    const profile = {
      version: 1 as const,
      ...input,
      memory: "",
      archived: false,
      pinned: false,
      skills: [],
      revision: 0,
      updatedAt: DateTime.formatIso(now),
    };
    yield* write(project.workspaceRoot, profile).pipe(
      Effect.tapError(() =>
        projects
          .delete({
            commandId: CommandId.make(`bot-create-cleanup:${project.projectId}`),
            projectId: project.projectId,
          })
          .pipe(Effect.ignore),
      ),
    );
    // Creation first publishes the workspace. Publish again after the profile
    // exists so other devices can discover the newly created bot.
    yield* projects
      .update({
        commandId: CommandId.make(`bot-profile:${project.projectId}:0`),
        projectId: project.projectId,
        title: profile.name,
      })
      .pipe(Effect.mapError((cause) => new BotOperationError({ operation: "write", cause })));
    return { projectId: project.projectId, workspaceRoot: project.workspaceRoot, profile };
  });

  const update = Effect.fn("BotService.update")(function* (input: typeof BotUpdateInput.Type) {
    return yield* locks.withLock(
      input.projectId,
      Effect.gen(function* () {
        const project = yield* projects
          .getById(input.projectId)
          .pipe(Effect.mapError((cause) => new BotOperationError({ operation: "read", cause })));
        if (Option.isNone(project))
          return yield* new BotNotFoundError({ projectId: input.projectId });
        const current = yield* read(project.value.workspaceRoot);
        if (current === null) return yield* new BotNotFoundError({ projectId: input.projectId });
        if (current.revision !== input.expectedRevision)
          return yield* new BotConflictError({ projectId: input.projectId });
        const now = yield* DateTime.now;
        const { projectId: _id, expectedRevision: _revision, ...fields } = input;
        const profile = {
          ...current,
          ...fields,
          revision: current.revision + 1,
          updatedAt: DateTime.formatIso(now),
        };
        yield* write(project.value.workspaceRoot, profile);
        // Publish through the existing project stream so other clients reload
        // the profile and the workspace title follows the bot's name.
        yield* projects
          .update({
            commandId: CommandId.make(`bot-profile:${input.projectId}:${profile.revision}`),
            projectId: input.projectId,
            title: profile.name,
          })
          .pipe(Effect.mapError((cause) => new BotOperationError({ operation: "write", cause })));
        return { projectId: input.projectId, workspaceRoot: project.value.workspaceRoot, profile };
      }),
    );
  });

  return BotService.of({ list, create, update });
});

export const layer = Layer.effect(BotService, make);
