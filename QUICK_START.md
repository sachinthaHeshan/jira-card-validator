# Quick Start Guide - validateCardStatus.js

## 🚀 Run the Script

```bash
# Normal mode (check your cards only)
node validateCardStatus.js

# All users mode (check everyone's cards)
node validateCardStatus.js -a

# Update mode (auto-move merged cards to IR-DA)
node validateCardStatus.js -u

# All users + update mode
node validateCardStatus.js -a -u

# Debug mode (detailed logs)
node validateCardStatus.js --debug

# Combine multiple flags
node validateCardStatus.js -a -u --debug
```

### Quick Aliases

```bash
vc           # Check your cards
vca          # Check all users' cards
vcu          # Check + update your merged cards
vca-update   # Check all users + update merged cards
vcd          # Check with debug
```

## 📊 What You'll See

### 1. Main Results Table

Shows each card with:

- **Status Icon**: 🟢 (open) / 🟣 (merged) / ❓ (missing)
- **Card ID & Title**
- **PR Counts**: Open vs Merged
- **All related PRs** with sources

### 2. 🟣 Fully Merged Cards List

Cards where **ALL** PRs are merged → **Ready to move forward!**

### 3. ❓ Cards Missing PRs List

Cards with no PRs found → **Need attention**

### 4. 📈 Summary Statistics

Quick overview of all cards

## 🎯 Quick Actions

| What You See      | What It Means      | What To Do                                 |
| ----------------- | ------------------ | ------------------------------------------ |
| 🟣 All PRs merged | All PRs are merged | Move card to next status (QA/Done)         |
| 🟢 Has open PRs   | Work in progress   | Continue development, wait for review      |
| ❓ Missing PRs    | No PRs found       | Check if PR exists, add link, or create PR |

## ✅ Best Practices

**When creating a PR:**

1. Include card key in branch name: `CL-9192-fix-bug`
2. Paste PR link in Jira card comments immediately
3. Run validation to verify detection

**When reviewing cards:**

1. Run `validateCardStatus.js`
2. Check "Fully Merged Cards" list
3. Move those cards to next status
4. Investigate any "Missing PRs"

## 🔍 PR Detection Methods

The script finds PRs two ways:

1. **From Comments** 💬

   - Scans card comments for GitHub PR URLs
   - Supports embedded cards (paste link → Jira auto-formats)
   - Supports plain text URLs

2. **From Branch Names** 🌿
   - Checks if PR branch contains card key
   - Example: `CL-9192-duplicate-messages` matches `CL-9192`

**Best confidence**: When found by BOTH methods ✅

## 📝 Output Icons

| Icon | Status    | Meaning                                |
| ---- | --------- | -------------------------------------- |
| 🟢   | Open      | PR is open, work in progress           |
| 🟣   | Merged    | PR is merged successfully              |
| ❓   | Not Found | No PR found for this card              |
| ⚠️   | Mixed     | Some PRs open, some closed (edge case) |

## 🎓 Example Scenarios

### Scenario 1: Ready to Move Forward

```
🟣 [CL-9750] Update email templates - 0 🟢 / 2 🟣
   └─ 🟣 Merged PRs (2):
      • Frontend PR (merged 12/20/2024)
      • Backend PR (merged 12/21/2024)
```

**Action**: Move card to QA/Done ✅

### Scenario 2: Work in Progress

```
🟢 [CL-9849] AI Profile Creation Fix - 1 🟢 / 0 🟣
   └─ 🟢 Open PRs (1):
      • Main PR (from comment + branch match)
```

**Action**: Wait for PR review/merge ⏳

### Scenario 3: Missing PR

```
❓ [CL-8500] Fix login bug - 0 🟢 / 0 🟣
   └─ ❓ No PRs found
```

**Action**: Investigate - was PR created? Is link in comments? 🔍

### Scenario 4: Multiple PRs (Partial Progress)

```
🟢 [CL-9700] Full Stack Feature - 1 🟢 / 1 🟣
   └─ 🟢 Open PRs (1):
      • Frontend PR
   └─ 🟣 Merged PRs (1):
      • Backend PR (merged 12/19/2024)
```

**Action**: Wait for frontend PR to merge ⏳

## 🐛 Troubleshooting

### "PR not detected but it exists"

- Run with `--debug` flag
- Check if PR link is in card comments
- Verify branch name contains card key
- Ensure PR is in one of the configured repos

### "Card shows as missing PR"

- Check if PR was merged >50 PRs ago (outside search window)
- Add PR link to card comments if old
- Verify PR is in configured repositories

### "Comment Check not working for my PR"

- Jira may format URLs differently
- Copy-paste the full PR URL again in comments
- Use format: `https://github.com/org/repo/pull/123`

## 💡 Pro Tips

1. **Run daily before standup** to prepare updates
2. **Alias the command** for quick access:
   ```bash
   alias vc="cd ~/Projects/jira && node validateCardStatus.js"
   ```
3. **Use debug mode** when investigating issues
4. **Keep PR links updated** in Jira comments for best results
5. **Include card key in all branches** for automatic detection

## 📚 More Info

- Full documentation: [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md)
- Setup instructions: [README.md](README.md)

---

Need help? Run with `--debug` flag for detailed information! 🔍
