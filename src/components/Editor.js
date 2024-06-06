import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { parser } from '@lezer/python';
import { syntaxTree, LRLanguage, indentNodeProp, delimitedIndent, foldNodeProp, foldInside, LanguageSupport } from '@codemirror/language';
import { NodeWeakMap, IterMode } from '@lezer/common';
import { snippetCompletion, ifNotIn, completeFromList } from '@codemirror/autocomplete';
import {
  Item,
  Entity,
  Ground,
  gameLibraryFunctionsWithParams,
  gameLibraryFunctionsWithoutParams,
  allowedStdLibFunctions,
  allowedTypes
} from '../GameLogic';


// Define completions
const itemCompletions = Object.keys(Item).map(key => ({ label: 'Item.' + key, type: 'enum' }));
const entityCompletions = Object.keys(Entity).map(key => ({ label: 'Entity.' + key, type: 'enum' }));
const groundCompletions = Object.keys(Ground).map(key => ({ label: 'Ground.' + key, type: 'enum' }));

const gameLibraryFunctionsWithParamsCompletions = gameLibraryFunctionsWithParams.map(n => ({
  label: n,
  type: "function",
  apply: (view, completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert: `${n}()` },
      selection: { anchor: from + n.length + 1 }
    });
  }
}));

const gameLibraryFunctionsWithoutParamsCompletions = gameLibraryFunctionsWithoutParams.map(n => ({
  label: n,
  type: "function",
  apply: (view, completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert: `${n}()` },
      selection: { anchor: from + n.length + 2 }
    });
  }
}));

const allowedStdLibFunctionsCompletions = allowedStdLibFunctions.map(n => ({
  label: n,
  type: "function",
  apply: (view, completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert: `${n}()` },
      selection: { anchor: from + n.length + 1 }
    });
  }
}));

const allowedTypesCompletions = allowedTypes.map(n => ({ label: n, type: "class" }));

const cache = new NodeWeakMap();
const ScopeNodes = new Set([
  "Script", "Body",
  "FunctionDefinition",
  "ForStatement",
]);
function defID(type) {
  return (node, def, outer) => {
    if (outer)
      return false;
    let id = node.node.getChild("VariableName");
    if (id)
      def(id, type);
    return true;
  };
}
const gatherCompletions = {
  FunctionDefinition: defID("function"),
  ForStatement(node, def, outer) {
    if (outer)
      for (let child = node.node.firstChild; child; child = child.nextSibling) {
        if (child.name == "VariableName")
          def(child, "variable");
        else if (child.name == "in")
          break;
      }
  },
  AssignStatement(node, def) {
    for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name == "VariableName")
        def(child, "variable");
      else if (child.name == ":" || child.name == "AssignOp")
        break;
    }
  },
  ParamList(node, def) {
    for (let prev = null, child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name == "VariableName" && (!prev || !/\*|AssignOp/.test(prev.name)))
        def(child, "variable");
      prev = child;
    }
  },
  CapturePattern: defID("variable"),
  AsPattern: defID("variable"),
  __proto__: null
};
function getScope(doc, node) {
  let cached = cache.get(node);
  if (cached)
    return cached;
  let completions = [], top = true;
  function def(node, type) {
    let name = doc.sliceString(node.from, node.to);
    completions.push({ label: name, type });
  }
  node.cursor(IterMode.IncludeAnonymous).iterate(node => {
    if (node.name) {
      let gather = gatherCompletions[node.name];
      if (gather && gather(node, def, top) || !top && ScopeNodes.has(node.name))
        return false;
      top = false;
    }
    else if (node.to - node.from > 8192) {
      // Allow caching for bigger internal nodes
      for (let c of getScope(doc, node.node))
        completions.push(c);
      return false;
    }
  });
  cache.set(node, completions);
  return completions;
}
const Identifier = /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/;
const dontComplete = ["String", "Comment", "PropertyName"];
/**
Completion source that looks up locally defined names in
Python code.
*/
function localCompletionSource(context) {
  const inner = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (dontComplete.indexOf(inner.name) > -1) return null;
  const isWord = inner.name == "VariableName" || inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to));
  if (!isWord && !context.explicit) return null;

  let options = [];

  for (let pos = inner; pos; pos = pos.parent) {
    if (ScopeNodes.has(pos.name))
      options = options.concat(getScope(context.state.doc, pos));
  }

  return {
    options,
    from: isWord ? inner.from : context.pos,
    validFor: Identifier
  };
}
const globals = ["False", "None", "True"].map(n => ({ label: n, type: "constant" }))
  .concat(allowedTypesCompletions)
  .concat(allowedStdLibFunctionsCompletions)
  .concat(gameLibraryFunctionsWithParamsCompletions)
  .concat(gameLibraryFunctionsWithoutParamsCompletions)
  .concat(itemCompletions)
  .concat(entityCompletions)
  .concat(groundCompletions);
const snippets = [
  snippetCompletion("def ${name}(${params}):\n\t${}", {
    label: "def",
    detail: "function",
    type: "keyword"
  }),
  snippetCompletion("for ${name} in ${collection}:\n\t${}", {
    label: "for",
    detail: "loop",
    type: "keyword"
  }),
  snippetCompletion("while ${}:\n\t${}", {
    label: "while",
    detail: "loop",
    type: "keyword"
  }),
  snippetCompletion("if ${}:\n\t\n", {
    label: "if",
    detail: "block",
    type: "keyword"
  }),
  snippetCompletion("if ${}:\n\t${}\nelse:\n\t${}", {
    label: "if",
    detail: "/ else block",
    type: "keyword"
  }),
];
/**
Autocompletion for built-in Python globals and keywords.
*/
const globalCompletion = ifNotIn(dontComplete, completeFromList(globals.concat(snippets)));

function innerBody(context) {
  let { node, pos } = context;
  let lineIndent = context.lineIndent(pos, -1);
  let found = null;
  for (; ;) {
    let before = node.childBefore(pos);
    if (!before) {
      break;
    }
    else if (before.name == "Comment") {
      pos = before.from;
    }
    else if (before.name == "Body") {
      if (context.baseIndentFor(before) + context.unit <= lineIndent)
        found = before;
      node = before;
    }
    else if (before.type.is("Statement")) {
      node = before;
    }
    else {
      break;
    }
  }
  return found;
}
function indentBody(context, node) {
  let base = context.baseIndentFor(node);
  let line = context.lineAt(context.pos, -1), to = line.from + line.text.length;
  // Don't consider blank, deindented lines at the end of the
  // block part of the block
  if (/^\s*($|#)/.test(line.text) &&
    context.node.to < to + 100 &&
    !/\S/.test(context.state.sliceDoc(to, context.node.to)) &&
    context.lineIndent(context.pos, -1) <= base)
    return null;
  // A normally deindenting keyword that appears at a higher
  // indentation than the block should probably be handled by the next
  // level
  if (/^\s*(else:|elif)/.test(context.textAfter) && context.lineIndent(context.pos, -1) > base)
    return null;
  return base + context.unit;
}
/**
A language provider based on the [Lezer Python
parser](https://github.com/lezer-parser/python), extended with
highlighting and indentation information.
*/
const simplePythonLanguage = LRLanguage.define({
  name: "python",
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Body: context => {
          var _a;
          let inner = innerBody(context);
          return (_a = indentBody(context, inner || context.node)) !== null && _a !== void 0 ? _a : context.continue();
        },
        IfStatement: cx => /^\s*(else:|elif )/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
        "ForStatement WhileStatement": cx => /^\s*else:/.test(cx.textAfter) ? cx.baseIndent : cx.continue(),
        "TupleExpression ComprehensionExpression ParamList ArgList ParenthesizedExpression": delimitedIndent({ closing: ")" }),
        "DictionaryExpression DictionaryComprehensionExpression SetExpression SetComprehensionExpression": delimitedIndent({ closing: "}" }),
        "ArrayExpression ArrayComprehensionExpression": delimitedIndent({ closing: "]" }),
        "String FormatString": () => null,
        Script: context => {
          var _a;
          let inner = innerBody(context);
          return (_a = (inner && indentBody(context, inner))) !== null && _a !== void 0 ? _a : context.continue();
        }
      }),
      foldNodeProp.add({
        "ArrayExpression DictionaryExpression SetExpression TupleExpression": foldInside,
        Body: (node, state) => ({ from: node.from + 1, to: node.to - (node.to == state.doc.length ? 0 : 1) })
      })
    ],
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



const Editor = ({ onCodeChange, code }) => {
  return (
    <CodeMirror
      value={code}
      extensions={[simplePython()]}
      basicSetup={{
        lineNumbers: true,
        tabSize: 4,
      }}
      onChange={(value, update) => onCodeChange(value)}
    />
  );
};

export default Editor;
