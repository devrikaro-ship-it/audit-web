#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [appRoot, skillRoot] = process.argv.slice(2);
const ts = createRequire(path.join(appRoot, "package.json"))("typescript");
const pagePath = path.join(appRoot, "app/google-ads/raport/page.tsx");
const registryPath = path.join(appRoot, "app/google-ads/raport/report-contract.tsx");
const testPath = path.join(appRoot, "app/google-ads/raport/page.test.tsx");
const configPath = path.join(appRoot, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, appRoot).options;
const program = ts.createProgram([pagePath, registryPath], compilerOptions);
const checker = program.getTypeChecker();
const page = program.getSourceFile(pagePath);
const registryFile = program.getSourceFile(registryPath);
const testFile = ts.createSourceFile(testPath, fs.readFileSync(testPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const docs = JSON.parse(fs.readFileSync(path.join(skillRoot, "references/report-contract.json"), "utf8"));
const rulesText = fs.readFileSync(path.join(skillRoot, "google-ads/RULES.md"), "utf8");
const failures = [];
const resolveFinalSymbol = (node) => {
  let symbol = checker.getSymbolAtLocation(node);
  const seen = new Set();
  while (symbol && (symbol.flags & ts.SymbolFlags.Alias) && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
};
const sourceModule = (symbol) => {
  const declaration = symbol?.declarations?.find((candidate) => !candidate.getSourceFile().isDeclarationFile);
  if (!declaration) return undefined;
  const relative = path.relative(appRoot, declaration.getSourceFile().fileName).replaceAll(path.sep, "/").replace(/\.(?:tsx?|mts|cts)$/, "").replace(/\/index$/, "");
  return relative.startsWith("lib/") ? `@/${relative}` : undefined;
};
const domainIdentity = (node) => {
  const symbol = resolveFinalSymbol(node);
  const module = sourceModule(symbol);
  if (!module || !(module.startsWith("@/lib/gads-") || module === "@/lib/calc")) return undefined;
  return { symbol, module, operation: symbol.getName() };
};
const namespaceContainsDomain = (node) => {
  const moduleSymbol = resolveFinalSymbol(node);
  return Boolean(moduleSymbol && checker.getExportsOfModule(moduleSymbol).some((exported) => {
    let final = exported;
    const seen = new Set();
    while ((final.flags & ts.SymbolFlags.Alias) && !seen.has(final)) {
      seen.add(final);
      final = checker.getAliasedSymbol(final);
    }
    const module = sourceModule(final);
    return module?.startsWith("@/lib/gads-") || module === "@/lib/calc";
  }));
};
for (const statement of page.statements) {
  const bindings = ts.isImportDeclaration(statement) && statement.importClause?.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings) && namespaceContainsDomain(bindings.name)) failures.push(`domain namespace import is forbidden: ${statement.moduleSpecifier.text}`);
}

const literalValue = (node) => {
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalValue);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((property) => [property.name.getText(registryFile).replaceAll('"', ""), literalValue(property.initializer)]));
  return undefined;
};
let registry;
const guardBodies = new Map();
for (const statement of registryFile.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.name.text === "reportContract") {
      const initializer = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer;
      registry = literalValue(initializer);
    }
    if (ts.isIdentifier(declaration.name) && declaration.name.text === "reportGuards" && ts.isObjectLiteralExpression(declaration.initializer)) {
      for (const property of declaration.initializer.properties) if (ts.isPropertyAssignment(property) && ts.isArrowFunction(property.initializer)) {
        guardBodies.set(property.name.getText(registryFile), property.initializer.body.getText(registryFile).replaceAll(/\s/g, ""));
      }
    }
  }
}
if (!registry) throw new Error("executable report contract was not found");

const localFunctions = new Map();
let root;
const registerFunction = (name, node) => { if (name) localFunctions.set(name, node); };
for (const statement of page.statements) {
  if (ts.isFunctionDeclaration(statement)) {
    registerFunction(statement.name?.text, statement);
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) root = statement;
  }
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) registerFunction(declaration.name.text, declaration.initializer);
  }
}
const reachable = new Set();
const registeredSteps = new Set();
const registeredSurfaces = new Set();
const pending = [root];
const infrastructureModules = new Set(["@/lib/gads-session", "@/lib/gads-oauth", "@/lib/gads-demo", "@/lib/gads-margin", "@/lib/gads-read-disclosure"]);
const callableDeclaration = (node) => {
  const symbol = resolveFinalSymbol(node);
  for (const declaration of symbol?.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) return declaration.initializer;
  }
  return undefined;
};
const visitFunction = (fn) => {
  if (!fn || reachable.has(fn)) return;
  reachable.add(fn);
  const visit = (node, activeStep) => {
    if (ts.isIfStatement(node) && node.expression.kind === ts.SyntaxKind.FalseKeyword) {
      if (node.elseStatement) visit(node.elseStatement, activeStep);
      return;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && node.left.kind === ts.SyntaxKind.FalseKeyword) return;
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && ["runReportStep", "runGoogleAdsRead"].includes(node.expression.text) && ts.isStringLiteral(node.arguments[0])) {
        const id = node.arguments[0].text;
        registeredSteps.add(id);
        const operation = node.arguments[1];
        if (ts.isArrowFunction(operation) || ts.isFunctionExpression(operation)) {
          const ownedCalls = [];
          const collectOwned = (child) => {
            if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && ["runReportStep", "runGoogleAdsRead"].includes(child.expression.text)) return;
            if (ts.isCallExpression(child)) {
              const identity = domainIdentity(child.expression);
              if (identity && !infrastructureModules.has(identity.module)) ownedCalls.push({ module: identity.module, operation: identity.operation });
            }
            ts.forEachChild(child, collectOwned);
          };
          collectOwned(operation.body);
          const expected = registry.pipeline[id];
          if (ownedCalls.length !== 1 || !expected || ownedCalls[0].module !== expected.module || ownedCalls[0].operation !== expected.operation) failures.push(`step ${id} does not own exactly its registered operation`);
          visit(operation.body, id);
        } else failures.push(`step ${id} operation must be an inline arrow or function expression`);
        return;
      }
      if (ts.isIdentifier(node.expression) && localFunctions.has(node.expression.text)) pending.push(localFunctions.get(node.expression.text));
      const identity = domainIdentity(node.expression);
      if (identity && !infrastructureModules.has(identity.module) && !activeStep) failures.push(`reachable platform call is not governed by runReportStep: ${node.expression.getText(node.getSourceFile())}`);
      if (!identity) {
        const declaration = callableDeclaration(node.expression);
        const source = declaration?.getSourceFile();
        if (source && !source.isDeclarationFile && path.resolve(source.fileName).startsWith(`${path.resolve(appRoot)}${path.sep}`)) pending.push(declaration);
      }
    }
    if (ts.isIdentifier(node)) {
      const identity = domainIdentity(node);
      const isCallable = checker.getTypeAtLocation(node).getCallSignatures().length > 0;
      if (isCallable && identity && !infrastructureModules.has(identity.module)) {
        const isDirectGovernedCall = activeStep && ts.isCallExpression(node.parent) && node.parent.expression === node;
        if (!isDirectGovernedCall) failures.push(`domain callable escapes its governed inline operation: ${node.text}`);
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(page) === "ReportSurface") {
      const idAttribute = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.text === "id");
      if (idAttribute && ts.isStringLiteral(idAttribute.initializer)) {
        const id = idAttribute.initializer.text;
        registeredSurfaces.add(id);
        const expectedGuard = registry.surfaces[id]?.guard;
        if (expectedGuard) {
          const when = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.text === "when");
          const expression = when && ts.isJsxExpression(when.initializer) ? when.initializer.expression : undefined;
          if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression) || expression.expression.expression.getText(page) !== "reportGuards" || expression.expression.name.text !== expectedGuard) failures.push(`surface ${id} does not consume its registered guard`);
          else if (JSON.stringify(expression.arguments.map((argument) => argument.getText(page).replaceAll(/\s/g, ""))) !== JSON.stringify(registry.surfaces[id].projection)) failures.push(`surface ${id} does not consume its registered dependency projection`);
        }
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName) && localFunctions.has(node.tagName.text)) pending.push(localFunctions.get(node.tagName.text));
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(page) === "aside") {
      let ancestor = node.parent;
      let governed = false;
      while (ancestor && ancestor !== fn.body) {
        if ((ts.isJsxElement(ancestor) || ts.isJsxSelfClosingElement(ancestor)) && ancestor.getText(page).startsWith("<ReportSurface")) governed = true;
        ancestor = ancestor.parent;
      }
      if (!governed) failures.push("reachable visible aside is not governed by ReportSurface");
    }
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some((property) => ts.isJsxAttribute(property) && property.name.text === "data-report-root")) {
      for (const child of node.children) {
        if (ts.isJsxText(child) || (ts.isJsxExpression(child) && !child.expression)) continue;
        if (!ts.isJsxElement(child) || child.openingElement.tagName.getText(page) !== "ReportSurface") failures.push(`report root contains ungoverned top-level output: ${child.getText(page).slice(0, 40)}`);
      }
    }
    ts.forEachChild(node, (child) => visit(child, activeStep));
  };
  visit(fn.body, undefined);
};
while (pending.length) visitFunction(pending.pop());

let reportReturn;
const findReturn = (node) => {
  if (node !== root && ts.isFunctionLike(node)) return;
  if (ts.isReturnStatement(node)) {
    let expression = node.expression;
    while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
    if (ts.isJsxElement(expression)) reportReturn = expression;
  }
  else ts.forEachChild(node, findReturn);
};
findReturn(root.body);
if (!reportReturn) failures.push("report entry point has no JSX return root");
else {
  const visibleChildren = reportReturn.children.filter((child) => !ts.isJsxText(child) && !(ts.isJsxExpression(child) && (!child.expression || ts.isJsxEmptyExpression(child.expression))));
  if (visibleChildren.length !== 1 || !ts.isJsxElement(visibleChildren[0]) || !visibleChildren[0].openingElement.attributes.properties.some((property) => ts.isJsxAttribute(property) && property.name.text === "data-report-root")) failures.push("report return tree contains output outside data-report-root");
}

const allowedRoles = new Set(["source", "analysis"]);
const allowedAvailability = new Set(["required", "required-primary-optional-secondary", "optional", "optional-with-fallback"]);
const sourceVisibility = new Set(["explicit", "explicit-primary-silent-secondary", "silent", "silent-with-specific-visibility-caveat", "server-log-only"]);
const allowedRendering = new Set(["always-on-success", "conditional", "alternative"]);
const executablePipelineFields = new Set(["role", "module", "operation", "dependencies", "readCategories", "availability", "failureVisibility"]);
const executableSurfaceFields = new Set(["rendering", "dependencies", "projection", "guard", "predicate", "effect"]);
const pipelineFields = new Set(["kind", "symbol", "module", "operation", "inclusion", "availability", "failureVisibility", "dependencies", "readCategories", "effect"]);
const surfaceFields = new Set(["id", "inclusion", "rendering", "dependencies", "projection", "guard", "predicate", "effect", "evidence"]);
const registryPipelineIds = new Set(Object.keys(registry.pipeline));
for (const [id, entry] of Object.entries(registry.pipeline)) {
  for (const field of Object.keys(entry)) if (!executablePipelineFields.has(field)) failures.push(`pipeline ${id} has unknown property ${field}`);
  if (!allowedRoles.has(entry.role)) failures.push(`pipeline ${id} has impossible role`);
  if (!allowedAvailability.has(entry.availability)) failures.push(`pipeline ${id} has impossible availability`);
  if (entry.role === "source" && !sourceVisibility.has(entry.failureVisibility)) failures.push(`source ${id} has impossible failureVisibility`);
  if (entry.role === "source" && (!Array.isArray(entry.readCategories) || entry.readCategories.length === 0)) failures.push(`source ${id} has no disclosed read category`);
  if (entry.role === "analysis" && entry.readCategories !== undefined) failures.push(`analysis ${id} cannot declare read categories`);
  if (entry.role === "analysis" && entry.failureVisibility !== "not-applicable") failures.push(`analysis ${id} has impossible failureVisibility`);
  if (new Set(entry.dependencies).size !== entry.dependencies.length) failures.push(`pipeline ${id} has duplicate dependencies`);
  for (const dependency of entry.dependencies) if (!registryPipelineIds.has(dependency)) failures.push(`pipeline ${id} has ghost dependency ${dependency}`);
}
for (const id of registeredSteps) if (!registryPipelineIds.has(id)) failures.push(`reachable unregistered pipeline step: ${id}`);
for (const id of registryPipelineIds) if (!registeredSteps.has(id)) failures.push(`registry pipeline step is not executed: ${id}`);

const registrySurfaceIds = new Set(Object.keys(registry.surfaces));
for (const [id, surface] of Object.entries(registry.surfaces)) {
  for (const field of Object.keys(surface)) if (!executableSurfaceFields.has(field)) failures.push(`surface ${id} has unknown property ${field}`);
  if (!surface.effect?.trim()) failures.push(`surface ${id} has empty executable effect`);
  if (!allowedRendering.has(surface.rendering)) failures.push(`surface ${id} has impossible rendering`);
  if (surface.rendering === "conditional" && (!surface.guard || !surface.predicate || !surface.projection || surface.projection.length !== surface.dependencies.length)) failures.push(`conditional surface ${id} has incomplete guard contract`);
  if (surface.rendering !== "conditional" && (surface.guard || surface.predicate || surface.projection)) failures.push(`unconditional surface ${id} cannot declare a guard contract`);
  if (surface.guard && guardBodies.get(surface.guard) !== surface.predicate.replaceAll(/\s/g, "")) failures.push(`surface ${id} predicate contradicts executable guard`);
}
for (const id of registeredSurfaces) if (!registrySurfaceIds.has(id)) failures.push(`reachable unregistered surface: ${id}`);
for (const id of registrySurfaceIds) if (!registeredSurfaces.has(id)) failures.push(`registry surface is not rendered: ${id}`);

const thresholdsSection = rulesText.match(/^## Thresholds\s*$([\s\S]*?)(?=^##\s)/m)?.[1] ?? "";
const thresholdNumbers = [...thresholdsSection.matchAll(/^(\d+)\.\s/gm)].map((match) => Number(match[1]));
const sequentialThresholdNumbers = thresholdNumbers.map((_, index) => index + 1);
if (!thresholdNumbers.length || JSON.stringify(thresholdNumbers) !== JSON.stringify(sequentialThresholdNumbers)) failures.push("threshold rules must use unique sequential numbering from 1");

const compareEntries = (kind, executable, documented) => {
  const seen = new Set();
  for (const entry of documented ?? []) {
    const id = kind === "pipeline" ? entry.symbol : entry.id;
    if (seen.has(id)) failures.push(`duplicate documented ${kind} entry: ${id}`);
    seen.add(id);
    const allowedFields = kind === "pipeline" ? pipelineFields : surfaceFields;
    for (const field of Object.keys(entry)) if (!allowedFields.has(field)) failures.push(`documented ${kind} ${id} has unknown property ${field}`);
    if (entry.inclusion !== "included") failures.push(`documented ${kind} ${id} must be included`);
    if (!entry.effect?.trim()) failures.push(`documented ${kind} ${id} has empty effect`);
    const actual = executable[id];
    if (!actual) { failures.push(`invented documented ${kind}: ${id}`); continue; }
    const role = entry.kind ?? entry.role;
    if (kind === "pipeline" && role !== actual.role) failures.push(`documented pipeline ${id} has contradictory role`);
    for (const field of ["module", "operation", "availability", "failureVisibility", "rendering", "guard", "predicate", "effect"]) if (actual[field] !== undefined && entry[field] !== actual[field]) failures.push(`documented ${kind} ${id} contradicts ${field}`);
    if (JSON.stringify([...(entry.dependencies ?? [])].sort()) !== JSON.stringify([...actual.dependencies].sort())) failures.push(`documented ${kind} ${id} contradicts dependencies`);
    if (JSON.stringify(entry.readCategories ?? []) !== JSON.stringify(actual.readCategories ?? [])) failures.push(`documented ${kind} ${id} contradicts readCategories`);
    if (JSON.stringify(entry.projection ?? []) !== JSON.stringify(actual.projection ?? [])) failures.push(`documented ${kind} ${id} contradicts projection`);
    if (kind === "surface" && (entry.evidence?.type !== "render-test" || !entry.evidence.testName || Object.keys(entry.evidence).some((field) => !["type", "testName"].includes(field)))) failures.push(`documented surface ${id} has invalid evidence`);
  }
  for (const id of Object.keys(executable)) if (!seen.has(id)) failures.push(`missing documented ${kind}: ${id}`);
};
compareEntries("pipeline", registry.pipeline, docs.pipeline);
compareEntries("surface", registry.surfaces, docs.surfaces);

const findTest = (name) => {
  let found;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["it", "test"].includes(node.expression.text) && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === name) found = node.arguments[1];
    ts.forEachChild(node, visit);
  };
  visit(testFile);
  return found;
};
const assertionCoverage = (testNode, id) => {
  let positive = false;
  let negative = false;
  const needle = `data-report-surface=\"${id}\"`;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toContain" && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === needle) {
      if (node.expression.expression.getText(testFile).endsWith(".not")) negative = true;
      else positive = true;
    }
    ts.forEachChild(node, visit);
  };
  if (testNode) visit(testNode);
  return { positive, negative };
};
const declaredTestNames = new Set();
for (const surface of docs.surfaces) {
  const testName = surface.evidence?.testName;
  declaredTestNames.add(testName);
  const coverage = assertionCoverage(findTest(testName), surface.id);
  if (!coverage.positive) failures.push(`surface ${surface.id} evidence lacks its positive assertion`);
  if (surface.rendering === "conditional" && !coverage.negative) failures.push(`conditional surface ${surface.id} evidence lacks its negative assertion`);
}
const escapedNames = [...declaredTestNames].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const tests = spawnSync("npm", ["test", "--", "app/google-ads/raport/page.test.tsx", "-t", `(?:${escapedNames.join("|")})`], { cwd: appRoot, encoding: "utf8" });
if (tests.status !== 0) failures.push("rendered contract tests failed");
if (failures.length) {
  for (const failure of failures) console.log(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`PASS: executable registry governs ${registeredSteps.size} reachable steps and ${registeredSurfaces.size} surfaces; rendered boundary tests passed`);
