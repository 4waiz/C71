# Behind the Scenes: This Event Runs on Its Own Intelligence Layer

The challenge asks you to build the intelligence layer for land, investment and communities. So we — **[eVoost AI](https://evoost.ai)**, the organizers — built one for the event itself. Everything below is real, running, and public.

## What's running right now

| System | What it does | AI involved |
|---|---|---|
| **AI Judge** | Evaluates every submission minutes after it arrives: reads your form, inspects your repo, scores against the public rubric, sends you constructive feedback and gives human judges a prioritized view | Claude, structured outputs, cached rubric — [methodology + source](https://github.com/abu-dhabi-ai-proptech-challenge/submissions/blob/main/docs/ai-judge.md) |
| **Event Pulse** | Every hour of the event, the AI reads real signals (submissions, Discord activity) and narrates the moment — on the venue's big screen ([/live](https://challenge.evoost.ai/live)) and in `#announcements` simultaneously | Claude with structured outputs; zero-backend dashboard reads public GitHub data |
| **Helper bot** | Answers questions in Discord `#help-desk` or on @mention, onboards every new member (role + welcome DM), and summarizes who's looking for a team on `!teams` | Claude with a curated knowledge base and prompt caching |
| **GitHub question bot** | Every `question` Issue gets a grounded AI answer in minutes; when the docs don't cover it, it says so and flags a human — calibrated honesty over invention | Claude, structured outputs with a self-reported confidence flag |
| **Submission pipeline** | Track labeling, welcome + checklist, link verification on every edit, late detection, live Discord feed | Deterministic workflows — automation where AI isn't needed |
| **Event ops** | Deadline countdown, final judging report, demo order with AI-written MC intros, winners publishing, post-event discovery analysis | Scheduled + one-command workflows |

A submission flows through the whole layer with **zero human touches**: labeled, welcomed, verified, AI-evaluated, fed to Discord, counted on the live dashboard, narrated by the Pulse, ranked for judges.

## Why we built it this way

Three reasons, in increasing order of honesty:

1. **It makes the event better.** Teams get feedback in minutes, judges spend their time judging instead of triaging, and nobody misses a deadline announcement.
2. **It practices what the event preaches.** A challenge about decision intelligence shouldn't run on spreadsheets and frantic Slack messages.
3. **It's a small, working sample of the thing we think about all day.** eVoost is defining a **City Intelligence Framework** for Abu Dhabi — how AI can support land, investment and city-level decisions. This event's infrastructure is a miniature of that idea: signals in (submissions, repos, deadlines), intelligence in the middle (scoring, verification, prioritization), better decisions out (where judges look first, who gets help). What you're prototyping today at city scale, we prototyped here at event scale.

## Design principles we'd recommend to any team

- **AI advises, humans decide.** The AI Judge never picks winners; it prioritizes attention. The same boundary matters in city-scale systems.
- **Transparency beats magic.** The judge's methodology, prompts and source are public. Trust in AI systems is earned by being inspectable.
- **Evidence over claims.** The judge scores what it can verify in your repo, and flags the rest for humans.
- **Automate the deterministic, reserve AI for judgment.** Labels and link checks are workflows; evaluation and explanation are AI.
- **Cache aggressively, structure outputs.** The whole event's AI judging costs a few dollars because the rubric is cached and responses are schema-validated.

## Build on the same ideas

Everything is open: the [AI Judge source](https://github.com/abu-dhabi-ai-proptech-challenge/submissions/blob/main/.github/scripts/ai_judge.py), the [workflows](https://github.com/abu-dhabi-ai-proptech-challenge/submissions/tree/main/.github/workflows), the [datasets](https://huggingface.co/datasets/eVoost/abu-dhabi-ai-proptech-challenge). Steal the patterns for your prototype — that's what they're for.

Want to talk about city-scale intelligence systems? Find the eVoost team in Discord `#evoost-hq`.
