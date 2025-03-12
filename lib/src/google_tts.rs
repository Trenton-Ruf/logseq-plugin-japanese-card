use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose};

// use regex::Regex;


use serde_json::json;
use std::collections::HashMap;

use crate::{http_request, Synthesizer};

pub struct GoogleTTS {
    api_key: String,
}

impl GoogleTTS {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.trim().to_string(),
        }
    }
}

#[async_trait(?Send)]
impl Synthesizer for GoogleTTS {
    async fn synthesize_audio(&self, text: &str) -> Result< Vec<u8>, String > {

        // TODO Regex the input here
        // Ignore # and [[]] ?

        let url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";
        let req_body = json!({
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": "ja-JP",
                "name": "ja-JP-Neural2-D"
            },
            "audioConfig": {
                "audioEncoding": "MP3"
            }
        });
    
        let mut headers = HashMap::new();
        headers.insert("X-Goog-Api-Key", self.api_key.as_str());
        headers.insert("Content-Type", "application/json; charset=utf-8");
    
        let res_body = http_request::make_request(url, req_body, Some(headers)).await?;
        let encoded_audio = extract_synthesized_audio(res_body)?;

        let decoded_audio = general_purpose::STANDARD
            .decode(encoded_audio)
            .map_err(|e| e.to_string())?;
            //.expect("Failed to decode Base64");

        Ok(decoded_audio)
    }
}

fn extract_synthesized_audio(res_body: serde_json::Value) -> Result<String, String> {
    let Some(synthesizer_str) = res_body["audioContent"].as_str()
    else {
        return Err("json error: synthesized audio not found".to_string());
    };
    let synthesizer_str = synthesizer_str
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    Ok(synthesizer_str.to_string())
}