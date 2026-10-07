import { BotSkillsDialog } from "./BotSkillsDialog";
import { BotRoutinesDialog } from "./BotRoutinesDialog";
import { useThreadShell } from "../state/entities";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ThreadId } from "@t3tools/contracts";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import {
  BrainIcon,
  ClockIcon,
  MonitorIcon,
  PlusIcon,
  EyeOffIcon,
  EyeIcon,
  BookOpenIcon,
  FolderIcon,
  TerminalIcon,
  PinIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { dispatchPreviewAction } from "../components/preview/previewActionBus";
import { useAtomCommand } from "../state/use-atom-command";
import { BotProfileDialog } from "./BotProfileDialog";
import { botAtoms, useBots, useOpenBot } from "./state";

export function BotConversationBar({
  environmentId,
  projectId,
  threadId,
}: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId | null;
  readonly threadId: ThreadId | null;
}) {
  const { bots } = useBots(environmentId);
  const bot = bots.find((candidate) => candidate.projectId === projectId);
  const openBot = useOpenBot(environmentId);
  const update = useAtomCommand(botAtoms.update);
  const thread = useThreadShell(threadId ? scopeThreadRef(environmentId, threadId) : null);
  const [skills, setSkills] = useState(false);
  const [routines, setRoutines] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hiding, setHiding] = useState(false);
  if (!bot) return null;
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-xl">
            {bot.profile.avatar}
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-semibold">{bot.profile.name}</span>
            <span className="block text-xs text-muted-foreground">
              {bot.profile.archived ? "Hidden · routines stay active" : "Your persistent teammate"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <BrainIcon size={15} />
            Profile & memory
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={thread === null}
            onClick={() => setRoutines(true)}
          >
            <ClockIcon size={15} />
            Routines
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSkills(true)}>
            <BookOpenIcon size={15} />
            Skills
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Open bot files"
            onClick={() => dispatchPreviewAction("open-files")}
          >
            <FolderIcon size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Toggle bot terminal"
            onClick={() => dispatchPreviewAction("toggle-terminal")}
          >
            <TerminalIcon size={15} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatchPreviewAction("toggle-panel")}>
            <MonitorIcon size={15} />
            Computer
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Start a new conversation with this bot"
            onClick={() => {
              void openBot(bot, true);
            }}
          >
            <PlusIcon size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={hiding}
            aria-label={bot.profile.pinned ? "Unpin bot" : "Pin bot"}
            aria-pressed={bot.profile.pinned}
            onClick={() => {
              setHiding(true);
              void update({
                environmentId,
                input: {
                  ...bot.profile,
                  projectId: bot.projectId,
                  expectedRevision: bot.profile.revision,
                  pinned: !bot.profile.pinned,
                },
              }).finally(() => setHiding(false));
            }}
          >
            <PinIcon size={15} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={hiding}
            aria-label={bot.profile.archived ? "Unhide bot" : "Hide bot"}
            onClick={() => {
              setHiding(true);
              void update({
                environmentId,
                input: {
                  projectId: bot.projectId,
                  expectedRevision: bot.profile.revision,
                  ...bot.profile,
                  archived: !bot.profile.archived,
                },
              }).finally(() => setHiding(false));
            }}
          >
            {bot.profile.archived ? <EyeIcon size={15} /> : <EyeOffIcon size={15} />}
          </Button>
        </div>
      </div>
      {skills ? (
        <BotSkillsDialog
          key={bot.projectId}
          bot={bot}
          environmentId={environmentId}
          onClose={() => setSkills(false)}
        />
      ) : null}
      {routines && thread ? (
        <BotRoutinesDialog
          key={bot.projectId}
          environmentId={environmentId}
          bot={bot}
          thread={thread}
          onClose={() => setRoutines(false)}
        />
      ) : null}
      {editing ? (
        <BotProfileDialog
          key={bot.projectId}
          environmentId={environmentId}
          bot={bot}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
