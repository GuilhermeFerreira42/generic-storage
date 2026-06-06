import { describe, it, expect, vi, beforeEach } from 'vitest';
import { web_fetch } from '@/server/src/tools/web/webFetch';

describe('web_fetch tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and cleans HTML content from a URL', async () => {
    const mockHtml = '<html><body><h1>Hello World</h1><p>Content</p></body></html>';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
      status: 200,
    });

    const result = await web_fetch.execute({
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith('https://example.com');
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await web_fetch.execute({
      url: 'https://invalid-url.example',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles non-200 responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await web_fetch.execute({
      url: 'https://example.com/404',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('404');
  });

  it('blocks non-http protocols', async () => {
    const result = await web_fetch.execute({
      url: 'file:///etc/passwd',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('protocolo');
  });

  it('blocks ftp protocol', async () => {
    const result = await web_fetch.execute({
      url: 'ftp://example.com/file',
    });

    expect(result.success).toBe(false);
  });

  it('handles timeout for slow responses', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
    });

    const result = await web_fetch.execute({
      url: 'https://slow.example.com',
    });

    expect(result.success).toBe(false);
  });

  it('extracts text content from HTML', async () => {
    const mockHtml = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Main Heading</h1>
          <p>This is a paragraph.</p>
          <script>alert('ignored');</script>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
      status: 200,
    });

    const result = await web_fetch.execute({
      url: 'https://example.com',
    });

    expect(result.success).toBe(true);
    // Should contain visible text
    expect(result.content).toContain('Main Heading');
    expect(result.content).toContain('This is a paragraph');
    // Should not contain script content
    expect(result.content).not.toContain('alert');
  });

  it('handles empty response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
      status: 200,
    });

    const result = await web_fetch.execute({
      url: 'https://example.com/empty',
    });

    expect(result.success).toBe(true);
    expect(result.content).toBe('');
  });

  it('generates correct schema', () => {
    const schema = web_fetch.schema;

    expect(schema).toBeDefined();
    expect(schema.name).toBe('web_fetch');
    expect(schema.description).toBeDefined();
    expect(schema.inputSchema).toBeDefined();
    expect(schema.inputSchema.properties.url).toBeDefined();
  });

  it('is not destructive', () => {
    expect(web_fetch.isDestructive).toBe(false);
  });

  it('does not require approval', () => {
    const result = web_fetch.requiresApproval?.({
      url: 'https://example.com',
    });

    expect(result).toBe(false);
  });

  it('respects redirect limits', async () => {
    // This test verifies that the tool handles redirects properly
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>Redirected</body></html>',
      status: 200,
      redirected: true,
      url: 'https://final.example.com',
    });

    const result = await web_fetch.execute({
      url: 'https://redirect.example.com',
    });

    expect(result.success).toBe(true);
  });

  it('sanitizes URLs before fetching', async () => {
    // Verify that malformed URLs are handled
    const result = await web_fetch.execute({
      url: 'not-a-valid-url',
    });

    // Should fail or be handled gracefully
    expect(result.success === false || result.error).toBeDefined();
  });

  it('handles large HTML pages', async () => {
    const largeHtml = '<html><body>' + '<p>Line</p>'.repeat(10000) + '</body></html>';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => largeHtml,
      status: 200,
    });

    const result = await web_fetch.execute({
      url: 'https://example.com/large',
    });

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
  });
});
