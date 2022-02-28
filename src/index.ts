import { Toolkit } from "actions-toolkit";
import { info, getInput } from "@actions/core";
import { getOctokit } from "@actions/github";
import Parser from "rss-parser";
import axios from "axios";

const parser = new Parser({ timeout: 20000 });

interface Inputs {
  feeds: string;
  pocket_consumer_key: string;
  pocket_access_token: string;
  my_token: string;
  [key: string]: string;
}

// If no timestamp for past runs is there, one week ago is set
const DEFAULT_TIMESPAN = Date.now() - 7 * 24 * 60 * 60 * 1000;

async function getWorkflowId(
  owner: string,
  repo: string,
  octokit: ReturnType<typeof getOctokit>
): Promise<number | undefined> {
  const { data: workflows } = await octokit.actions.listRepoWorkflows({
    owner: owner,
    repo: repo,
  });

  if (!workflows || workflows.total_count === 0) return;

  return workflows.workflows.filter(
    (workflow) => workflow.name === process.env.GITHUB_WORKFLOW
  )[0].id;
}

async function getMostRecentSucessfulRun(
  owner: string,
  repo: string,
  workflowId: number,
  octokit: ReturnType<typeof getOctokit>
): Promise<string> {
  const { data: runs } = await octokit.actions.listWorkflowRuns({
    owner: owner,
    repo: repo,
    workflow_id: workflowId,
  });

  return runs.workflow_runs.filter((run) => run.conclusion === "success")[0]
    .created_at;
}

async function loadSuccessDate(): Promise<number> {
  const myToken = getInput("my_token");
  const octokit = getOctokit(myToken);

  if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_WORKFLOW) {
    throw new Error("Unknown repository or workflow");
  }

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const workflowId = await getWorkflowId(owner, repo, octokit);

  if (!workflowId) return DEFAULT_TIMESPAN;

  const lastSuccessfulRun = await getMostRecentSucessfulRun(
    owner,
    repo,
    workflowId,
    octokit
  );

  return Date.parse(lastSuccessfulRun);
}

async function addToPocket(
  url: String,
  consumerKey: String,
  accessToken: String
) {
  info(`adding url: ${url}`);

  axios
    .post("https://getpocket.com/v3/add", {
      url: url,
      consumer_key: consumerKey,
      access_token: accessToken,
    })
    .catch(function (error) {
      throw new Error(`Cannot save article to pocket: ${error}`);
    });
}

Toolkit.run<Inputs>(async (tools) => {
  const lastSuccessfulUpdate = await loadSuccessDate();
  const feeds = tools.inputs["feeds"].split(/,\s*/);

  if (!feeds || feeds.length === 0) {
    throw new Error("No feeds found");
  }

  info(
    `Last successful update at: ${new Date(lastSuccessfulUpdate).toUTCString()}`
  );

  for (let feed of feeds) {
    const rssFeed = await parser.parseURL(feed);

    if (!rssFeed.items) {
      throw new Error(`No items in feed: ${feed}`);
    }

    info(`polling feed: ${feed}, ${rssFeed.items.length} items found`);

    for (let item of rssFeed.items) {
      if (!item.isoDate || !item.link) {
        info(`No date or link found in item: ${item.isoDate}, ${item.link}}`);
        continue;
      }

      const itemDate = Date.parse(item.isoDate);

      if (itemDate > lastSuccessfulUpdate) {
        addToPocket(
          item.link,
          tools.inputs["pocket_consumer_key"],
          tools.inputs["pocket_access_token"]
        );
      }
    }
  }
});
