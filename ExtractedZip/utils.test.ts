import { describe, it, expect } from 'vitest';
import { parseFilenameTemplate } from '../src/shared/utils';

describe('Filename Template Parser', () => {
  it('should replace {title}, {type}, {index}, and {ext} tokens correctly', () => {
    const template = '{title}_{type}_{index}.{ext}';
    const result = parseFilenameTemplate(template, 'Sample PDF Document!', 'pdf', 0, 'pdf');
    expect(result).toBe('Sample_PDF_Document__pdf_01.pdf');
  });

  it('should handle special characters safely', () => {
    const template = '{title}_page.{ext}';
    const result = parseFilenameTemplate(template, 'Doc / Page: 123', 'image', 2, 'png');
    expect(result).toBe('Doc___Page__123_page.png');
  });
});
