import * as wasm from "logseq-plugin-japanese-card";
import "@logseq/libs"

function sanitizeText(text) {
  const specialCharsToRemove = /[\^\*\=\_]|\[.*?\]|\n/g;
  const sanitizedText = text.replace(specialCharsToRemove, '');
  console.log("sanitizedText:", sanitizedText);
  return sanitizedText
}


async function main() {

  logseq.useSettingsSchema([{
    key: "gemini_ai_api_key",
    description: "Gemini AI API Key",
    type: "string",
    default: "",
    title: "API key for Gemini AI, you can get it from https://ai.google.dev/",
  }, {
    key: "google_tts_api_key",
    description: "Google TTS API Key",
    type: "string",
    default: "",
    title: "API key for Google Text-to-Speech Enable the text-to-speech API and create a key here: https://console.cloud.google.com/apis/credentials",
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
  }])

  const save_path = "../assets/storages/logseq-plugin-japanese-card/"
  // TODO lots of repeated code under the 3 registerSlashCommand functions.
  // Separate into functions.
  

  logseq.Editor.registerSlashCommand(
    '📙 Generate Vocabulary Card',
    async () => {
      const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
      if (!gemini_ai_api_key) {
        logseq.App.showMsg("Please set Gemini AI API Key first")
        return
      }

      const google_tts_api_key = logseq.settings["google_tts_api_key"]
      if (!google_tts_api_key) {
        logseq.App.showMsg("Please set the Google TTS key first")
        return
      }

      const custom_tags = logseq.settings["custom_tags_vocab"]
      const { content, uuid } = await logseq.Editor.getCurrentBlock()
      await logseq.Editor.updateBlock(uuid, `${content} loading...`)

      try {
        const word = await wasm.define_word(content, gemini_ai_api_key)
        await logseq.Editor.updateBlock(uuid, `${word.word} #card ${custom_tags}`);
        await logseq.Editor.insertBlock(uuid, `*${word.pronunciation}*`, { before: false, sibling: false, focus: false, isPageBlock: false })
        for (const definition of word.definition) {
          await logseq.Editor.insertBlock(uuid, `${definition}`, { before: false, sibling: false, focus: false, isPageBlock: false });
        }

        // TTS Here
        const s = logseq.Assets.makeSandboxStorage()
        const audio = await wasm.synthesize_audio(word.word, google_tts_api_key)
        const audio_typedArray = new Uint8Array(audio);
        await s.setItem(content + `.mp3`, audio_typedArray) // save TTS
        await logseq.Editor.insertBlock(uuid, `![`+content+`.mp3](`+save_path+content+`.mp3)`, { before: false, sibling: false, focus: false, isPageBlock: false });

        const exampleBlock = await logseq.Editor.insertBlock(uuid, `**Examples:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
        for (const example of word.examples) {
          await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.japanese}`, { before: false, sibling: false, focus: false, isPageBlock: false });
          await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.english}`, { before: false, sibling: false, focus: false, isPageBlock: false });
        }

      } catch (e) {
        console.log(e)
        logseq.App.showMsg("Failed to generate vocabulary card." + e)
        await logseq.Editor.updateBlock(uuid, `${content}`)
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

      const google_tts_api_key = logseq.settings["google_tts_api_key"]
      if (!google_tts_api_key) {
        logseq.App.showMsg("Please set the Google TTS key first")
        return
      }
      const custom_tags = logseq.settings["custom_tags_grammar"]

      const { content, uuid } = await logseq.Editor.getCurrentBlock()
      await logseq.Editor.updateBlock(uuid, `${content} loading...`)

      try {
        const grammar = await wasm.define_grammar(content, gemini_ai_api_key)

        const s = logseq.Assets.makeSandboxStorage()

        await logseq.Editor.updateBlock(uuid, `${grammar.examples[0].japanese} #card ${custom_tags}`);
        await logseq.Editor.insertBlock(uuid, `${grammar.examples[0].english}`, { before: false, sibling: false, focus: false, isPageBlock: false })

        // TTS Here
        // Remove special chars from the audio and filename
        const sanitizedFilename = sanitizeText( grammar.examples[0].japanese )
        const audio = await wasm.synthesize_audio(sanitizedFilename, google_tts_api_key)
        const audio_typedArray = new Uint8Array(audio);
        await s.setItem(sanitizedFilename + `.mp3`, audio_typedArray)
        await logseq.Editor.insertBlock(uuid, `![`+sanitizedFilename+`.mp3](`+save_path+sanitizedFilename+`.mp3)`, { before: false, sibling: false, focus: false, isPageBlock: false });

        await logseq.Editor.insertBlock(uuid, grammar.grammar, { before: false, 
          sibling: false, focus: false, isPageBlock: false , properties: {'heading':'3', 'background-color':"pink"}}
        )
  
        const explanationBlock = await logseq.Editor.insertBlock(uuid, `**Explanation:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
        for (const explanation of grammar.explanations) {
            await logseq.Editor.insertBlock(explanationBlock.uuid, `${explanation}`, { before: false, sibling: false, focus: false, isPageBlock: false });
          }

        if (grammar.examples.length > 1 ){
          const exampleBlock = await logseq.Editor.insertBlock(uuid, `**Examples:**`, { before: false, sibling: false, focus: false, isPageBlock: false })

          for (let i = 1; i < grammar.examples.length; i++) {
            const example = grammar.examples[i];
            await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.japanese}`, { before: false, sibling: false, focus: false, isPageBlock: false });
            await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.english}`, { before: false, sibling: false, focus: false, isPageBlock: false });
          }
        }

      } catch (e) {
        console.log(e)
        logseq.App.showMsg("Failed to generate grammar card." + e)
        await logseq.Editor.updateBlock(uuid, `${content}`)
      }
    },
  )

  logseq.Editor.registerSlashCommand(
  '📙 Translate block',
    async () => {
      const google_tts_api_key = logseq.settings["google_tts_api_key"]
      if (!google_tts_api_key) {
        logseq.App.showMsg("Please set the Google TTS key first")
        return
      }

      const s = logseq.Assets.makeSandboxStorage()

      const { content, uuid } = await logseq.Editor.getCurrentBlock()
      await logseq.Editor.updateBlock(uuid, `${content} loading...`)

      try {

        const sanitizedContent = sanitizeText( content )
        const audio = await wasm.synthesize_audio(sanitizedContent, google_tts_api_key)
        const audio_typedArray = await new Uint8Array(audio);
        await s.setItem(sanitizedContent + `.mp3`, audio_typedArray) // save TTS
        await logseq.Editor.insertBlock(uuid, `![`+sanitizedContent+`.mp3](`+save_path+sanitizedContent+`.mp3)`, { before: false, sibling: false, focus: false, isPageBlock: false })
      } catch (e) {
        console.log(e)
        logseq.App.showMsg("Failed to generate vocabulary card." + e)
      }
      await logseq.Editor.updateBlock(uuid, `${content}`)
    },
  )



}

// bootstrap
logseq.ready(main).catch(console.error)
