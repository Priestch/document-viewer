use lightningcss::rules::CssRule;
use lightningcss::selector::{Component, SelectorList};
use lightningcss::traits::ToCss;
use lightningcss::{
    stylesheet::{ParserOptions, PrinterOptions, StyleSheet},
    visit_types,
    visitor::{Visit, VisitTypes, Visitor},
};
use std::convert::Infallible;
use std::fs;
use std::path::Path;

fn replace_id_selector(selector: &str) -> String {
    let mut new_selector = String::new();
    let mut chars = selector.chars();
    new_selector.push_str("#");
    new_selector.push_str(&chars.skip(1).collect::<String>());
    new_selector
}

pub fn extract_css(sheet_path: &Path) {
    let text = fs::read_to_string(sheet_path).unwrap();
    let mut stylesheet = StyleSheet::parse(&text, ParserOptions::default()).unwrap();

    struct MyVisitor;
    impl<'i> Visitor<'i> for MyVisitor {
        type Error = Infallible;

        fn visit_types(&self) -> VisitTypes {
            visit_types!(RULES)
        }

        fn visit_rule(&mut self, rule: &mut CssRule<'i>) -> Result<(), Self::Error> {
            match rule {
                CssRule::Style(rule) => {
                    let mut selectors = vec![];
                    for selector in rule.selectors.0.iter() {
                        for component in selector.iter_raw_match_order() {
                            match component {
                                Component::ID(identifier) => {
                                    selectors.push(Component::Class(identifier.clone().into()).into());
                                }
                                Component::Empty => {}
                                _ => selectors.push(component.clone().into()),
                            }
                        }
                    }
                    selectors.reverse();
                    println!(
                        "{} -> {}",
                        rule.selectors,
                        SelectorList::from_vec(selectors.clone())
                    );
                    rule.selectors = SelectorList::from_vec(selectors);
                    Ok(())
                }
                _ => Ok(()),
            }
        }
    }
~
    stylesheet.visit(&mut MyVisitor).unwrap();

    let res = stylesheet
        .to_css(PrinterOptions {
            minify: false,
            ..Default::default()
        })
        .unwrap();

    print!("{:?}", res);
    fs::write("output.css", res.code).unwrap();
}
