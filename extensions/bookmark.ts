/**
 * Bookmark Extension
 *
 * Save and jump to specific entries in the session tree by user-defined tags.
 *
 * Commands:
 *   /bookmark set <tag>      Bookmark the current tree entry
 *   /bookmark browse         Fuzzy-search bookmarks and open one
 *   /bookmark list           Show all saved bookmarks
 *   /bookmark remove <tag>   Remove a bookmark
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { fuzzyFilter, Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Bookmark {
	tag: string;
	sessionFile: string;
	entryId: string;
	cwd: string;
	createdAt: number;
}

const STORAGE_FILE = "bookmarks.json";

function getBookmarksPath(): string {
	return join(getAgentDir(), STORAGE_FILE);
}

function loadBookmarks(): Record<string, Bookmark> {
	const path = getBookmarksPath();
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return {};
	}
}

function saveBookmarks(bookmarks: Record<string, Bookmark>): void {
	writeFileSync(getBookmarksPath(), JSON.stringify(bookmarks, null, 2));
}

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export default function bookmarkExtension(pi: ExtensionAPI) {
	pi.registerCommand("bookmark", {
		description: "Bookmark tree entries: set <tag> | browse | list | remove <tag>",
		handler: async (args, ctx) => {
			const trimmed = args.trim();

			// ── /bookmark set <tag> ──────────────────────────────────────────
			if (trimmed.startsWith("set ")) {
				const tag = trimmed.slice(4).trim();
				if (!tag) {
					ctx.ui.notify("Usage: /bookmark set <tag>", "warning");
					return;
				}

				const bookmarks = loadBookmarks();
				if (bookmarks[tag]) {
					ctx.ui.notify(`Bookmark "${tag}" already exists. Use /bookmark remove ${tag} first.`, "error");
					return;
				}

				const sessionFile = ctx.sessionManager.getSessionFile();
				if (!sessionFile) {
					ctx.ui.notify("Cannot bookmark: session is ephemeral (no file)", "error");
					return;
				}

				const leafEntry = ctx.sessionManager.getLeafEntry();
				if (!leafEntry) {
					ctx.ui.notify("Cannot bookmark: no leaf entry found", "error");
					return;
				}

				bookmarks[tag] = {
					tag,
					sessionFile,
					entryId: leafEntry.id,
					cwd: ctx.cwd,
					createdAt: Date.now(),
				};
				saveBookmarks(bookmarks);
				ctx.ui.notify(`Bookmarked current entry as: ${tag}`, "info");
				return;
			}

			// ── /bookmark remove <tag> ───────────────────────────────────────
			if (trimmed.startsWith("remove ")) {
				const tag = trimmed.slice(7).trim();
				if (!tag) {
					ctx.ui.notify("Usage: /bookmark remove <tag>", "warning");
					return;
				}
				const bookmarks = loadBookmarks();
				if (!bookmarks[tag]) {
					ctx.ui.notify(`No bookmark found: ${tag}`, "error");
					return;
				}
				delete bookmarks[tag];
				saveBookmarks(bookmarks);
				ctx.ui.notify(`Removed bookmark: ${tag}`, "info");
				return;
			}

			// ── /bookmark list ───────────────────────────────────────────────
			if (trimmed === "list") {
				const bookmarks = loadBookmarks();
				const list = Object.values(bookmarks);
				if (list.length === 0) {
					ctx.ui.notify("No bookmarks saved.", "info");
					return;
				}
				list.sort((a, b) => b.createdAt - a.createdAt);
				const lines = list.map((b) => `  ${b.tag}  →  ${b.cwd}  (${timeAgo(b.createdAt)})`);
				ctx.ui.notify([`${list.length} bookmark(s):`, ...lines].join("\n"), "info");
				return;
			}

			// ── /bookmark browse (or bare /bookmark) ─────────────────────────
			if (trimmed === "browse" || trimmed === "") {
				const bookmarks = loadBookmarks();
				const bookmarkList = Object.values(bookmarks);

				if (bookmarkList.length === 0) {
					ctx.ui.notify("No bookmarks saved yet. Use /bookmark set <tag>", "info");
					return;
				}

				// Sort newest first
				bookmarkList.sort((a, b) => b.createdAt - a.createdAt);

				const selected = await ctx.ui.custom<Bookmark | null>((tui, theme, _kb, done) => {
					let filter = "";
					let selectedIndex = 0;
					let filtered = bookmarkList;

					function updateFilter() {
						if (!filter.trim()) {
							filtered = bookmarkList;
						} else {
							filtered = fuzzyFilter(bookmarkList, filter, (b) => `${b.tag} ${b.cwd}`);
						}
						selectedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
					}

					return {
						render(width: number): string[] {
							const lines: string[] = [];

							// Header
							lines.push(truncateToWidth(theme.fg("accent", theme.bold("Bookmarks")), width));

							// Filter line
							const filterLine = `Filter: ${filter}_`;
							lines.push(truncateToWidth(filterLine, width));
							lines.push("");

							// Bookmark list
							const maxVisible = Math.min(filtered.length, 10);
							const startIndex = Math.max(
								0,
								Math.min(
									selectedIndex - Math.floor(maxVisible / 2),
									filtered.length - maxVisible,
								),
							);
							const endIndex = Math.min(startIndex + maxVisible, filtered.length);

							for (let i = startIndex; i < endIndex; i++) {
								const b = filtered[i];
								const isSelected = i === selectedIndex;
								const prefix = isSelected ? theme.fg("accent", "> ") : "  ";
								const tagPart = isSelected ? theme.fg("accent", b.tag) : b.tag;
								const metaPart = theme.fg("muted", `  ${b.cwd}  •  ${timeAgo(b.createdAt)}`);
								const line = `${prefix}${tagPart}${metaPart}`;
								lines.push(truncateToWidth(line, width));
							}

							if (filtered.length === 0) {
								lines.push(truncateToWidth(theme.fg("warning", "  No matching bookmarks"), width));
							} else if (filtered.length > maxVisible) {
								const scrollInfo = theme.fg("dim", `  (${selectedIndex + 1}/${filtered.length})`);
								lines.push(truncateToWidth(scrollInfo, width));
							}

							lines.push("");
							lines.push(
								truncateToWidth(
									theme.fg("dim", "↑↓ navigate • type to filter • enter select • esc cancel"),
									width,
								),
							);

							return lines;
						},

						invalidate(): void {
							// No render cache to invalidate
						},

						handleInput(data: string): void {
							if (matchesKey(data, Key.enter)) {
								done(filtered[selectedIndex] ?? null);
								return;
							}
							if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
								done(null);
								return;
							}
							if (matchesKey(data, Key.up)) {
								selectedIndex = selectedIndex === 0 ? filtered.length - 1 : selectedIndex - 1;
								tui.requestRender();
								return;
							}
							if (matchesKey(data, Key.down)) {
								selectedIndex = selectedIndex === filtered.length - 1 ? 0 : selectedIndex + 1;
								tui.requestRender();
								return;
							}
							if (matchesKey(data, Key.backspace)) {
								filter = filter.slice(0, -1);
								updateFilter();
								tui.requestRender();
								return;
							}
							if (matchesKey(data, Key.ctrl("u"))) {
								filter = "";
								updateFilter();
								tui.requestRender();
								return;
							}
							// Accept printable / pasted text
							if (!data.startsWith("\x1b") && data !== "\r" && data !== "\n") {
								filter += data;
								updateFilter();
								tui.requestRender();
							}
						},
					};
				});

				if (!selected) {
					ctx.ui.notify("Cancelled", "info");
					return;
				}

				if (!existsSync(selected.sessionFile)) {
					ctx.ui.notify(`Session file not found: ${selected.sessionFile}`, "error");
					// Clean up stale bookmark
					const bookmarks = loadBookmarks();
					delete bookmarks[selected.tag];
					saveBookmarks(bookmarks);
					return;
				}

				await ctx.switchSession(selected.sessionFile, {
					withSession: async (newCtx) => {
						const result = await newCtx.navigateTree(selected.entryId);
						if (result.cancelled) {
							newCtx.ui.notify(
								`Could not navigate to bookmarked entry. Session opened at current leaf.`,
								"warning",
							);
						} else {
							newCtx.ui.notify(`Opened bookmark: ${selected.tag}`, "info");
						}
					},
				});
				return;
			}

			// Unknown subcommand
			ctx.ui.notify("Usage: /bookmark set <tag> | browse | list | remove <tag>", "warning");
		},
	});
}
