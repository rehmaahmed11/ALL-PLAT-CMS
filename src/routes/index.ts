import { Router } from '../lib/router.ts';
import * as auth from './auth-pages.ts';
import * as dash from './pages.ts';
import * as sites from './sites.ts';
import * as domains from './domains.ts';
import * as monitor from './monitor.ts';
import * as content from './content.ts';
import * as ops from './ops.ts';
import * as system from './system.ts';
import * as cloudflare from './cloudflare.ts';
import * as api from './api.ts';

export function buildRouter(): Router {
  const r = new Router('');

  // auth
  r.get('/login', auth.loginPage, 'login');
  r.post('/login', auth.loginSubmit);
  r.post('/logout', auth.logout);
  r.get('/account', auth.accountPage);
  r.post('/account', auth.accountSubmit);

  // install (only reachable before the owner exists; handled in index.ts)
  r.post('/install', async (c) => new Response('Already installed', { status: 409 }));

  // dashboard + onboarding
  r.get('/', dash.dashboard);
  r.get('/onboarding', dash.onboarding);
  r.get('/switch', dash.switchSite);
  r.get('/healthz', dash.healthz);

  // sites
  r.get('/sites', sites.list);
  r.get('/sites/new', sites.newForm);
  r.post('/sites/new', sites.create);
  r.get('/sites/:id', sites.detail);
  r.post('/sites/:id/edit', sites.edit);
  r.post('/sites/:id/status', sites.setStatus);
  r.post('/sites/:id/check', sites.check);
  r.post('/sites/:id/credentials', sites.rotateCredentials);
  r.post('/sites/:id/cms-provision', sites.provisionCmsSite);
  r.post('/sites/:id/delete', sites.remove);
  r.get('/sites/:id/preview', sites.preview);

  // domains
  r.get('/domains', domains.list);
  r.post('/domains/add', domains.add);
  r.post('/domains/:id/verify', domains.verify);
  r.post('/domains/:id/primary', domains.makePrimary);
  r.post('/domains/:id/delete', domains.remove);

  // monitoring
  r.get('/monitor', monitor.page);
  r.post('/monitor/run', monitor.runAll);
  r.get('/monitor/site/:id', monitor.siteDetail);

  // content
  r.get('/pages', content.pagesList);
  r.get('/pages/new', content.pageNew);
  r.post('/pages/new', content.pageCreate);
  r.get('/pages/:id', content.pageEdit);
  r.post('/pages/:id', content.pageSave);
  r.post('/pages/:id/delete', content.pageDelete);
  r.get('/media', content.mediaList);
  r.post('/media/upload', content.mediaUpload);
  r.get('/media/:id/raw', content.mediaRaw);
  r.post('/media/:id/delete', content.mediaDelete);

  // operations
  r.get('/backups', ops.backups);
  r.post('/backups/create', ops.backupCreate);
  r.get('/backups/:id/download', ops.backupDownload);
  r.post('/backups/:id/restore', ops.backupRestore);
  r.post('/backups/:id/delete', ops.backupDelete);
  r.get('/deployments', ops.deployments);
  r.post('/deployments/upload', ops.deploymentUpload);
  r.post('/deployments/:id/activate', ops.deploymentActivate);
  r.post('/deployments/:id/rollback', ops.deploymentRollback);
  r.post('/deployments/:id/delete', ops.deploymentDelete);
  r.get('/env', ops.envList);
  r.post('/env/save', ops.envSave);
  r.post('/env/delete', ops.envDelete);

  // system
  r.get('/team', system.team);
  r.post('/team/invite', system.teamInvite);
  r.post('/team/:id/role', system.teamRole);
  r.post('/team/:id/delete', system.teamDelete);
  r.get('/apikeys', system.apiKeys);
  r.post('/apikeys/create', system.apiKeyCreate);
  r.post('/apikeys/:id/delete', system.apiKeyDelete);
  r.get('/audit', system.auditPage);
  r.get('/cloudflare', cloudflare.page);
  r.post('/cloudflare/credentials', cloudflare.saveCredentials);
  r.post('/cloudflare/test', cloudflare.testConnection);
  r.post('/cloudflare/disconnect', cloudflare.disconnect);
  r.post('/cloudflare/template', cloudflare.uploadTemplate);
  r.post('/cloudflare/template/delete', cloudflare.deleteTemplate);
  r.post('/cloudflare/retry', cloudflare.retryPending);
  r.get('/settings', system.settings);
  r.post('/settings', system.settingsSave);
  r.post('/settings/system', system.systemAction);
  r.get('/docs', system.docs);
  r.get('/export', system.exportAll);

  // JSON API used by the panel's own JS and by external automation
  r.get('/api/overview', api.overview);
  r.get('/api/sites', api.sitesJson);
  r.post('/api/sites/:id/check', api.checkSiteApi);
  r.get('/api/monitor/feed', api.monitorFeed);

  return r;
}
