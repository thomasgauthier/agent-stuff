---
name: strong-inference
description: Use Strong Inference to debug or understand a problem by forming multiple hypotheses, designing decisive tests, falsifying alternatives, and iterating from the surviving explanations.
---

# Strong Inference Problem Solving

Use this skill when a problem is confusing, has many possible causes, or previous trial-and-error has not converged. The goal is to make progress by **systematically eliminating explanations**, not by defending a favorite theory.

This is based on John R. Platt's “Strong Inference” method:

1. Devise alternative hypotheses.
2. Devise crucial experiments that can exclude one or more hypotheses.
3. Run the experiments cleanly.
4. Recycle: refine the remaining hypotheses and repeat.

Related principles:

- T.C. Chamberlin's “multiple working hypotheses”
- Popperian falsification
- Sherlock Holmes' rule: once impossible explanations are eliminated, what remains becomes more credible

---

## When to use this skill

Use Strong Inference when:

- A bug has multiple plausible causes.
- Output is degraded but not totally broken.
- A model, system, build, API, or pipeline partly works.
- The user asks to “debug systematically,” “use strong inference,” or “stop guessing.”
- Several changes have been tried without knowing which one mattered.
- You need to separate pipeline stages, e.g. input preparation vs model logic vs output rendering.

Avoid using it when:

- The problem is a simple syntax error or obvious missing file.
- The user wants a quick direct implementation and the cause is already clear.

---

## Core mindset

Do **not** ask “How can I make my theory work?”

Ask:

> “What are the plausible explanations, and what test would kill at least one of them?”

Prefer tests that produce one of these outcomes:

```text
If result A happens, hypothesis H1 is unlikely.
If result B happens, hypothesis H2 is unlikely.
```

A strong test should distinguish hypotheses, not merely collect more logs.

---

## Workflow

### 1. State the observed phenomenon precisely

Write down what is actually observed, not what you assume.

Bad:

```text
The model is broken.
```

Better:

```text
The model returns valid-shaped audio, and the audio sounds speech-like, but the words are unintelligible.
```

Include:

- expected behavior
- actual behavior
- what still works
- what recently changed
- reproducible command/input if available

---

### 2. List multiple working hypotheses

Create at least 2–5 plausible explanations.

Example structure:

```text
H1: Input/preprocessing is wrong.
H2: Core algorithm/model is wrong.
H3: Output/postprocessing is wrong.
H4: Configuration/version mismatch.
H5: Resource/runtime issue.
```

Make them mutually distinguishable where possible.

Do not overcommit to one hypothesis yet.

---

### 3. Design crucial experiments

For each hypothesis, ask:

```text
What would I observe if this hypothesis were false?
```

Prioritize experiments that:

- are cheap and fast
- isolate one subsystem
- compare against a known-good reference
- replace one stage with ground truth
- use a minimal reproduction
- produce numeric or binary evidence

Examples of decisive experiment patterns:

#### A/B against a known-good implementation

```text
Run the same input through implementation A and B.
Compare intermediate outputs, not just final output.
```

#### Bypass one stage

```text
Feed known-good intermediate data into later stages.
If failure persists, earlier stages are innocent.
```

#### Freeze or remove variability

```text
Disable sampling, random seeds, caching, parallelism, quantization, or approximations.
```

#### Round-trip invariant

```text
Encode -> decode -> compare.
Serialize -> deserialize -> compare.
Convert -> inverse-convert -> compare.
```

#### Minimal input

```text
Use the smallest input that should work.
```

#### Boundary test

```text
Test empty, one-element, max-length, type edge cases.
```

#### Trace internal state

```text
Compare shapes, ranges, checksums, top-k logits, norms, IDs, or config values at boundaries.
```

---

### 4. Execute cleanly

When running a test:

- change only one thing at a time
- save commands and outputs
- name artifacts clearly
- preserve old outputs for comparison
- record expected result before interpreting actual result

Useful logging template:

```text
Hypothesis tested:
Experiment:
Expected if H is true:
Expected if H is false:
Observed:
Conclusion:
Next hypothesis:
```

---

### 5. Interpret results as falsification

Prefer conclusions like:

```text
This result makes H1 unlikely.
This result supports H2 but does not prove it.
This test was inconclusive because it changed two variables.
```

Avoid:

```text
This proves everything is fixed.
```

Strong inference narrows the space; it rarely proves final truth in one step.

---

### 6. Recycle

After eliminating hypotheses, refine the survivors.

Example:

```text
H2: Core algorithm is wrong.
```

becomes:

```text
H2a: Attention mask is wrong.
H2b: Position encoding is wrong.
H2c: Numeric dtype causes instability.
H2d: State/cache update is wrong.
```

Then design new crucial experiments for these sub-hypotheses.

---

## Recommended response style

When using this skill, explain your plan briefly before executing:

```text
Let's use strong inference. I see three hypotheses:
1. ...
2. ...
3. ...

The cheapest decisive test is X, because it distinguishes 1 from 2/3.
```

After each experiment, summarize:

```text
Result: X happened.
This falsifies H1 but leaves H2/H3.
Next decisive test: Y.
```

Keep the user oriented. Strong inference is only useful if the decision tree stays visible.

---

## Common hypothesis buckets

For software/debugging problems, start from these broad buckets:

### Input / preprocessing

- wrong format
- wrong tokenization/parsing
- missing special markers
- wrong units or scale
- wrong shape/order/layout
- bad normalization
- stale/corrupt input artifact

### Configuration / environment

- wrong version
- wrong path/import
- stale editable install
- conflicting dependency
- runtime feature flag mismatch
- GPU/CPU/dtype/precision mismatch

### Core logic / model / algorithm

- wrong recurrence/cache update
- wrong indexing/offset
- wrong coordinate system
- wrong convention between implementations
- missing masking/stopping condition
- incorrect mathematical transformation

### Output / postprocessing

- wrong decoding
- wrong scale/range
- wrong serialization
- wrong sampling rate/framerate
- clipping/normalization error
- file saved correctly but interpreted incorrectly

### Randomness / search / sampling

- nondeterminism
- bad seed
- stochastic decoding vs greedy/reference decoding
- temperature/top-k/top-p mismatch
- race condition

### Resource/runtime behavior

- OOM leading to fallback or partial output
- silent CPU/GPU placement mismatch
- dtype overflow/underflow
- async error reported late
- cache not invalidated

---

## Evidence quality hierarchy

Prefer stronger evidence:

1. Binary reproduction / non-reproduction
2. Exact numeric comparison to reference
3. Round-trip invariant success/failure
4. Intermediate state mismatch at a boundary
5. Logs showing config/path/version mismatch
6. Subjective output quality
7. Hunches

Subjective observations are useful for generating hypotheses, but should be converted into objective tests whenever possible.

---

## Anti-patterns

Avoid these:

- Randomly changing many parameters at once.
- Treating improvement as proof of correctness.
- Ignoring a known-good reference implementation.
- Debugging only final outputs when intermediate states can be compared.
- Confirmation hunting for one favored theory.
- Failing to record which change produced which result.
- Calling a test conclusive when it changed multiple variables.

---

## Minimal template to use in conversation

```text
Let's use strong inference.

Observation:
- ...

Hypotheses:
- H1: ...
- H2: ...
- H3: ...

Crucial experiment 1:
- Run/compare ...
- If ..., H1 is unlikely.
- If ..., H2 is unlikely.

Result:
- ...

Conclusion:
- Eliminated: ...
- Surviving: ...

Next experiment:
- ...
```

---

## Success criterion

The skill is successful when the problem space is smaller after each test.

You do not need to solve the entire problem in one leap. You need to make each step eliminate at least one plausible branch or produce a sharper sub-hypothesis.
