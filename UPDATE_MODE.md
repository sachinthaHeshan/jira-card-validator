# Auto-Update Mode - Move Merged Cards Automatically

## Overview

The `-u` (update) flag automatically moves cards with all PRs merged from **"DEV IN REVIEW"** to **"REVIEW APPROVED"** status.

## Usage

```bash
# Run validation with auto-update
node validateCardStatus.js -u

# Or use the alias
vc-update
vcu

# Combine with debug mode
node validateCardStatus.js -u --debug
```

## How It Works

### 1. Validation Phase

The script runs normally:

- Fetches all PRs from GitHub
- Fetches all "DEV IN REVIEW" cards
- Validates which cards have all PRs merged

### 2. Update Phase (with `-u` flag)

After validation, the script:

- Identifies cards where **ALL** associated PRs are merged
- Automatically transitions these cards to "REVIEW APPROVED" status
- Shows detailed update results

## Example Output

### Regular Mode (No Update)

```bash
node validateCardStatus.js
```

```
🟣 LIST OF FULLY MERGED CARDS
========================================
1 card(s) with all PRs merged - ready to move to next status:

🟣 [CL-9539] Case Studies Card Size Mismatch
   📋 https://collectiveos.atlassian.net/browse/CL-9539
   ✅ All 1 PR(s) merged
      • https://github.com/.../pull/3389
```

### Update Mode (Auto-Move)

```bash
node validateCardStatus.js -u
```

```
🟣 LIST OF FULLY MERGED CARDS
========================================
1 card(s) with all PRs merged - ready to move to next status:
...

========================================
🔄 UPDATING CARD STATUS
========================================

Moving 1 card(s) to "REVIEW APPROVED" status...

  🔄 Updating [CL-9539]...
  ✅ [CL-9539] → REVIEW APPROVED

========================================
📊 UPDATE SUMMARY
========================================

  ✅ Successfully updated: 1
  ❌ Failed to update: 0

  Successfully moved to REVIEW APPROVED:
    • [CL-9539] Case Studies Card Size Mismatch
```

## When to Use Update Mode

### ✅ Use `-u` When:

- You want to automatically move completed cards
- You've verified all PRs for a card are merged and approved
- You want to save time manually moving cards
- Running as part of an automated workflow

### ❌ Don't Use `-u` When:

- You want to review before moving cards
- PRs are merged but need additional verification
- Testing the script
- Unsure if cards are ready to move

## Safety Features

### 1. Only Moves Fully Merged Cards

Cards are **only** updated if:

- ✅ All associated PRs are merged
- ✅ No open PRs remain
- ✅ PRs were found (not missing)

### 2. Individual Error Handling

- If one card fails to update, others continue
- Shows which cards succeeded and which failed
- Displays detailed error messages

### 3. Validation First

- Always validates cards before updating
- Shows full report of what will be moved
- No surprises - you see the results before update

## Workflow Examples

### Daily Workflow

```bash
# 1. Check status (no update)
vc

# 2. Review the merged cards list
# (Shows which cards would be moved)

# 3. Run update mode when ready
vc-update
```

### Before Sprint End

```bash
# Move all completed cards at once
node validateCardStatus.js -u
```

### Automated CI/CD

```bash
# In a cron job or CI pipeline
cd ~/Projects/jira
node validateCardStatus.js -u >> log.txt 2>&1
```

## Troubleshooting

### "Transition to 'REVIEW APPROVED' not found"

**Problem**: The Jira workflow doesn't have a "REVIEW APPROVED" status or transition.

**Solution**:

1. Check available statuses in your Jira board
2. Update the script to use the correct status name
3. Contact your Jira admin if the transition isn't available

### "Failed to update: 401 Unauthorized"

**Problem**: API token doesn't have permission to update issues.

**Solution**:

1. Verify `JIRA_API_TOKEN` in `.env` is correct
2. Check API token has "Edit Issues" permission
3. Generate a new API token if needed

### "Failed to update: 403 Forbidden"

**Problem**: Your account doesn't have permission to transition the issue.

**Solution**:

1. Check you have "Edit Issues" permission in the Jira project
2. Verify the transition is allowed for your role
3. Contact project admin for permissions

### Cards Updated But Still Show in DEV IN REVIEW

**Problem**: Cards were moved but appear again when running the script.

**Possible Causes**:

1. You have new cards in DEV IN REVIEW
2. Cards were moved back by someone else
3. Run the script again to see current state

**Solution**:

```bash
# Check current status
vc
```

## Aliases Available

| Alias       | Command                              | Description              |
| ----------- | ------------------------------------ | ------------------------ |
| `vc`        | `node validateCardStatus.js`         | Check status only        |
| `vcd`       | `node validateCardStatus.js --debug` | Check with debug info    |
| `vc-update` | `node validateCardStatus.js -u`      | Check and update         |
| `vcu`       | `node validateCardStatus.js -u`      | Check and update (short) |

## Tips

### 1. Review Before Update

```bash
# First, check what would be updated
vc

# Then run update
vc-update
```

### 2. Combine with Debug Mode

```bash
# See detailed information during update
node validateCardStatus.js -u --debug
```

### 3. Save Update Logs

```bash
# Keep a record of updates
node validateCardStatus.js -u | tee update-$(date +%Y%m%d).log
```

### 4. Dry Run Simulation

If you want to see what would be updated without actually updating:

```bash
# Just use regular mode - it shows what would be moved
vc
```

## Advanced: Custom Status Names

If your Jira board uses a different status name, you can modify the script:

**Edit `validateCardStatus.js`:**

```javascript
// Change this line (around line 160):
await updateCardStatus(card.cardKey, "REVIEW APPROVED");

// To your custom status:
await updateCardStatus(card.cardKey, "YOUR_STATUS_NAME");
```

Common alternatives:

- "QA Ready"
- "Ready for QA"
- "Code Review Complete"
- "Merged"
- "Done"

## Integration Examples

### Git Hook (Post-Merge)

```bash
#!/bin/bash
# .git/hooks/post-merge

# After pulling merged changes, update Jira
cd ~/Projects/jira
node validateCardStatus.js -u --quiet
```

### Scheduled Task (Cron)

```bash
# Update cards every day at 5 PM
0 17 * * * cd ~/Projects/jira && node validateCardStatus.js -u
```

### Manual Checklist

1. Merge all PRs for a feature
2. Run `vc` to verify all PRs detected as merged
3. Run `vcu` to move cards automatically
4. Verify in Jira board

## FAQ

**Q: What if I have multiple PRs for one card?**
A: The card will only update when **ALL** PRs are merged. If even one PR is still open, the card stays in DEV IN REVIEW.

**Q: Can I undo an auto-update?**
A: Yes, you can manually move the card back in Jira. The script doesn't prevent manual changes.

**Q: Does it work with draft PRs?**
A: Draft PRs are treated as open PRs. The card won't update until the draft PR is merged.

**Q: What if the PR was closed but not merged?**
A: Closed (not merged) PRs don't count as completed. The card won't auto-update.

**Q: Can I customize which status to move cards to?**
A: Yes, edit the `updateCardStatus` call in the script to use your preferred status name.

---

**Ready to use!** Try `vc-update` or `vcu` when you have fully merged cards! 🚀
