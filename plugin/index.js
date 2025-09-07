import * as wasm from "logseq-plugin-japanese-card";
import "@logseq/libs"

function sanitizeText(text) {
  const specialCharsToRemove = /[\^\*\=\_]|\[.*?\]|\s/g;
  const sanitizedText = text.replace(specialCharsToRemove, '');
  //console.log("sanitizedText:", sanitizedText);
  return sanitizedText
}

// Small contract for helper functions:
// - ensureKeys: checks for required keys and returns them or shows a message
// - saveTTS: saves a Uint8Array audio blob to sandbox storage and inserts a block with the asset link
// - insertGrammarCardForBlock: generates grammar using wasm and inserts blocks under a target block

async function ensureKeys(...keys) {
  for (const key of keys) {
    if (!logseq.settings[key]) {
      const pretty = key === 'gemini_ai_api_key' ? 'Gemini AI API Key' : key === 'google_tts_api_key' ? 'Google TTS key' : key
      logseq.App.showMsg(`Please set ${pretty} first`)
      return false
    }
  }
  return true
}

async function saveTTSAndInsert(sandbox, filenameBase, audioBuffer, insertTargetUuid, save_path) {
  const audio_typedArray = new Uint8Array(audioBuffer);
  await sandbox.setItem(filenameBase + `.mp3`, audio_typedArray)
  await logseq.Editor.insertBlock(insertTargetUuid, `![${filenameBase}.mp3](${save_path}${filenameBase}.mp3)`, { before: false, sibling: false, focus: false, isPageBlock: false });
}

async function insertGrammarCardForBlock({sourceText, targetUuid, geminiKey, googleTtsKey, customTags, save_path, replace = false}) {
  // returns true if inserted successfully
  try {
    const grammar = await wasm.define_grammar(sourceText, geminiKey)
    const s = logseq.Assets.makeSandboxStorage()

    // Insert the card either by replacing the source block or as a sibling
    let cardBlock
    // read original block properties so we can preserve highlighting/heading
    let originalProps = {}
    try {
      const originalBlock = await logseq.Editor.getBlock(targetUuid)
      if (originalBlock && originalBlock.properties) originalProps = originalBlock.properties
    } catch (e) {
      // ignore - not all runtimes return properties
    }

    const cardProperties = Object.assign({}, originalProps, {'heading':'3', 'background-color':"pink"})

    if (replace) {
      // update the original block to become the card (properties may be lost depending on runtime)
      await logseq.Editor.updateBlock(targetUuid, `${grammar.grammar} #card ${customTags}`)
      // attempt to re-apply properties by inserting a sibling and removing original if updateBlock doesn't support properties
      cardBlock = { uuid: targetUuid }
    } else {
      // Insert as sibling before the original so it occupies the same position when we remove the source; apply merged properties
      cardBlock = await logseq.Editor.insertBlock(targetUuid, `${grammar.grammar} #card ${customTags}`, { before: true, sibling: true, focus: false, isPageBlock: false , properties: cardProperties})

      // Fallback: some runtimes ignore properties on insert; read the inserted block and if properties are missing, try to reapply them using updateBlock.
      try {
        const inserted = await logseq.Editor.getBlock(cardBlock.uuid)
        if (inserted && (!inserted.properties || Object.keys(inserted.properties).length === 0)) {
          // attempt to reapply properties - updateBlock usually accepts content only, but some runtimes accept a properties object
          try {
            await logseq.Editor.updateBlock(cardBlock.uuid, `${grammar.grammar} #card ${customTags}`)
            // if updateBlock supports properties we can attempt a second call via insertBlock of an empty sibling with properties, but that's risky; keep simple.
          } catch (e) {
            // ignore failure - best-effort only
          }
        }
      } catch (e) {
        // ignore errors reading back the block
      }
    }

    const explanationBlock = await logseq.Editor.insertBlock(cardBlock.uuid, `**Explanation:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
    for (const explanation of grammar.explanations) {
      await logseq.Editor.insertBlock(explanationBlock.uuid, `${explanation}`, { before: false, sibling: false, focus: false, isPageBlock: false });
    }

    if (grammar.examples && grammar.examples.length > 0) {
      const exampleBlock = await logseq.Editor.insertBlock(cardBlock.uuid, `**Examples:**`, { before: false, sibling: false, focus: false, isPageBlock: false })
      for (let i = 0; i < grammar.examples.length; i++) {
        const example = grammar.examples[i];
        await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.japanese}`, { before: false, sibling: false, focus: false, isPageBlock: false });
        await logseq.Editor.insertBlock(exampleBlock.uuid, `${example.english}`, { before: false, sibling: false, focus: false, isPageBlock: false });
        if (i === 0 && googleTtsKey) {
          // TTS for first example; sanitize filename
          const sanitizedFilename = sanitizeText(example.japanese)
          const audio = await wasm.synthesize_audio(sanitizedFilename, googleTtsKey)
          await saveTTSAndInsert(s, sanitizedFilename, audio, exampleBlock.uuid, save_path)
        }
      }
    }
    return true
  } catch (e) {
    console.log(e)
    return false
  }
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

  // Vocabulary command left mostly as-is but using helpers
  logseq.Editor.registerSlashCommand('📙 Generate Vocabulary Card', async () => {
    if (!await ensureKeys('gemini_ai_api_key','google_tts_api_key')) return
    const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
    const google_tts_api_key = logseq.settings["google_tts_api_key"]
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
      await saveTTSAndInsert(s, content, audio, uuid, save_path)

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
  })

  // Single-block grammar command using helper
  logseq.Editor.registerSlashCommand('📙 Generate grammar Card', async () => {
    if (!await ensureKeys('gemini_ai_api_key','google_tts_api_key')) return
    const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
    const google_tts_api_key = logseq.settings["google_tts_api_key"]
    const custom_tags = logseq.settings["custom_tags_grammar"]
    const { content, uuid } = await logseq.Editor.getCurrentBlock()
    await logseq.Editor.updateBlock(uuid, `${content} loading...`)
    try {
      const ok = await insertGrammarCardForBlock({sourceText: content, targetUuid: uuid, geminiKey: gemini_ai_api_key, googleTtsKey: google_tts_api_key, customTags: custom_tags, save_path})
      if (!ok) throw new Error('insert failed')
      // remove the original source block so the generated card (sibling) remains with its properties
      await logseq.Editor.removeBlock(uuid)
    } catch (e) {
      console.log(e)
      logseq.App.showMsg("Failed to generate grammar card." + e)
      await logseq.Editor.updateBlock(uuid, `${content}`)
    }
  })

  // New: Page-wide grammar command
  logseq.Editor.registerSlashCommand('📙 Generate Grammar Card for Page', async () => {
    if (!await ensureKeys('gemini_ai_api_key','google_tts_api_key')) return
    const gemini_ai_api_key = logseq.settings["gemini_ai_api_key"]
    const google_tts_api_key = logseq.settings["google_tts_api_key"]
    const custom_tags = logseq.settings["custom_tags_grammar"]

    const currentPage = await logseq.Editor.getCurrentPage()
    if (!currentPage) {
      logseq.App.showMsg('No page context')
      return
    }
    const blocks = await logseq.Editor.getPageBlocksTree(currentPage.name)
    if (!blocks || blocks.length === 0) {
      logseq.App.showMsg('No blocks on this page')
      return
    }

    // iterate blocks and skip those that already look like generated cards
    for (const b of blocks) {
      try {
        const text = b.content || ''
        // Skip if it's already a card or contains the custom tag
        if (text.includes('#card') || (custom_tags && text.includes(custom_tags))) continue

        // Skip empty or whitespace-only
        if (!text.trim()) continue

            // For each block, mark it loading, run the generator. If successful, remove the original line.
            await logseq.Editor.updateBlock(b.uuid, `${text} loading...`)
            const ok = await insertGrammarCardForBlock({sourceText: text, targetUuid: b.uuid, geminiKey: gemini_ai_api_key, googleTtsKey: google_tts_api_key, customTags: custom_tags, save_path})
            if (ok) {
              // remove the original source line since the card was inserted
              await logseq.Editor.removeBlock(b.uuid)
            } else {
              // restore original text if insertion failed
              await logseq.Editor.updateBlock(b.uuid, `${text}`)
            }
      } catch (e) {
        console.log('page command error', e)
      }
    }
    logseq.App.showMsg('Finished processing page')
  })

  // Translate block command preserved
  logseq.Editor.registerSlashCommand('📙 Translate block', async () => {
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
      await saveTTSAndInsert(s, sanitizedContent, audio, uuid, save_path)
    } catch (e) {
      console.log(e)
      logseq.App.showMsg("Failed to generate vocabulary card." + e)
    }
    await logseq.Editor.updateBlock(uuid, `${content}`)
  })

}

// bootstrap
logseq.ready(main).catch(console.error)
