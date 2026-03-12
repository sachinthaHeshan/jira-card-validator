# jira-card-validator

CLI tool that validates Jira cards in **"DEV IN REVIEW"** status by cross-referencing GitHub PRs — and optionally auto-transitions fully merged cards to **IR-DA**.

## Installation

Install globally so it's available anywhere:

```bash
npm install -g .
```

Or, for team members installing from a git repository:

```bash
npm install -g git+https://github.com/ChameleonCollective/jira-card-validator.git
```

## Setup

Run the interactive configuration to store your Jira and GitHub credentials:

```bash
jira-card-validator configure
```

You'll be prompted for:

| Field            | Description                           |
| ---------------- | ------------------------------------- |
| Jira Base URL    | e.g. `https://collectiveos.atlassian.net` |
| Jira Email       | Your Atlassian account email          |
| Jira API Token   | [Create one here](https://id.atlassian.com/manage-profile/security/api-tokens) |
| GitHub Token     | [Create one here](https://github.com/settings/tokens) with `repo` scope |
| Repos            | Comma-separated list of GitHub repos to scan (defaults provided) |

Credentials are saved to `~/.jira-card-validator/config.json` (file permissions set to owner-only).

## Usage

```bash
# Validate cards assigned to you
jira-card-validator

# Validate cards for all users
jira-card-validator -a

# Validate and auto-move merged cards to IR-DA
jira-card-validator -u

# Both flags
jira-card-validator -a -u

# Debug mode
jira-card-validator --debug

# Show help
jira-card-validator help
```

## Options

| Flag           | Description                                      |
| -------------- | ------------------------------------------------ |
| `-a`, `--all`  | Show cards for all users, not just yours          |
| `-u`, `--update` | Auto-transition fully-merged cards to IR-DA     |
| `--debug`      | Print detailed debug output                      |
| `-h`, `--help` | Show help                                        |

## How It Works

1. Fetches all open & recently closed PRs from configured GitHub repos
2. Fetches Jira cards in "DEV IN REVIEW" status
3. Matches cards to PRs via:
   - PR URLs found in Jira card comments
   - Branch names containing the Jira card key
4. Reports card status:
   - 🟢 Has open PRs (still in review)
   - 🟣 All PRs merged (ready to advance)
   - ❓ No PRs found
   - ⚠️ Mixed status
5. With `-u` flag, auto-transitions fully-merged cards to IR-DA

## Uninstall

```bash
npm uninstall -g jira-card-validator
rm -rf ~/.jira-card-validator
```
