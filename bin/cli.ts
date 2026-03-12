#!/usr/bin/env node

import {
  loadConfig,
  validateConfig,
  getRepos,
  runConfigure,
} from "../lib/config.js";
import { run } from "../lib/validate.js";

const args = process.argv.slice(2);

if (args.includes("configure") || args.includes("--configure")) {
  await runConfigure();
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  jira-card-validator — Validate Jira card statuses against GitHub PR states

  Usage:
    jira-card-validator [options]
    jira-card-validator configure

  Commands:
    configure          Set up Jira & GitHub credentials interactively

  Options:
    -u, --update       Auto-transition fully merged cards to IR-DA status
    -a, --all          Show cards for all users (not just yours)
    --debug            Enable debug logging
    -h, --help         Show this help message
  `);
  process.exit(0);
}

const config = loadConfig();
const validation = validateConfig(config);

if (!validation.valid) {
  console.error("❌ Missing configuration:");
  for (const m of validation.missing) {
    console.error(`   • ${m}`);
  }
  console.error("\nRun: jira-card-validator configure\n");
  process.exit(1);
}

const debug = args.includes("--debug");
const update = args.includes("-u") || args.includes("--update");
const showAllUsers = args.includes("-a") || args.includes("--all");

await run({
  debug,
  update,
  showAllUsers,
  config: { ...config!, repos: getRepos(config) },
});
