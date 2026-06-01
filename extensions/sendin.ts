/**
 * /sendin — Send a message after a delay.
 *
 * Usage: /sendin <delay> <message>
 *   delay: e.g. 10s, 5m, 1h  (plain numbers default to seconds)
 *   message: text to send after the delay
 *
 * Press Alt+Up to cancel pending messages and restore them to the editor.
 *
 * Example:
 *   /sendin 10s "Hello it's me again, it's now been 10 seconds"
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

// ---------------------------------------------------------------------------
// Pending message tracking
// ---------------------------------------------------------------------------

interface PendingSendin {
  intervalId: ReturnType<typeof setInterval>;
  message: string;
  statusKey: string;
  durationStr: string;
}

const pending: PendingSendin[] = [];

function cancelAll(ctx: { ui: ExtensionContext["ui"] }): string[] {
  const messages: string[] = [];
  for (const p of pending) {
    clearInterval(p.intervalId);
    ctx.ui.setStatus(p.statusKey, undefined);
    messages.push(`/sendin ${p.durationStr} "${p.message}"`);
  }
  pending.length = 0;
  return messages;
}

function cancelAllSend(ctx: { ui: ExtensionContext["ui"] }): string[] {
  const messages: string[] = [];
  for (const p of pending) {
    clearInterval(p.intervalId);
    ctx.ui.setStatus(p.statusKey, undefined);
    messages.push(p.message);
  }
  pending.length = 0;
  return messages;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default async function (pi: ExtensionAPI) {
  let unsubscribeTerminal: (() => void) | undefined;

  // ── Alt+Up listener (pass-through when nothing is pending) ─────────

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    // Clean up previous listener (reload / session switch)
    unsubscribeTerminal?.();

    unsubscribeTerminal = ctx.ui.onTerminalInput((data) => {
      // Nothing pending → pass through to native handlers
      if (pending.length === 0) return undefined;
      if (matchesKey(data, "alt+up")) {
        // Cancel all pending sendins and restore messages to editor
        const messages = cancelAll(ctx);
        const combined = messages.join("\n\n");
        ctx.ui.setEditorText(combined);
        ctx.ui.notify(
          `Cancelled ${messages.length} scheduled message${messages.length > 1 ? "s" : ""}`,
          "info",
        );
        return { consume: true };
      }
      if (matchesKey(data, "alt+right")) {
        // Send all pending messages immediately
        const messages = cancelAllSend(ctx);
        for (const msg of messages) {
          pi.sendUserMessage(msg);
        }
        ctx.ui.notify(
          `Sent ${messages.length} message${messages.length > 1 ? "s" : ""} now`,
          "info",
        );
        return { consume: true };
      }
      return undefined;

      // Cancel all pending sendins and restore messages to editor
      const messages = cancelAll(ctx);
      const combined = messages.join("\n\n");
      ctx.ui.setEditorText(combined);
      ctx.ui.notify(
        `Cancelled ${messages.length} scheduled message${messages.length > 1 ? "s" : ""}`,
        "info",
      );
      return { consume: true };
    });
  });

  pi.on("session_shutdown", async () => {
    unsubscribeTerminal?.();
    unsubscribeTerminal = undefined;
    for (const p of pending) clearInterval(p.intervalId);
    pending.length = 0;
  });

  // ── /sendin command ────────────────────────────────────────────────

  pi.registerCommand("sendin", {
    description: "Send a message after a delay (Alt+Up to cancel)",
    getArgumentCompletions: (prefix: string) => {
      const suggestions = ["5s", "10s", "30s", "1m", "5m", "15m", "1h"];
      return suggestions
        .filter((s) => s.startsWith(prefix))
        .map((value) => ({ value, label: value }));
    },
    handler: async (args, ctx) => {
      const trimmed = args.trim();

      // ── /sendin cancel ──────────────────────────────────────────────
      if (trimmed === "cancel") {
        if (pending.length === 0) {
          ctx.ui.notify("No pending scheduled messages.", "info");
          return;
        }
        const messages = cancelAll(ctx);
        const combined = messages.join("\n\n");
        ctx.ui.setEditorText(combined);
        ctx.ui.notify(
          `Cancelled ${messages.length} scheduled message${messages.length > 1 ? "s" : ""}`,
          "info",
        );
        return;
      }

      // ── /sendin list ────────────────────────────────────────────────
      if (trimmed === "list") {
        if (pending.length === 0) {
          ctx.ui.notify("No pending scheduled messages.", "info");
          return;
        }
        const lines = pending.map(
          (p, i) => `  ${i + 1}. "${p.message.length > 50 ? p.message.slice(0, 47) + "..." : p.message}"`,
        );
        ctx.ui.notify(`Pending (${pending.length}):\n${lines.join("\n")}`, "info");
        return;
      }

      // ── /sendin <delay> <message> ──────────────────────────────────

      const match = trimmed.match(/^(\d+[smh]?)\s+(.+)$/);
      if (!match) {
        ctx.ui.notify(
          "Usage: /sendin <delay> <message>\n" +
          '  delay:  e.g. 10s, 5m, 1h  (numbers default to seconds)\n' +
          "  message: text to send after the delay\n" +
          "  Press Alt+Up to cancel and restore to editor\n" +
          "  /sendin cancel  — cancel all pending\n" +
          "  /sendin list    — show pending messages",
          "error",
        );
        return;
      }

      const [, durationStr, rawMessage] = match;

      // Parse duration
      const durationMatch = durationStr.match(/^(\d+)([smh]?)$/);
      if (!durationMatch) {
        ctx.ui.notify(`Invalid duration: ${durationStr}`, "error");
        return;
      }

      const [, numStr, unit] = durationMatch;
      const num = parseInt(numStr, 10);
      let ms: number;
      switch (unit || "s") {
        case "s":
          ms = num * 1000;
          break;
        case "m":
          ms = num * 60 * 1000;
          break;
        case "h":
          ms = num * 60 * 60 * 1000;
          break;
        default:
          ctx.ui.notify(`Invalid time unit: ${unit}`, "error");
          return;
      }

      // Strip surrounding quotes
      let message = rawMessage.trim();
      if (
        (message.startsWith('"') && message.endsWith('"')) ||
        (message.startsWith("'") && message.endsWith("'"))
      ) {
        message = message.slice(1, -1);
      }

      if (!message) {
        ctx.ui.notify("Message cannot be empty", "error");
        return;
      }

      const preview = message.length > 60 ? message.slice(0, 57) + "..." : message;
      const statusKey = `sendin-${Date.now()}`;
      let remaining = Math.ceil(ms / 1000);

      const fmtTime = (secs: number): string => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
      };

      // Show initial countdown
      const hint = remaining > 5 ? " (alt+up cancel · alt+right send now)" : "";
      ctx.ui.setStatus(statusKey, `⏳ Sending in ${fmtTime(remaining)}: "${preview}"${hint}`);

      // Start countdown
      const intervalId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(intervalId);
          ctx.ui.setStatus(statusKey, undefined);
          // Remove from pending array
          const idx = pending.findIndex((p) => p.statusKey === statusKey);
          if (idx >= 0) pending.splice(idx, 1);
          pi.sendUserMessage(message);
          ctx.ui.notify(`Sent: "${preview}"`, "info");
        } else {
          const hint = remaining > 5 ? " (alt+up cancel · alt+right send now)" : "";
          ctx.ui.setStatus(statusKey, `⏳ Sending in ${fmtTime(remaining)}: "${preview}"${hint}`);
        }
      }, 1000);

      // Track pending
      pending.push({ intervalId, message, statusKey, durationStr });
    },
  });
}