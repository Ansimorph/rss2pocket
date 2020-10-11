# RSS to README Action
A GitHub Action that reads RSS feeds and adds them to your pocket queue

---

## Usage

You can use this action in a workflow file like any other:
See https://www.jamesfmackenzie.com/getting-started-with-the-pocket-developer-api/ on how to get access token and consumer key

```yml
name: Update this repo's README

on:
  schedule:
    # Every 2 hours
    - cron: 0 */2 * * *

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: Ansimorph/rss-to-pocket@v1
        with:
          feeds: https://jasonet.co/rss.xml, https://www.smashingmagazine.com/feed/
          pocket_consumer_key: SECRET
          pocket_access_token: SECRET

```

> Based on work by Brian Lovin and Jason Octo
