import { Link, useParams } from "@tanstack/react-router";
import {
  BotIcon,
  PlusIcon,
  SettingsIcon,
  ClockIcon,
  BlocksIcon,
  ChevronDownIcon,
  FolderIcon,
} from "lucide-react";
import { EnvironmentId } from "@t3tools/contracts";
import { useEnvironments } from "../state/environments";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SidebarHeader, SidebarContent, SidebarFooter, useSidebar } from "../components/ui/sidebar";
import { useThreadShell, useThreadShells } from "../state/entities";
import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { resolveThreadRouteRef } from "../threadRoutes";
import { BotProfileDialog } from "./BotProfileDialog";
import { selectBotEnvironment, useBots, useOpenBot } from "./state";
import { cn } from "../lib/utils";

export function BotSidebar({ onWorkbench }: { readonly onWorkbench: () => void }) {
  const { bots, environmentId, error, isPending, refresh } = useBots();
  const openBot = useOpenBot(environmentId);
  const { environments } = useEnvironments();
  const { setOpenMobile } = useSidebar();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const params = useParams({ strict: false });
  const activeThread = useThreadShell(resolveThreadRouteRef(params));
  const draft = useComposerDraftStore((store) =>
    params.draftId ? store.getDraftSession(DraftId.make(params.draftId)) : null,
  );
  const activeProjectId = activeThread?.projectId ?? draft?.projectId;
  const threads = useThreadShells();
  const visible = bots
    .toSorted(
      (a, b) =>
        Number(b.profile.pinned) - Number(a.profile.pinned) ||
        a.profile.name.localeCompare(b.profile.name),
    )
    .filter(
      (bot) =>
        bot.profile.archived === showHidden &&
        `${bot.profile.name} ${bot.profile.role}`.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between pb-4 pt-3">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BotIcon size={19} />
            </span>
            T3bot
          </Link>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Create bot"
            onClick={() => setCreating(true)}
            disabled={environmentId === null}
          >
            <PlusIcon size={18} />
          </Button>
        </div>
        {environments.length > 1 ? (
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Server</span>
            <select
              aria-label="Bot server"
              value={environmentId ?? ""}
              onChange={(event) => selectBotEnvironment(EnvironmentId.make(event.target.value))}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {environments.map((environment) => (
                <option key={environment.environmentId} value={environment.environmentId}>
                  {environment.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a bot…"
          aria-label="Search bots"
        />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex items-center justify-between px-4 pb-2 pt-4 text-xs text-muted-foreground">
          <span>{showHidden ? "Hidden bots" : "Your bots"}</span>
          <span>{visible.length}</span>
        </div>
        <div className="space-y-1 px-2">
          {visible.map((bot) => {
            const work = threads.filter(
              (thread) =>
                thread.environmentId === environmentId &&
                thread.projectId === bot.projectId &&
                thread.deletedAt === null,
            );
            const running = work.some(
              (thread) =>
                thread.latestRun?.status === "running" || thread.latestRun?.status === "starting",
            );
            return (
              <button
                key={bot.projectId}
                type="button"
                onClick={() => {
                  void openBot(bot).then(() => setOpenMobile(false));
                }}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                  activeProjectId === bot.projectId && "bg-accent",
                )}
                aria-current={activeProjectId === bot.projectId ? "page" : undefined}
              >
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                  {bot.profile.avatar}
                  {running ? (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-success" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{bot.profile.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {running ? "Working" : bot.profile.role || "Ready when you are"}
                  </span>
                </span>
              </button>
            );
          })}
          {isPending && bots.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Loading bots…</p>
          ) : null}
          {error ? (
            <div className="px-3 py-3">
              <p role="alert" className="mb-2 text-xs text-destructive">
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : null}
          {!isPending && !error && visible.length === 0 ? (
            <p className="px-3 py-5 text-sm text-muted-foreground">
              {search
                ? "No bots match your search."
                : showHidden
                  ? "No hidden bots."
                  : "Create a bot to get started."}
            </p>
          ) : null}
        </div>
        {showHidden || bots.some((bot) => bot.profile.archived) ? (
          <div className="px-4 py-3">
            <Button size="sm" variant="ghost" onClick={() => setShowHidden(!showHidden)}>
              <ChevronDownIcon size={14} />
              {showHidden ? "Show active bots" : "Show hidden bots"}
            </Button>
          </div>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <div className="space-y-1 border-t border-border px-1 pt-3">
          <Button variant="ghost" render={<Link to="/settings/scheduled-tasks" />}>
            <ClockIcon size={16} />
            Routines
          </Button>
          <Button variant="ghost" render={<Link to="/settings/providers" />}>
            <BlocksIcon size={16} />
            Harnesses
          </Button>
          <Button variant="ghost" onClick={onWorkbench}>
            <FolderIcon size={16} />
            Workspaces
          </Button>
          <Button variant="ghost" render={<Link to="/settings/general" />}>
            <SettingsIcon size={16} />
            Settings
          </Button>
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Your bots run on your connected server.
        </div>
      </SidebarFooter>
      {creating && environmentId ? (
        <BotProfileDialog
          environmentId={environmentId}
          onClose={() => setCreating(false)}
          onCreated={(bot) => {
            void openBot(bot);
          }}
        />
      ) : null}
    </>
  );
}
