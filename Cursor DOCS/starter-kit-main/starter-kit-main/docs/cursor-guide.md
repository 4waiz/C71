# Hacking with Cursor

This event is co-hosted by **Cursor** — and there's a dedicated award, ⚡ **Best Use of Cursor**, judged by the Cursor team. This guide is how to get the most out of it in a one-day format.

## Setup (2 minutes)

1. Download Cursor: <https://cursor.com>
2. Open the [project-template](https://github.com/abu-dhabi-ai-proptech-challenge/project-template) (or your own repo) in Cursor.
3. **The template ships with event rules built in** (`.cursor/rules/event.mdc`) — Cursor already knows the event, the tracks, the datasets, and the demo-first priorities. No prompting context needed; just start asking.

## The one-day workflow that works

**Hour 1 — understand fast.** Use chat to interrogate the starter kit instead of reading it linearly: *"How do the four CSVs join?"*, *"Walk me through the land-intelligence example agent."*

**Hours 2–6 — agent does the boilerplate, you do the thinking.** Let the agent scaffold components, parsers, API routes and tests from prompts, while you spend your brain on the two things AI can't decide: what problem you're solving and what the demo story is.

**Work in small steps.** One change → run it → commit → next. Small diffs are easy to review and easy to undo; a giant generated blob at hour 6 that doesn't compile is how demos die.

**Add your own rules as you go.** When the agent keeps getting something wrong about *your* project (your data model, your naming, your track), put it in a rule file in `.cursor/rules/` instead of repeating it in every prompt.

**Last 2 hours — demo readiness.** Use the agent to harden exactly one path: the one you'll demo. Then record the fallback video.

## Going for the ⚡ Best Use of Cursor award

The submission form has a **"How did you use Cursor?"** field — that's what the Cursor team reads. What stands out:

- **Concrete workflows, not praise.** "The agent built the dashboard scaffold from a 4-line prompt, then we iterated component by component" beats "Cursor was amazing."
- **Leverage** — places where Cursor let a 3-person team do 6-person work in a day.
- **Smart steering** — your own rules files, well-crafted prompts, using the agent for tests/refactors, recovering fast from a wrong turn.
- **Honest limits** — what you did by hand and why. The judges use Cursor daily; they know what it can and can't do.

During the day: the Cursor team hangs out in the **#cursor-corner** Discord channel — ask them anything.

## Quick reference

| Want to… | Do |
|---|---|
| Understand unfamiliar code | Chat with the codebase — ask, don't scroll |
| Build a feature | Describe the outcome to the agent; review the diff before accepting |
| Edit a specific spot | Inline edit on the selection |
| Stop repeating context | Add a rule in `.cursor/rules/` |
| Recover from a mess | Small commits + git — ask the agent to help bisect what broke |
