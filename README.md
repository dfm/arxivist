# The ArXivist

This browser extension reorders the listings at [arXiv.org](https://arxiv.org) based on your browsing history.
It keeps track of the papers that you have clicked on previously and it moves the "similar" papers to the top of the pile.

_Note: your history is only stored in local storage on your local computer and it is never communicated to an external server._

## Installation

You can install arxivist as a ~[Chrome extension](https://chrome.google.com/webstore/detail/arxivist/fmnaemfbhjjgdokfgboolpjhnfcdaime)~ or [Firefox add-on](https://addons.mozilla.org/en-US/firefox/addon/arxivist/).
_Note: this extension has been removed from the Chrome web store because it didn't have a screenshot. I'll try to get it re-submitted, but until then, Chrome users should follow the developer instructions below._

## Developer installation

You can install the development version by:

1. Cloning the GitHub repository,
2. Running `./zip_extension.sh` in the repository root, to generate a `manifest.json` file,
3. Navigating to [chrome://extensions](chrome://extensions), turning on "developer mode", and
4. Loading the repository directory as an "unpacked extension".

![](https://github.com/dfm/arxivist/raw/master/arxivist.png?v=2)

## Releasing

To release a new version, update the version number in `manifest.json.template`, and then run:

```bash
./zip_extension.sh
```

Note that this will produce a v3 manifest compatible with Chrome. To generate the v2 version compatible with Firefox, run:

```bash
./zip_extension.sh v2
```
