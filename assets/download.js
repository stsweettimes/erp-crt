/* Sweet Times ERP certificate downloader.
 * Works at /<any-repository-name>/demo[/] or /live[/] without hardcoded paths.
 * Does NOT install or trust the certificate on the user's device.
 */
(() => {
  'use strict';

  const environment = document.documentElement.dataset.certificateMode;
  const status = document.getElementById('status');
  const manual = document.getElementById('manual-download');
  if (!['demo', 'live'].includes(environment) || !status || !manual) return;

  const certificateURL = new URL('./root.crt', document.baseURI);
  const outputName = `SweetTimesERP-${environment}-root.crt`;
  manual.download = outputName;

  function showFallback(message, allowDownload = false) {
    status.textContent = message;
    manual.hidden = !allowDownload;
  }

  async function download() {
    try {
      // Avoid downloading a GitHub Pages 404 HTML page as if it were a certificate.
      const response = await fetch(certificateURL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Certificate not available (HTTP ${response.status}).`);
      }
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 128 * 1024) {
        throw new Error('Certificate is empty or unexpectedly large.');
      }
      const content = new TextDecoder('utf-8').decode(bytes).trim();
      // Caddy writes its root.crt as one PEM X.509 certificate.
      if (!/^-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----$/.test(content)) {
        throw new Error('root.crt is missing or does not contain a PEM certificate.');
      }

      const objectURL = URL.createObjectURL(new Blob([bytes], { type: 'application/x-x509-ca-cert' }));
      const anchor = document.createElement('a');
      anchor.href = objectURL;
      anchor.download = outputName;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectURL), 60_000);

      // Browsers provide no reliable "download successfully started" event.
      // Leave one manual option for Safari, iOS and browsers that block auto-downloads.
      showFallback('Download requested. If nothing downloaded, use the link below.', true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown download error.';
      showFallback(`Unable to download the ${environment} certificate. ${reason}`);
    }
  }

  download();
})();
