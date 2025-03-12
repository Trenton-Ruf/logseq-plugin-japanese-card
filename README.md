# logseq-plugin-japanese-card

This is a fork of 0xRichardH/logseq-plugin-vocabulary-card.

A logseq plugin for creating Japanese to English vocabulary and grammar cards. This plugin uses the Gemini AI API and the Google TTS API to generate the cards.

## Demo

![demo](./demo.gif)

## Usage

### Build

```bash
just build
```

### Add plugin to logseq
- Click the three-dots menu, go to Settings and turn on Developer Mode. After that, there will be a plugins button inside the menu. Click it to go to the plugin list page.
- In the plugin list page, click Load unpacked plugin and choose the `logseq-plugin-japanese-card/plugin/` folder. 