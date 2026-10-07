import type { Bot, BotSkill, EnvironmentId } from "@t3tools/contracts";
import { randomUUID } from "../lib/utils";
import { useState } from "react";
import * as Cause from "effect/Cause";
import { PlusIcon, TrashIcon } from "lucide-react";
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

export function BotSkillsDialog({
  bot,
  environmentId,
  onClose,
}: {
  readonly bot: Bot;
  readonly environmentId: EnvironmentId;
  readonly onClose: () => void;
}) {
  const [baseProfile] = useState(bot.profile);
  const [skills, setSkills] = useState<readonly (BotSkill & { key: string })[]>(() =>
    bot.profile.skills.map((skill) => ({ ...skill, key: randomUUID() })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useAtomCommand(botAtoms.update, { reportFailure: false });
  const change = (index: number, patch: Partial<BotSkill>) =>
    setSkills((current) =>
      current.map((skill, position) => (position === index ? { ...skill, ...patch } : skill)),
    );
  const save = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await update({
        environmentId,
        input: {
          ...baseProfile,
          projectId: bot.projectId,
          expectedRevision: baseProfile.revision,
          skills: skills.map(({ key: _key, ...skill }) => skill),
        },
      });
      if (result._tag === "Success") onClose();
      else {
        const failure = Cause.squash(result.cause);
        setError(failure instanceof Error ? failure.message : "Could not save skills. Try again.");
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
        <DialogHeader>
          <DialogTitle>{bot.profile.name}'s skills</DialogTitle>
          <DialogDescription>
            Save reusable workflows. Enabled skills follow this bot across harnesses and apply to
            future turns.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogPanel>
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a workflow you want this bot to repeat, such as how to prepare a sourced
                briefing.
              </p>
            ) : null}
            {skills.map((skill, index) => (
              <fieldset
                key={skill.key}
                disabled={pending}
                className="space-y-3 border-b border-border pb-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={skill.enabled}
                      onChange={(event) => change(index, { enabled: event.target.checked })}
                    />
                    Use this skill
                  </label>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${skill.name || "skill"}`}
                    onClick={() =>
                      setSkills((current) => current.filter((_, position) => position !== index))
                    }
                  >
                    <TrashIcon size={15} />
                  </Button>
                </div>
                <label className="block space-y-2 text-sm">
                  <span>Skill name</span>
                  <Input
                    value={skill.name}
                    onChange={(event) => change(index, { name: event.target.value })}
                    required
                    maxLength={100}
                    placeholder="Weekly research brief"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Workflow instructions</span>
                  <Textarea
                    value={skill.instructions}
                    onChange={(event) => change(index, { instructions: event.target.value })}
                    maxLength={4000}
                    placeholder="Search primary sources, compare findings, cite evidence, and save a short report in the workspace."
                  />
                </label>
              </fieldset>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={pending || skills.length >= 8}
              onClick={() =>
                setSkills((current) => [
                  ...current,
                  { name: "", instructions: "", enabled: true, key: randomUUID() },
                ])
              }
            >
              <PlusIcon size={15} />
              Add skill
            </Button>
            <p className="text-xs text-muted-foreground">
              These are workflow instructions. Available tools and integrations depend on the
              selected harness. Keep credentials out of skills.
            </p>
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
            <Button type="submit" disabled={pending || skills.some((skill) => !skill.name.trim())}>
              {pending ? "Saving…" : "Save skills"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
