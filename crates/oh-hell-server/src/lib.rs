//! Headless service layer over `oh-hell-core`. Native clients call it
//! in-process; the `http` feature exposes it to the web client.

#[cfg(feature = "http")]
pub mod http;
