---
name: reading
description: Quick access to Feedly articles across Markets, Real Estate, and thought leadership categories. Surfaces unread articles by project context and supports save-for-later workflow.
allowed-tools: mcp__feedly__*
---

# Reading Skill

Quick access to Feedly articles organized by project context.

## Quick Reference

| Command | Action |
|---------|--------|
| `/reading` | Show unread counts and top articles per category |
| `/reading markets` | JGL Capital - Markets category articles |
| `/reading cre` | L7 Partners - Real Estate category articles |
| `/reading learn` | Thought leadership - Other category |
| `/reading local` | CT/NY local news |
| `/reading sports` | Sports news |
| `/reading saved` | Articles saved for later |
| `/reading save [id]` | Save an article for later |
| `/reading mark [id]` | Mark article as read |

---

## Category to Project Mapping

| Feedly Category | Project | Stream ID |
|-----------------|---------|-----------|
| Markets | jgl-capital | `user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Markets` |
| Real estate | l7-partners | `user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Real estate` |
| Other | claude-hub | `user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Other` |
| Local | personal | `user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/28ab5146-0763-43b0-b6df-224292296f7b` |
| Sports | personal | `user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Sports` |

---

## Instructions for `/reading` (Overview)

### Step 1: Get Unread Counts

```
Use mcp__feedly__feedly_unread_counts
```

### Step 2: Get Top Unread Articles

```
Use mcp__feedly__feedly_all_articles with count=10, unreadOnly=true
```

### Step 3: Format Overview

```
## Reading Overview

### Unread by Category
| Category | Count | Project |
|----------|-------|---------|
| Markets | X | JGL Capital |
| Real Estate | X | L7 Partners |
| Other | X | Learning |
| Local | X | Personal |
| Sports | X | Personal |
| **Total** | **X** | |

### Top 10 Unread Articles

#### [Article Title](url)
**Source:** [feed name] | **Category:** [category]
> [summary snippet...]

...

### Quick Actions
- `/reading markets` - Focus on trading research
- `/reading cre` - Focus on CRE intelligence
- `/reading saved` - Review saved articles
```

---

## Instructions for `/reading markets`

### Step 1: Fetch Markets Articles

```
Use mcp__feedly__feedly_stream with:
- streamId: "user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Markets"
- count: 20
- unreadOnly: true
```

### Step 2: Format Markets Brief

```
## Markets Reading (JGL Capital)

**X unread articles** | [View in Feedly](https://feedly.com)

### Recent Articles

#### 1. [Title](url)
**Source:** [feed] | **Published:** [time ago]
> [summary...]

---

#### 2. [Title](url)
...

### Key Sources
- TraderFeed, Reformed Broker, A Wealth of Common Sense
- Abnormal Returns, All Star Charts, Investor Amnesia
- Apollo Daily Spark, Glassnode Insights

### Actions
- Reply with article number to save for later
- `/reading save [entry_id]` to bookmark
```

---

## Instructions for `/reading cre`

### Step 1: Fetch Real Estate Articles

```
Use mcp__feedly__feedly_stream with:
- streamId: "user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Real estate"
- count: 20
- unreadOnly: true
```

### Step 2: Format Real Estate Brief

```
## Real Estate Reading (L7 Partners)

**X unread articles** | [View in Feedly](https://feedly.com)

### Recent Articles

#### 1. [Title](url)
**Source:** [feed] | **Published:** [time ago]
> [summary...]

---

...

### Key Sources
- Connect CRE, Commercial Observer, GlobeSt
- Thesis Driven, Adventures in CRE
- Green Street, Banker & Tradesman

### Deal Research Tips
- Use articles to inform underwriting assumptions
- Track market trends for specific metros
- Monitor competitor activity
```

---

## Instructions for `/reading learn`

### Step 1: Fetch Other/Learning Articles

```
Use mcp__feedly__feedly_stream with:
- streamId: "user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Other"
- count: 20
- unreadOnly: true
```

### Step 2: Format Learning Brief

```
## Thought Leadership & Learning

**X unread articles** | [View in Feedly](https://feedly.com)

### Recent Articles

#### 1. [Title](url)
**Source:** [feed] | **Published:** [time ago]
> [summary...]

---

...

### Featured Sources
- Tomasz Tunguz (startup metrics)
- Not Boring (tech/business)
- AVC, Feld Thoughts (VC insights)
- Collaborative Fund, Daily Stoic
- Tim Ferriss, Art of Manliness
```

---

## Instructions for `/reading local`

### Step 1: Fetch Local News

```
Use mcp__feedly__feedly_stream with:
- streamId: "user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/28ab5146-0763-43b0-b6df-224292296f7b"
- count: 15
- unreadOnly: true
```

### Step 2: Format Local Brief

```
## Local News (CT/NY)

**X unread articles**

### Recent Articles
...

### Coverage Areas
- Darien, Stamford, Greenwich, Norwalk
- Fairfield County, Long Island
- CT Examiner, Darien Times, NewCanaanite
```

---

## Instructions for `/reading sports`

### Step 1: Fetch Sports Articles

```
Use mcp__feedly__feedly_stream with:
- streamId: "user/d0fa0f4e-f318-4df9-9d37-e86cdb63cfcd/category/Sports"
- count: 15
- unreadOnly: true
```

### Step 2: Format Sports Brief

```
## Sports Reading

**X unread articles**

### Recent Articles
...

### Coverage
- NY Rangers (Blueshirt Banter, NY Post)
- NY Giants (Big Blue View)
- Yankees (Pinstripe Alley)
- Lacrosse (Inside Lacrosse)
```

---

## Instructions for `/reading saved`

### Step 1: Fetch Saved Articles

```
Use mcp__feedly__feedly_saved_articles with count=20
```

### Step 2: Format Saved List

```
## Saved for Later

**X articles saved**

### Saved Articles

#### 1. [Title](url)
**Source:** [feed] | **Saved:** [date]

...

### Actions
- Review and clear your backlog
- Create tasks from actionable articles
```

---

## Instructions for `/reading save [entry_id]`

### Step 1: Save Article

```
Use mcp__feedly__feedly_save_for_later with entryId="[entry_id]"
```

### Step 2: Confirm

```
Saved "[Article Title]" for later.

View saved articles: `/reading saved`
```

---

## Instructions for `/reading mark [entry_id]` or `/reading mark all [category]`

### For Single Article:

```
Use mcp__feedly__feedly_mark_read with entryIds=["[entry_id]"]
```

### For Category:

```
Use mcp__feedly__feedly_mark_read with categoryIds=["[category_stream_id]"]
```

### Confirm

```
Marked X article(s) as read.
```

---

## Integration with Industry Reading Habit

After reviewing articles, remind user:

```
Don't forget to log your reading habit!
Use: `/jeff` then "log Industry Reading"
```

Or directly:

```
Use mcp__jeff-agent__jeff_log_habit with habit_name="Industry Reading"
```

---

## Proactive Suggestions

When surfacing articles, consider context:
- Working on L7 deal? Suggest `/reading cre`
- Trading session prep? Suggest `/reading markets`
- High unread count (100+)? Suggest marking old articles as read
- Saved backlog growing? Suggest review session

---

## Article Entry ID Format

Feedly entry IDs look like:
```
/LEy92nsHtSWwVYwfeZu7SHT952fo8nU/Sjav2gcswE=_19bd82eb954:39da14:ce4addd7
```

When referencing articles, use the full ID or display a numbered list and let user select by number.
