# Jira API Scripts

This repository contains scripts to interact with Jira's REST API.

## Scripts

### `get_cards.js`

Fetches all Jira cards/issues that the authenticated user has access to.

**Usage:**

```bash
node get_cards.js
```

**Output:**

- Summary of total cards and status columns
- Detailed list of all cards with:
  - Issue key
  - Summary
  - Status
  - Type
  - Assignee
  - Direct URL to the issue

### `index.js`

Finds Jira cards in the "Review" column that have unmerged GitHub PRs.

**Usage:**

```bash
node index.js
```

**Output:**

- List of card keys that have unmerged pull requests

### `get_github_prs.js`

Fetches all **open** pull requests from specified GitHub repositories.

**Usage:**

```bash
node get_github_prs.js
```

**Features:**

- Fetches open PRs from six repositories:
  - ChameleonCollective/CollectiveOSMultiTenant
  - ChameleonCollective/CollectiveOSMultiTenantExpressBE
  - ChameleonCollective/MultitenantSignUpService
  - ChameleonCollective/CollectiveOSExpressBE
  - ChameleonCollective/CollectiveOS
  - ChameleonCollective/CollectiveOSMultiTenantSST
- Shows only open/active PRs (excludes merged and closed)
- Optional filtering by GitHub username (set `GITHUB_USERNAME` in `.env`)
- Summary statistics of open PRs

**Output:**

- Detailed list of all open PRs with:
  - Title and number
  - Author
  - Created date
  - Direct URL to the PR
  - Draft status indicator
- Summary count of total open PRs
- Quick reference list of all open PRs

### `validateCardStatus.js` ⭐ NEW

**The most comprehensive validation tool** - validates 'DEV IN REVIEW' Jira cards against GitHub PRs to identify cards ready to move forward or needing attention.

**Usage:**

```bash
# Check card status (your cards only)
node validateCardStatus.js

# Check all users' cards
node validateCardStatus.js -a

# Auto-update: Move merged cards to IR-DA
node validateCardStatus.js -u

# Check all users + auto-update merged cards
node validateCardStatus.js -a -u

# Debug mode for detailed information
node validateCardStatus.js --debug

# Quick aliases (works from anywhere)
vc           # Check your cards
vca          # Check all users' cards
vcu          # Check + auto-update your cards
vca-update   # Check all + auto-update
vcd          # Check with debug
```

**Features:**

- ✅ Fetches both **open** and **recently merged** PRs (last 50 per repo) from all repositories
- ✅ Validates cards using **two methods**:
  1. **Comment Check**: Finds PR URLs in Jira comments (supports embedded cards and plain text)
  2. **Branch Check**: Matches card key in PR branch names (e.g., `CL-9192-fix-bug`)
- ✅ Handles **multiple PRs per card** (tracks all PRs mentioned in comments or matching branches)
- ✅ Smart PR detection:
  - Embedded/inlineCard URLs (when you paste a PR link in Jira)
  - Plain text URLs
  - Markdown links
- ✅ Categorizes cards into:
  - 🟢 **Cards with open PRs** - Work in progress
  - 🟣 **Cards with all PRs merged** - Ready to move to next status
  - ❓ **Cards missing PRs** - Need attention (no PR found)

**Output:**

1. **Detailed validation results table** showing:

   - Status icon (🟢 open / 🟣 merged / ❓ missing)
   - Card ID and title
   - Count of open vs merged PRs
   - Full list of all related PRs with sources (comment/branch match)
   - Merge dates for merged PRs

2. **🟣 List of Fully Merged Cards**:

   - Cards where ALL associated PRs are merged
   - Ready to move to next status in Jira
   - Direct links to Jira cards and GitHub PRs

3. **❓ List of Cards Missing PRs**:

   - Cards with no PR links in comments AND no matching branch names
   - May need investigation or PR creation

4. **📈 Summary Statistics**:
   - Total cards checked
   - Breakdown by status (open/merged/missing)

**Example Output:**

```
Status      Card ID        Title                                             PRs (Open/Merged)
🟢          [CL-9849]      AI-Based Profile Creation Fails...                1 🟢 / 0 🟣
  └─ 🟢 Open PRs (1):
     • https://github.com/.../pull/3384 (from comment + branch match)

🟣          [CL-9750]      Update email templates                            0 🟢 / 2 🟣
  └─ 🟣 Merged PRs (2):
     • https://github.com/.../pull/3386 (from comment) - merged 12/20/2024
     • https://github.com/.../pull/1337 (from branch match) - merged 12/21/2024
```

**Why use this script?**

- Quickly identify cards ready to be moved out of "DEV IN REVIEW"
- **Auto-update cards**: Move merged cards to REVIEW APPROVED with `-u` flag
- Find cards that may be missing PRs or need cleanup
- Track multiple PRs per card automatically
- Save time by avoiding manual PR status checks

**New in v2.0**: Auto-update mode! Use `-u` flag to automatically move cards with all PRs merged to "REVIEW APPROVED" status. See [UPDATE_MODE.md](UPDATE_MODE.md) for details.

## Setup

1. Create a `.env` file in the project root with the following variables:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_BOARD_ID=your-board-id-or-project-key
REVIEW_COLUMN_NAME=DEV IN REVIEW
GITHUB_TOKEN=your-github-token-here
GITHUB_USERNAME=your-github-username  # Optional: filter PRs by this user
```

2. Install dependencies:

```bash
npm install
```

## API Token Setup

### Jira API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name and copy the token
4. Add it to your `.env` file

### GitHub Personal Access Token

1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Jira Scripts")
4. Select scopes: `repo` (for private repos) or `public_repo` (for public repos only)
5. Click "Generate token" and copy it
6. Add it to your `.env` file as `GITHUB_TOKEN`

### Important Permissions

Make sure your Jira API token has the following permissions:

- **Browse Projects** - Required to view issues
- **View Development Tools** - Required to see PR links
- **View Issues** - Required to read issue details

## Troubleshooting

### "No issues found" or empty results

This can happen for several reasons:

1. **No accessible projects**: The API token doesn't have access to any Jira projects

   - Solution: Contact your Jira admin to grant project access

2. **Wrong JIRA_BOARD_ID**: The board ID in `.env` might be incorrect

   - Solution: Check the board URL in Jira browser (it's in the URL bar)
   - Format: `https://your-domain.atlassian.net/jira/software/projects/ABC/boards/123`
   - Use `123` as the JIRA_BOARD_ID

3. **No issues in the project**: The project exists but has no issues yet

   - Solution: Create some test issues in Jira

4. **Insufficient permissions**: The API token doesn't have "Browse Project" permission
   - Solution: Contact your Jira admin to grant permissions

### "401 Unauthorized" errors

- Check that JIRA_EMAIL and JIRA_API_TOKEN in `.env` are correct
- Verify the API token hasn't expired
- Make sure you're using an API token, not your Jira password

### "410 Gone" errors

The old Jira API endpoints have been deprecated. This has been fixed in the latest version of these scripts which now use the `/rest/api/3/search/jql` endpoint.

## Recent Updates

- ✅ Updated to use new Jira API endpoint `/rest/api/3/search/jql`
- ✅ Added proper error handling and user-friendly messages
- ✅ Fixed deprecated API endpoint issues
- ✅ Added helpful troubleshooting information

## API Endpoints Used

- `/rest/api/3/search/jql` - Search for issues using JQL
- `/rest/api/3/project/search` - Get accessible projects
- `/rest/api/3/issue/{issueKey}/comment` - Get issue comments
- `/rest/api/3/myself` - Get current user info
# jira
