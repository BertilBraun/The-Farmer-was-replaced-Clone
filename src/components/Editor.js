import React, { useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/python/python';

const Editor = ({ onCodeChange }) => {
  const [code, setCode] = useState('');

  return (
    <CodeMirror
      value={code}
      options={{
        mode: 'python',
        lineNumbers: true
      }}
      onBeforeChange={(editor, data, value) => {
        setCode(value);
      }}
      onChange={(editor, data, value) => {
        onCodeChange(value);
      }}
    />
  );
};

export default Editor;
