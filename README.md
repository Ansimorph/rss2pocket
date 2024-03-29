# RSS to Pocket Action
A GitHub Action that reads RSS feeds and adds them to your pocket queue

---

## Usage

See https://www.jamesfmackenzie.com/getting-started-with-the-pocket-developer-api/ on how to get access token and consumer key for pocket

```yml
name: Push that RSS to pocket

on:
  schedule:
    # Every 2 hours
    - cron: 0 */2 * * *

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: Ansimorph/rss2pocket@v1.1
        with:
          feeds: https://jasonet.co/rss.xml, https://www.smashingmagazine.com/feed/
          pocket_consumer_key: ${{ secrets.CONSUMER_KEY }}
          pocket_access_token: ${{ secrets.ACCESS_TOKEN }}
          my_token: ${{ secrets.GITHUB_TOKEN }}
```

> Based on work by Brian Lovin and Jason Octo
