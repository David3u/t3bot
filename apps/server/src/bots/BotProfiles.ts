// @effect-diagnostics nodeBuiltinImport:off - resolve the profile without adding a Path dependency to turn startup.
import { BOT_PROFILE_PATH, BotOperationError, BotProfile } from "@t3tools/contracts";
import * as NodePath from "node:path";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

const decodeProfile = Schema.decodeUnknownEffect(Schema.fromJsonString(BotProfile));
const encodeProfile = Schema.encodeEffect(Schema.fromJsonString(BotProfile));

export const readBotProfile = Effect.fn("BotProfiles.read")(function* (workspaceRoot: string) {
  const fs = yield* FileSystem.FileSystem;
  const contents = yield* fs
    .readFileString(NodePath.join(workspaceRoot, BOT_PROFILE_PATH))
    .pipe(
      Effect.catch((cause) =>
        cause.reason._tag === "NotFound"
          ? Effect.succeed(null)
          : Effect.fail(new BotOperationError({ operation: "read", cause })),
      ),
    );
  if (contents === null) return null;
  return yield* decodeProfile(contents).pipe(
    Effect.mapError((cause) => new BotOperationError({ operation: "read", cause })),
  );
});

/** Readers see either the old complete profile or the new complete profile. */
export const writeBotProfile = Effect.fn("BotProfiles.write")(
  function* (workspaceRoot: string, profile: BotProfile) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const destination = path.join(workspaceRoot, BOT_PROFILE_PATH);
    yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
    const contents = yield* encodeProfile(profile);
    // Saved preferences are state: checkpoints and commits must not restore
    // or publish them alongside the bot's work files.
    const ignorePath = path.join(path.dirname(destination), ".gitignore");
    if (!(yield* fs.exists(ignorePath))) yield* fs.writeFileString(ignorePath, "*\n");
    const temporary = yield* fs.makeTempFile({
      directory: path.dirname(destination),
      prefix: "profile-",
      suffix: ".tmp",
    });
    yield* fs
      .writeFileString(temporary, `${contents}\n`)
      .pipe(
        Effect.andThen(fs.rename(temporary, destination)),
        Effect.ensuring(fs.remove(temporary).pipe(Effect.ignore)),
      );
  },
  Effect.mapError((cause) => new BotOperationError({ operation: "write", cause })),
);
