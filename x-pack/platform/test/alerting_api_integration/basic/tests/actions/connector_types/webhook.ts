/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import getPort from 'get-port';
import { getWebhookServer } from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('webhook connector', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    // need to wait for kibanaServer to settle ...
    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('should return 403 when creating a webhook connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook connector',
          connector_type_id: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .webhook is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });

    after(() => {
      webhookServer.close();
    });
  });
}
