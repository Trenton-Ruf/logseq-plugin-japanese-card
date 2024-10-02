use reqwest::StatusCode;
use std::collections::HashMap;

pub async fn make_request(
    url: &str,
    body: serde_json::Value,
    headers: Option<HashMap<&str, &str>>
) -> Result<serde_json::Value, String> {
    let req_client = reqwest::Client::new();
    let mut request = req_client.post(url).json(&body);

    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }

    let res = request.send().await.map_err(|e| format!("request error: {}", e))?;
    if res.status() != StatusCode::OK {
        return Err(format!("request error: {}", res.status()));
    }
    let json = res
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("json error: {}", e))?;
    Ok(json)
}