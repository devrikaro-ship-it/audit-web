#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const [appRoot] = process.argv.slice(2);
if (!appRoot) throw new Error("Usage: check_public_google_ads_reads.mjs <app-root>");
const ts = createRequire(path.join(appRoot, "package.json"))("typescript");
const configPath = path.join(appRoot, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, appRoot).options;
const routeRoot = path.join(appRoot, "app/google-ads");
const routeFiles = [];
const collectFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(absolute);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) routeFiles.push(absolute);
  }
};
collectFiles(routeRoot);
const registryPath = path.join(appRoot, "shared/public-contract/read-disclosure.ts");
const program = ts.createProgram([...routeFiles, registryPath], compilerOptions);
const checker = program.getTypeChecker();
const failures = [];
const resolveSymbolAliases = (symbol) => {
  const seen = new Set();
  while (symbol && (symbol.flags & ts.SymbolFlags.Alias) && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
};
const resolveFinalSymbol = (node) => resolveSymbolAliases(checker.getSymbolAtLocation(node));
const unwrapExpression = (node) => {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
  return node;
};
const staticKey = (node, seen = new Set()) => {
  node = unwrapExpression(node);
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) {
    const symbol = resolveFinalSymbol(node);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        const value = staticKey(declaration.initializer, seen);
        if (value !== undefined) return value;
      }
    }
  }
  return undefined;
};
const staticInteger = (node, seen = new Set()) => {
  node = unwrapExpression(node);
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const value = staticInteger(node.operand, seen);
    return value === undefined ? undefined : -value;
  }
  if (ts.isIdentifier(node)) {
    const symbol = resolveFinalSymbol(node);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        const value = staticInteger(declaration.initializer, seen);
        if (value !== undefined) return value;
      }
    }
  }
  return undefined;
};
const propertyKey = (name) => {
  if (ts.isComputedPropertyName(name)) return staticKey(name.expression);
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
};
const valueExpression = (node, seen = new Set()) => {
  node = unwrapExpression(node);
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  if (ts.isCallExpression(node)) {
    const selector = unwrapExpression(node.expression);
    if (ts.isPropertyAccessExpression(selector) && selector.name.text === "at" && node.arguments.length === 1) {
      const container = valueExpression(selector.expression, seen) ?? unwrapExpression(selector.expression);
      const rawIndex = staticInteger(node.arguments[0]);
      if (ts.isArrayLiteralExpression(container) && rawIndex !== undefined && Number.isInteger(rawIndex)) {
        const index = rawIndex < 0 ? container.elements.length + rawIndex : rawIndex;
        const element = index >= 0 ? container.elements[index] : undefined;
        if (element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)) return unwrapExpression(element);
      }
    }
  }
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    const key = ts.isPropertyAccessExpression(node) ? node.name.text : staticKey(node.argumentExpression);
    const container = valueExpression(node.expression, seen) ?? unwrapExpression(node.expression);
    if (key !== undefined && ts.isElementAccessExpression(node) && ts.isArrayLiteralExpression(container)) {
      const index = Number(key);
      const element = Number.isInteger(index) && index >= 0 ? container.elements[index] : undefined;
      if (element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)) return unwrapExpression(element);
    }
    if (key !== undefined && ts.isObjectLiteralExpression(container)) {
      for (const property of container.properties) {
        if ((ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property)) && propertyKey(property.name) === key) {
          if (ts.isPropertyAssignment(property)) return unwrapExpression(property.initializer);
          if (ts.isShorthandPropertyAssignment(property)) return property.name;
          return property;
        }
      }
    }
  }
  if (ts.isIdentifier(node)) {
    const symbol = resolveFinalSymbol(node);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) return valueExpression(declaration.initializer, seen) ?? unwrapExpression(declaration.initializer);
      if (ts.isBindingElement(declaration)) {
        const pattern = declaration.parent;
        const variable = pattern.parent;
        if (ts.isArrayBindingPattern(pattern) && ts.isVariableDeclaration(variable) && variable.initializer) {
          const index = pattern.elements.indexOf(declaration);
          const container = valueExpression(variable.initializer, seen) ?? unwrapExpression(variable.initializer);
          const element = ts.isArrayLiteralExpression(container) ? container.elements[index] : undefined;
          if (element && !ts.isOmittedExpression(element) && !ts.isSpreadElement(element)) return unwrapExpression(element);
        }
        if (ts.isObjectBindingPattern(pattern) && ts.isVariableDeclaration(variable) && variable.initializer) {
          const key = propertyKey(declaration.propertyName ?? declaration.name);
          const container = valueExpression(variable.initializer, seen) ?? unwrapExpression(variable.initializer);
          if (key !== undefined && ts.isObjectLiteralExpression(container)) {
            const property = container.properties.find((candidate) => (ts.isPropertyAssignment(candidate) || ts.isShorthandPropertyAssignment(candidate) || ts.isMethodDeclaration(candidate)) && propertyKey(candidate.name) === key);
            if (property && ts.isPropertyAssignment(property)) return unwrapExpression(property.initializer);
            if (property && ts.isShorthandPropertyAssignment(property)) return property.name;
            if (property && ts.isMethodDeclaration(property)) return property;
          }
        }
      }
    }
  }
  if (ts.isObjectLiteralExpression(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node;
  return undefined;
};
const callableDeclaration = (node, seen = new Set()) => {
  node = unwrapExpression(node);
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  const resolvedValue = valueExpression(node);
  if (resolvedValue && resolvedValue !== node) {
    const resolved = callableDeclaration(resolvedValue, seen);
    if (resolved) return resolved;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node;
  const symbol = resolveFinalSymbol(node);
  for (const declaration of symbol?.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const resolved = callableDeclaration(declaration.initializer, seen);
      if (resolved) return resolved;
    }
    if (ts.isPropertyAssignment(declaration)) {
      const resolved = callableDeclaration(declaration.initializer, seen);
      if (resolved) return resolved;
    }
    if (ts.isShorthandPropertyAssignment(declaration)) {
      const valueSymbol = resolveSymbolAliases(checker.getShorthandAssignmentValueSymbol(declaration));
      for (const valueDeclaration of valueSymbol?.declarations ?? []) {
        if (ts.isFunctionDeclaration(valueDeclaration) || ts.isMethodDeclaration(valueDeclaration)) return valueDeclaration;
        if (ts.isVariableDeclaration(valueDeclaration) && valueDeclaration.initializer) {
          const resolved = callableDeclaration(valueDeclaration.initializer, seen);
          if (resolved) return resolved;
        }
      }
    }
  }
  return undefined;
};
const exportedIdentity = (node) => {
  const callable = callableDeclaration(node);
  const declaration = callable && !callable.getSourceFile().isDeclarationFile ? callable : undefined;
  if (!declaration) return undefined;
  let nameNode = declaration.name;
  if (!nameNode && (ts.isArrowFunction(declaration) || ts.isFunctionExpression(declaration)) && ts.isVariableDeclaration(declaration.parent)) nameNode = declaration.parent.name;
  if (!nameNode || !ts.isIdentifier(nameNode)) return undefined;
  const symbol = resolveFinalSymbol(nameNode);
  const relative = path.relative(appRoot, declaration.getSourceFile().fileName).replaceAll(path.sep, "/").replace(/\.(?:tsx?|jsx?)$/, "").replace(/\/index$/, "");
  return { module: `@/${relative}`, operation: symbol?.getName() ?? nameNode.text };
};
const registryFile = program.getSourceFile(registryPath);
const registry = {};
const readLiteral = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
const registryVisit = (node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "googleAdsReadRegistry") {
    let initializer = node.initializer;
    if (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)) initializer = initializer.expression;
    if (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)) initializer = initializer.expression;
    if (!ts.isObjectLiteralExpression(initializer)) failures.push("Google Ads read registry is not a closed object literal");
    else for (const property of initializer.properties) {
      if (!ts.isPropertyAssignment(property)) { failures.push("Google Ads read registry contains a non-property entry"); continue; }
      const id = property.name.getText(registryFile).replace(/^['\"]|['\"]$/g, "");
      if (!ts.isObjectLiteralExpression(property.initializer)) { failures.push(`Google Ads read ${id} is not a closed object`); continue; }
      const fields = Object.fromEntries(property.initializer.properties.filter(ts.isPropertyAssignment).map((field) => [field.name.getText(registryFile).replace(/^['\"]|['\"]$/g, ""), field.initializer]));
      registry[id] = { module: readLiteral(fields.module), operation: readLiteral(fields.operation) };
    }
  }
  ts.forEachChild(node, registryVisit);
};
registryVisit(registryFile);

const reachesGoogleAdsSearch = (declaration, seen = new Set()) => {
  if (!declaration || seen.has(declaration)) return false;
  seen.add(declaration);
  let reaches = false;
  const visit = (node) => {
    if (reaches) return;
    if (ts.isCallExpression(node)) {
      const identity = exportedIdentity(node.expression);
      if (identity?.module === "@/lib/net" && identity.operation === "googleAdsSearch") { reaches = true; return; }
      if (reachesGoogleAdsSearch(callableDeclaration(node.expression), seen)) { reaches = true; return; }
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration);
  return reaches;
};
const isCanonicalGovernorCall = (node) => {
  if (!ts.isCallExpression(node)) return false;
  const identity = exportedIdentity(node.expression);
  return identity?.module === "@/lib/gads-read-disclosure" && identity.operation === "runGoogleAdsRead";
};
const observed = new Map();
const analyzedDeclarations = new Set();
const registeredOperationKey = (identity) => identity ? `${identity.module}#${identity.operation}` : undefined;
const registeredOperations = new Set(Object.values(registry).map(registeredOperationKey));
const isUnresolvedLocalContainerCall = (node) => {
  const expression = unwrapExpression(node.expression);
  if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) return false;
  const container = valueExpression(expression.expression);
  const finiteContainer = container && (ts.isObjectLiteralExpression(container) || (ts.isElementAccessExpression(expression) && ts.isArrayLiteralExpression(container)));
  return Boolean(finiteContainer && !callableDeclaration(expression));
};
const isUnresolvedLocalSelectorCall = (node) => {
  const invokedValue = unwrapExpression(node.expression);
  if (!ts.isCallExpression(invokedValue)) return false;
  const selector = unwrapExpression(invokedValue.expression);
  if (!ts.isPropertyAccessExpression(selector) && !ts.isElementAccessExpression(selector)) return false;
  const container = valueExpression(selector.expression);
  return Boolean(container && ts.isArrayLiteralExpression(container) && !callableDeclaration(invokedValue));
};
const analyzeTree = (rootNode) => {
  const visit = (node) => {
    if (isCanonicalGovernorCall(node)) {
      const id = readLiteral(node.arguments[0]);
      const operation = node.arguments[1];
      const callSite = `${path.relative(appRoot, node.getSourceFile().fileName)}:${node.getStart(node.getSourceFile())}`;
      if (!id || !registry[id]) failures.push(`unregistered Google Ads read id at ${callSite}: ${id ?? "dynamic"}`);
      if (!ts.isArrowFunction(operation) && !ts.isFunctionExpression(operation)) failures.push(`Google Ads read ${id ?? "dynamic"} must use an inline operation`);
      else {
        const owned = [];
        const collect = (child) => {
          if (ts.isCallExpression(child)) {
            const declaration = callableDeclaration(child.expression);
            if (reachesGoogleAdsSearch(declaration)) owned.push(exportedIdentity(child.expression));
          }
          ts.forEachChild(child, collect);
        };
        collect(operation.body);
        const expected = registry[id];
        if (owned.length !== 1 || !expected || owned[0]?.module !== expected.module || owned[0]?.operation !== expected.operation) failures.push(`Google Ads read ${id ?? "dynamic"} at ${callSite} does not own exactly its registered operation`);
        else observed.set(callSite, { id, owner: registeredOperationKey(owned[0]) });
      }
      return;
    }
    if (ts.isCallExpression(node)) {
      if (isUnresolvedLocalContainerCall(node)) {
        const callSite = `${path.relative(appRoot, node.getSourceFile().fileName)}:${node.getStart(node.getSourceFile())}`;
        failures.push(`reachable local callable value cannot be resolved at ${callSite}`);
      }
      if (isUnresolvedLocalSelectorCall(node)) {
        const callSite = `${path.relative(appRoot, node.getSourceFile().fileName)}:${node.getStart(node.getSourceFile())}`;
        failures.push(`reachable local callable selector cannot be resolved at ${callSite}`);
      }
      const identity = exportedIdentity(node.expression);
      const declaration = callableDeclaration(node.expression);
      if ((identity?.module === "@/lib/net" && identity.operation === "googleAdsSearch") || registeredOperations.has(registeredOperationKey(identity))) {
        failures.push(`reachable Google Ads read is unregistered: ${identity?.module ?? "unknown"}#${identity?.operation ?? node.expression.getText(source)}`);
      } else if (declaration && !analyzedDeclarations.has(declaration)) {
        const declarationPath = path.resolve(declaration.getSourceFile().fileName);
        if (declarationPath.startsWith(`${path.resolve(appRoot)}${path.sep}`)) {
          analyzedDeclarations.add(declaration);
          analyzeTree(declaration);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(rootNode);
};
for (const filePath of routeFiles) {
  analyzeTree(program.getSourceFile(filePath));
}
const observedIds = new Set([...observed.values()].map((entry) => entry.id));
for (const id of Object.keys(registry)) if (!observedIds.has(id)) failures.push(`registered Google Ads read is not reachable from a public audit path: ${id}`);
if (failures.length) {
  for (const failure of [...new Set(failures)]) console.log(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`PASS: ${Object.keys(registry).length} registered Google Ads reads match all reachable public audit operations in both directions`);
