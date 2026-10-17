use std::path::PathBuf;

use axum::{Json, Router, routing::get};
use serde_json::{Value, json};
use tower_http::{services::ServeDir, trace::TraceLayer};

pub fn router(web_dir: Option<PathBuf>) -> Router {
    let api = Router::new().route("/health", get(health));
    let router = Router::new().nest("/api", api);
    let router = match web_dir {
        Some(dir) => router.fallback_service(ServeDir::new(dir)),
        None => router,
    };
    router.layer(TraceLayer::new_for_http())
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok", "version": env!("CARGO_PKG_VERSION") }))
}
