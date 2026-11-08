/**
 * Browserless PDF Generation Integration
 *
 * Calls Browserless REST API (/pdf) to render HTML with print-specific CSS
 * into a high-fidelity, multi-page financial PDF document via headless Chromium.
 */

export interface BrowserlessPdfOptions {
  format?: 'Letter' | 'Legal' | 'A4';
  landscape?: boolean;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export function getBrowserlessConfig(): { endpoint: string; isConfigured: boolean } {
  const customUrl = process.env.BROWSERLESS_URL;
  const token = process.env.BROWSERLESS_API_KEY || process.env.BROWSERLESS_TOKEN;

  if (customUrl) {
    const base = customUrl.endsWith('/pdf') ? customUrl : `${customUrl.replace(/\/+$/, '')}/pdf`;
    if (token && !base.includes('token=')) {
      return { endpoint: `${base}?token=${encodeURIComponent(token)}`, isConfigured: true };
    }
    return { endpoint: base, isConfigured: true };
  }

  if (token) {
    return {
      endpoint: `https://chrome.browserless.io/pdf?token=${encodeURIComponent(token)}`,
      isConfigured: true,
    };
  }

  return {
    endpoint: 'https://chrome.browserless.io/pdf',
    isConfigured: false,
  };
}

export async function generatePdfWithBrowserless(
  html: string,
  options: BrowserlessPdfOptions = {}
): Promise<Buffer> {
  const { endpoint, isConfigured } = getBrowserlessConfig();

  if (!isConfigured && !process.env.BROWSERLESS_URL) {
    throw new Error(
      'BROWSERLESS_API_KEY or BROWSERLESS_URL is not configured in environment variables.'
    );
  }

  const payload = {
    html,
    options: {
      format: options.format || 'Letter',
      printBackground: options.printBackground !== false,
      preferCSSPageSize: options.preferCSSPageSize !== false,
      margin: options.margin || {
        top: '0in',
        right: '0in',
        bottom: '0in',
        left: '0in',
      },
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Browserless rendering failed (${response.status} ${response.statusText}): ${
        errorText || 'Unknown error'
      }`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
