import type { AppConfig } from "./config.js";
export interface PullRequest {
    repo: string;
    number: number;
    title: string;
    branch: string;
    url: string;
    author: string;
    draft: boolean;
    state: "open" | "closed";
    merged: boolean;
    mergedAt?: string | null;
}
interface JiraCommentMark {
    type: string;
    attrs?: {
        href?: string;
    };
}
interface JiraCommentContentItem {
    text?: string;
    type?: string;
    attrs?: {
        url?: string;
    };
    marks?: JiraCommentMark[];
}
interface JiraCommentContentBlock {
    content?: JiraCommentContentItem[];
}
interface JiraComment {
    body?: {
        content?: JiraCommentContentBlock[];
    } | string;
}
export interface JiraCard {
    key: string;
    fields: {
        summary: string;
        status?: {
            name: string;
        };
        issuetype?: {
            name: string;
        };
        assignee?: {
            displayName: string;
        } | null;
        created?: string;
        updated?: string;
        comment?: {
            comments: JiraComment[];
        };
    };
}
export type CardStatus = "unknown" | "no-prs" | "all-merged" | "has-open" | "mixed";
export interface ValidationResult {
    cardKey: string;
    cardTitle: string;
    assigneeName: string;
    cardStatus: CardStatus;
    statusIcon: string;
    allRelatedPRs: PullRequest[];
    openPRs: PullRequest[];
    mergedPRs: PullRequest[];
    closedNotMergedPRs: PullRequest[];
    notFoundUrls: string[];
    commentPRs: PullRequest[];
    branchPRs: PullRequest[];
}
interface RunOptions {
    debug?: boolean;
    update?: boolean;
    showAllUsers?: boolean;
    config: AppConfig;
}
export declare function run({ debug, update, showAllUsers, config }: RunOptions): Promise<void>;
export {};
//# sourceMappingURL=validate.d.ts.map