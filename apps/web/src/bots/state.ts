import { createBotAtoms } from "@t3tools/client-runtime/state/bots";
import type { Bot, EnvironmentId } from "@t3tools/contracts";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { toastManager } from "../components/ui/toast";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { connectionAtomRuntime } from "../connection/runtime";
import { useEnvironmentQuery } from "../state/query";
import { usePrimaryEnvironmentId } from "../state/environments";
import {
  useActiveEnvironmentId,
  useProjects,
  useThreadShells,
  waitForProject,
} from "../state/entities";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";

const selectedBotEnvironment = Atom.make<EnvironmentId | null>(null);
export const selectBotEnvironment = (id: EnvironmentId) =>
  appAtomRegistry.set(selectedBotEnvironment, id);

export const botAtoms = createBotAtoms(connectionAtomRuntime);

export function useBots(targetEnvironmentId?: EnvironmentId | null) {
  const primary = usePrimaryEnvironmentId();
  const active = useActiveEnvironmentId();
  const selected = useAtomValue(selectedBotEnvironment);
  const environmentId = targetEnvironmentId ?? selected ?? active ?? primary;
  const query = useEnvironmentQuery(
    environmentId === null ? null : botAtoms.list({ environmentId, input: {} }),
  );
  const refresh = query.refresh;
  const projects = useProjects();
  const profileVersion = projects
    .filter((project) => project.environmentId === environmentId)
    .map((project) => `${project.id}:${project.updatedAt}`)
    .join("|");
  useEffect(() => refresh(), [profileVersion, refresh]);
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  return { ...query, environmentId, bots: query.data ?? [] };
}

export function useOpenBot(environmentId: EnvironmentId | null) {
  const threads = useThreadShells();
  const navigate = useNavigate();
  const newThread = useNewThreadHandler();
  return useCallback(
    async (bot: Bot, fresh = false) => {
      if (environmentId === null) return;
      try {
        const main = threads
          .filter(
            (thread) =>
              thread.environmentId === environmentId &&
              thread.projectId === bot.projectId &&
              thread.deletedAt === null &&
              thread.archivedAt === null,
          )
          .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        if (main && !fresh) {
          await navigate({
            to: "/$environmentId/$threadId",
            params: { environmentId, threadId: main.id },
          });
        } else {
          const ref = scopeProjectRef(environmentId, bot.projectId);
          await waitForProject(ref);
          await newThread(ref, { envMode: "local" });
        }
      } catch (error) {
        toastManager.add({
          type: "error",
          title: "Could not open this bot",
          description: error instanceof Error ? error.message : "Reconnect and try again.",
        });
      }
    },
    [environmentId, navigate, newThread, threads],
  );
}
