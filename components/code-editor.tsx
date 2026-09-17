'use client'

import { useMemo } from 'react'

type Lang = 'html' | 'css' | 'js'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightHtml(code: string) {
  let s = escapeHtml(code)
  s = s.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#8b949e;font-style:italic">$1</span>')
  s = s.replace(/(&lt;\/?[a-zA-Z][\w:-]*)/g, '<span style="color:#7ee787">$1</span>')
  s = s.replace(/\s([a-zA-Z_:][\w:.-]*)(=)/g, ' <span style="color:#79c0ff">$1</span>$2')
  s = s.replace(/(['"])(.*?)(\1)/g, '<span style="color:#a5d6ff">$1$2$3</span>')
  return s
}

function highlightCss(code: string) {
  let s = escapeHtml(code)
  s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#8b949e;font-style:italic">$1</span>')
  s = s.replace(/([.#]?[a-zA-Z_][\w-]*)(\s*\{)/g, '<span style="color:#ff7b72">$1</span>$2')
  s = s.replace(/([a-zA-Z-]+)(\s*:)/g, '<span style="color:#79c0ff">$1</span>$2')
  s = s.replace(/(#[0-9a-fA-F]{3,8}|\b\d+(?:px|rem|em|%|vh|vw|s|ms)?\b)/g, '<span style="color:#ffa657">$1</span>')
  s = s.replace(/(['"])(.*?)(\1)/g, '<span style="color:#a5d6ff">$1$2$3</span>')
  return s
}

function highlightJs(code: string) {
  let s = escapeHtml(code)
  s = s.replace(/(\/\/.*$)/gm, '<span style="color:#8b949e;font-style:italic">$1</span>')
  s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#8b949e;font-style:italic">$1</span>')
  s = s.replace(
    /\b(const|let|var|function|return|if|else|for|while|class|new|await|async|import|from|export|default|try|catch|throw|typeof|instanceof)\b/g,
    '<span style="color:#ff7b72">$1</span>',
  )
  s = s.replace(/\b(true|false|null|undefined)\b/g, '<span style="color:#ffa657">$1</span>')
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#d2a8ff">$1</span>')
  s = s.replace(/(['"`])((?:\\.|(?!\1)[\s\S])*?)(\1)/g, '<span style="color:#a5d6ff">$1$2$3</span>')
  return s
}

function highlight(code: string, lang: Lang) {
  if (lang === 'css') return highlightCss(code)
  if (lang === 'js') return highlightJs(code)
  return highlightHtml(code)
}

export function CodeEditor({
  value,
  onChange,
  language,
}: {
  value: string
  onChange: (next: string) => void
  language: Lang
}) {
  const colored = useMemo(() => highlight(value || '', language), [value, language])

  return (
    <div
      style={{
        position: 'relative',
        width: 'calc(100% - 36px)',
        margin: '0 18px 14px',
        minHeight: 360,
        height: 420,
        border: '1px solid #30363d',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#0d1117',
      }}
    >
      <pre
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          padding: '14px 16px',
          overflow: 'auto',
          pointerEvents: 'none',
          color: '#e6edf3',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          tabSize: 2,
        }}
        dangerouslySetInnerHTML={{ __html: colored + '\n' }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          minHeight: 360,
          margin: 0,
          padding: '14px 16px',
          boxSizing: 'border-box',
          border: 0,
          outline: 'none',
          resize: 'vertical',
          background: 'transparent',
          color: 'transparent',
          caretColor: '#ea580c',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          tabSize: 2,
        }}
      />
    </div>
  )
}
