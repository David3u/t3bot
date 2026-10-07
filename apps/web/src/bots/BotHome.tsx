import { Link } from "@tanstack/react-router";
import { BotIcon, PlusIcon, ArrowUpRightIcon, BlocksIcon } from "lucide-react";
import { useState } from "react";
import { SidebarInset } from "../components/ui/sidebar";
import { Button } from "../components/ui/button";
import { WorkspacePageHeader } from "../components/WorkspacePageHeader";
import { isElectron } from "../env";
import { BOT_TEMPLATES, BotProfileDialog } from "./BotProfileDialog";
import { useBots, useOpenBot } from "./state";

export function BotHome() {
  const { bots, environmentId, error, isPending, refresh } = useBots();
  const openBot = useOpenBot(environmentId);
  const [initial, setInitial] = useState<{ name: string; role: string; avatar: string } | null>(
    null,
  );
  const active = bots.filter((bot) => !bot.profile.archived);
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden">
      <WorkspacePageHeader electron={isElectron}>
        <span className="text-sm text-muted-foreground">Your team, on your terms</span>
      </WorkspacePageHeader>
      <main className="flex-1 overflow-auto px-6 pb-12 pt-12 md:px-12 md:pt-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BotIcon size={30} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            A little help. A lot done.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Give your bots a job, a place to work, and the harness you trust. Come back to finished
            work.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              onClick={() => setInitial({ name: "", role: "", avatar: "🤖" })}
              disabled={environmentId === null}
            >
              <PlusIcon size={17} />
              Create a bot
            </Button>
            <Button variant="outline" render={<Link to="/settings/providers" />}>
              <BlocksIcon size={17} />
              Connect a harness
            </Button>
          </div>
          {error ? (
            <div className="mt-6">
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
              <Button variant="ghost" onClick={refresh}>
                Try again
              </Button>
            </div>
          ) : null}
          {active.length > 0 ? (
            <section className="mt-12">
              <h2 className="mb-4 text-sm font-medium">Pick up with your team</h2>
              <div className="divide-y divide-border">
                {active.map((bot) => (
                  <button
                    type="button"
                    key={bot.projectId}
                    onClick={() => {
                      void openBot(bot);
                    }}
                    className="flex min-h-20 w-full items-center gap-4 rounded-lg px-2 py-4 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-2xl">
                      {bot.profile.avatar}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{bot.profile.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {bot.profile.role || "Ready for your next task"}
                      </span>
                    </span>
                    <ArrowUpRightIcon size={17} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <section className="mt-12">
            <h2 className="mb-2 text-sm font-medium">Start with a useful job</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              A starting point you can make your own.
            </p>
            <div className="divide-y divide-border">
              {BOT_TEMPLATES.map((template) => (
                <button
                  type="button"
                  key={template.name}
                  disabled={environmentId === null}
                  onClick={() => setInitial(template)}
                  className="flex min-h-20 w-full items-start gap-4 rounded-lg px-2 py-4 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                    {template.avatar}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{template.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {template.role.split(". ")[0]}.
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Closing this window leaves server work running. Unattended routines need a server that
            stays awake.
          </p>
          {isPending ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Loading your team…
            </p>
          ) : null}
        </div>
      </main>
      {initial && environmentId ? (
        <BotProfileDialog
          environmentId={environmentId}
          initial={initial}
          onClose={() => setInitial(null)}
          onCreated={(bot) => {
            void openBot(bot);
          }}
        />
      ) : null}
    </SidebarInset>
  );
}
