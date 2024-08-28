#![feature(allocator_api)]

use oxc::allocator::{Allocator, CloneIn, Vec as OxcVec, Box as OxcBox};
use oxc::ast::ast::{BindingIdentifier, BindingPattern, BindingPatternKind, BindingRestElement, ClassElement, Declaration, Expression, Function, FunctionBody, FunctionType, IfStatement, ModuleDeclaration, ObjectExpression, ObjectProperty, ObjectPropertyKind, PropertyKind, Statement, TSTypeAnnotation, TSTypeParameterDeclaration, VariableDeclarationKind};
use oxc::ast::visit::walk;
use oxc::ast::visit::walk::{walk_declaration, walk_if_statement, walk_module_declaration, walk_statement};
use oxc::ast::{ast, match_declaration, match_expression, match_module_declaration, AstBuilder, AstKind, Trivias, Visit};
use oxc::codegen::{Codegen, CodegenOptions, CommentOptions, Context, Gen, GenExpr};
use oxc::parser::Parser;
use oxc::span::{Atom, CompactStr, GetSpan, SourceType, Span, SPAN};
use oxc::syntax::precedence::Precedence;
use oxc::syntax::scope::ScopeFlags;
use std::borrow::Cow;
use std::cell::RefCell;
use std::cmp::min;
use std::hash::Hash;
use std::{env, fs, vec};

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
    helper_codegen: RefCell<Codegen<'a>>,
    app_builder: AstBuilder<'a>,
    app_body: OxcVec<'a, ClassElement<'a>>,
    visiting_prop: Option<ObjProperty>,
    source_text: String,
    object_property_depth: u32,
    func_declare_depth: u32,
    object_expression_depth: u32,
    helpers: OxcVec<'a, Statement<'a>>,
    helper_body: FunctionBody<'a>,
    in_target_if_block: bool,
    func_names_in_helper: OxcVec<'a, Atom<'a>>,
}

impl<'a> AppExtractor<'a> {
    const VAR_NAME: &'static str = "PDFViewerApplication";

    fn new(allocator: &'a Allocator, source_text: &str) -> Self {
        let builder = AstBuilder::new(allocator);
        let app_body = OxcVec::new_in(allocator);
        let codegen = Codegen::new();
        let helper_codegen = Codegen::new();
        // let comment_options = CommentOptions {
        //     preserve_annotate_comments: true
        // };
        // helper_codegen = helper_codegen.enable_comment("", Trivias::default(), comment_options);
        let mut statements = builder.vec();
        let property = builder.binding_property(
            SPAN,
            builder.property_key_identifier_name(SPAN, Atom::from("AppOptions")),
            builder.binding_pattern(
                builder.binding_pattern_kind_binding_identifier(
                    SPAN,
                    Atom::from("AppOptions"),
                ),
                None::<TSTypeAnnotation>,
                false,
            ),
            true,
            false,
        );
        let init = builder.expression_identifier_reference(
            SPAN,
            Atom::from("PDFViewerApplication"),
        );
        let declaration = builder.declaration_from_variable(
            builder.variable_declaration(
                SPAN,
                VariableDeclarationKind::Const,
                builder.vec1(
                    builder.variable_declarator(
                        SPAN,
                        VariableDeclarationKind::Const,
                        builder.binding_pattern(
                            builder.binding_pattern_kind_object_pattern(
                                SPAN,
                                builder.vec1(property),
                                None::<BindingRestElement>,
                            ),
                            None::<TSTypeAnnotation>,
                            false,
                        ),
                        Some(init),
                        false,
                    )
                ),
                false,
            )
        );
        statements.push(
            Statement::from(declaration)
        );
        Self {
            in_app_variable_context: false,
            app_visited: false,
            app_codegen: RefCell::new(codegen),
            helper_codegen: RefCell::new(helper_codegen),
            app_builder: builder,
            app_body,
            helper_body: builder.function_body(SPAN, builder.vec(), statements),
            visiting_prop: None,
            source_text: source_text.to_string(),
            object_property_depth: 0,
            func_declare_depth: 0,
            object_expression_depth: 0,
            helpers: OxcVec::new_in(allocator),
            in_target_if_block: false,
            func_names_in_helper: OxcVec::from_iter_in(vec![
                Atom::from("validateFileURL"),
                Atom::from("webViewerFileInputChange"),
            ], builder.allocator),
        }
    }

    fn gen_helper_func(&mut self) {
        let codegen = self.helper_codegen.get_mut();
        codegen.print_str("function createHelper(PDFViewerApplication) {\n");
    }

    fn get_helper_func_text(&mut self) -> String {
        let mut properties = OxcVec::with_capacity_in(self.func_names_in_helper.len(), self.app_builder.allocator);

        for name in &self.func_names_in_helper {
            let s = name.as_str();
            let property = self.app_builder.object_property(
                SPAN,
                PropertyKind::Init,
                self.app_builder.property_key_identifier_name(SPAN, Atom::from(s)),
                self.app_builder.expression_identifier_reference(SPAN, Atom::from(s)),
                None,
                false,
                true,
                false,
            );

            properties.push(
                self.app_builder.object_property_kind_from_object_property(property)
            )
        }

        let statement = self.app_builder.return_statement(
            SPAN,
            Some(
                self.app_builder.expression_from_object(
                    self.app_builder.object_expression(
                        SPAN,
                        properties,
                        None,
                    )
                )
            ),
        );
        self.helper_body.statements.push(
            self.app_builder.statement_from_return(statement)
        );

        let body = self.helper_body.clone_in(self.app_builder.allocator);
        let id = self.app_builder.binding_identifier(SPAN, Atom::from("createHelper"));
        let parameters = self.app_builder.formal_parameters(
            SPAN,
            ast::FormalParameterKind::Signature,
            self.app_builder.vec1(self.app_builder.formal_parameter(
                SPAN,
                self.app_builder.vec(),
                self.app_builder.binding_pattern(
                    self.app_builder.binding_pattern_kind_binding_identifier(SPAN, "PDFViewerApplication"),
                    None::<TSTypeAnnotation>,
                    false,
                ),
                None,
                false,
                false,
            )),
            None::<BindingRestElement>,
        );

        let function = self.app_builder.function(
            FunctionType::FunctionDeclaration,
            SPAN,
            Some(id),
            false,
            false,
            false,
            None::<TSTypeParameterDeclaration>,
            None,
            parameters,
            None::<TSTypeAnnotation>,
            Some(body),
        );

        let codegen = self.helper_codegen.get_mut();
        let context = Context::default();
        function.gen(codegen, context);

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

    fn print_helper_statement(&mut self, statement: &str) {
        let codegen = self.helper_codegen.get_mut();
        codegen.print_str(statement)
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
                if self.app_visited && if_text == test_text && self.func_declare_depth == 0{
                    // self.helpers.push(it.clone_in(self.app_builder.allocator));
                    self.helper_body.statements.push(it.clone_in(self.app_builder.allocator));
                }
            },
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
                            && self.object_expression_depth == 0 {
                            if let Some(id) = &func.id {
                                // self.helpers.push(it.clone_in(self.app_builder.allocator));
                                let identifier = id.name.as_str();
                                self.func_names_in_helper.push(self.app_builder.atom(identifier));
                                self.helper_body.statements.push(it.clone_in(self.app_builder.allocator));
                            }

                        }
                        self.func_declare_depth += 1;
                    }
                    // Declaration::ClassDeclaration(it) => visitor.visit_class(it),
                    _ => {}
                }
            },
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

    fn visit_function(&mut self, func: &Function<'_>, flags: ScopeFlags) {
        if self.app_visited
            && self.func_declare_depth == 0
            && !self.in_target_if_block
            && self.object_expression_depth == 0
        {
            let mut identifier = "";
            if let Some(id) = &func.id {
                // identifier = id.name.as_str();
                // self.func_names_in_helper.push(identifier.to_string());
                // let statement = get_span_text(&self.source_text, &func.span, func.span.end as usize);
                // self.print_helper_statement(statement.as_str());
                // func.gen(self.helper_codegen.get_mut(), Context::default());
            }
        }

        self.func_declare_depth += 1;

        let kind = AstKind::Function(self.alloc(func));
        self.enter_node(kind);
        self.enter_scope(
            {
                let mut flags = flags;
                if func.is_strict() {
                    flags |= ScopeFlags::StrictMode;
                }
                flags
            },
            &func.scope_id,
        );
        if self.object_expression_depth == 1 && self.in_app_variable_context {
            self.print_class_method1(func);
        }

        if let Some(id) = &func.id {
            self.visit_binding_identifier(id);
        }
        if let Some(type_parameters) = &func.type_parameters {
            self.visit_ts_type_parameter_declaration(type_parameters);
        }
        if let Some(this_param) = &func.this_param {
            self.visit_ts_this_parameter(this_param);
        }
        self.visit_formal_parameters(&func.params);
        if let Some(return_type) = &func.return_type {
            self.visit_ts_type_annotation(return_type);
        }
        if let Some(body) = &func.body {
            self.visit_function_body(body);
        }
        self.leave_scope();
        self.leave_node(kind);
        self.func_declare_depth -= 1;
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

    fn visit_if_statement(&mut self, it: &IfStatement<'_>) {
        let if_text = "typeof PDFJSDev === \"undefined\" || PDFJSDev.test(\"GENERIC\")";
        match it.test {
            match_expression!(Expression) => {
                let test_span = it.test.span();
                let text = get_span_text(&self.source_text, &test_span, test_span.end as usize);
                if self.app_visited && text == if_text && self.func_declare_depth == 0 {
                    self.in_target_if_block = true;
                    // let span = it.span();
                    // let text = get_span_text(&self.source_text, &span, span.end as usize);
                    // self.print_helper_statement(text.as_str());
                    // self.helper_codegen.get_mut().print_str(text.as_str());
                    // it.gen(self.helper_codegen.get_mut(), Context::default());
                }
            }
        }
        walk_if_statement(self, it);
        self.in_target_if_block = false;
    }

    fn visit_module_declaration(&mut self, it: &ModuleDeclaration<'_>) {
        match it {
            ModuleDeclaration::ImportDeclaration(import) => {
                import.gen(self.helper_codegen.get_mut(), Context::default());
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

    // app.gen_helper_func();

    app.visit_program(&ret.program);

    app.print_class_end();
    let codegen = app.app_codegen.get_mut();
    let generated = codegen.into_source_text();
    let output = cwd.join("upstream/output.js");
    fs::write(&output, generated);

    let helper = cwd.join("upstream/helper.js");
    let helper_source = app.get_helper_func_text();
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
