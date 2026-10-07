# T3bot

Persistent bots with your choice of agent harness, built as a fork of [T3 Code](https://github.com/pingdotgg/t3code).

This is a development build. It adds a bot-first interface to T3’s existing execution, browser, scheduling, and remote-connection services. It is inspired by the documented workflows of Grok Bot, Hermes, and Muse; it does not yet have full feature or visual parity with them.

## Run locally

Use Node 24.13.1 or newer in the Node 24 series, and Corepack with pnpm 11.10.0.

```bash
git clone https://github.com/David3u/t3bot.git
cd t3bot
git checkout feat/t3bot
corepack pnpm install --frozen-lockfile
node_modules/.bin/vp run dev --home-dir "$PWD/.t3bot-data"
```

Open the pairing URL printed by the server. Development ports are chosen from the checkout path, so read the actual URL from the output. Keep the server running while bots work or run scheduled routines.

Install and sign in to at least one harness before sending a task. Configure it in **Harnesses**. The inherited provider settings support built-in adapters and external agents that speak Agent Client Protocol (ACP). A harness without ACP needs a compatible T3 adapter. Available tools, permissions, models, and input types depend on the harness.

## Use your bots

Create a named bot or choose a research, personal-assistant, or developer template. Each bot gets a workspace on its selected server. Open it to start a conversation; select a harness and model in the composer. **Workspaces** opens T3’s original project and conversation interface.

**Profile & memory** changes the bot’s job and saved preferences. This context is supplied on future turns, including new conversations and provider switches. Past transcripts keep their own history. Profile revisions prevent two devices from silently overwriting each other’s edits. Keep passwords and API keys in the harness’s credential store.

New bot profiles are excluded from Git by default. Saved preferences stay separate from code checkpoints.

**Skills** saves up to eight reusable workflows per bot. Enable or disable a workflow, edit its instructions, or remove it. Enabled workflows are supplied with the bot’s context across harnesses. These instructions do not install new tools or grant access to services.

**Computer**, **Files**, and **Terminal** open T3’s existing work surfaces. The computer view is a server-hosted browser; full native desktop control and virtual-machine provisioning are not implemented. A workspace is an organizational boundary, not a process sandbox.

After sending the first message, use **Routines** to schedule daily work in that conversation. Times use the server’s local timezone. The routine records the conversation’s harness and permission settings when created. You can run it immediately, pause it, or resume it. The Routines settings page also provides editing, deletion, other cadences, webhook triggers, and run history. Closing the client leaves server-owned work running; putting the host to sleep stops execution until it wakes.

Pin important bots or hide them from the roster. Show hidden bots to reopen them. Hiding a bot does not pause its routines.

Agents can use `t3_bot_list`, `t3_bot_create`, and `t3_bot_update` through T3’s MCP server. Bot execution uses the original conversation, approval, cancellation, delegation, recovery, and context-handoff services.

## State and updates

The fork defaults to `~/.t3bot`, port 3873 for the standalone server, separate Electron profiles, and T3bot application and URL-scheme IDs. `T3BOT_HOME` or the server’s `--base-dir` flag overrides the data directory. The development runner uses `--home-dir`. Development can use the checkout’s gitignored `.t3bot-data` directory as shown above. T3 Code’s `T3CODE_HOME` setting does not select T3bot state.

Automatic desktop updates and advertised server self-updates are disabled until this fork has its own release channel. There are no published T3bot installers yet. Forking does not provision T3 Connect, OAuth applications, mobile signing, push notifications, or third-party integrations.

## Build and check

```bash
node_modules/.bin/vp run --filter @t3tools/web build
node_modules/.bin/vp run --filter t3 build:bundle
node_modules/.bin/vp test run apps/server/src/bots/BotProfiles.test.ts apps/server/src/bots/BotService.test.ts
```

The web UI is shared with Electron. The inherited React Native client remains available, but its bot-specific screens have not been ported. Group conversations, voice, messaging gateways, autonomous goal tracking, structured memory search, and a skill marketplace remain future work.

## Upstream and license

Upstream is pinned initially at `d8d037eae1b77a77f372fd1afd2662a31ebe37c8`. Keep an `upstream` Git remote to merge improvements. Internal package names retain their upstream names to keep workspace tooling compatible; the server package is private and exposes the `t3bot` binary.

The upstream [MIT license](LICENSE), copyright notices, and third-party notices are retained. See [the original README](README.upstream.md) for upstream context; its installers and hosted services belong to T3 Code.
