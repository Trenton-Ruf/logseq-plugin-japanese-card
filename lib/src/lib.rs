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
    definition: Vec<String>,
    examples: Vec<Example>,
    // image: String,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct GrammarDefinition {
    grammar: String,
    explanations: Vec<String>,
    examples: Vec<Example>,
    //image: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Example {
    pub japanese: String,
    pub english: String,
}

#[allow(non_snake_case)]
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct EncodedAudio {
    audioContent: String,
}



const PROMPT_VOCAB_TEMPLATE: &str = "Please act as a Japanese to English dictionary, including the pronunciation in hiragana, explanation, and example grammars with English translations. \
The word is `{:word}`. Please output the result in json format, the json keys are `word`, `pronunciation`, `definition`, and `examples`.\n\
please limit the number of definitions and examples to the most important ones. \
`word` should be just the dictionary form. Do not include romaji. \n\
{\n\
    \"word\": \"Placeholder word\",\n\
    \"pronunciation\": \"Placeholder pronunciation\",\n\
    \"definition\": [\n\
        \"Placeholder definition 1\",\n\
        \"Placeholder definition 2\"\n\
    ],\n\
    \"examples\": [\n\
        {\n\
            \"japanese\": \"Placeholder Japanese grammar 1.\",\n\
            \"english\": \"Placeholder English translation 1.\"\n\
            \"japanese\": \"Placeholder Japanese grammar 2.\",\n\
            \"english\": \"Placeholder English translation 2.\"\n\
        }\n\
    ]\n\
}\n\
Only output a json code block";


const PROMPT_GRAMMAR_TEMPLATE: &str = "Please act as a Japanese to English Dictionary. Please explain the grammar point in English: `{:grammar}`.
Output the result in json format, the json keys are `grammar`, `explanations`, and `examples`. Each explanation is its own element of a vector.
please limit the number of explanations and examples to the most important ones.
Use standard markdown sytax for bold and italics, and surround any words with double carets to ^^highlight^^ them.
Limit highlights to the explanation and do so sparingly. Bold the grammar point: `{:grammar}` in the explanation and examples.
Make sure to add a space AFTER the furigana in brackets, and if a word with furigana is directly after a ”、” then add a space before the word as well.
For example: `授業[じゅぎょう] しているうちに、  宿題[しゅくだい] を完成[かんせい] した。`.
Use furigana for advanced words ONLY (Starting at JLPT N2). DO NOT use furigana for basic words.
Do NOT include romaji ANYWHERE.\n\
{\n\
    \"grammar\": \"Placeholder grammar\",\n\
    \"explanations\": [\n\
        \"Placeholder explanation 1\",\n\
        \"Placeholder explanation 2\"\n\
    ],\n\
    \"examples\": [\n\
        {\n\
            \"japanese\": \"Placeholder Japanese example sentence 1.\",\n\
            \"english\": \"Placeholder English translation 1.\"\n\
            \"japanese\": \"Placeholder Japanese example sentence 2.\",\n\
            \"english\": \"Placeholder English translation 2.\"\n\
        }\n\
    ]\n\
}\n\
Only output a json code block";

#[async_trait(?Send)]
pub trait Dictionary {
    // fn set_llm_model(&self, model: &str) -> Result<&Self, String>;
    async fn define_word(&self, word: &str) -> Result<WordDefinition, String>;
    // fn get_llm_models(&self) -> Result<Vec<String>, String>;
    fn default_word_prompt(&self, word: &str) -> String {
        PROMPT_VOCAB_TEMPLATE.replace("{:word}", word.trim())
    }

    async fn define_grammar(&self, grammar: &str) -> Result<GrammarDefinition, String>;
    fn default_grammar_prompt(&self, grammar: &str) -> String {
        PROMPT_GRAMMAR_TEMPLATE.replace("{:grammar}", grammar.trim())
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
pub async fn define_grammar(grammar: &str, api_key: &str) -> Result<JsValue, JsValue> {
    let dictionary = GeminiDictionary::new(api_key);
    let grammar_defination = dictionary
        .define_grammar(grammar)
        .await
        .map_err(|e| JsValue::from_str(&e))?;

    Ok(serde_wasm_bindgen::to_value(&grammar_defination)?)
}

#[async_trait(?Send)]
pub trait Synthesizer {
    async fn synthesize_audio(&self, text: &str) -> Result< Vec<u8>, String>;
}

#[wasm_bindgen]
pub async fn synthesize_audio(grammar: &str, api_key: &str) -> Result<JsValue, JsValue> {
    let synthesizer = GoogleTTS::new(api_key);
    let synthesized_audio = synthesizer
        .synthesize_audio(grammar)
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(serde_wasm_bindgen::to_value(&synthesized_audio)?)
}