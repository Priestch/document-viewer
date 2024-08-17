#![feature(allocator_api)]

use std::{env, fs};
use std::borrow::Cow;
use std::cell::{Cell, RefCell};
use std::hash::Hash;

use oxc::allocator::{Allocator, Vec};
use oxc::ast::{AstBuilder, AstKind, Visit};
use oxc::ast::ast::{BindingPattern, BindingPatternKind, ClassElement, Expression, Function, FunctionBody, ObjectExpression, ObjectProperty, PropertyKind};
use oxc::ast::visit::walk;
use oxc::codegen::{Codegen, CodegenOptions, Context, Gen, GenExpr};
use oxc::parser::Parser;
use oxc::span::{CompactStr, GetSpan, SourceType};
use oxc::syntax::precedence::Precedence;
use oxc::syntax::scope::ScopeFlags;

struct ObjProperty {
    name: CompactStr,
    computed: bool,
    kind: PropertyKind,
}

impl ObjProperty {
    fn name(&self) -> &str {
        &self.name
    }
}

struct AppExtractor<'a> {
    in_app_variable_context: bool,
    app_codegen: RefCell<Codegen<'a, false>>,
    app_builder: AstBuilder<'a>,
    app_body: Vec<'a, ClassElement<'a>>,
    visiting_prop: Option<ObjProperty>,
    source_text: String,
    object_property_depth: u32,
    object_expression_depth: u32,
}

impl<'a> AppExtractor<'a> {
    const VAR_NAME: &'static str = "PDFViewerApplication";

    fn new(allocator: &'a Allocator, source_text: &str) -> Self {
        let builder = AstBuilder::new(allocator);
        let app_body = Vec::new_in(allocator);
        let codegen = Codegen::new();
        Self {
            in_app_variable_context: false,
            app_codegen: RefCell::new(codegen),
            app_builder: builder,
            app_body,
            visiting_prop: None,
            source_text: source_text.to_string(),
            object_property_depth: 0,
            object_expression_depth: 0,
        }
    }

    fn print_class_start(&mut self, name: &str) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str(format!("class {name} {{\n").as_str());
    }

    fn print_class_end(&mut self) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str(format!("}}\n").as_str());
    }

    fn print_method(&mut self, name: &str) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str(format!("{name}() {{\n").as_str());
    }

    fn print_method_end(&mut self) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str(format!("}}\n").as_str());
    }

    fn print_class_prop(&mut self, prop: &ObjectProperty) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str("  ");
        let ctx = Context::default();
        prop.key.gen(codegen, ctx);
        codegen.print_str(" = ");
        prop.value.gen_expr(codegen, Precedence::Assign, ctx);
        codegen.print_str(";\n");

    }

    fn print_class_method(&mut self, body: &FunctionBody) {
        if let Some(ref prop) = self.visiting_prop {
            let codegen = self.app_codegen.get_mut();
            codegen.print_str("  ");
            let ctx = Context::default();
            if (prop.kind == PropertyKind::Get || prop.kind == PropertyKind::Set) && prop.computed {

            }
            match prop.kind {
                PropertyKind::Init => {}
                PropertyKind::Get => {
                    codegen.print_str("get ")
                }
                PropertyKind::Set => {
                    codegen.print_str("set ")
                }
            }
            codegen.print_str(prop.name());
            codegen.print_str("() ");
            body.gen(codegen, ctx);
            codegen.print_str("\n");
        }
    }

    fn print_class_method1(&mut self, func: &Function) {
        if let Some(ref prop) = self.visiting_prop {
            let codegen = self.app_codegen.get_mut();
            codegen.print_str("  ");
            let ctx = Context::default();
            match prop.kind {
                PropertyKind::Init => {}
                PropertyKind::Get => {
                    codegen.print_str("get ")
                }
                PropertyKind::Set => {
                    codegen.print_str("set ")
                }
            }
            if func.r#async {
                codegen.print_str("async ");
            }
            codegen.print_str(prop.name());
            codegen.print_str("(");
            func.params.gen(codegen, ctx);
            codegen.print_str(") ");
            if let Some(ref body) = func.body {
                body.gen(codegen, ctx);
            }
            codegen.print_str("\n");
        }
    }
}


impl Visit<'_> for AppExtractor<'_> {
    fn visit_expression(&mut self, expr: &Expression<'_>) {
        self.object_property_depth += 1;
        if !self.visiting_prop.is_none() && self.object_property_depth == 1 {
            let codegen = self.app_codegen.get_mut();
            expr.gen_expr(codegen, Precedence::Assign, Context::default());
            codegen.print_str(";\n");
        }
        walk::walk_expression(self, expr);
    }

    fn visit_binding_pattern(&mut self, pat: &BindingPattern<'_>) {
        match &pat.kind {
            BindingPatternKind::BindingIdentifier(ident) => {
                if ident.name == AppExtractor::VAR_NAME {
                    self.in_app_variable_context = true;
                    self.print_class_start("PDFViewerApplication")
                }
                self.visit_binding_identifier(ident);
            }
            BindingPatternKind::ObjectPattern(pat) => self.visit_object_pattern(pat),
            BindingPatternKind::ArrayPattern(pat) => self.visit_array_pattern(pat),
            BindingPatternKind::AssignmentPattern(pat) => self.visit_assignment_pattern(pat),
        }
        if let Some(type_annotation) = &pat.type_annotation {
            self.visit_ts_type_annotation(type_annotation);
        }
    }

    fn visit_function(&mut self, func: &Function<'_>, flags: ScopeFlags) {
        let kind = AstKind::Function(self.alloc(func));
        self.enter_scope({
                             let mut flags = flags;
                             if func.is_strict() {
                                 flags |= ScopeFlags::StrictMode;
                             }
                             flags
                         }, &Cell::new(None));
        self.enter_node(kind);
        if self.object_expression_depth == 1 && self.in_app_variable_context {
            self.print_class_method1(func);
        }
        if let Some(ident) = &func.id {
            self.visit_binding_identifier(ident);
        }
        self.visit_formal_parameters(&func.params);
        if let Some(body) = &func.body {
            self.visit_function_body(body);
        }
        if let Some(parameters) = &func.type_parameters {
            self.visit_ts_type_parameter_declaration(parameters);
        }
        if let Some(annotation) = &func.return_type {
            self.visit_ts_type_annotation(annotation);
        }
        self.leave_node(kind);
        self.leave_scope();
    }

    fn visit_object_expression(&mut self, expr: &ObjectExpression<'_>) {
        let kind = AstKind::ObjectExpression(self.alloc(expr));
        self.object_expression_depth += 1;
        self.enter_node(kind);
        for prop in &expr.properties {
            self.visit_object_property_kind(prop);
        }
        self.object_expression_depth -= 1;
        if self.object_expression_depth == 0 {
            if self.in_app_variable_context {
                self.in_app_variable_context = false;
            }
        }
        self.leave_node(kind);
    }

    fn visit_object_property(&mut self, prop: &ObjectProperty<'_>) {
        let kind = AstKind::ObjectProperty(self.alloc(prop));
        self.enter_node(kind);
        if self.object_expression_depth == 1 && self.in_app_variable_context {
            // self.visiting_prop = prop.key.name().unwrap_or(CompactStr::from(""));
            let name = CompactStr::from(prop.key.name().unwrap_or(Cow::from(CompactStr::from(""))));
            self.visiting_prop = Some(ObjProperty {
                name,
                computed: prop.computed,
                kind: prop.kind,
            });
            match prop.kind {
                PropertyKind::Init => {
                    if !prop.method {
                        self.print_class_prop(prop);
                    }
                }
                PropertyKind::Get => {}
                PropertyKind::Set => {}
            }
        }
        self.visit_property_key(&prop.key);
        self.visit_expression(&prop.value);
        self.leave_node(kind);
        self.visiting_prop = None;
    }
}

fn main() {
    let cwd = env::current_dir().unwrap();

    let app_file = cwd.join("packages/document-viewer/pdf.js/web/app.js");

    let parser_allocator = Allocator::default();
    let source_type = SourceType::from_path(app_file.clone()).unwrap();
    let text = fs::read_to_string(app_file).unwrap();
    let ret = Parser::new(&parser_allocator, &text, source_type).parse();

    let app_allocator = Allocator::default();
    let mut app = AppExtractor::new(&app_allocator, &text);
    app.visit_program(&ret.program);

    app.print_class_end();
    let codegen = app.app_codegen.get_mut();
    let generated = codegen.into_source_text();
    let output = cwd.join("upstream/output.js");
    fs::write(&output, generated);

    // let allocator = Allocator::default();
    // let source_type = SourceType::default().with_module(true);
    // let ret = Parser::new(&allocator, &generated, source_type).preserve_parens(true).parse();

    // let output = Prettier::new(
    //     &allocator,
    //     &generated,
    //     &ret.trivias,
    //     PrettierOptions { semi, trailing_comma: TrailingComma::All, ..PrettierOptions::default() },
    // );
}
