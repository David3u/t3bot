import type { Bot, EnvironmentId } from "@t3tools/contracts";
import { useState } from "react";
import * as Cause from "effect/Cause";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "../components/ui/dialog";
import { useAtomCommand } from "../state/use-atom-command";
import { botAtoms } from "./state";

export const BOT_TEMPLATES = [
  {
    name: "Atlas",
    avatar: "🔎",
    label: "Research",
    role: "Research questions thoroughly using current, reliable sources. Cite the evidence, distinguish facts from inference, and deliver useful reports and files.",
  },
  {
    name: "Milo",
    avatar: "🗓️",
    label: "Personal assistant",
    role: "Help me organize my day and advance my goals. Keep track of priorities, prepare drafts and briefings, and suggest useful next steps. Ask before sending external messages or making purchases.",
  },
  {
    name: "Patch",
    avatar: "🛠️",
    label: "Developer",
    role: "Build and maintain software. Inspect the code before changing it, follow project instructions, run focused checks, and report completed changes and remaining limitations.",
  },
] as const;

export function BotProfileDialog({
  environmentId,
  bot,
  initial,
  onClose,
  onCreated,
}: {
  readonly environmentId: EnvironmentId;
  readonly bot?: Bot;
  readonly initial?: { readonly name: string; readonly role: string; readonly avatar: string };
  readonly onClose: () => void;
  readonly onCreated?: (bot: Bot) => void;
}) {
  const [baseProfile] = useState(bot?.profile);
  const [name, setName] = useState(bot?.profile.name ?? initial?.name ?? "");
  const [avatar, setAvatar] = useState(bot?.profile.avatar ?? initial?.avatar ?? "🤖");
  const [role, setRole] = useState(bot?.profile.role ?? initial?.role ?? "");
  const [memory, setMemory] = useState(bot?.profile.memory ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useAtomCommand(botAtoms.create, { reportFailure: false });
  const update = useAtomCommand(botAtoms.update, { reportFailure: false });

  const save = async () => {
    if (pending || !name.trim() || !avatar.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = bot
        ? await update({
            environmentId,
            input: {
              projectId: bot.projectId,
              expectedRevision: baseProfile!.revision,
              name,
              role,
              avatar,
              memory,
              archived: baseProfile!.archived,
              pinned: baseProfile!.pinned,
              skills: baseProfile!.skills,
            },
          })
        : await create({ environmentId, input: { name, role, avatar } });
      if (result._tag === "Failure") {
        const cause = Cause.squash(result.cause);
        setError(cause instanceof Error ? cause.message : "Could not save this bot. Try again.");
      } else {
        onClose();
        if (!bot) onCreated?.(result.value);
      }
    } catch {
      setError("Could not reach the server. Reconnect and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {bot ? `About ${bot.profile.name}` : "Meet your next teammate"}
            </DialogTitle>
            <DialogDescription>
              {bot
                ? "Its role and saved context follow it across conversations and harnesses."
                : "Give your bot a name and a job. Choose its harness when you start chatting."}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="grid grid-cols-[72px_1fr] gap-4">
              <label className="space-y-2 text-sm">
                <span>Avatar</span>
                <Input
                  value={avatar}
                  onChange={(event) => setAvatar(event.target.value)}
                  maxLength={32}
                  required
                  disabled={pending}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Name</span>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="e.g. Atlas"
                  required
                  disabled={pending}
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              <span>What should this bot do?</span>
              <Textarea
                value={role}
                onChange={(event) => setRole(event.target.value)}
                maxLength={8000}
                placeholder="Describe its job, working style, and when it should ask you before acting."
                disabled={pending}
              />
            </label>
            {bot ? (
              <label className="block space-y-2 text-sm">
                <span>Memory</span>
                <Textarea
                  value={memory}
                  onChange={(event) => setMemory(event.target.value)}
                  maxLength={16000}
                  placeholder="Preferences and context you want it to remember. Keep passwords and API keys out of memory."
                  disabled={pending}
                />
                <span className="block text-xs text-muted-foreground">
                  Changes apply to future turns. Past conversations keep their own history.
                </span>
              </label>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim() || !avatar.trim()}>
              {pending ? "Saving…" : bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
