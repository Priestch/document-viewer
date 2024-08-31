use oxc::allocator;
use oxc::allocator::{Allocator, CloneIn};
use oxc::ast::ast::{
    BindingRestElement, FunctionBody, FunctionType, ImportDeclaration, ImportOrExportKind,
    ModuleExportName, PropertyKind, Statement, TSTypeAnnotation, TSTypeParameterDeclaration,
    VariableDeclarationKind,
};
use oxc::ast::{ast, AstBuilder};
use oxc::codegen::{Codegen, Context, Gen};
use oxc::span::{Atom, SourceType, SPAN};
use std::cell::RefCell;

pub struct UtilsGen<'a> {
    codegen: RefCell<Codegen<'a>>,
    builder: AstBuilder<'a>,
    main_body: FunctionBody<'a>,
    func_names: allocator::Vec<'a, Atom<'a>>,
    default_service_statements: allocator::Vec<'a, Statement<'a>>,
}

impl<'a> UtilsGen<'a> {
    pub fn new(allocator: &'a Allocator) -> Self {
        let builder = AstBuilder::new(allocator);
        let codegen = Codegen::new();
        // let comment_options = CommentOptions {
        //     preserve_annotate_comments: true
        // };
        // helper_codegen = helper_codegen.enable_comment("", Trivias::default(), comment_options);
        let mut statements = builder.vec();
        let property = builder.binding_property(
            SPAN,
            builder.property_key_identifier_name(SPAN, Atom::from("AppOptions")),
            builder.binding_pattern(
                builder.binding_pattern_kind_binding_identifier(SPAN, Atom::from("AppOptions")),
                None::<TSTypeAnnotation>,
                false,
            ),
            true,
            false,
        );
        let init =
            builder.expression_identifier_reference(SPAN, Atom::from("PDFViewerApplication"));
        let declaration = builder.declaration_from_variable(builder.variable_declaration(
            SPAN,
            VariableDeclarationKind::Const,
            builder.vec1(builder.variable_declarator(
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
            )),
            false,
        ));
        statements.push(Statement::from(declaration));

        Self {
            codegen: RefCell::new(codegen),
            builder,
            main_body: builder.function_body(SPAN, builder.vec(), statements),
            func_names: allocator::Vec::from_iter_in(
                vec![
                    Atom::from("validateFileURL"),
                    Atom::from("webViewerFileInputChange"),
                ],
                builder.allocator,
            ),
            default_service_statements: allocator::Vec::new_in(allocator),
        }
    }

    pub fn get_module_text(&mut self) -> String {
        let mut properties =
            allocator::Vec::with_capacity_in(self.func_names.len(), self.builder.allocator);

        for name in &self.func_names {
            let s = name.as_str();
            let property = self.builder.object_property(
                SPAN,
                PropertyKind::Init,
                self.builder
                    .property_key_identifier_name(SPAN, Atom::from(s)),
                self.builder
                    .expression_identifier_reference(SPAN, Atom::from(s)),
                None,
                false,
                true,
                false,
            );

            properties.push(
                self.builder
                    .object_property_kind_from_object_property(property),
            )
        }

        let statement = self.builder.return_statement(
            SPAN,
            Some(
                self.builder
                    .expression_from_object(self.builder.object_expression(SPAN, properties, None)),
            ),
        );
        self.main_body
            .statements
            .push(self.builder.statement_from_return(statement));

        let body = self.main_body.clone_in(self.builder.allocator);
        let id = self
            .builder
            .binding_identifier(SPAN, Atom::from("createHelper"));
        let parameters = self.builder.formal_parameters(
            SPAN,
            ast::FormalParameterKind::Signature,
            self.builder.vec1(
                self.builder.formal_parameter(
                    SPAN,
                    self.builder.vec(),
                    self.builder.binding_pattern(
                        self.builder
                            .binding_pattern_kind_binding_identifier(SPAN, "PDFViewerApplication"),
                        None::<TSTypeAnnotation>,
                        false,
                    ),
                    None,
                    false,
                    false,
                ),
            ),
            None::<BindingRestElement>,
        );

        let function = self.builder.function(
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

        let codegen = self.codegen.get_mut();
        let context = Context::default();
        function.gen(codegen, context);

        let export_stmt = self.builder.module_declaration_export_named_declaration(
            SPAN,
            None,
            self.builder.vec1(
                self.builder.export_specifier(
                    SPAN,
                    ModuleExportName::IdentifierName(
                        self.builder
                            .identifier_name(SPAN, Atom::from("createHelper")),
                    ),
                    ModuleExportName::IdentifierName(
                        self.builder
                            .identifier_name(SPAN, Atom::from("createHelper")),
                    ),
                    ImportOrExportKind::Value,
                ),
            ),
            None,
            ImportOrExportKind::Value,
            None,
        );

        Statement::from(export_stmt).gen(codegen, context);

        codegen.into_source_text()
    }

    pub fn add_func_statement(&mut self, statement: Statement<'a>) {
        self.main_body.statements.push(statement)
    }

    pub fn add_func_name(&mut self, name: Atom<'a>) {
        self.func_names.push(name)
    }

    pub fn gen_import_declaration(&mut self, it: &allocator::Box<ImportDeclaration>) {
        it.gen(self.codegen.get_mut(), Context::default());
    }

    pub fn add_external_service_statement(&mut self, statement: Statement<'a>) {
        self.default_service_statements.push(statement)
    }

    pub fn get_default_external_service_text(&mut self) -> String {
        let mut codegen = Codegen::new();
        codegen.print_str("import { shadow } from \"pdfjs-lib\";\n\n");

        for stmt in &self.default_service_statements {
            stmt.gen(&mut codegen, Context::default());
        }

        let export_stmt = self.builder.module_declaration_export_named_declaration(
            SPAN,
            None,
            self.builder.vec1(
                self.builder.export_specifier(
                    SPAN,
                    ModuleExportName::IdentifierName(
                        self.builder
                            .identifier_name(SPAN, Atom::from("DefaultExternalServices")),
                    ),
                    ModuleExportName::IdentifierName(
                        self.builder
                            .identifier_name(SPAN, Atom::from("DefaultExternalServices")),
                    ),
                    ImportOrExportKind::Value,
                ),
            ),
            None,
            ImportOrExportKind::Value,
            None,
        );

        Statement::from(export_stmt).gen(&mut codegen, Context::default());

        codegen.into_source_text()
    }
}
