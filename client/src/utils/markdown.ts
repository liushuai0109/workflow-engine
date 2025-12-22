import MarkdownIt from 'markdown-it';

/**
 * Markdown 渲染器配置
 * - 禁用 HTML 标签（安全性）
 * - 启用 linkify（自动将 URL 转为链接）
 * - 启用 typographer（智能标点）
 */
const md = new MarkdownIt({
  html: false,        // 禁用 HTML 标签，防止 XSS
  linkify: true,      // 自动将 URL 转为链接
  typographer: true,  // 智能标点符号
  breaks: true,       // 将换行符转为 <br>
});

/**
 * 渲染 Markdown 内容为 HTML
 * @param content - Markdown 格式的内容
 * @returns 渲染后的 HTML 字符串（已转义，安全）
 */
export function renderMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  return md.render(content);
}

/**
 * 将 Markdown 内容渲染为内联 HTML（不包含 <p> 标签）
 * @param content - Markdown 格式的内容
 * @returns 渲染后的内联 HTML 字符串
 */
export function renderMarkdownInline(content: string): string {
  if (!content) {
    return '';
  }

  return md.renderInline(content);
}
