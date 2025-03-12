use async_trait::async_trait;

use crate::{http_request, Dictionary, WordDefinition, GrammarDefinition};

pub struct GeminiDictionary {
    api_key: String,
}

impl GeminiDictionary {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.trim().to_string(),
        }
    }
}

#[async_trait(?Send)]
impl Dictionary for GeminiDictionary {
    async fn define_word(&self, word: &str) -> Result<WordDefinition, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            self.api_key
        );
        let req_body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": self.default_word_prompt(word)
                }]
            }]
        });

        let res_body = http_request::make_request(&url, req_body, None).await?;
        let dictionary = extract_word_dictionary(res_body)?;
        Ok(dictionary)
    }

    async fn define_grammar(&self, grammar: &str) -> Result<GrammarDefinition, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            self.api_key
        );
        let req_body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": self.default_grammar_prompt(grammar)
                }]
            }]
        });

        let res_body = http_request::make_request(&url, req_body, None).await?;
        let dictionary = extract_grammar_dictionary(res_body)?;
        Ok(dictionary)
    }
}

fn extract_word_dictionary(res_body: serde_json::Value) -> Result<WordDefinition, String> {
    let Some(dictionary_str) = res_body["candidates"][0]["content"]["parts"][0]["text"].as_str()
    else {
        return Err("json error: dictionary not found".to_string());
    };
    let dictionary_str = dictionary_str
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .trim_end_matches("```") // Gemini gives too many ``` sometimes...
        .trim();
    let definition = serde_json::from_str::<WordDefinition>(dictionary_str)
        .map_err(|e| format!("serde error: {} Gemini Reply: {}", e, dictionary_str))?;
    Ok(definition)
}

fn extract_grammar_dictionary(res_body: serde_json::Value) -> Result<GrammarDefinition, String> {
    let Some(dictionary_str) = res_body["candidates"][0]["content"]["parts"][0]["text"].as_str()
    else {
        return Err("json error: dictionary not found".to_string());
    };
    let dictionary_str = dictionary_str
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .trim_end_matches("```") // Gemini gives too many ``` sometimes...
        .trim();
    let definition = serde_json::from_str::<GrammarDefinition>(dictionary_str)
        .map_err(|e| format!("serde error: {} Gemini Reply: {}", e, dictionary_str))?;
    Ok(definition)
}