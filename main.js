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
//call the function to get the repositories
await getRepos();


async function getRepos() {
    //create a function to get the public 100 java repositories with most stars
    const query = `query getRepos($cursor: String) {
        search(query: "language:java stars:>10000", type: REPOSITORY, first: 100, after: $cursor) {
            repositoryCount
            pageInfo {
                endCursor
                hasNextPage
            }
            edges {
                node {
                    ... on Repository {
                        nameWithOwner
                        description
                        stargazers {
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
        const result = await client(query, {
            cursor: endCursor,
        });

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

            repoList.push({
                nameWithOwner: repo.nameWithOwner,
                description: repo.description,
                stars: repo.stargazers.totalCount,
            });
        }

        console.log(`Got ${repoCount} repositories...`);
    }

    console.log(`Got ${repoCount} repositories in total.`);

    console.log(`Got ${orgList.length} organizations in total.`);

    console.log(`Got ${repoList.length} repositories in total.`);

    //write the owners of the repositories to orgList.txt
    fs.writeFileSync("orgList.txt", orgList.join("\n"));
    console.log("orgList.txt written.");

    //write the repositories information to repoList.csv
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    const objectCsvWriter = createCsvWriter({
        path: "repoList.csv",
        header: [
            { id: "nameWithOwner", title: "NameWithOwner" },
            { id: "stars", title: "Stars" },
            { id: "description", title: "Description" },
        ],
    });
    objectCsvWriter.writeRecords(repoList).then(() => {
        console.log("repoList.csv written.");
    });
}

