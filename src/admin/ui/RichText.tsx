import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

export default function RichText({ value, onChange, editable = true, headings = true }: { value: string; onChange: (html: string, json: unknown) => void; editable?: boolean; headings?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false, ...(headings ? { heading: { levels: [2, 3] } } : { heading: false }) }), Link.configure({ openOnClick: false }), Image],
    content: value || '',
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getJSON()),
    editorProps: { attributes: { class: 'prose max-w-none min-h-48 p-3 focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-bold [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-teal-text [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_img]:max-w-full' } },
  });
  if (!editor) return null;
  const b = (label: string, on: () => void, active?: boolean) => (
    <button type="button" onClick={on} className={`btn btn-sm ${active ? 'bg-teal-tint' : ''}`} aria-pressed={active}>{label}</button>
  );
  return (
    <div className="rounded-md border border-line bg-white">
      {editable && (
        <div className="flex flex-wrap gap-1 border-b border-line p-1.5">
          {headings && <>
            {b('Text', () => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'))}
            {b('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
            {b('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
          </>}
          {b('Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
          {b('Italic', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
          {b('• List', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
          {b('1. List', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
          {b('Quote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
          {b('Link', () => {
            const url = prompt('Link address (https://…)', editor.getAttributes('link').href ?? '');
            if (url === null) return;
            url ? editor.chain().focus().setLink({ href: url }).run() : editor.chain().focus().unsetLink().run();
          }, editor.isActive('link'))}
          {b('Image', () => { const src = prompt('Image address (copy it from Media)'); if (src) editor.chain().focus().setImage({ src }).run(); })}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
