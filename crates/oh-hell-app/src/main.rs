use dioxus::prelude::*;

const APP_CSS: &str = include_str!("../assets/styles.css");

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    rsx! {
        style { {APP_CSS} }
        main { class: "app",
            h1 { "Oh Hell" }
        }
    }
}
