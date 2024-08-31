#![feature(allocator_api)]

mod utils_gen;

use crate::utils_gen::UtilsGen;
use oxc::allocator::{Allocator, CloneIn, Vec as OxcVec};
use oxc::ast::ast::{
    BindingPattern, BindingPatternKind, ClassElement, Declaration, Expression, Function,
    FunctionBody, ModuleDeclaration, ObjectExpression, ObjectProperty, PropertyKind, Statement,
};
use oxc::ast::visit::walk;
use oxc::ast::visit::walk::{walk_module_declaration, walk_statement};
use oxc::ast::{match_declaration, AstBuilder, AstKind, Visit};
use oxc::codegen::{Codegen, Context, Gen, GenExpr};
use oxc::parser::Parser;
use oxc::span::{CompactStr, GetSpan, SourceType, Span};
use oxc::syntax::precedence::Precedence;
use std::borrow::Cow;
use std::cell::RefCell;
use std::cmp::min;
use std::hash::Hash;
use std::{env, fs};

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

fn get_span_text(source_text: &str, span: &Span, size: usize) -> String {
    let start: usize = span.start as usize;
    let end: usize = min(span.end as usize, start + size);

    source_text.clone()[start..end].to_string()
}

struct AppExtractor<'a> {
    in_app_variable_context: bool,
    app_visited: bool,
    app_codegen: RefCell<Codegen<'a>>,
    app_builder: AstBuilder<'a>,
    app_body: OxcVec<'a, ClassElement<'a>>,
    visiting_prop: Option<ObjProperty>,
    source_text: String,
    object_property_depth: u32,
    func_declare_depth: u32,
    object_expression_depth: u32,
    in_target_if_block: bool,
    pub utils_gen: UtilsGen<'a>,
}

impl<'a> AppExtractor<'a> {
    const VAR_NAME: &'static str = "PDFViewerApplication";

    fn new(allocator: &'a Allocator, source_text: &str) -> Self {
        let builder = AstBuilder::new(allocator);
        let app_body = OxcVec::new_in(allocator);
        let codegen = Codegen::new();
        Self {
            in_app_variable_context: false,
            app_visited: false,
            app_codegen: RefCell::new(codegen),
            app_builder: builder,
            app_body,
            visiting_prop: None,
            source_text: source_text.to_string(),
            object_property_depth: 0,
            func_declare_depth: 0,
            object_expression_depth: 0,
            in_target_if_block: false,
            utils_gen: UtilsGen::new(builder.allocator),
        }
    }

    fn get_app_module_text(&mut self) -> String {
        self.print_class_end();
        let codegen = self.app_codegen.get_mut();

        codegen.into_source_text()
    }

    fn print_class_start(&mut self, name: &str) {
        let codegen = self.app_codegen.get_mut();
        codegen.print_str(format!("class {name} {{\n").as_str());
    }

    fn get_span_text(&self, span: Span, size: usize) -> &str {
        let start: usize = span.start as usize;
        let end: usize = min(span.end as usize, start + size);
        let text = &self.source_text.as_str()[start..end];

        text
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
            match prop.kind {
                PropertyKind::Init => {}
                PropertyKind::Get => codegen.print_str("get "),
                PropertyKind::Set => codegen.print_str("set "),
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
                PropertyKind::Get => codegen.print_str("get "),
                PropertyKind::Set => codegen.print_str("set "),
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
    fn visit_statement(&mut self, it: &Statement<'_>) {
        let if_text = "typeof PDFJSDev === \"undefined\" || PDFJSDev.test(\"GENERIC\")";
        let mut is_if_stmt = false;
        let mut is_func_stmt = false;
        match it {
            // Statement::BlockStatement(it) => visitor.visit_block_statement(it),
            // Statement::BreakStatement(it) => visitor.visit_break_statement(it),
            // Statement::ContinueStatement(it) => visitor.visit_continue_statement(it),
            // Statement::DebuggerStatement(it) => visitor.visit_debugger_statement(it),
            // Statement::DoWhileStatement(it) => visitor.visit_do_while_statement(it),
            // Statement::EmptyStatement(it) => visitor.visit_empty_statement(it),
            // Statement::ExpressionStatement(it) => visitor.visit_expression_statement(it),
            // Statement::ForInStatement(it) => visitor.visit_for_in_statement(it),
            // Statement::ForOfStatement(it) => visitor.visit_for_of_statement(it),
            // Statement::ForStatement(it) => visitor.visit_for_statement(it),
            Statement::IfStatement(ifs) => {
                is_if_stmt = true;
                self.in_target_if_block = true;
                let span = ifs.test.span();
                let test_text = self.get_span_text(span, span.end as usize);
                if self.app_visited && if_text == test_text && self.func_declare_depth == 0 {
                    // self.helper_body.statements.push(it.clone_in(self.app_builder.allocator));
                    self.utils_gen
                        .add_func_statement(it.clone_in(self.app_builder.allocator));
                }
            }
            // Statement::LabeledStatement(it) => visitor.visit_labeled_statement(it),
            // Statement::ReturnStatement(it) => visitor.visit_return_statement(it),
            // Statement::SwitchStatement(it) => visitor.visit_switch_statement(it),
            // Statement::ThrowStatement(it) => visitor.visit_throw_statement(it),
            // Statement::TryStatement(it) => visitor.visit_try_statement(it),
            // Statement::WhileStatement(it) => visitor.visit_while_statement(it),
            // Statement::WithStatement(it) => visitor.visit_with_statement(it),
            match_declaration!(Statement) => {
                let declaration = it.to_declaration();
                match declaration {
                    // Declaration::VariableDeclaration(it) => visitor.visit_variable_declaration(it),
                    Declaration::FunctionDeclaration(func) => {
                        is_func_stmt = true;
                        if self.app_visited
                            && self.func_declare_depth == 0
                            && !self.in_target_if_block
                            && self.object_expression_depth == 0
                        {
                            if let Some(id) = &func.id {
                                let identifier = id.name.as_str();
                                // self.func_names_in_helper.push(self.app_builder.atom(identifier));
                                self.utils_gen
                                    .add_func_name(self.app_builder.atom(identifier));
                                // self.helper_body.statements.push(it.clone_in(self.app_builder.allocator));
                                self.utils_gen
                                    .add_func_statement(it.clone_in(self.app_builder.allocator));
                            }
                        }
                        self.func_declare_depth += 1;
                    }
                    // Declaration::ClassDeclaration(it) => visitor.visit_class(it),
                    _ => {}
                }
            }
            // match_module_declaration!(Statement) => {
            //     visitor.visit_module_declaration(it.to_module_declaration())
            _ => {}
        }

        walk_statement(self, it);
        if is_if_stmt {
            self.in_target_if_block = false
        }

        if is_func_stmt {
            self.func_declare_depth -= 1;
        }
    }

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
                self.app_visited = true;
            }
        }
        self.leave_node(kind);
    }

    fn visit_object_property(&mut self, prop: &ObjectProperty<'_>) {
        let kind = AstKind::ObjectProperty(self.alloc(prop));
        self.enter_node(kind);
        if self.object_expression_depth == 1 && self.in_app_variable_context {
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

    fn visit_module_declaration(&mut self, it: &ModuleDeclaration<'_>) {
        match it {
            ModuleDeclaration::ImportDeclaration(import) => {
                self.utils_gen.gen_import_declaration(import);
            }
            _ => {}
        }
        walk_module_declaration(self, it);
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

    let generated = app.get_app_module_text();
    let output = cwd.join("upstream/output.js");
    fs::write(&output, generated);

    let helper = cwd.join("upstream/helper.js");
    let helper_source = app.utils_gen.get_module_text();
    fs::write(&helper, helper_source);

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
