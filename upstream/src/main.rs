#![feature(allocator_api)]

mod utils_gen;
mod style;

use crate::utils_gen::UtilsGen;
use crate::style::{extract_css};
use oxc::allocator::{Allocator, CloneIn, Vec as OxcVec};
use oxc::ast::ast::{
    BindingPatternKind, BindingRestElement, ClassElement, ClassType, Declaration, Expression,
    FunctionType, MethodDefinitionKind, MethodDefinitionType, ModuleDeclaration, ObjectExpression,
    ObjectProperty, PropertyDefinitionType, PropertyKey, PropertyKind, Statement, TSTypeAnnotation,
    TSTypeParameterDeclaration, TSTypeParameterInstantiation, VariableDeclarationKind,
};
use oxc::ast::visit::walk::{
    walk_module_declaration, walk_object_expression, walk_object_property, walk_statement,
};
use oxc::ast::{match_declaration, AstBuilder, AstKind, Visit};
use oxc::codegen::{Codegen, Context, Gen, GenExpr};
use oxc::parser::Parser;
use oxc::span::{Atom, GetSpan, SourceType, Span, SPAN};
use std::cell::RefCell;
use std::cmp::min;
use std::hash::Hash;
use std::{env, fs};


fn get_span_text(source_text: &str, span: Span, size: usize) -> String {
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
    source_text: String,
    object_property_depth: u32,
    func_declare_depth: u32,
    object_expression_depth: u32,
    in_target_if_block: bool,
    viewer_app: Declaration<'a>,
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
            source_text: source_text.to_string(),
            object_property_depth: 0,
            func_declare_depth: 0,
            object_expression_depth: 0,
            in_target_if_block: false,
            viewer_app: builder.declaration_class(
                ClassType::ClassDeclaration,
                SPAN,
                OxcVec::new_in(allocator),
                Some(builder.binding_identifier(SPAN, Atom::from("ViewerApplication"))),
                None::<TSTypeParameterDeclaration>,
                None,
                None::<TSTypeParameterInstantiation>,
                None,
                builder.class_body(SPAN, OxcVec::new_in(allocator)),
                false,
                false,
            ),
            utils_gen: UtilsGen::new(builder.allocator),
        }
    }

    fn add_class_method(&mut self, it: &ObjectProperty<'_>) {
        match it.kind {
            PropertyKind::Get | PropertyKind::Init => match self.viewer_app {
                Declaration::ClassDeclaration(ref mut class) => {
                    let mut name = "";
                    match &it.key {
                        PropertyKey::StaticIdentifier(ident) => {
                            name = ident.name.as_str();
                        }
                        _ => {}
                    }

                    match &it.value {
                        Expression::FunctionExpression(func) => {
                            let identifier = self
                                .app_builder
                                .binding_identifier(SPAN, self.app_builder.atom(name));
                            let span = func.span();
                            let text = get_span_text(&self.source_text, span, span.end as usize);
                            let mut access_options_obj = false;
                            if text.contains("AppOptions.") {
                                access_options_obj = true;
                            }
                            let mut func_body = func.body.clone_in(self.app_builder.allocator);
                            if access_options_obj {
                                let property = self.app_builder.binding_property(
                                    SPAN,
                                    self.app_builder.property_key_identifier_name(
                                        SPAN,
                                        Atom::from("appOptions"),
                                    ),
                                    self.app_builder.binding_pattern(
                                        self.app_builder.binding_pattern_kind_binding_identifier(
                                            SPAN,
                                            Atom::from("AppOptions"),
                                        ),
                                        None::<TSTypeAnnotation>,
                                        false,
                                    ),
                                    true,
                                    false,
                                );
                                let init = self
                                    .app_builder
                                    .expression_identifier_reference(SPAN, Atom::from("this"));
                                let declaration = self.app_builder.declaration_from_variable(
                                    self.app_builder.variable_declaration(
                                        SPAN,
                                        VariableDeclarationKind::Const,
                                        self.app_builder.vec1(
                                            self.app_builder.variable_declarator(
                                                SPAN,
                                                VariableDeclarationKind::Const,
                                                self.app_builder.binding_pattern(
                                                    self.app_builder
                                                        .binding_pattern_kind_object_pattern(
                                                            SPAN,
                                                            self.app_builder.vec1(property),
                                                            None::<BindingRestElement>,
                                                        ),
                                                    None::<TSTypeAnnotation>,
                                                    false,
                                                ),
                                                Some(init),
                                                false,
                                            ),
                                        ),
                                        false,
                                    ),
                                );
                                match func_body {
                                    None => {}
                                    Some(ref mut body) => {
                                        body.statements.insert(0, Statement::from(declaration))
                                    }
                                }
                            }

                            let mut method_kind = MethodDefinitionKind::Method;
                            if it.kind == PropertyKind::Get {
                                method_kind = MethodDefinitionKind::Get
                            }
                            class.body.body.push(
                                self.app_builder.class_element_from_method_definition(
                                    self.app_builder.method_definition(
                                        MethodDefinitionType::MethodDefinition,
                                        SPAN,
                                        OxcVec::new_in(self.app_builder.allocator),
                                        it.key.clone_in(self.app_builder.allocator),
                                        self.app_builder.function(
                                            FunctionType::FunctionExpression,
                                            SPAN,
                                            Some(identifier),
                                            func.generator,
                                            func.r#async,
                                            func.declare,
                                            None::<TSTypeParameterDeclaration>,
                                            None,
                                            func.params.clone_in(self.app_builder.allocator),
                                            func.return_type.clone_in(self.app_builder.allocator),
                                            func_body,
                                        ),
                                        method_kind,
                                        false,
                                        false,
                                        false,
                                        false,
                                        None,
                                    ),
                                ),
                            );
                        }
                        _ => {}
                    };
                }
                _ => {}
            },
            PropertyKind::Set => {}
        }
    }

    fn add_app_property(&mut self, it: &ObjectProperty<'_>) {
        match it.kind {
            PropertyKind::Init => match self.viewer_app {
                Declaration::ClassDeclaration(ref mut class) => {
                    if !it.method {
                        class
                            .body
                            .body
                            .push(self.app_builder.class_element_property_definition(
                                PropertyDefinitionType::PropertyDefinition,
                                SPAN,
                                OxcVec::new_in(self.app_builder.allocator),
                                it.key.clone_in(self.app_builder.allocator),
                                Some(it.value.clone_in(self.app_builder.allocator)),
                                it.computed,
                                false,
                                false,
                                false,
                                false,
                                false,
                                false,
                                None::<TSTypeAnnotation>,
                                None,
                            ));
                    } else {
                        self.add_class_method(it);
                    }
                }
                _ => {}
            },
            PropertyKind::Get => self.add_class_method(it),
            PropertyKind::Set => {}
        }
    }

    fn get_app_module_text(&mut self) -> String {
        let codegen = self.app_codegen.get_mut();

        codegen.into_source_text()
    }

    fn get_span_text(&self, span: Span, size: usize) -> &str {
        let start: usize = span.start as usize;
        let end: usize = min(span.end as usize, start + size);
        let text = &self.source_text.as_str()[start..end];

        text
    }

    fn get_default_external_services_text(&mut self) -> String {
        self.utils_gen.get_default_external_service_text()
    }
}

impl Visit<'_> for AppExtractor<'_> {
    fn leave_node(&mut self, kind: AstKind<'_>) {
        match kind {
            AstKind::VariableDeclaration(it) => {
                let text = get_span_text(&self.source_text, it.span(), 30);
                if text == "const PDFViewerApplication = {" {
                    self.in_app_variable_context = false;
                    self.app_visited = true;
                }
            }
            _ => {}
        }
    }

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
                    Declaration::VariableDeclaration(it) => {
                        if it.kind == VariableDeclarationKind::Const && it.declarations.len() == 1 {
                            let declaration = &it.declarations[0];
                            match &declaration.id.kind {
                                BindingPatternKind::BindingIdentifier(ident) => {
                                    if ident.name == AppExtractor::VAR_NAME {
                                        self.in_app_variable_context = true;
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    Declaration::FunctionDeclaration(func) => {
                        is_func_stmt = true;
                        if self.app_visited
                            && self.func_declare_depth == 0
                            && !self.in_target_if_block
                            && self.object_expression_depth == 0
                        {
                            if let Some(id) = &func.id {
                                let identifier = id.name.as_str();
                                self.utils_gen
                                    .add_func_name(self.app_builder.atom(identifier));
                                self.utils_gen
                                    .add_func_statement(it.clone_in(self.app_builder.allocator));
                            }
                        }
                        self.func_declare_depth += 1;
                    }
                    Declaration::ClassDeclaration(itc) => match &itc.id {
                        Some(id) => {
                            if id.name == "DefaultExternalServices" {
                                self.utils_gen.add_external_service_statement(
                                    it.clone_in(self.app_builder.allocator),
                                );
                            }
                        }
                        _ => {}
                    },
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

    fn visit_object_expression(&mut self, it: &ObjectExpression<'_>) {
        self.object_expression_depth += 1;
        walk_object_expression(self, it);
        self.object_expression_depth -= 1;
    }

    fn visit_object_property(&mut self, it: &ObjectProperty<'_>) {
        let in_context = self.object_expression_depth == 1 && self.in_app_variable_context;
        if in_context {
            self.add_app_property(it);
        }

        walk_object_property(self, it);
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
    let mut extractor = AppExtractor::new(&app_allocator, &text);

    extractor.visit_program(&ret.program);

    let default_external_services =
        cwd.join("packages/document-viewer/src/default_external_services.js");

    fs::write(
        &default_external_services,
        extractor.get_default_external_services_text(),
    );

    let mut codegen = Codegen::new();
    Statement::from(extractor.viewer_app).gen(&mut codegen, Context::default());
    let output = cwd.join("packages/document-viewer/src/default_app.js");
    fs::write(&output, codegen.into_source_text());

    let stylesheet_path = cwd.join("packages/document-viewer/pdf.js/web/viewer.css");
    extract_css(&stylesheet_path);
}
