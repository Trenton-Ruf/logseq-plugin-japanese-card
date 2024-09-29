import * as wasm from "logseq-plugin-vocabulary-card";
import "@logseq/libs"

async function main() {
  logseq.useSettingsSchema([{
    key: "gemini_ai_api_key",
    description: "Gemini AI API Key",
    type: "string",
    default: "",
    title: "API key for Gemini AI, you can get it from https://ai.google.dev/",
  }, {
    key: "custom_tags_vocab",
    description: "Custom tags for vocab",
    type: "string",
    default: "#words",
    title: "Custom tags for vocabulary card",
  }, {
    key: "custom_tags_grammar",
    description: "Custom tags for grammar",
    type: "string",
    default: "#grammar",
    title: "Custom tags for grammar card",
  }]),

  logseq.Editor.registerSlashCommand(
    '📙 Generate Vocabulary Card',
    async () => {
      const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
      if (!gemini_ai_api_key) {
        logseq.App.showMsg("Please set Gemini AI API Key first")
        return
      }
      const custom_tags = logseq.settings["custom_tags_vocab"]

      const { content, uuid } = await logseq.Editor.getCurrentBlock()
      await logseq.Editor.updateBlock(uuid, `${content} loading...`)

      try {
        const word = await wasm.define_word(content, gemini_ai_api_key)
        await logseq.Editor.updateBlock(uuid, `${word.word} #card ${custom_tags}`);
        await logseq.Editor.insertBlock(uuid, `*${word.pronunciation}*`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `**${word.definition}**`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `**Example:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `${word.examples[0]}`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `${word.examples[1]}`, { before: false, sibling: false, focus: false, isPageBlock: false })
      } catch (e) {
        await logseq.Editor.updateBlock(uuid, `${content}`)
        console.log(e)
        logseq.App.showMsg("Failed to generate vocabulary card." + e)
      }
    },
  )


  logseq.Editor.registerSlashCommand(
    '📙 Generate grammar Card',
    async () => {
      const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
      if (!gemini_ai_api_key) {
        logseq.App.showMsg("Please set Gemini AI API Key first")
        return
      }
      const custom_tags = logseq.settings["custom_tags_grammar"]

      const { content, uuid } = await logseq.Editor.getCurrentBlock()
      await logseq.Editor.updateBlock(uuid, `${content} loading...`)

      try {
        const sentence = await wasm.define_sentence(content, gemini_ai_api_key)
        await logseq.Editor.updateBlock(uuid, `${sentence.sentence} #card ${custom_tags}`);
        await logseq.Editor.insertBlock(uuid, `*${sentence.translation}*`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `**Explanation:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `${sentence.explanation[0]}`, { before: false, sibling: false, focus: false, isPageBlock: false })
        await logseq.Editor.insertBlock(uuid, `${sentence.explanation[1]}`, { before: false, sibling: false, focus: false, isPageBlock: false })
        //await logseq.Editor.insertBlock(uuid, `${sentence.explanation[2]}`, { before: false, sibling: false, focus: false, isPageBlock: false })
      } catch (e) {
        await logseq.Editor.updateBlock(uuid, `${content}`)
        console.log(e)
        logseq.App.showMsg("Failed to generate grammar card." + e)
      }
    },
  )



}

// bootstrap
logseq.ready(main).catch(console.error)
