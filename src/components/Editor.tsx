/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { parser } from '@lezer/python';
import { syntaxTree, LRLanguage, indentNodeProp, delimitedIndent, foldNodeProp, foldInside, LanguageSupport } from '@codemirror/language';
import { NodeWeakMap, IterMode, SyntaxNode } from '@lezer/common';
import { snippetCompletion, ifNotIn, completeFromList, Completion } from '@codemirror/autocomplete';
import { Entity, Ground, Item } from '../gameLogic/enums';
import { allowedStdLibFunctions, allowedTypes, gameLibraryFunctionsWithParams, gameLibraryFunctionsWithoutParams } from '../gameLogic/allowed';


// Define completions
const createCompletion = (label: string, type: string, applyOffset: number) => ({
  label,
  type,
  apply: (view: any, completion: any, from: number, to: number) => {
    view.dispatch({
      changes: { from, to, insert: `${label}()` },
      selection: { anchor: from + label.length + applyOffset }
    });
  }
});

const itemCompletions = Object.keys(Item).map(key => ({ label: `Item.${key}`, type: 'enum' }));
const entityCompletions = Object.keys(Entity).map(key => ({ label: `Entity.${key}`, type: 'enum' }));
const groundCompletions = Object.keys(Ground).map(key => ({ label: `Ground.${key}`, type: 'enum' }));

const gameLibraryCompletions = [
  ...gameLibraryFunctionsWithParams.map(n => createCompletion(n, 'function', 1)),
  ...gameLibraryFunctionsWithoutParams.map(n => createCompletion(n, 'function', 2))
];

const allowedStdLibCompletions = allowedStdLibFunctions.map(n => createCompletion(n, 'function', 1));
const allowedTypesCompletions = allowedTypes.map(n => ({ label: n, type: 'class' }));

const cache = new NodeWeakMap<Completion[]>();
const ScopeNodes = new Set(['Script', 'Body', 'FunctionDefinition', 'ForStatement']);
const gatherCompletions: any = {
  FunctionDefinition: defID('function'),
  ForStatement(node: any, def: any, outer: any) {
    if (outer)
      for (let child = node.node.firstChild; child; child = child.nextSibling) {
        if (child.name === 'VariableName') def(child, 'variable');
        else if (child.name === 'in') break;
      }
  },
  AssignStatement(node: any, def: any) {
    for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name === 'VariableName') def(child, 'variable');
      else if (child.name === ':' || child.name === 'AssignOp') break;
    }
  },
  ParamList(node: any, def: any) {
    for (let prev = null, child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name === 'VariableName' && (!prev || !/\*|AssignOp/.test(prev.name))) def(child, 'variable');
      prev = child;
    }
  },
  CapturePattern: defID('variable'),
  AsPattern: defID('variable'),
};

function defID(type: string) {
  return (node: any, def: any, outer: boolean) => {
    if (outer) return false;
    const id = node.node.getChild('VariableName');
    if (id) def(id, type);
    return true;
  };
}

function getScope(doc: any, node: any): Completion[] {
  const cached: Completion[] | undefined = cache.get(node);
  if (cached) return cached;
  const completions: Completion[] = [];
  const top = true;
  function def(node: any, type: string) {
    const name = doc.sliceString(node.from, node.to);
    completions.push({ label: name, type });
  }
  node.cursor(IterMode.IncludeAnonymous).iterate((node: any) => {
    if (node.name) {
      const gather = gatherCompletions[node.name];
      if (gather && gather(node, def, top) || !top && ScopeNodes.has(node.name)) return false;
    } else if (node.to - node.from > 8192) {
      for (const c of getScope(doc, node.node)) completions.push(c);
      return false;
    }
  });
  cache.set(node, completions);
  return completions;
}

const Identifier = /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/;
const dontComplete = ['String', 'Comment', 'PropertyName'];

function localCompletionSource(context: any) {
  const inner = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (dontComplete.includes(inner.name)) return null;
  const isWord = inner.name === 'VariableName' || inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to));
  if (!isWord && !context.explicit) return null;
  let options: Completion[] = [];
  for (let pos: SyntaxNode | null = inner; pos; pos = pos.parent) {
    if (ScopeNodes.has(pos.name)) options = options.concat(getScope(context.state.doc, pos));
  }
  return {
    options,
    from: isWord ? inner.from : context.pos,
    validFor: Identifier
  };
}

const globals: Completion[] = ['False', 'None', 'True'].map(n => ({ label: n, type: 'constant' }))
  .concat(allowedTypesCompletions)
  .concat(allowedStdLibCompletions)
  .concat(gameLibraryCompletions)
  .concat(itemCompletions)
  .concat(entityCompletions)
  .concat(groundCompletions);

const snippets: Completion[] = [
  snippetCompletion('def ${name}(${params}):\n\t${}', { label: 'def', detail: 'function', type: 'keyword' }),
  snippetCompletion('for ${name} in ${collection}:\n\t${}', { label: 'for', detail: 'loop', type: 'keyword' }),
  snippetCompletion('while ${}:\n\t${}', { label: 'while', detail: 'loop', type: 'keyword' }),
  snippetCompletion('if ${}:\n\t\n', { label: 'if', detail: 'block', type: 'keyword' }),
  snippetCompletion('if ${}:\n\t${}\nelse:\n\t${}', { label: 'if', detail: '/ else block', type: 'keyword' }),
];

const globalCompletion = ifNotIn(dontComplete, completeFromList(globals.concat(snippets)));

function innerBody(context: any) {
  let { node, pos } = context;
  const lineIndent = context.lineIndent(pos, -1);
  let found = null;
  for (; ;) {
    const before = node.childBefore(pos);
    if (!before) break;
    if (before.name === 'Comment') pos = before.from;
    else if (before.name === 'Body') {
      if (context.baseIndentFor(before) + context.unit <= lineIndent) found = before;
      node = before;
    } else if (before.type.is('Statement')) node = before;
    else break;
  }
  return found;
}

function indentBody(context: any, node: any) {
  const base = context.baseIndentFor(node);
  const line = context.lineAt(context.pos, -1), to = line.from + line.text.length;
  if (/^\s*($|#)/.test(line.text) && context.node.to < to + 100 && !/\S/.test(context.state.sliceDoc(to, context.node.to)) && context.lineIndent(context.pos, -1) <= base) return null;
  if (/^\s*(else:|elif)/.test(context.textAfter) && context.lineIndent(context.pos, -1) > base) return null;
  return base + context.unit;
}

const simplePythonLanguage = LRLanguage.define({
  name: 'python',
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Body: context => {
          const inner = innerBody(context);
          return inner ? indentBody(context, inner) : context.continue();
        },
        IfStatement: cx => /^\s*(else:|elif )/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
        'ForStatement WhileStatement': cx => /^\s*else:/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
        'TupleExpression ComprehensionExpression ParamList ArgList ParenthesizedExpression': delimitedIndent({ closing: ')' }),
        'DictionaryExpression DictionaryComprehensionExpression SetExpression SetComprehensionExpression': delimitedIndent({ closing: '}' }),
        'ArrayExpression ArrayComprehensionExpression': delimitedIndent({ closing: ']' }),
        'String FormatString': () => null,
        Script: context => {
          const inner = innerBody(context);
          return inner ? indentBody(context, inner) : context.continue();
        }
      }),
      foldNodeProp.add({
        'ArrayExpression DictionaryExpression SetExpression TupleExpression': foldInside,
        Body: (node, state) => ({ from: node.from + 1, to: node.to - (node.to === state.doc.length ? 0 : 1) })
      })
    ]
  }),
  languageData: {
    closeBrackets: {
      brackets: ["(", "[", "{", "'", '"'],
      stringPrefixes: ["f"]
    },
    commentTokens: { line: "#" },
    indentOnInput: /^\s*([\}\]\)]|else:|elif)$/
  }
});

function simplePython() {
  return new LanguageSupport(simplePythonLanguage, [
    simplePythonLanguage.data.of({ autocomplete: localCompletionSource }),
    simplePythonLanguage.data.of({ autocomplete: globalCompletion }),
  ]);
}

interface EditorProps {
  onCodeChange: (value: string) => unknown;
  code: string;
}

const Editor: React.FC<EditorProps> = ({ onCodeChange, code }) => (
  <CodeMirror
    value={code}
    extensions={[simplePython()]}
    basicSetup={{
      lineNumbers: true,
      tabSize: 4,
    }}
    onChange={(value) => onCodeChange(value)}
  />
);

export default Editor;

