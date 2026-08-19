# Depthly Marketing Rules — Lessons Learned

A living reference, built from real feedback across multiple Reddit posts and one detailed private critique. Update this as new lessons come in.

---

## 1. Audience

- **Stop targeting developers and technical founder subs.** Devs see a timer and shrug, they don't feel the pain the way non-technical people do. Every "yet another pomodoro app" dismissal came from a dev-heavy sub.
- **Target students first.** Studying for X hours is an existing behavior they already have, the product maps onto it naturally. This is the single highest-leverage audience shift identified.
- **Freelancers are a secondary target**, worth testing after students, with an ROI-framed angle ("know exactly how much focused time you're putting into client work").
- **Devs are not the audience, full stop**, unless a future dev-specific angle is deliberately built (e.g. "how many hours did you actually spend in deep work this week?" for coding communities).

## 2. Positioning

- **Stop describing Depthly as "timer + analytics + leaderboard."** That's a feature list, not a reason to care.
- **Reframe as "the social layer for deep work."** The friends/leaderboard/accountability mechanic is the actual product, not a feature bolted onto a timer.
- **Sell the outcome, not the feature.** "Build a deep-work habit with your friends" beats "focus timer with analytics." Validate the mechanic first, then write copy around what actually gets people to participate, don't write the tagline before you know it works.
- **Accept the category is crowded, but frame it as underrated.** Doesn't need to be the first focus app, needs to actually work for the people using it.

## 3. Distribution

- **Don't just post "I built an app."** Give people something to participate in: a "30-Day Deep Work Challenge," "Can you hit 20 hours this week?", "University A vs University B."
- **Go where the audience already is**: study Discord servers, study-focused subreddits, study-with-me communities, university communities, student creators on TikTok/YouTube.
- **Turn the leaderboard into a growth loop, not just a feature**: shareable weekly stats cards (focus → get stats → share → friend joins → both compete). Build community-specific leaderboards (e.g. "join your Discord's Depthly leaderboard").
- **Don't wait for App Store/Play Store to validate.** The web app is enough to start testing acquisition and retention now.
- **Find people already frustrated with a competitor, don't just post cold.** Search r/productivity and r/freelance for people specifically complaining that Toggl/Clockify are too bloated or gamified, that's a warmer, higher-intent lead than a general audience post.
- **Submit to smaller launch platforms for early, low-stakes feedback before bigger channels.** Microlaunch, Launching Next, and BetaList were recommended as good places to get early tech feedback before hitting Product Hunt or larger audiences.
- **When someone offers to test the product directly and asks for the link, give it.** That's different from proactively dropping a link, it's a genuine "come break it" outcome and should be honored immediately, along with a specific ask for what kind of feedback would help most (e.g. UX/landing page read).
- **Skip building a big waitlist.** 20–50 real users beats 1,000 "notify me" emails.
- **Post weekly build-in-public updates, regardless of outcome.** Don't only post reactively when something happens, consistency matters more than any single post's result.
- **Collect real testimonials from actual daily users.** Ask directly instead of assuming, then use them in future posts.

## 4. Cold-start problem (social/competitive features)

- A leaderboard with very few users doesn't feel competitive, it can actively signal "not many people use this."
- Don't lean hard on the social/leaderboard angle in marketing until there's enough user density for it to feel alive. Consider community-specific (private) leaderboards as a way to create critical mass within smaller groups before going broad.

## 5. Reddit posting mechanics

- **No link in the post body on story-first subs** (r/StartupSoloFounder, r/SideProject, etc.). Drop the link only in a comment reply once someone asks.
- **One post per subreddit, never same-day cross-posting.** Vary the title and opening line for each community, don't copy-paste the same post.
- **Space posts days apart minimum.** Posting multiple subs in the same week reads as a coordinated campaign, not a founder sharing progress.
- **Each post should reflect something that's actually changed** (new users, a milestone, a lesson learned) rather than repeating the same origin story.
- **Disclose founder identity and affiliation.** Never hide that you're the builder.
- **Screenshots go in the first comment, not the post body**, when the sub's editor doesn't support inline images, or when a story-first sub expects the text to stand alone.
- **Retire the "founder in a high-end café" photo.** Flagged independently by two people as an overused, no-longer-convincing trope. Use real product/usage screenshots instead.
- **Close posts with a soft, specific ask, not an open invitation.** "Come break this tool for me" outperforms "ask me anything" or a signup pitch, people engage more with finding flaws than being sold to.

## 6. Handling criticism and hostile comments

- **Most hostile comments are not worth a second reply.** One reply per hostile commenter, max. If they come back with more, let it sit.
- **Concede the fair, low-stakes part of a critique; hold firm on the substantive disagreement.** This reads as reasonable, not defensive, and makes the pushback land harder.
- **Never end a reply on contempt or a "mic-drop" line** (e.g. "keep it next time"). It invites escalation and gives hostile commenters an easy comeback. End on the factual point instead.
- **Don't take "you have no idea" or "gatekeeping" style comments as real feedback.** They're not actionable, they're dismissiveness. Respond briefly if at all, then move on.
- **Real, good-faith questions deserve real, specific answers.** Describe concretely what's different (projects → tasks → time tracked per task → analytics across daily/weekly/monthly/yearly/lifetime → friends/leaderboard), don't argue in adjectives ("better," "smarter").
- **A meaningful chunk of hostile Reddit engagement may not be from real, engaged people.** Reddit's own incentives favor negative engagement (it drives more activity), and bot/farm accounts add to the pile. Don't over-index on volume of negativity as a signal about the real target audience.
- **Distinguish jabs from substance within a single comment.** Someone can say something contemptuous ("you must not have much experience") *and* raise a legitimate point ("is there real paid demand for this category") in the same message. Answer the substance, ignore the insult.

## 7. Security (non-marketing, but earned the hard way)

- **Row Level Security is row-level, not column-level.** A policy like `id = auth.uid() or is_public = true` on a table containing both public-safe fields and sensitive fields (billing IDs, subscription status) exposes *all* columns on public rows to anonymous requests.
- **Never expose a table with mixed sensitive/public columns directly to anon reads.** Create a narrow public view with only the safe columns, point public-facing features (leaderboard, public profiles) at the view, and restrict the base table to owner-only access.
- **A stranger finding this and disclosing it privately, instead of posting it publicly, is a genuine favor.** Treat responsible disclosure with real gratitude, and run a full security diagnostic (RLS policies across every table, service role key exposure, webhook signature verification, write paths) rather than only patching the one issue reported.

## 8. General posture

- **Test the idea in the right room before concluding it's wrong.** Multiple people told me to "pivot to a more niche idea." The actual issue was audience, not the idea. Don't let volume of criticism from the wrong crowd override real usage data (daily use, active streaks, real sessions logged).
- **Usage data beats opinions.** When someone questions whether there's demand, the answer is showing real behavior (streaks, session counts, daily use), not defending the concept in the abstract.
- **Keep a running list of both the good and the sharp feedback.** The single most valuable piece of feedback so far came from one detailed, unsolicited private message, not from any public post. Don't discount quiet, thoughtful outreach in favor of chasing public post performance.
