import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, GITHUB_TOKEN } = process.env;

// GitHub repositories to check
const REPOS = [
  "ChameleonCollective/CollectiveOSMultiTenant",
  "ChameleonCollective/CollectiveOSMultiTenantExpressBE",
  "ChameleonCollective/MultitenantSignUpService",
  "ChameleonCollective/CollectiveOSExpressBE",
  "ChameleonCollective/CollectiveOS",
  "ChameleonCollective/CollectiveOSMultiTenantSST",
];

// Jira auth header
const jiraAuth =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// ============= GITHUB FUNCTIONS =============

// Fetch PRs from a specific repository
async function getPullRequests(repo, state = "open", perPage = 100) {
  const apiUrl = `https://api.github.com/repos/${repo}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      console.error(
        `Failed to fetch PRs for ${repo}: ${res.status} ${res.statusText}`,
      );
      return [];
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching PRs for ${repo}:`, error.message);
    return [];
  }
}

// Fetch PRs from a single repo (both open and closed in parallel)
async function fetchRepoData(repo) {
  try {
    // Fetch open and closed PRs in parallel for this repo
    const [openPRs, closedPRs] = await Promise.all([
      getPullRequests(repo, "open", 30),
      getPullRequests(repo, "closed", 30),
    ]);

    const allPRs = [];

    // Process open PRs
    openPRs.forEach((pr) => {
      allPRs.push({
        repo,
        number: pr.number,
        title: pr.title,
        branch: pr.head.ref,
        url: pr.html_url.toLowerCase(),
        author: pr.user.login,
        draft: pr.draft,
        state: "open",
        merged: false,
      });
    });

    // Process closed PRs
    closedPRs.forEach((pr) => {
      allPRs.push({
        repo,
        number: pr.number,
        title: pr.title,
        branch: pr.head.ref,
        url: pr.html_url.toLowerCase(),
        author: pr.user.login,
        draft: pr.draft,
        state: "closed",
        merged: pr.merged_at ? true : false,
        mergedAt: pr.merged_at,
      });
    });

    return allPRs;
  } catch (error) {
    console.error(`⚠️  Error fetching from ${repo}:`, error.message);
    return []; // Return empty array on error, don't fail entire process
  }
}

// Fetch all PRs from all repositories in parallel
async function getAllPRs() {
  console.log("Fetching PRs from all repositories in parallel...\n");

  // Fetch from all repos in parallel
  const allRepoPromises = REPOS.map((repo) => fetchRepoData(repo));
  const repoResults = await Promise.all(allRepoPromises);

  // Flatten all PRs into a single array
  const allPRs = repoResults.flat();

  const openCount = allPRs.filter((pr) => pr.state === "open").length;
  const mergedCount = allPRs.filter((pr) => pr.merged).length;

  console.log(`✅ Found ${openCount} open PRs and ${mergedCount} merged PRs\n`);
  return allPRs;
}

// ============= JIRA FUNCTIONS =============

// Update card status
async function updateCardStatus(cardKey, newStatus) {
  const url = `${JIRA_BASE_URL}/rest/api/3/issue/${cardKey}/transitions`;

  try {
    // First, get available transitions
    const getRes = await fetch(url, {
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
      },
    });

    if (!getRes.ok) {
      throw new Error(`Failed to get transitions: ${getRes.status}`);
    }

    const transitions = await getRes.json();

    // Find the transition ID for the target status
    const transition = transitions.transitions.find(
      (t) =>
        t.name.toUpperCase() === newStatus.toUpperCase() ||
        t.to.name.toUpperCase() === newStatus.toUpperCase(),
    );

    if (!transition) {
      throw new Error(
        `Transition to "${newStatus}" not found. Available: ${transitions.transitions
          .map((t) => t.name)
          .join(", ")}`,
      );
    }

    // Execute the transition
    const postRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transition: {
          id: transition.id,
        },
      }),
    });

    if (!postRes.ok) {
      const errorText = await postRes.text();
      throw new Error(`Failed to update: ${postRes.status} - ${errorText}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

// Fetch cards with status 'DEV IN REVIEW'
async function getDevInReviewCards(showAllUsers = false) {
  const jql = showAllUsers
    ? 'status = "DEV IN REVIEW" ORDER BY created DESC'
    : 'assignee = currentUser() AND status = "DEV IN REVIEW" ORDER BY created DESC';

  console.log(`Fetching cards with status 'DEV IN REVIEW'...`);
  if (showAllUsers) {
    console.log("🌐 Showing cards for ALL users");
  } else {
    console.log("👤 Showing cards assigned to you");
  }
  console.log(`JQL: ${jql}\n`);

  const url = `${JIRA_BASE_URL}/rest/api/3/search/jql`;

  const requestBody = {
    jql: jql,
    fields: [
      "summary",
      "status",
      "issuetype",
      "assignee",
      "created",
      "updated",
      "comment",
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      console.error(`Error: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.error("Response:", errorText);
      throw new Error(`Failed to fetch cards: ${res.status}`);
    }

    const data = await res.json();
    console.log(
      `✅ Found ${data.issues?.length || 0} cards in 'DEV IN REVIEW' status\n`,
    );

    return data.issues || [];
  } catch (error) {
    console.error("Error fetching cards:", error.message);
    return [];
  }
}

// ============= VALIDATION FUNCTIONS =============

// Extract PR URLs from card comments
function extractPRUrlsFromComments(card, debug = false) {
  const comments = card.fields.comment?.comments || [];
  const prUrls = [];

  // GitHub PR URL patterns - more comprehensive
  const prUrlPattern =
    /https?:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/pull\/\d+/gi;

  comments.forEach((comment) => {
    // Extract comment body text and URLs from various Jira comment structures
    let body = "";
    const foundUrls = [];

    if (comment.body?.content) {
      comment.body.content.forEach((contentBlock) => {
        if (!contentBlock.content) return;

        contentBlock.content.forEach((item) => {
          // Handle text nodes
          if (item.text) {
            body += item.text + " ";
          }

          // Handle inlineCard (embedded URLs)
          if (item.type === "inlineCard" && item.attrs?.url) {
            const url = item.attrs.url;
            if (prUrlPattern.test(url)) {
              foundUrls.push(url);
              if (debug) {
                console.log(
                  `[DEBUG] Found inlineCard URL for ${card.key}:`,
                  url,
                );
              }
            }
          }

          // Handle marks with hrefs (links)
          if (item.marks) {
            item.marks.forEach((mark) => {
              if (mark.type === "link" && mark.attrs?.href) {
                const url = mark.attrs.href;
                if (prUrlPattern.test(url)) {
                  foundUrls.push(url);
                }
              }
            });
          }
        });
      });
    } else if (typeof comment.body === "string") {
      body = comment.body;
    }

    const bodyStr = String(body || "").trim();

    if (debug && bodyStr) {
      console.log(
        `\n[DEBUG] Comment text for ${card.key}:`,
        bodyStr.substring(0, 200),
      );
    }

    // Match URLs from text content
    const matches = bodyStr.match(prUrlPattern);
    if (matches) {
      if (debug) {
        console.log(`[DEBUG] Found PR URLs in text:`, matches);
      }
      foundUrls.push(...matches);
    }

    // Add all found URLs
    prUrls.push(...foundUrls);
  });

  // Return unique URLs (normalized to lowercase and https for comparison)
  const uniqueUrls = [
    ...new Set(
      prUrls.map((url) => url.toLowerCase().replace(/^http:\/\//, "https://")),
    ),
  ];

  if (debug && uniqueUrls.length > 0) {
    console.log(`[DEBUG] Total unique PR URLs for ${card.key}:`, uniqueUrls);
  }

  return uniqueUrls;
}

// Find PR by URL
function findPRByUrl(prUrl, allPRs) {
  const normalizedUrl = prUrl.toLowerCase().replace(/^http:\/\//, "https://");
  return allPRs.find((pr) => pr.url === normalizedUrl);
}

// Find all PRs that match the card key in branch name
function findPRsByCardKey(cardKey, allPRs) {
  return allPRs.filter((pr) => pr.branch.includes(cardKey));
}

// Validate a single card
function validateCard(card, allPRs, debug = false) {
  const cardKey = card.key;
  const cardTitle = card.fields.summary;
  const assigneeName = card.fields.assignee?.displayName || "Unassigned";

  // Find PRs from comments
  const commentUrls = extractPRUrlsFromComments(card, debug);
  const commentPRs = commentUrls
    .map((url) => findPRByUrl(url, allPRs))
    .filter((pr) => pr !== undefined);

  // Find PRs from branch names
  const branchPRs = findPRsByCardKey(cardKey, allPRs);

  // Combine all PRs (remove duplicates by URL)
  const allRelatedPRs = [...commentPRs];
  branchPRs.forEach((branchPR) => {
    if (!allRelatedPRs.find((pr) => pr.url === branchPR.url)) {
      allRelatedPRs.push(branchPR);
    }
  });

  // Check for PRs that were in comments but not found
  const notFoundUrls = commentUrls.filter((url) => !findPRByUrl(url, allPRs));

  // Categorize PRs
  const openPRs = allRelatedPRs.filter((pr) => pr.state === "open");
  const mergedPRs = allRelatedPRs.filter((pr) => pr.merged);
  const closedNotMergedPRs = allRelatedPRs.filter(
    (pr) => pr.state === "closed" && !pr.merged,
  );

  // Determine card status
  let cardStatus = "unknown";
  let statusIcon = "❓";

  if (allRelatedPRs.length === 0 && notFoundUrls.length === 0) {
    cardStatus = "no-prs";
    statusIcon = "❓";
  } else if (
    allRelatedPRs.length > 0 &&
    openPRs.length === 0 &&
    allRelatedPRs.every((pr) => pr.merged)
  ) {
    cardStatus = "all-merged";
    statusIcon = "🟣";
  } else if (openPRs.length > 0) {
    cardStatus = "has-open";
    statusIcon = "🟢";
  } else {
    cardStatus = "mixed";
    statusIcon = "⚠️";
  }

  if (debug) {
    console.log(
      `[DEBUG] ${cardKey}: Found ${allRelatedPRs.length} PRs (${openPRs.length} open, ${mergedPRs.length} merged)`,
    );
  }

  return {
    cardKey,
    cardTitle,
    assigneeName,
    cardStatus,
    statusIcon,
    allRelatedPRs,
    openPRs,
    mergedPRs,
    closedNotMergedPRs,
    notFoundUrls,
    commentPRs,
    branchPRs,
  };
}

// ============= UPDATE FUNCTIONS =============

async function updateMergedCards(mergedCards) {
  if (mergedCards.length === 0) {
    console.log("\n✨ No cards to update - no fully merged cards found\n");
    return { success: [], failed: [] };
  }

  const targetStatus = "IR-DA"; // Dev in Review -> Dev Approved transition

  console.log("\n" + "=".repeat(120));
  console.log("🔄 UPDATING CARD STATUS");
  console.log("=".repeat(120));
  console.log(
    `\nMoving ${mergedCards.length} card(s) to "${targetStatus}" status...\n`,
  );

  const results = {
    success: [],
    failed: [],
  };

  for (const card of mergedCards) {
    try {
      console.log(`  🔄 Updating [${card.cardKey}]...`);
      await updateCardStatus(card.cardKey, targetStatus);
      console.log(`  ✅ [${card.cardKey}] → ${targetStatus}`);
      results.success.push(card);
    } catch (error) {
      console.log(`  ❌ [${card.cardKey}] Failed: ${error.message}`);
      results.failed.push({ card, error: error.message });
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log("📊 UPDATE SUMMARY");
  console.log("=".repeat(120));
  console.log(`\n  ✅ Successfully updated: ${results.success.length}`);
  console.log(`  ❌ Failed to update: ${results.failed.length}\n`);

  if (results.success.length > 0) {
    console.log(`  Successfully moved to ${targetStatus}:`);
    results.success.forEach((card) => {
      console.log(`    • [${card.cardKey}] ${card.cardTitle}`);
    });
    console.log();
  }

  if (results.failed.length > 0) {
    console.log("  Failed updates:");
    results.failed.forEach(({ card, error }) => {
      console.log(`    • [${card.cardKey}] ${card.cardTitle}`);
      console.log(`      Error: ${error}`);
    });
    console.log();
  }

  return results;
}

// ============= DISPLAY FUNCTIONS =============

function displayResults(results, debug = false, showAllUsers = false) {
  console.log("\n" + "=".repeat(120));
  console.log("📊 VALIDATION RESULTS");
  console.log("=".repeat(120));
  console.log();

  // Table header
  const keyWidth = 15;
  const titleWidth = showAllUsers ? 40 : 50;
  const statusWidth = 12;
  const assigneeWidth = showAllUsers ? 20 : 0;
  const prEmojiWidth = 30;

  console.log(
    padRight("Status", statusWidth) +
      padRight("Card ID", keyWidth) +
      padRight("Title", titleWidth) +
      (showAllUsers ? padRight("Assignee", assigneeWidth) : "") +
      padRight("PR Status", prEmojiWidth),
  );
  console.log("-".repeat(120));

  // Display all cards
  results.forEach((result) => {
    const key = `[${result.cardKey}]`;
    const title = truncate(result.cardTitle, titleWidth - 1);
    const assignee = showAllUsers
      ? truncate(result.assigneeName || "Unassigned", assigneeWidth - 1)
      : "";

    // Create emoji visualization
    const openEmojis = "🟢 ".repeat(result.openPRs.length);
    const mergedEmojis = "🟣 ".repeat(result.mergedPRs.length);
    const closedEmojis =
      result.closedNotMergedPRs.length > 0
        ? "❌ ".repeat(result.closedNotMergedPRs.length)
        : "";
    const notFoundEmojis =
      result.notFoundUrls.length > 0
        ? "❓ ".repeat(result.notFoundUrls.length)
        : "";

    let prStatus = openEmojis + mergedEmojis + closedEmojis + notFoundEmojis;
    if (prStatus === "") {
      prStatus = "❓ (no PRs found)";
    }

    console.log(
      padRight(result.statusIcon, statusWidth) +
        padRight(key, keyWidth) +
        padRight(title, titleWidth) +
        (showAllUsers ? padRight(assignee, assigneeWidth) : "") +
        prStatus.trim(),
    );

    // Show PR details
    if (result.openPRs.length > 0) {
      console.log(`  └─ 🟢 Open PRs (${result.openPRs.length}):`);
      result.openPRs.forEach((pr) => {
        const inComment = result.commentPRs.includes(pr);
        const inBranch = result.branchPRs.includes(pr);
        let source = "";
        if (inComment && inBranch) {
          source = "(from comment + branch match)";
        } else if (inComment) {
          source = "(from comment)";
        } else {
          source = "(from branch match)";
        }
        console.log(`     • ${pr.url} ${source}`);
      });
    }

    if (result.mergedPRs.length > 0) {
      console.log(`  └─ 🟣 Merged PRs (${result.mergedPRs.length}):`);
      result.mergedPRs.forEach((pr) => {
        const inComment = result.commentPRs.includes(pr);
        const inBranch = result.branchPRs.includes(pr);
        let source = "";
        if (inComment && inBranch) {
          source = "(from comment + branch match)";
        } else if (inComment) {
          source = "(from comment)";
        } else {
          source = "(from branch match)";
        }
        const mergedDate = pr.mergedAt
          ? new Date(pr.mergedAt).toLocaleDateString()
          : "";
        console.log(
          `     • ${pr.url} ${source} ${
            mergedDate ? `- merged ${mergedDate}` : ""
          }`,
        );
      });
    }

    if (result.closedNotMergedPRs.length > 0) {
      console.log(
        `  └─ ❌ Closed (not merged) PRs (${result.closedNotMergedPRs.length}):`,
      );
      result.closedNotMergedPRs.forEach((pr) => {
        console.log(`     • ${pr.url}`);
      });
    }

    if (result.notFoundUrls.length > 0) {
      console.log(
        `  └─ ❓ PRs not found in recent data (${result.notFoundUrls.length}):`,
      );
      result.notFoundUrls.forEach((url) => {
        console.log(`     • ${url}`);
      });
    }

    if (result.allRelatedPRs.length === 0 && result.notFoundUrls.length === 0) {
      console.log(
        `  └─ ❓ No PRs found (no PR links in comments, no matching branch names)`,
      );
    }

    console.log();
  });

  // Categorized lists
  console.log("\n" + "=".repeat(120));
  console.log("🟣 LIST OF FULLY MERGED CARDS");
  console.log("=".repeat(120));

  const mergedCards = results.filter((r) => r.cardStatus === "all-merged");

  if (mergedCards.length > 0) {
    console.log(
      `\n${mergedCards.length} card(s) with all PRs merged - ready to move to next status:\n`,
    );
    mergedCards.forEach((r) => {
      console.log(`🟣 [${r.cardKey}] ${r.cardTitle}`);
      console.log(`   📋 ${JIRA_BASE_URL}/browse/${r.cardKey}`);
      console.log(`   ✅ All ${r.mergedPRs.length} PR(s) merged`);
      r.mergedPRs.forEach((pr) => {
        console.log(`      • ${pr.url}`);
      });
      console.log();
    });
  } else {
    console.log("\n✨ No cards with all PRs merged\n");
  }

  console.log("\n" + "=".repeat(120));
  console.log("❓ LIST OF CARDS MISSING PRs");
  console.log("=".repeat(120));

  const missingPRCards = results.filter((r) => r.cardStatus === "no-prs");

  if (missingPRCards.length > 0) {
    console.log(
      `\n${missingPRCards.length} card(s) with no PRs found - may need attention:\n`,
    );
    missingPRCards.forEach((r) => {
      console.log(`❓ [${r.cardKey}] ${r.cardTitle}`);
      console.log(`   📋 ${JIRA_BASE_URL}/browse/${r.cardKey}`);
      console.log(
        `   ⚠️  No PR links in comments and no matching branch names found`,
      );
      console.log();
    });
  } else {
    console.log("\n✨ All cards have associated PRs\n");
  }

  // Summary
  console.log("\n" + "=".repeat(120));
  console.log("📈 SUMMARY");
  console.log("=".repeat(120));

  const totalCards = results.length;
  const hasOpenPRs = results.filter((r) => r.openPRs.length > 0).length;
  const allMergedCards = mergedCards.length;
  const missingCards = missingPRCards.length;
  const mixedCards = results.filter((r) => r.cardStatus === "mixed").length;

  console.log(`\n  📊 Total cards: ${totalCards}`);
  console.log(`  🟢 Cards with open PRs: ${hasOpenPRs}`);
  console.log(`  🟣 Cards with all PRs merged: ${allMergedCards}`);
  console.log(`  ❓ Cards missing PRs: ${missingCards}`);
  if (mixedCards > 0) {
    console.log(`  ⚠️  Cards with mixed status: ${mixedCards}`);
  }
  console.log();
}

// Helper functions for formatting
function padRight(str, length) {
  return str.length >= length
    ? str.substring(0, length)
    : str + " ".repeat(length - str.length);
}

function truncate(str, length) {
  return str.length > length ? str.substring(0, length - 3) + "..." : str;
}

// ============= MAIN =============

async function main() {
  try {
    const startTime = Date.now();

    // Check for flags
    const debug =
      process.argv.includes("--debug") || process.env.DEBUG === "true";
    const updateMode =
      process.argv.includes("-u") || process.argv.includes("--update");
    const showAllUsers =
      process.argv.includes("-a") || process.argv.includes("--all");

    if (debug) {
      console.log("🐛 Debug mode enabled\n");
    }

    if (updateMode) {
      console.log(
        "🔄 Update mode enabled - will move merged cards to IR-DA status\n",
      );
    }

    if (showAllUsers) {
      console.log("🌐 All users mode - showing cards for everyone\n");
    }

    // Validate environment variables
    if (!GITHUB_TOKEN) {
      console.error("❌ Error: GITHUB_TOKEN is not set in .env file");
      return;
    }

    if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
      console.error("❌ Error: Jira credentials are not set in .env file");
      return;
    }

    console.log("🚀 Starting validation process...\n");
    console.log("=".repeat(120));
    console.log();

    // Fetch GitHub PRs and Jira cards in parallel for maximum speed
    const [allPRs, cards] = await Promise.all([
      getAllPRs(),
      getDevInReviewCards(showAllUsers),
    ]);

    const fetchTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⚡ Data fetched in ${fetchTime}s\n`);

    if (debug) {
      console.log("\n[DEBUG] All PR branches:");
      allPRs.forEach((pr) => {
        const status =
          pr.state === "open"
            ? "🟢 OPEN"
            : pr.merged
              ? "🟣 MERGED"
              : "❌ CLOSED";
        console.log(`  • ${status} ${pr.repo}: ${pr.branch} -> ${pr.url}`);
      });
      console.log();
    }

    if (cards.length === 0) {
      console.log("✨ No cards found with status 'DEV IN REVIEW'");
      return;
    }

    // Validate each card
    console.log("🔍 Validating cards...\n");
    const results = cards.map((card) => validateCard(card, allPRs, debug));

    // Display results
    displayResults(results, debug, showAllUsers);

    // Update mode: move fully merged cards to IR-DA
    let updateResults = null;
    if (updateMode) {
      const mergedCards = results.filter((r) => r.cardStatus === "all-merged");

      if (mergedCards.length > 0) {
        updateResults = await updateMergedCards(mergedCards);
      } else {
        console.log("\n✨ No fully merged cards to update\n");
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⚡ Total execution time: ${totalTime}s`);

    // Final summary of updated cards
    if (updateResults && updateResults.success.length > 0) {
      console.log("\n" + "=".repeat(120));
      console.log("✅ FINAL: CARDS MOVED TO IR-DA STATUS");
      console.log("=".repeat(120));
      console.log();
      updateResults.success.forEach((card) => {
        console.log(`✅ [${card.cardKey}] ${card.cardTitle}`);
        console.log(`   📋 ${JIRA_BASE_URL}/browse/${card.cardKey}`);
        console.log(`   🎯 Status: DEV IN REVIEW → IR-DA`);
        console.log(`   🟣 All ${card.mergedPRs.length} PR(s) merged:`);
        card.mergedPRs.forEach((pr) => {
          console.log(`      • ${pr.url}`);
        });
        console.log();
      });
      console.log("=".repeat(120));
      console.log(
        `🎉 Successfully moved ${updateResults.success.length} card(s) to IR-DA status!`,
      );
      console.log("=".repeat(120));
      console.log();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

main().catch(console.error);
