use std::{net::SocketAddr, path::PathBuf};

use clap::Parser;
use tracing_subscriber::EnvFilter;

#[derive(Parser)]
#[command(version, about)]
struct Args {
    #[arg(long, env = "OH_HELL_BIND", default_value = "127.0.0.1:8080")]
    bind: SocketAddr,

    /// Directory holding the built Dioxus web client to serve at `/`.
    #[arg(long, env = "OH_HELL_WEB_DIR")]
    web_dir: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let args = Args::parse();
    let listener = tokio::net::TcpListener::bind(args.bind).await?;
    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, oh_hell_server::http::router(args.web_dir))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
