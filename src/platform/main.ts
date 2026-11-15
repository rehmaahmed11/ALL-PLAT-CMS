import { createPlatformRuntime } from './server';

const dataDir = process.env.DATA_DIR || './data';
const masterPanelHost = process.env.MASTER_PANEL_HOST || 'panel.localhost';
const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || '0.0.0.0';
const originSecret = process.env.ORIGIN_HMAC_SECRET;
const trustProxy = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || '');
const allowUnauthenticatedOrigin = process.env.ALLOW_UNAUTHENTICATED_ORIGIN
  ? /^(1|true|yes)$/i.test(process.env.ALLOW_UNAUTHENTICATED_ORIGIN)
  : !originSecret;
const allowPreviewMasterHost = /^(1|true|yes)$/i.test(process.env.ALLOW_PREVIEW_MASTER_HOST || '');

const runtime = createPlatformRuntime({
  dataDir,
  masterPanelHost,
  port,
  host,
  originSecret,
  trustProxy,
  allowUnauthenticatedOrigin,
  allowPreviewMasterHost,
  startScheduler: true,
});

runtime.startHttpServer();
