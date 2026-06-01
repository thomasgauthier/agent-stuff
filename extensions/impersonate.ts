/**
 * /impersonate — Inject a message as if the assistant said it.
 *
 * Usage: /impersonate <message>
 *   message: text to inject into the conversation as an assistant message
 *
 * Example:
 *   /impersonate "Hello, I am the model speaking"
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Convert impersonate custom messages to assistant role for the LLM context
  pi.on("context", async (event) => {
    const messages = event.messages.map((m: any) => {
      if (m.role === "custom" && m.customType === "impersonate") {
        const content =
          typeof m.content === "string"
            ? [{ type: "text", text: m.content }]
            : m.content;
        return { ...m, role: "assistant", content };
      }
      return m;
    });
    return { messages };
  });

  pi.registerCommand("impersonate", {
    description: "Inject a message as if the assistant said it",
    handler: async (args, ctx) => {
      const content = args.trim();
      if (!content) {
        ctx.ui.notify("Usage: /impersonate <message>", "warning");
        return;
      }

      pi.sendMessage({
        customType: "impersonate",
        content,
        display: true,
        details: {},
      });
    },
  });
}
