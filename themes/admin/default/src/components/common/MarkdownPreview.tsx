import React, { useState } from 'react';
import {
  Copy,
  Check,
  Info,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Helper to parse inline styles (bold, italic, code, links, strikethrough)
  const renderInlineFormatted = (text: string): React.ReactNode[] => {
    // Regex for inline code, links, bold, italic, strikethrough
    const inlineRegex = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*]+\*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const matchedStr = match[0];

      if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
        // Inline code
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-mono text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60"
          >
            {matchedStr.slice(1, -1)}
          </code>
        );
      } else if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
        // Link
        const linkMatch = matchedStr.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={match.index}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline font-medium inline-flex items-center gap-0.5"
            >
              <span>{linkMatch[1]}</span>
              <ExternalLink className="w-3 h-3 inline-block opacity-70" />
            </a>
          );
        }
      } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
        // Bold
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900 dark:text-white">
            {renderInlineFormatted(matchedStr.slice(2, -2))}
          </strong>
        );
      } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
        // Strikethrough
        parts.push(
          <del key={match.index} className="line-through text-slate-400 dark:text-slate-500">
            {matchedStr.slice(2, -2)}
          </del>
        );
      } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
        // Italic
        parts.push(
          <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
            {matchedStr.slice(1, -1)}
          </em>
        );
      }

      lastIndex = match.index + matchedStr.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Pre-process markdown into blocks
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    // 1. Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text';
      index++;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      index++; // skip closing ```
      const fullCode = codeLines.join('\n');
      const isCopied = copiedCode === fullCode;

      blocks.push(
        <div
          key={`code-${index}`}
          className="my-4 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md text-xs"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-mono uppercase font-semibold text-slate-300">{lang}</span>
            <button
              type="button"
              onClick={() => handleCopyCode(fullCode)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table: | Col | Col |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|') && lines[index].trim().endsWith('|')) {
        tableLines.push(lines[index]);
        index++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const bodyRows = tableLines
          .slice(2)
          .map((row) =>
            row
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );

        blocks.push(
          <div key={`table-${index}`} className="my-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  {headerRow.map((col, ci) => (
                    <th key={ci} className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {renderInlineFormatted(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                        {renderInlineFormatted(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. GitHub Alert Block: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
    if (line.trim().startsWith('> [!')) {
      const alertMatch = line.trim().match(/>\s*\[!([A-Z]+)\]/i);
      const alertType = (alertMatch ? alertMatch[1] : 'NOTE').toUpperCase();
      index++;
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index++;
      }

      let alertStyles = {
        bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200',
        icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
        title: 'Note',
      };

      if (alertType === 'TIP') {
        alertStyles = {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200',
          icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          title: 'Tip',
        };
      } else if (alertType === 'IMPORTANT') {
        alertStyles = {
          bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/50 text-violet-900 dark:text-violet-200',
          icon: <AlertCircle className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />,
          title: 'Important',
        };
      } else if (alertType === 'WARNING') {
        alertStyles = {
          bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
          title: 'Warning',
        };
      } else if (alertType === 'CAUTION') {
        alertStyles = {
          bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
          title: 'Caution',
        };
      }

      blocks.push(
        <div
          key={`alert-${index}`}
          className={`my-3 p-4 rounded-2xl border text-xs flex gap-3 ${alertStyles.bg}`}
        >
          {alertStyles.icon}
          <div className="space-y-1">
            <span className="font-bold tracking-tight block">{alertStyles.title}</span>
            <div className="leading-relaxed opacity-95">
              {quoteLines.map((ql, qli) => (
                <p key={qli}>{renderInlineFormatted(ql)}</p>
              ))}
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 4. Standard Blockquote: > text
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index++;
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-3 pl-4 border-l-4 border-violet-500/50 dark:border-violet-500/40 text-slate-600 dark:text-slate-300 italic text-xs leading-relaxed space-y-1"
        >
          {quoteLines.map((ql, qli) => (
            <p key={qli}>{renderInlineFormatted(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Horizontal Rule: --- or ***
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      blocks.push(
        <hr
          key={`hr-${index}`}
          className="my-5 border-t border-slate-200 dark:border-slate-800"
        />
      );
      index++;
      continue;
    }

    // 6. Headers: #, ##, ###, ####
    if (line.startsWith('#')) {
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];

        if (level === 1) {
          blocks.push(
            <h1
              key={`h1-${index}`}
              className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2"
            >
              {renderInlineFormatted(text)}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2
              key={`h2-${index}`}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2.5 tracking-tight"
            >
              {renderInlineFormatted(text)}
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h3-${index}`}
              className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2"
            >
              {renderInlineFormatted(text)}
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`h4-${index}`}
              className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-3 mb-1.5"
            >
              {renderInlineFormatted(text)}
            </h4>
          );
        }
        index++;
        continue;
      }
    }

    // 7. Lists (Unordered & Ordered)
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const listItems: { text: string; ordered: boolean; num?: string }[] = [];
      const isOrdered = /^\s*\d+\.\s+/.test(line);

      while (
        index < lines.length &&
        (/^\s*[-*+]\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]))
      ) {
        const itemLine = lines[index];
        const numMatch = itemLine.match(/^\s*(\d+)\.\s+(.*)$/);
        const bulletMatch = itemLine.match(/^\s*[-*+]\s+(.*)$/);

        if (numMatch) {
          listItems.push({ text: numMatch[2], ordered: true, num: numMatch[1] });
        } else if (bulletMatch) {
          listItems.push({ text: bulletMatch[1], ordered: false });
        }
        index++;
      }

      if (isOrdered) {
        blocks.push(
          <ol key={`ol-${index}`} className="my-2.5 pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-decimal">
            {listItems.map((item, li) => (
              <li key={li} className="leading-relaxed">
                {renderInlineFormatted(item.text)}
              </li>
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul key={`ul-${index}`} className="my-2.5 pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc">
            {listItems.map((item, li) => (
              <li key={li} className="leading-relaxed">
                {renderInlineFormatted(item.text)}
              </li>
            ))}
          </ul>
        );
      }
      continue;
    }

    // 8. Plain paragraph
    if (line.trim().length > 0) {
      blocks.push(
        <p
          key={`p-${index}`}
          className="text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 my-2"
        >
          {renderInlineFormatted(line)}
        </p>
      );
    }

    index++;
  }

  return <div className={`markdown-preview-root space-y-1 ${className}`}>{blocks}</div>;
};
