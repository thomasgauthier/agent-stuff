---
name: tmux
description: Remote control tmux sessions for interactive CLIs by sending keystrokes and reading pane output.
---

# tmux Skill

Run interactive programs (Python, gdb, psql, node, ...) in a tmux session over a private socket so you can send input and read output programmatically.

## Quickstart

```bash
export AGENT_TMUX_SOCKET_DIR="${TMPDIR:-/tmp}/agent-tmux-sockets"
mkdir -p "$AGENT_TMUX_SOCKET_DIR"
SOCKET="$AGENT_TMUX_SOCKET_DIR/agent.sock"
SESSION=agent-python

tmux -S "$SOCKET" new -d -s "$SESSION"
tmux -S "$SOCKET" send-keys -t "$SESSION" -- 'PYTHON_BASIC_REPL=1 python3 -q' Enter
```

After starting a session, show the user a monitor command:

```
tmux -S "$SOCKET" attach -t "$SESSION"
```

Read output:

```bash
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION" -S -200
```

Kill when done:

```bash
tmux -S "$SOCKET" kill-session -t "$SESSION"
```

## Targeting

Target just `"$SESSION"` — tmux will use the active pane automatically. This avoids fragility from window indexing (`:0.0` breaks if user config sets `base-index 1` or if `-n` renames the window).

Only specify `{session}:{window}.{pane}` if you have multiple windows/panes and need a specific one.

## Core commands

| Action | Command |
|--------|---------|
| New session | `tmux -S "$SOCKET" new -d -s "$SESSION"` |
| Send literal text | `tmux -S "$SOCKET" send-keys -t "$SESSION" -l -- "$text"` |
| Send Enter | `tmux -S "$SOCKET" send-keys -t "$SESSION" Enter` |
| Send Ctrl-C | `tmux -S "$SOCKET" send-keys -t "$SESSION" C-c` |
| Send Ctrl-D | `tmux -S "$SOCKET" send-keys -t "$SESSION" C-d` |
| Capture output | `tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION" -S -200` |
| List sessions | `tmux -S "$SOCKET" list-sessions` |
| Attach interactively | `tmux -S "$SOCKET" attach -t "$SESSION"` |
| Kill session | `tmux -S "$SOCKET" kill-session -t "$SESSION"` |
| Kill all on socket | `tmux -S "$SOCKET" kill-server` |

## Waiting for output

Poll until a regex appears in the pane. Use the **absolute** script path:

```bash
~/.pi/agent/skills/tmux/scripts/wait-for-text.sh -t "$SESSION" -p '^>>>' -T 15 -l 4000
```

Options: `-t` target, `-p` regex pattern, `-S` socket path, `-L` socket name, `-T` timeout (default 15s), `-l` history lines (default 1000), `-F` fixed string, `-i` poll interval (default 0.5s).

Both scripts default to `$AGENT_TMUX_SOCKET_DIR/agent.sock` when no socket is specified, so you can often omit `-S`:

```bash
~/.pi/agent/skills/tmux/scripts/wait-for-text.sh -t "$SESSION" -p '^>>>' -T 15
```

## Recipes

**Python REPL**
```bash
tmux -S "$SOCKET" send-keys -t "$SESSION" -- 'PYTHON_BASIC_REPL=1 python3 -q' Enter
~/.pi/agent/skills/tmux/scripts/wait-for-text.sh -t "$SESSION" -p '^>>>' -T 10
```

**gdb**
```bash
tmux -S "$SOCKET" send-keys -t "$SESSION" -- 'gdb --quiet ./a.out' Enter
~/.pi/agent/skills/tmux/scripts/wait-for-text.sh -t "$SESSION" -p '^(gdb)' -T 10
tmux -S "$SOCKET" send-keys -t "$SESSION" -- 'set pagination off' Enter
```

**lldb**
```bash
tmux -S "$SOCKET" send-keys -t "$SESSION" -- 'lldb ./a.out' Enter
~/.pi/agent/skills/tmux/scripts/wait-for-text.sh -t "$SESSION" -p '^\(lldb\)' -T 10
```

## Finding sessions

```bash
~/.pi/agent/skills/tmux/scripts/find-sessions.sh              # default agent socket
~/.pi/agent/skills/tmux/scripts/find-sessions.sh -S "$SOCKET" # specific socket
~/.pi/agent/skills/tmux/scripts/find-sessions.sh --all         # all agent sockets
```
