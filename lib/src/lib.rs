mod gemini_dictionary;
mod http_request;
mod google_tts;

use async_trait::async_trait;
use gemini_dictionary::GeminiDictionary;
use google_tts::GoogleTTS;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct WordDefinition {
    word: String,
    pronunciation: String,
    definition: String,
    examples: Vec<String>,
    image: String,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct SentenceDefinition {
    sentence: String,
    translation: String,
    explanation: Vec<String>,
    //image: String,
}

#[allow(non_snake_case)]
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct EncodedAudio {
    audioContent: String,
}

const PROMPT_VOCAB_TEMPLATE: &str = "Please act as a Japanese to English dictionary, including the pronunciation in hiragana, explanation, An example sentence with English translations in plain text, and one image. The word is `{:word}`. Please output the result in json format, the json keys are `word`, `pronunciation`, `definition`, `examples`, and `image`. There should be no nested keys";
const PROMPT_SENTENCE_TEMPLATE: &str = "Please act as a Japanese to English Translator including a grammar explanation. The grammar explanations should a maximum of two points, only include the most advanced points and surround the grammer components with ^^ to highlight them. Convert the phrase `{:sentence}`. Output the result in json format, the json keys are `sentence`, `translation` and `explanation`. Each explanation is its own element of a vector. There should be no nested keys";

#[async_trait(?Send)]
pub trait Dictionary {
    // fn set_llm_model(&self, model: &str) -> Result<&Self, String>;
    async fn define_word(&self, word: &str) -> Result<WordDefinition, String>;
    // fn get_llm_models(&self) -> Result<Vec<String>, String>;
    fn default_word_prompt(&self, word: &str) -> String {
        PROMPT_VOCAB_TEMPLATE.replace("{:word}", word.trim())
    }

    async fn define_sentence(&self, sentence: &str) -> Result<SentenceDefinition, String>;
    fn default_sentence_prompt(&self, sentence: &str) -> String {
        PROMPT_SENTENCE_TEMPLATE.replace("{:sentence}", sentence.trim())
    }
}

#[wasm_bindgen]
pub async fn define_word(word: &str, api_key: &str) -> Result<JsValue, JsValue> {
    let dictionary = GeminiDictionary::new(api_key);
    let word_defination = dictionary
        .define_word(word)
        .await
        .map_err(|e| JsValue::from_str(&e))?;

    Ok(serde_wasm_bindgen::to_value(&word_defination)?)
}

#[wasm_bindgen]
pub async fn define_sentence(sentence: &str, api_key: &str) -> Result<JsValue, JsValue> {
    let dictionary = GeminiDictionary::new(api_key);
    let sentence_defination = dictionary
        .define_sentence(sentence)
        .await
        .map_err(|e| JsValue::from_str(&e))?;

    Ok(serde_wasm_bindgen::to_value(&sentence_defination)?)
}

#[async_trait(?Send)]
pub trait Synthesizer {
    async fn synthesize_audio(&self, text: &str) -> Result< Vec<u8>, String>;
}

#[wasm_bindgen]
pub async fn synthesize_audio(sentence: &str, api_key: &str) -> Result<JsValue, JsValue> {
    let synthesizer = GoogleTTS::new(api_key);
    let synthesized_audio = synthesizer
        .synthesize_audio(sentence)
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(serde_wasm_bindgen::to_value(&synthesized_audio)?)
}