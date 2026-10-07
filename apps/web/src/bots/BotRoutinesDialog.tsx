import type { Bot, EnvironmentId } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useState } from "react";
import { ClockIcon, PlayIcon, PauseIcon } from "lucide-react";
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
import { useEnvironmentQuery } from "../state/query";
import { serverEnvironment } from "../state/server";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";

export function BotRoutinesDialog({
  bot,
  environmentId,
  thread,
  onClose,
}: {
  readonly bot: Bot;
  readonly environmentId: EnvironmentId;
  readonly thread: EnvironmentThreadShell;
  readonly onClose: () => void;
}) {
  const query = useEnvironmentQuery(
    serverEnvironment.scheduledTasksLive({ environmentId, input: {} }),
  );
  const tasks = query.data?.tasks.filter((task) => task.projectId === bot.projectId) ?? [];
  const create = useAtomCommand(serverEnvironment.upsertScheduledTask, { reportFailure: false });
  const toggle = useAtomCommand(serverEnvironment.setScheduledTaskEnabled);
  const run = useAtomCommand(serverEnvironment.runScheduledTaskNow);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (saving || !title.trim() || !prompt.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await create({
        environmentId,
        input: {
          title: title.trim(),
          prompt: prompt.trim(),
          enabled: true,
          schedule: { type: "fixed_time", timeOfDay: time },
          projectId: bot.projectId,
          threadId: thread.id,
          workspaceStrategy: { type: "root" },
          modelSelection: thread.modelSelection,
          runtimeMode: thread.runtimeMode,
          interactionMode: thread.interactionMode,
          creationSource: "web",
        },
      });
      if (result._tag === "Failure") {
        const failure = squashAtomCommandFailure(result);
        setError(
          failure instanceof Error ? failure.message : "Could not save this routine. Try again.",
        );
      } else {
        setTitle("");
        setPrompt("");
      }
    } catch {
      setError("Could not reach the server. Reconnect and try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bot.profile.name}'s routines</DialogTitle>
          <DialogDescription>
            Repeat useful work and bring the result back to this conversation. Your server must stay
            awake.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogPanel>
            {tasks.length ? (
              <div className="divide-y divide-border">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {task.enabled
                          ? task.nextRunAt
                            ? `Next: ${new Date(task.nextRunAt).toLocaleString()}`
                            : "Waiting for an event"
                          : "Paused"}{" "}
                        · {task.lastRunStatus}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busyTask === task.id}
                        aria-label={`Run ${task.title} now`}
                        onClick={() => {
                          setBusyTask(task.id);
                          void run({ environmentId, input: { id: task.id } }).finally(() =>
                            setBusyTask(null),
                          );
                        }}
                      >
                        <PlayIcon size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyTask === task.id}
                        onClick={() => {
                          setBusyTask(task.id);
                          void toggle({
                            environmentId,
                            input: { id: task.id, enabled: !task.enabled },
                          }).finally(() => setBusyTask(null));
                        }}
                      >
                        {task.enabled ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                        {task.enabled ? "Pause" : "Resume"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No routines yet. Start with a daily briefing or a recurring check.
              </p>
            )}
            {query.error ? (
              <p role="alert" className="text-sm text-destructive">
                {query.error}
              </p>
            ) : null}
            <div className="border-t border-border pt-4">
              <h3 className="mb-4 text-sm font-medium">Add a daily routine</h3>
              <div className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span>Name</span>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Morning briefing"
                    required
                    maxLength={200}
                    disabled={saving}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>What should it do?</span>
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Review my priorities and prepare a short briefing with sources. Ask before sending anything externally."
                    required
                    disabled={saving}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Daily at (server time)</span>
                  <Input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                    disabled={saving}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Uses this conversation's current harness and permissions. Review those before
                  enabling unattended work.
                </p>
              </div>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Close
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !prompt.trim()}>
              <ClockIcon size={15} />
              {saving ? "Saving…" : "Add routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
