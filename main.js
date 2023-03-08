//import graphql from "@octokit/graphql";
import { graphql } from "@octokit/graphql";
import { getReposCount, getRepos, getRateLimit, getAddDel } from "./queries.js" ;


//create a client of graphql with base url
const client = graphql.defaults({
    baseUrl: "https://api.github.com",
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
});
// console.log(await getRateLimit(client))

// console.log(await getReposCount(client, 60, 400000))

//call the function to get the repositories
// let baseCount = 60;
// let minCount = 60;
// let maxCount = 100;
// while (maxCount >= baseCount) {
//     //get the repoCount from client, if throw errors, wait 5 seconds and retry for 3 times
//     let repoCount;
//     for (let i = 0; i < 3; i++) {
//         try {
//             repoCount = await getReposCount(client, minCount, maxCount);
//             break;
//         } catch (e) {
//             console.log(e);
//             await new Promise((resolve) => setTimeout(resolve, 5000));
//         }
//     }
//     console.log(`There are ${repoCount} repositories with stars between ${minCount} and ${maxCount}.`);
//     if (repoCount <= 1000) {
//         await getRepos(client, minCount, maxCount);
//         maxCount = minCount -1;
//         minCount = baseCount;
//     } else {
//         minCount = Math.floor((minCount + maxCount) / 2);
//     }
// }




