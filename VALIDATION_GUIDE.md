# Card Status Validation Guide

## Overview

The `validateCardStatus.js` script helps you track the status of your 'DEV IN REVIEW' Jira cards by automatically checking if their associated GitHub PRs are open, merged, or missing.

## Quick Start

```bash
# Run the validation
node validateCardStatus.js

# Run with detailed debug information
node validateCardStatus.js --debug
```

## How It Works

### 1. Data Collection

The script fetches:

- ✅ All **open** PRs from your configured GitHub repositories
- ✅ Last **50 merged** PRs from each repository (recently merged)
- ✅ All Jira cards with status **'DEV IN REVIEW'** assigned to you

### 2. Two-Level PR Detection

For each card, the script uses two methods to find related PRs:

#### Method 1: Comment Check 🔍

- Scans all comments on the Jira card
- Extracts GitHub PR URLs
- Supports multiple formats:
  - Embedded cards (when you paste a PR link)
  - Plain text URLs
  - Markdown links

#### Method 2: Branch Check 🌿

- Checks if any PR branch name contains the card key
- Example: Branch `CL-9192-fix-duplicate-messages` matches card `CL-9192`
- Case-insensitive matching

### 3. Status Determination

Cards are categorized based on their PRs:

| Status             | Icon | Meaning                                          |
| ------------------ | ---- | ------------------------------------------------ |
| **Has Open PRs**   | 🟢   | Work in progress - at least one PR is still open |
| **All PRs Merged** | 🟣   | Ready to move forward - all PRs are merged       |
| **Missing PRs**    | ❓   | No PRs found - may need attention                |

## Understanding the Output

### Main Results Table

```
Status      Card ID        Title                                             PRs (Open/Merged)
🟢          [CL-9849]      AI-Based Profile Creation Fails...                1 🟢 / 0 🟣
  └─ 🟢 Open PRs (1):
     • https://github.com/.../pull/3384 (from comment + branch match)
```

- **Status Icon**: Quick visual indicator
- **Card ID**: Jira card key
- **Title**: Card summary (truncated)
- **PRs (Open/Merged)**: Count of open and merged PRs
- **PR Details**: Shows each PR with its source

### PR Source Indicators

- `(from comment)` - PR URL found in card comments
- `(from branch match)` - PR branch name contains card key
- `(from comment + branch match)` - Found using both methods (best confidence!)

### Categorized Lists

#### 🟣 List of Fully Merged Cards

Shows cards where **ALL** associated PRs are merged:

```
🟣 [CL-9750] Update email templates
   📋 https://collectiveos.atlassian.net/browse/CL-9750
   ✅ All 2 PR(s) merged
      • https://github.com/.../pull/3386
      • https://github.com/.../pull/1337
```

**Action**: These cards are ready to move to the next status (e.g., "QA", "Done")

#### ❓ List of Cards Missing PRs

Shows cards with no PRs found:

```
❓ [CL-8500] Fix login bug
   📋 https://collectiveos.atlassian.net/browse/CL-8500
   ⚠️  No PR links in comments and no matching branch names found
```

**Possible reasons**:

1. PR was never created
2. PR link not added to card comments
3. Branch name doesn't include card key
4. PR was merged more than 50 PRs ago (outside search window)

**Action**:

- Check if PR exists but wasn't linked
- Add PR link to card comments
- Create PR if needed
- Move card to appropriate status if work is abandoned

## Handling Multiple PRs Per Card

The script automatically handles cards with multiple PRs:

### Example Scenario

Card `CL-9750` has:

- PR #1: Frontend changes (in comment)
- PR #2: Backend changes (in comment)
- Both PRs have branches containing "CL-9750"

### Result

```
🟣          [CL-9750]      Email template updates                            0 🟢 / 2 🟣
  └─ 🟣 Merged PRs (2):
     • https://github.com/.../CollectiveOSMultiTenant/pull/3386 (from comment + branch match)
     • https://github.com/.../ExpressBE/pull/1337 (from comment + branch match)
```

The card shows as 🟣 (all merged) only when **ALL** PRs are merged.

## Common Workflows

### Daily Review Workflow

1. **Run validation**:

   ```bash
   node validateCardStatus.js
   ```

2. **Check "Fully Merged Cards" list** (🟣):

   - Review each card
   - Verify changes are ready for next stage
   - Move cards to "QA" or next status in Jira

3. **Check "Missing PRs" list** (❓):

   - Investigate why PRs are missing
   - Add PR links to comments if needed
   - Update card status if work is blocked/abandoned

4. **Review cards with open PRs** (🟢):
   - These are in active development
   - No action needed unless stale

### Before Sprint End

1. Run validation to identify:

   - Cards that can be closed (all PRs merged)
   - Cards that need to carry over (open PRs)
   - Cards that need clarification (missing PRs)

2. Update card statuses in bulk based on results

### Code Review Workflow

1. After merging a PR, run validation
2. Check if the card's status changed to 🟣
3. If yes → move card forward in Jira workflow
4. If no → check if other PRs for that card are pending review

## Debug Mode

Enable debug mode to see detailed information:

```bash
node validateCardStatus.js --debug
```

Debug output includes:

- All PRs found (open and merged)
- Comment parsing details
- URL extraction process
- Branch matching logic

Useful for:

- Troubleshooting why a PR isn't being detected
- Understanding why a card shows as "missing PRs"
- Verifying correct PR status

## Best Practices

### For PR Creation

✅ **DO**:

- Include card key in branch name: `CL-9192-fix-bug`
- Add PR link to Jira card comments immediately after creating PR
- Use Jira's smart URL embedding (just paste the link)

❌ **DON'T**:

- Use generic branch names like `bugfix` or `feature`
- Forget to link PR in Jira comments
- Use shortened URLs (bit.ly, etc.)

### For Card Management

✅ **DO**:

- Run validation before moving cards to next status
- Keep all related PRs linked in card comments
- Update card status when all PRs are merged

❌ **DON'T**:

- Assume PRs are linked if you don't see them in output
- Move cards forward with open PRs unless intentional
- Leave cards in "DEV IN REVIEW" with all PRs merged

### For Multiple PRs

If a card requires multiple PRs (frontend + backend):

1. Create all PRs
2. Add ALL PR links to card comments
3. Use card key in all branch names if possible
4. Card will show as 🟣 only when ALL are merged

## Troubleshooting

### PR not detected in comments

**Symptom**: PR exists in comments but shows "No PR found"

**Solutions**:

- Run with `--debug` flag to see comment parsing
- Check if URL is complete (https://github.com/org/repo/pull/123)
- Re-paste the PR link in comments
- Ensure comment is saved properly in Jira

### PR not detected by branch name

**Symptom**: Branch contains card key but not matched

**Solutions**:

- Verify branch name contains exact card key (e.g., "CL-9192")
- Check if PR is still open or was merged (check last 50 merged)
- Ensure PR exists in one of the configured repositories

### Card shows as "Missing PRs" but PR exists

**Possible causes**:

1. PR was merged more than 50 PRs ago
   - Solution: Add PR link to card comments
2. PR is in a different repository not in the config
   - Solution: Add repository to REPOS array in script
3. Branch name doesn't contain card key
   - Solution: Add PR link to card comments

### Old merged PRs not showing

**Note**: The script only fetches the last 50 merged PRs per repository for performance.

**Solution**: Add PR links to card comments for older PRs

## Configuration

Edit `validateCardStatus.js` to customize:

```javascript
// Add/remove repositories
const REPOS = [
  "ChameleonCollective/CollectiveOSMultiTenant",
  "YourOrg/YourRepo", // Add your repos here
];

// Change number of merged PRs to fetch (default: 50)
const closedPRs = await getPullRequests(repo, "closed", 50); // Increase if needed
```

## Summary Stats Explained

```
📈 SUMMARY
  📊 Total cards: 5
  🟢 Cards with open PRs: 3
  🟣 Cards with all PRs merged: 2
  ❓ Cards missing PRs: 0
```

- **Total cards**: All cards in 'DEV IN REVIEW' status assigned to you
- **Cards with open PRs**: Have at least one PR still open (work in progress)
- **Cards with all PRs merged**: All associated PRs are merged (ready to move)
- **Cards missing PRs**: No PRs found by either method (need attention)

## Tips for Efficiency

1. **Bookmark the script**: Add to your terminal aliases

   ```bash
   alias validate-cards="cd ~/Projects/jira && node validateCardStatus.js"
   ```

2. **Run regularly**: Check daily or before standup meetings

3. **Use with git hooks**: Run after pushing PRs to verify linking

4. **Combine with Jira workflow**: Update card status based on results

5. **Share with team**: Help team members track their PR status too

## Support

If you encounter issues:

1. Run with `--debug` flag
2. Check the [README.md](README.md) for setup instructions
3. Verify environment variables in `.env`
4. Ensure GitHub token has proper permissions

---

**Happy validating! 🚀**
