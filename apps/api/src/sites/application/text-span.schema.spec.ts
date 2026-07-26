import { textSpanSchema } from '@heritage/shared-types';

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
});
