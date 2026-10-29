import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link, Code, Quote, Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export const parseMarkdown = (markdown: string): string => {
  if (!markdown) return "";
  let html = markdown;

  // Escape HTML entities to prevent XSS (allowing safe tags only after parse if needed, but here we escape first)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers (H1 - H6)
  html = html.replace(/^###### (.*?)$/gm, "<h6 class='text-sm font-bold text-base-content mt-4 mb-2'>$1</h6>");
  html = html.replace(/^##### (.*?)$/gm, "<h5 class='text-base font-bold text-base-content mt-4 mb-2'>$1</h5>");
  html = html.replace(/^#### (.*?)$/gm, "<h4 class='text-lg font-bold text-base-content mt-4 mb-2'>$1</h4>");
  html = html.replace(/^### (.*?)$/gm, "<h3 class='text-xl font-bold text-base-content mt-5 mb-2'>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2 class='text-2xl font-bold text-base-content mt-6 mb-3 pb-1 border-b border-base-200'>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1 class='text-3xl font-extrabold text-base-content mt-8 mb-4'>$1</h1>");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-base-content'>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong class='font-bold text-base-content'>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em class='italic'>$1</em>");

  // Code inline
  html = html.replace(/`(.*?)`/g, "<code class='bg-base-200 px-1.5 py-0.5 rounded text-sm text-error font-mono font-semibold'>$1</code>");

  // Links ([label](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-info hover:underline font-medium'>$1</a>");

  // Blockquotes. The escaping pass above already turned ">" into "&gt;", so
  // the pattern matches the escaped form — otherwise a quote line rendered as
  // a literal "> " inside a paragraph.
  html = html.replace(/^&gt; (.*?)$/gm, "<blockquote class='border-l-4 border-base-300 pl-4 py-2 my-4 italic text-base-content/70 bg-base-200/50 rounded-r'>$1</blockquote>");

  // Tables (GFM pipe tables). Rendered as a single block so the paragraph
  // pass below does not wrap the rows in <p>.
  html = html.replace(/(?:^\|.*\|[ \t]*$\n?)+/gm, (block) => {
    const rows = block
      .trim()
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length < 2) return block;

    const cells = (row: string) =>
      row
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());

    // The second row must be the alignment separator (|---|---|) for this to
    // be a table. Without it the pipe rows are left untouched.
    if (!/^[\s|:-]+$/.test(rows[1])) return block;

    const header = cells(rows[0]);
    const body = rows.slice(2).map(cells);

    const head = header
      .map(
        (cell) =>
          `<th class='border border-base-300 bg-base-200 px-3 py-2 text-left font-bold text-base-content'>${cell}</th>`,
      )
      .join("");

    const bodyRows = body
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td class='border border-base-300 px-3 py-2 align-top text-base-content/90'>${cell}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");

    return `<table class='w-full border-collapse text-sm my-4 overflow-x-auto'><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Unordered list items (* or - or +). The marker class doubles as the tag
  // used by the wrapping pass below.
  html = html.replace(/^\s*[\*\-\+]\s+(.*?)$/gm, "<li class='list-disc ml-6 my-1 text-base-content'>$1</li>");

  // Ordered list items (1. 2. etc.)
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, "<li class='list-decimal ml-6 my-1 text-base-content'>$1</li>");

  // Wrap consecutive list items in their container. The marker comes from the
  // container (disc for <ul>, decimal for <ol>), so the items keep only the
  // spacing classes.
  const wrapList = (input: string, marker: "list-disc" | "list-decimal", tag: "ul" | "ol") =>
    input.replace(
      new RegExp(
        `((?:<li class='${marker} ml-6 my-1 text-base-content'>[^\\n]*<\\/li>\\n?)+)`,
        "g",
      ),
      (run) =>
        `<${tag} class='my-2'>${run
          .trim()
          .replace(new RegExp(`<li class='${marker} `, "g"), "<li class='")}</${tag}>\n`,
    );

  html = wrapList(html, "list-disc", "ul");
  html = wrapList(html, "list-decimal", "ol");

  // Paragraphs
  const lines = html.split(/\n\n+/);
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<(h\d|blockquote|li|ul|ol|pre|table)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p class="mb-4 leading-relaxed text-base-content">${trimmed.replace(/\n/g, "<br/>")}</p>`;
  });
  html = formattedLines.join("\n");

  return html;
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Escribe aquí en formato Markdown...",
  disabled = false,
  error = false,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + (selectedText || "") + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    // Reposicionar el cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shortcuts (Ctrl+B / Ctrl+I)
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        insertText("**", "**");
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        insertText("*", "*");
      }
    }
  };

  return (
    <div className={`w-full rounded-xl border ${error ? 'border-error/50 ring-1 ring-error/30' : 'border-base-300'} bg-base-100 overflow-hidden shadow-sm flex flex-col`}>
      {/* TABS & TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-base-200 bg-base-200/50 p-2 gap-2">
        {/* Toggle Edit / Preview */}
        <div className="flex bg-base-200 p-0.5 rounded-lg border border-base-300/50 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'edit'
                ? 'bg-base-100 text-base-content shadow-sm'
                : 'text-base-content/70 hover:text-base-content'
            }`}
          >
            <Edit3 size={13} />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'preview'
                ? 'bg-base-100 text-base-content shadow-sm'
                : 'text-base-content/70 hover:text-base-content'
            }`}
          >
            <Eye size={13} />
            Vista Previa
          </button>
        </div>

        {/* Toolbar Buttons */}
        {activeTab === 'edit' && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertText("**", "**")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Negrita (Ctrl+B)"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("*", "*")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Itálica (Ctrl+I)"
            >
              <Italic size={15} />
            </button>
            <span className="w-px h-4 bg-base-300 mx-1" />
            <button
              type="button"
              onClick={() => insertText("# ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors font-mono font-bold"
              title="Título 1"
            >
              <Heading1 size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("## ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors font-mono font-bold"
              title="Título 2"
            >
              <Heading2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("### ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors font-mono font-bold"
              title="Título 3"
            >
              <Heading3 size={15} />
            </button>
            <span className="w-px h-4 bg-base-300 mx-1" />
            <button
              type="button"
              onClick={() => insertText("- ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Lista de viñetas"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("1. ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Lista numerada"
            >
              <ListOrdered size={15} />
            </button>
            <span className="w-px h-4 bg-base-300 mx-1" />
            <button
              type="button"
              onClick={() => insertText("[", "](url)")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Enlace"
            >
              <Link size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("`", "`")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Código en línea"
            >
              <Code size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertText("> ", "")}
              disabled={disabled}
              className="p-1.5 text-base-content/70 hover:text-base-content hover:bg-base-300/60 rounded-md transition-colors"
              title="Cita"
            >
              <Quote size={15} />
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE */}
      <div className="flex-grow min-h-[300px] flex">
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-full min-h-[300px] p-4 text-sm font-mono text-base-content border-0 outline-none resize-y focus:ring-0 placeholder:text-base-content/50"
          />
        ) : (
          <div
            className="w-full h-full min-h-[300px] p-6 bg-base-100/50 overflow-y-auto prose prose-slate max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
          />
        )}
      </div>
    </div>
  );
};
