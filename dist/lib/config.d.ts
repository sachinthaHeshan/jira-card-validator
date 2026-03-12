export interface AppConfig {
    jiraBaseUrl: string;
    jiraEmail: string;
    jiraApiToken: string;
    githubToken: string;
    repos: string[];
}
declare const CONFIG_FILE: string;
export declare function loadConfig(): AppConfig | null;
export declare function saveConfig(config: AppConfig): void;
export declare function getRepos(config: AppConfig | null): string[];
export declare function validateConfig(config: AppConfig | null): {
    valid: boolean;
    missing: string[];
};
export declare function runConfigure(): Promise<void>;
export { CONFIG_FILE };
//# sourceMappingURL=config.d.ts.map