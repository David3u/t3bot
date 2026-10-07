import { WS_METHODS, type EnvironmentId } from "@t3tools/contracts";
import { Atom, AtomRegistry } from "effect/reactivity";
import type { EnvironmentRegistry } from "../connection/registry.ts";
import * as Effect from "effect/Effect";
import { createEnvironmentRpcCommand, createEnvironmentRpcQueryAtomFamily } from "./runtime.ts";

export function createBotAtoms<R, E>(runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>) {
  const list = createEnvironmentRpcQueryAtomFamily(runtime, {
    label: "t3bot:profiles",
    tag: WS_METHODS.botsList,
    staleTimeMs: 5000,
  });
  const refresh = (
    target: { readonly environmentId: EnvironmentId },
    registry: AtomRegistry.AtomRegistry,
  ) =>
    Effect.sync(() => registry.refresh(list({ environmentId: target.environmentId, input: {} })));
  return {
    list,
    create: createEnvironmentRpcCommand(runtime, {
      label: "t3bot:create",
      tag: WS_METHODS.botsCreate,
      onSuccess: refresh,
    }),
    update: createEnvironmentRpcCommand(runtime, {
      label: "t3bot:update",
      tag: WS_METHODS.botsUpdate,
      onSettled: refresh,
    }),
  };
}
