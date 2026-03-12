import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

export interface AppConfig {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  githubToken: string;
  repos: string[];
}

const CONFIG_DIR = path.join(os.homedir(), ".jira-card-validator");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_REPOS: string[] = [
  "ChameleonCollective/CollectiveOSMultiTenant",
  "ChameleonCollective/CollectiveOSMultiTenantExpressBE",
  "ChameleonCollective/MultitenantSignUpService",
  "ChameleonCollective/CollectiveOSExpressBE",
  "ChameleonCollective/CollectiveOS",
  "ChameleonCollective/CollectiveOSMultiTenantSST",
];

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AppConfig | null {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  fs.chmodSync(CONFIG_FILE, 0o600);
}

export function getRepos(config: AppConfig | null): string[] {
  return config?.repos?.length ? config.repos : DEFAULT_REPOS;
}

export function validateConfig(config: AppConfig | null): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!config) return { valid: false, missing: ["all — run: jira-card-validator configure"] };
  if (!config.jiraBaseUrl) missing.push("JIRA_BASE_URL");
  if (!config.jiraEmail) missing.push("JIRA_EMAIL");
  if (!config.jiraApiToken) missing.push("JIRA_API_TOKEN");
  if (!config.githubToken) missing.push("GITHUB_TOKEN");
  return { valid: missing.length === 0, missing };
}

function prompt(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function promptSecret(rl: readline.Interface, question: string, currentValue = ""): Promise<string> {
  const masked = currentValue ? "••••" + currentValue.slice(-4) : "";
  const suffix = masked ? ` [${masked}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || currentValue);
    });
  });
}

export async function runConfigure(): Promise<void> {
  const existing = loadConfig() || ({} as Partial<AppConfig>);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Jira Card Validator — Configuration");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("  Press Enter to keep the current value.\n");

  const jiraBaseUrl = await prompt(rl, "  Jira Base URL", existing.jiraBaseUrl || "https://collectiveos.atlassian.net");
  const jiraEmail = await prompt(rl, "  Jira Email", existing.jiraEmail || "");
  const jiraApiToken = await promptSecret(rl, "  Jira API Token", existing.jiraApiToken || "");
  const githubToken = await promptSecret(rl, "  GitHub Token", existing.githubToken || "");

  console.log(`\n  GitHub Repositories (comma-separated)`);
  console.log(`  Default: ${DEFAULT_REPOS.join(", ")}`);
  const reposInput = await prompt(rl, "  Repos", "");
  const repos = reposInput
    ? reposInput.split(",").map((r) => r.trim()).filter(Boolean)
    : existing.repos || DEFAULT_REPOS;

  rl.close();

  const config: AppConfig = {
    jiraBaseUrl,
    jiraEmail,
    jiraApiToken,
    githubToken,
    repos,
  };

  saveConfig(config);

  console.log(`\n  ✅ Configuration saved to ${CONFIG_FILE}`);
  console.log("  Run 'jira-card-validator' to start validating.\n");
}

export { CONFIG_FILE };
