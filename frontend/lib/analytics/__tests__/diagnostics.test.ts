import { safeDiagnosticMessage, safeDiagnosticStack, sanitizeDiagnosticLog, sanitizeExceptionList } from '../diagnostics';

describe('diagnostic privacy', () => {
  it('retains reviewed messages and rejects messages with private values', () => {
    expect(safeDiagnosticMessage('Network request failed')).toBe('Network request failed');
    expect(safeDiagnosticMessage('Upload failed: user@example.com file:///private/photo.jpg')).toBe('Details removed for privacy');
    expect(safeDiagnosticMessage('Bearer eyJhbGciOiJIUzI1NiJ9.private.signature')).toBe('Details removed for privacy');
  });

  it('redacts log attributes before they enter the logs queue', () => {
    expect(sanitizeDiagnosticLog({ body: 'user@example.com', level: 'error', attributes: { error_source: 'render_boundary', stack: 'index.android.bundle:9:2', password: 'secret' } })).toEqual({ body: 'Details removed for privacy', level: 'error', attributes: { error_source: 'render_boundary', stack: 'index.android.bundle:9:2' } });
  });

  it('preserves bundle coordinates but strips messages, dynamic paths, variables and source lines', () => {
    const result = sanitizeExceptionList([{ type: 'TypeError', value: 'Network request failed', stacktrace: { type: 'raw', frames: [{
      platform: 'hermes', filename: 'https://host/index.android.bundle?access_token=secret', function: 'user@example.com', lineno: 42, colno: 8,
      vars: { email: 'user@example.com' }, context_line: 'secret', abs_path: '/private/data',
    }] } }]);
    expect(result).toEqual([{ type: 'TypeError', value: 'Network request failed', stacktrace: { type: 'raw', frames: [{ platform: 'hermes', filename: 'index.android.bundle', lineno: 42, colno: 8 }] } }]);
    expect(JSON.stringify(result)).not.toMatch(/secret|user@example|private/);
  });

  it('extracts only recognized bundle locations from error logs', () => {
    expect(safeDiagnosticStack('Error: secret\n at render (index.android.bundle:42:8)\n at file:///private/user:1:2')).toBe('index.android.bundle:42:8');
  });
});
