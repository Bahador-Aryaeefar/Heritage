import { sanitizeUnsafeHref, textSpanSchema } from '@heritage/shared-types';

describe('textSpanSchema href sanitization', () => {
  it('accepts an absolute https link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'https://example.com' })).not.toThrow();
  });

  it('accepts a relative link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: '/sites/taq-e-bostan' })).not.toThrow();
  });

  it('accepts a mailto link', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'mailto:info@example.com' })).not.toThrow();
  });

  it('rejects a javascript: URI', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'javascript:alert(1)' })).toThrow();
  });

  it('rejects a data: URI', () => {
    expect(() =>
      textSpanSchema.parse({ text: 'Link', href: 'data:text/html,<script>alert(1)</script>' }),
    ).toThrow();
  });

  it('rejects a vbscript: URI', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'vbscript:msgbox(1)' })).toThrow();
  });

  it('rejects a file: URI', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'file:///etc/passwd' })).toThrow();
  });

  it('rejects a mixed-case JavaScript: URI', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: 'JavaScript:alert(1)' })).toThrow();
  });

  it('rejects a javascript: URI with leading whitespace', () => {
    expect(() => textSpanSchema.parse({ text: 'Link', href: '  javascript:alert(1)' })).toThrow();
  });
});

describe('sanitizeUnsafeHref (read-path degradation)', () => {
  it('strips an unsafe href but keeps the rest of the span', () => {
    const span = { text: 'Click me', bold: true, href: 'javascript:alert(1)' };
    const sanitized = sanitizeUnsafeHref(span);
    expect(sanitized).toEqual({ text: 'Click me', bold: true });
    expect(sanitized.href).toBeUndefined();
    expect(() => textSpanSchema.parse(sanitized)).not.toThrow();
  });

  it('leaves a safe href untouched', () => {
    const span = { text: 'Link', href: 'https://example.com' };
    expect(sanitizeUnsafeHref(span)).toEqual(span);
  });

  it('leaves a span with no href untouched', () => {
    const span = { text: 'Plain text' };
    expect(sanitizeUnsafeHref(span)).toEqual(span);
  });
});
