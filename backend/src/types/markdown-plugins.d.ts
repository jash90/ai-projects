// Type declarations for markdown-it plugins without official type definitions

declare module 'markdown-it-katex' {
  import MarkdownIt from 'markdown-it';
  const markdownItKatex: MarkdownIt.PluginSimple;
  export default markdownItKatex;
}

declare module 'markdown-it-table-of-contents' {
  import MarkdownIt from 'markdown-it';
  const markdownItToc: MarkdownIt.PluginSimple;
  export default markdownItToc;
}
