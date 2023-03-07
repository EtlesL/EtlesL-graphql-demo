//import graphql from "@octokit/graphql";
import { graphql } from "@octokit/graphql";
import fs from "fs";
import csvWriter from "csv-writer";


//create a client of graphql with base url
const client = graphql.defaults({
    baseUrl: "https://api.github.com",
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
});
// console.log(await getRateLimit(client))

// console.log(await getReposCount(60, 400000))

//call the function to get the repositories
let baseCount = 60;
let minCount = 60;
let maxCount = 61;
while (maxCount >= baseCount) {
    //get the repoCount from client, if throw errors, wait 5 seconds and retry for 3 times
    let repoCount;
    for (let i = 0; i < 3; i++) {
        try {
            repoCount = await getReposCount(minCount, maxCount);
            break;
        } catch (e) {
            console.log(e);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
    console.log(`There are ${repoCount} repositories with stars between ${minCount} and ${maxCount}.`);
    if (repoCount <= 1000) {
        await getRepos(minCount, maxCount);
        maxCount = minCount -1;
        minCount = baseCount;
    } else {
        minCount = Math.floor((minCount + maxCount) / 2);
    }
}

async function getReposCount(minCount, maxCount) {
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

async function getRepos(minCount, maxCount) {
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
