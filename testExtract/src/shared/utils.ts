/**
 * Parses custom filename template such as "{title}_{type}_{index}.{ext}"
 */
export function parseFilenameTemplate(
  template: string,
  title: string,
  type: string,
  index: number,
  ext: string
): string {
  const sanitizedTitle = (title || 'resource')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 40);

  return template
    .replace('{title}', sanitizedTitle)
    .replace('{type}', type)
    .replace('{index}', (index + 1).toString().padStart(2, '0'))
    .replace('{ext}', ext.replace(/^\./, ''));
}
