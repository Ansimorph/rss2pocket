import { Toolkit } from "actions-toolkit";
import { info } from "@actions/core";
import * as artifact from "@actions/artifact";
import Parser from "rss-parser";
import rimraf from "rimraf";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import axios from "axios";

const parser = new Parser();

interface Inputs {
  feeds: string;
  pocket_consumer_key: string;
  pocket_access_token: string;
  [key: string]: string;
}

const WORKDIR = join(process.cwd(), "_persist_action_dir");
const FILE_NAME = "lastSuccessfulUpdate.txt";
const ARTIFACT = "lastSuccessfulUpdate";
// If no timestamp for past runs is there, one week ago is set
const DEFAULT_TIMESPAN = 7 * 24 * 60 * 60 * 1000;

async function storeSuccessDate(date: number) {
  var client = artifact.create();
  const file = join(WORKDIR, FILE_NAME);

  // cleanup old directories if needed
  rimraf.sync(WORKDIR);
  mkdirSync(WORKDIR);

  writeFileSync(file, date.toString(), { encoding: "utf8" });
  await client.uploadArtifact(ARTIFACT, [file], process.cwd());
}

async function loadSuccessDate(): Promise<number> {
  var client = artifact.create();

  // cleanup old directories if needed
  rimraf.sync(WORKDIR);
  mkdirSync(WORKDIR);

  try {
    const file = join(WORKDIR, FILE_NAME);
    await client.downloadArtifact(ARTIFACT);
    return Date.parse(readFileSync(file, { encoding: "utf8" }).toString());
  } catch (error) {
    return Date.now() - DEFAULT_TIMESPAN;
  }
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
  const currentTime = Date.now();

  if (!feeds || feeds.length === 0) {
    throw new Error("No feeds found");
  }

  info(`Last successful update at: ${new Date(lastSuccessfulUpdate).toUTCString()}`);

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

  storeSuccessDate(currentTime);
});
