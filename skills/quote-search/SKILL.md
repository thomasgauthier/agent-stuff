---
name: quote-search
description: Search local .txt files for meaningful quotes and passages using targeted ripgrep patterns. Use when the user asks to find quotes, passages, insights, or memorable lines about a topic from text transcripts, books, essays, or notes.
---

# Quote Search

Use this skill to find meaningful quotes, insights, and passages from `.txt` files using targeted ripgrep patterns. This is ideal for searching video transcripts, essays, books, or notes for memorable lines about a topic.

## When to use it

Use this skill when the user asks to:

- find quotes about a topic or concept
- discover memorable passages in text files
- collect insights about a theme from transcripts
- find meaningful lines about philosophy, psychology, self-improvement, etc.
- compare how a topic is discussed across multiple sources

## Core principles

1. **Think in themes, not just keywords** — good quote searches capture the *idea*, not just exact words
2. **Use regex alternation** to cast a wider net: `word1|word2|word3`
3. **Include context** with `-C 3` so quotes stand alone as meaningful passages
4. **Iterate** — if results are too narrow, broaden; too broad, narrow down
5. **Organize by theme** in your final answer — don't just dump raw results

## Defaults (always use these)

- **`rg`** — always use ripgrep, never `grep` or `find`
- **`-i`** — case-insensitive (quotes may be capitalized any way)
- **`-C 3`** — 3 lines of context so quotes are self-contained
- **`-g '*.txt'`** — restrict to `.txt` files unless told otherwise
- **`-n`** — add line numbers for reference when searching

## Core workflow

### 1) Draft your search pattern

Think about the **concept**, then brainstorm related words and phrases. Build a regex with alternation:

```
theme_keyword1|theme_keyword2|theme_keyword3
```

For example, for "black holes":
```
black hole.*(event horizon|singularity|gravity|collapse|mass)
event horizon.*(escape|light|cross|point|return)
```

For "dark matter":
```
dark matter.*universe|gravity.*(mass|invisible|halo)|dark energy|expansion.*(accelerate|cosmos)
```

### 2) Run the search

```bash
# Basic search
rg -i -C 3 -g '*.txt' -e 'your_pattern' target_dir/

# Case-insensitive with context
rg -i -C 3 -g '*.txt' -e 'gravity|expansion|nebula' .

# Multiple patterns in one call
rg -i -C 3 -g '*.txt' -e 'orbit' -e 'gravity' -e 'eclipse' .

# With line numbers for reference
rg -ni -C 3 -g '*.txt' -e 'your_pattern' target_dir/

# Search from a specific directory
rg -i -C 3 -g '*.txt' -e 'your_pattern' /path/to/texts/
```

### 3) Refine your search

If results are **too narrow** (too few), broaden:
```bash
# Add synonyms and related concepts
rg -i -C 3 -g '*.txt' -e 'galaxy|nebula|star|planet|comet|asteroid' .

# Remove overly specific patterns
```

If results are **too broad** (too many, too noisy), narrow:
```bash
# Add more specific terms
rg -i -C 3 -g '*.txt' -e 'star.*(collapse|explode)' .

# Exclude noisy terms
rg -i -C 3 -g '*.txt' -e 'your_pattern' . | rg -v 'exclude_this'
```

### 4) Organize by theme

Group findings into thematic categories for your final answer:
- **The Phenomenon** — what it is (e.g., celestial events, anomalies)
- **The Discovery** — what scientists or authors say about the issue
- **The Methodology** — suggested approaches or ways to study it
- **Historical Context** — lived experiences, past theories, and anecdotes

## Pattern-building guide

### Start broad, then refine

```bash
# Step 1: Broad search
rg -i -C 3 -g '*.txt' -e 'orbit' .

# Step 2: Add related concepts
rg -i -C 3 -g '*.txt' -e 'orbit|gravity|mass|velocity' .

# Step 3: Add qualifying phrases
rg -i -C 3 -g '*.txt' -e 'orbit.*(elliptical|circular).*velocity|star.*(collapse|explode)' .

# Step 4: Refine to exact theme
rg -i -C 3 -g '*.txt' -e 'star.*(collapse|explode|supernova|dwarf)' .
```

### Common regex patterns

| Pattern | Matches |
|---------|---------|
| `black hole\|singularity` | Variations of "black holes" |
| `star.*(collapse\|explode)` | "star collapses", "star explodes" |
| `universe.*(expand\|accelerat\|origin)` | Universe expansion and origins |
| `telescope.*(hubble\|webb\|radio)` | Space telescopes |
| `planet.*(orbit\|transit\|habitable)` | Planetary orbits, habitability |
| `beyond.*(galaxy\|milky way\|solar system)` | Regions beyond our galaxy |
| `mission.*(apollo\|voyager\|rover)` | Space exploration missions |
| `theory.*(relativity\|quantum\|string)` | Physics theories |

## Examples

### Example 1: Finding quotes about the expanding universe

```bash
rg -i -C 3 -g '*.txt' -e 'universe.*(expand|accelerat|origin|size)' .
rg -i -C 3 -g '*.txt' -e 'expand.*universe|origin.*universe' .
```

### Example 2: Finding quotes about black holes

```bash
rg -i -C 3 -g '*.txt' -e 'event.*(horizon|boundary)|black hole.*(mass|gravity|light)' .
rg -i -C 3 -g '*.txt' -e 'escape.*(velocity|light)|singularity.*(center|density)' .
```

### Example 3: Finding quotes about space telescopes

```bash
rg -i -C 3 -g '*.txt' -e 'telescope.*(hubble|james webb|radio)' .
rg -i -C 3 -g '*.txt' -e 'observatory.*(orbit|space|ground|lens)' .
```

### Example 4: Finding quotes about planetary systems

```bash
rg -i -C 3 -g '*.txt' -e 'planet.*(orbit|transit|habitable|gas)' .
rg -i -C 3 -g '*.txt' -e 'solar.*(system|flare|wind)' .
```

## Post-processing

### Extract file names

```bash
# Get unique filenames with matches
rg -il -g '*.txt' -e 'your_pattern' .

# Get filenames with line counts
rg -ic -g '*.txt' -e 'your_pattern' . | sort -t: -k2 -rn
```

### Filter out noise

```bash
# Exclude file types from matches
rg -i -C 3 -g '*.txt' -e 'your_pattern' . | rg -v 'video|youtube|link'

# Only show passages with specific keywords
rg -i -C 3 -g '*.txt' -e 'your_pattern' . | rg 'insight|crucial|important|key|fact'
```

## Recommended agent behavior

1. **Understand the user's theme** before searching — ask clarifying questions if needed
2. **Brainstorm 5-10 related terms** and build a comprehensive regex
3. **Search, then iterate** — narrow or broaden based on results
4. **Organize results thematically** — don't dump raw rg output
5. **Attribute by filename** — include the source file for each quote
6. **Highlight the most profound passages** — pick the best 3-5 quotes, not all
7. **Preserve context** — the `-C 3` context lines are important for understanding

## Tips

- For **video transcripts**, look for **emphatic language**: "crucial", "key", "important", "the thing to understand", "here's what happens"
- For **philosophy**, look for **contrasts**: "not X but Y", "instead of", "rather than"
- For **personal stories**, look for **narrative markers**: "I realized", "I learned", "the problem was"
- Use `-E` for extended regex (no need to escape `(`, `|`, `)`):

```bash
rg -iC 3 -g '*.txt' -E 'star.*(collapse|explode)' .  
``` 
(Note: `rg` uses extended regex by default, so `-E` is often unnecessary.)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Too few results | Add synonyms, remove qualifiers, broaden regex |
| Too many results | Add more specific terms, use `-v` to exclude noise |
| Results cut off | Split into multiple searches, search subdirectories |
| Case sensitivity issues | Ensure `-i` flag is used |
| Want full context | Increase `-C` value (e.g., `-C 5`) |
| Need exact phrase | Use quotes: `rg -i -C 3 -g '*.txt' -e '"exact phrase"' .` |

## References

- [Ripgrep documentation](https://github.com/BurntSushi/ripgrep)
- [Regex cheat sheet](https://regex.alf.nu/)