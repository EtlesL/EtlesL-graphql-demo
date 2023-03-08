import fs from "fs";
import csvWriter from "csv-writer";

async function getReposCount(client, minCount, maxCount) {
    //create a function to get the public repositories count with stars between minCount and maxCount
    const query = `query {
        search(query: "is:public language:typescript stars:${minCount}..${maxCount}", type: REPOSITORY, first: 1) {
            repositoryCount
        }
    }`;

    const result = await client(query, {
        minCount: minCount,
        maxCount: maxCount
    });

    return result.search.repositoryCount;
    
}

async function getRepos(client, minCount, maxCount) {
    //create a function to get the public 100 java repositories with most stars
    //TODO add commits count 
    const query = `query getRepos($cursor: String) {
        search(query: "is:public language:typescript stars:${minCount}..${maxCount}", type: REPOSITORY, first: 30, after: $cursor) {
            repositoryCount
            pageInfo {
                endCursor
                hasNextPage
            }
            edges {
                node {
                    ... on Repository {
                        nameWithOwner
                        commitComments {
                            totalCount
                        }
                        createdAt
                        description
                        forks {
                            totalCount
                        }
                        isArchived
                        isDisabled
                        isEmpty
                        isFork
                        isInOrganization
                        isLocked
                        isMirror
                        isTemplate
                        isUserConfigurationRepository
                        issues {
                            totalCount
                        }
                        licenseInfo {
                            name
                        }
                        mentionableUsers {
                            totalCount
                        }
                        primaryLanguage {
                            name
                        }
                        pullRequests {
                            totalCount
                        }
                        pushedAt
                        refs(refPrefix: "refs/heads/") {
                            totalCount
                        }
                        releases {
                            totalCount
                        }
                        stargazerCount
                        updatedAt
                        watchers {
                            totalCount
                        }
                    }
                }
            }
        }
    }`;

    let hasNextPage = true;
    let endCursor = null;
    let repoCount = 0;

    let orgSet = new Set();
    let orgList = [];

    let repoList = [];

    while (hasNextPage) {
        //get the result from client, if throw errors, wait 5 seconds and retry for 3 times
        let result;
        for (let i = 0; i < 3; i++) {
            try {
                result = await client(query, {
                    cursor: endCursor,
                });
                break;
            } catch (e) {
                console.log(e);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }

        hasNextPage = result.search.pageInfo.hasNextPage;
        endCursor = result.search.pageInfo.endCursor;
        repoCount += result.search.edges.length;

        for (const e of result.search.edges) {
            const repo = e.node;
            const org = repo.nameWithOwner.split("/")[0];
            if (!orgSet.has(org)) {
                orgSet.add(org);
                orgList.push(org);
            }
            
            ///put edges node of result into repoList
            repoList.push({
                nameWithOwner: repo.nameWithOwner,
                stars: repo.stargazerCount,
                // contributors: repo.contributors.totalCount,
                commitComments: repo.commitComments.totalCount,
                createdAt: repo.createdAt,
                description: repo.description,
                forkCount: repo.forks.totalCount,
                isArchived: repo.isArchived,
                isDisabled: repo.isDisabled,
                isEmpty: repo.isEmpty,
                isFork: repo.isFork,
                isInOrganization: repo.isInOrganization,
                isLocked: repo.isLocked,
                isMirror: repo.isMirror,
                isTemplate: repo.isTemplate,
                isUserConfigurationRepository: repo.isUserConfigurationRepository,
                issues: repo.issues.totalCount,
                licenseInfo: repo.licenseInfo ? repo.licenseInfo.name : "",
                mentionableUsers: repo.mentionableUsers.totalCount,
                primaryLanguage: repo.primaryLanguage ? repo.primaryLanguage.name : "",
                pullRequests: repo.pullRequests.totalCount,
                pushedAt: repo.pushedAt,
                refs: repo.refs.totalCount,
                releases: repo.releases.totalCount,
                updatedAt: repo.updatedAt,
                watchers: repo.watchers.totalCount,
            });

        }

        console.log(`Got ${repoCount} repositories...`);
    }

    console.log(`Got ${repoCount} repositories in total.`);

    console.log(`Got ${orgList.length} organizations in total.`);

    console.log(`Got ${repoList.length} repositories in total.`);

    //write the owners of the repositories to orgList.txt
    fs.appendFileSync("orgList-typescript.txt", orgList.join("\n"));
    console.log("orgList.txt written.");

    //write the repositories information to repoList.csv
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    const objectCsvWriter = createCsvWriter({
        path: "repoList-typescript.csv",
        header: [
            // list all the items of repoList as id, then capital the first letter for title
            { id: "nameWithOwner", title: "NameWithOwner" },
            { id: "stars", title: "Stars" },
            // { id: "contributors", title: "Contributors" },
            { id: "commitComments", title: "CommitComments" },
            { id: "createdAt", title: "CreatedAt" },
            { id: "forkCount", title: "ForkCount" },
            { id: "isArchived", title: "IsArchived" },
            { id: "isDisabled", title: "IsDisabled" },
            { id: "isEmpty", title: "IsEmpty" },
            { id: "isFork", title: "IsFork" },
            { id: "isInOrganization", title: "IsInOrganization" },
            { id: "isLocked", title: "IsLocked" },
            { id: "isMirror", title: "IsMirror" },
            { id: "isTemplate", title: "IsTemplate" },
            { id: "isUserConfigurationRepository", title: "IsUserConfigurationRepository" },
            { id: "issues", title: "Issues" },
            { id: "licenseInfo", title: "LicenseInfo" },
            { id: "mentionableUsers", title: "MentionableUsers" },
            { id: "primaryLanguage", title: "PrimaryLanguage" },
            { id: "pullRequests", title: "PullRequests" },
            { id: "pushedAt", title: "PushedAt" },
            { id: "refs", title: "Refs" },
            { id: "releases", title: "Releases" },
            { id: "updatedAt", title: "UpdatedAt" },
            { id: "watchers", title: "Watchers" },
            { id: "description", title: "Description" },
        ],
        append: true,
    });
    objectCsvWriter.writeRecords(repoList).then(() => {
        console.log("repoList.csv written.");
    });
}

// create a function to get the rate limit of the client
async function getRateLimit(client) {
    const query = `query {
        rateLimit {
            limit
            cost
            remaining
            resetAt
        }
    }`;

    const result = await client(query);
    console.log(result.rateLimit);
}

//create a function to get the total adds and deletes by a user
async function getAddDel(client, userList, start, end) {
    const query = `query($user: String!, $start: DateTime!, $end: DateTime!) {
        user(login: $user) {
            contributionsCollection(from: $start, to: $end) {
                totalCommitContributions
                totalRepositoryContributions
                totalPullRequestContributions
                totalPullRequestReviewContributions
                totalRepositoriesWithContributedCommits
                totalRepositoriesWithContributedPullRequestReviews
                totalRepositoriesWithContributedPullRequests
                totalRepositoriesWithContributedIssues
                totalRepositoriesWithContributedCodeReviews
                totalIssueContributions
                commitContributionsByRepository {
                    repository {
                        nameWithOwner
                    }
                    contributions {
                        occurredAt
                        additions
                        deletions
                    }
                }
            }
        }
    }`;
    let userContributeList = [];
    for (let username of userList) {
        const result = await client(query, {
            user: username,
            start: start,
            end: end,
        });
        userContributeList.push({
            username: username,
            totalCommitContributions: result.user.contributionsCollection.totalCommitContributions,
            totalRepositoryContributions: result.user.contributionsCollection.totalRepositoryContributions,
            totalPullRequestContributions: result.user.contributionsCollection.totalPullRequestContributions,
            totalPullRequestReviewContributions: result.user.contributionsCollection.totalPullRequestReviewContributions,
            totalRepositoriesWithContributedCommits: result.user.contributionsCollection.totalRepositoriesWithContributedCommits,
            totalRepositoriesWithContributedPullRequestReviews: result.user.contributionsCollection.totalRepositoriesWithContributedPullRequestReviews,
            totalRepositoriesWithContributedPullRequests: result.user.contributionsCollection.totalRepositoriesWithContributedPullRequests,
            totalRepositoriesWithContributedIssues: result.user.contributionsCollection.totalRepositoriesWithContributedIssues,
            totalRepositoriesWithContributedCodeReviews: result.user.contributionsCollection.totalRepositoriesWithContributedCodeReviews,
            totalIssueContributions: result.user.contributionsCollection.totalIssueContributions,
            commitContributionsByRepository: result.user.contributionsCollection.commitContributionsByRepository,
        });
    }
    // write the user contribution information to userContributeList.csv
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    const objectCsvWriter = createCsvWriter({
        path: "userContributeList.csv",
        header: [
            { id: "username", title: "Username" },
            { id: "totalCommitContributions", title: "TotalCommitContributions" },
            { id: "totalRepositoryContributions", title: "TotalRepositoryContributions" },
            { id: "totalPullRequestContributions", title: "TotalPullRequestContributions" },
            { id: "totalPullRequestReviewContributions", title: "TotalPullRequestReviewContributions" },
            { id: "totalRepositoriesWithContributedCommits", title: "TotalRepositoriesWithContributedCommits" },
            { id: "totalRepositoriesWithContributedPullRequestReviews", title: "TotalRepositoriesWithContributedPullRequestReviews" },
            { id: "totalRepositoriesWithContributedPullRequests", title: "TotalRepositoriesWithContributedPullRequests" },
            { id: "totalRepositoriesWithContributedIssues", title: "TotalRepositoriesWithContributedIssues" },
            { id: "totalRepositoriesWithContributedCodeReviews", title: "TotalRepositoriesWithContributedCodeReviews" },
            { id: "totalIssueContributions", title: "TotalIssueContributions" },
            { id: "commitContributionsByRepository", title: "CommitContributionsByRepository" },
        ],
        append: true,
    });
    objectCsvWriter.writeRecords(userContributeList).then(() => {
        console.log("userContributeList.csv written.");
    });
}