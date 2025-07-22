/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));

  const conf = functionalConfig.getAll();

  conf.kbnTestServer.serverArgs.push(
    `--logging.appenders.default=${JSON.stringify({
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '[%date][%level][%logger] %message %meta',
      },
    })}`,
    `--logging.appenders.console=${JSON.stringify({
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '[%date][%level][%logger] %message %meta',
      },
    })}`,
    `--logging.loggers=${JSON.stringify([
      {
        name: 'trace',
        level: 'all',
        appenders: ['console'],
      },
    ])}`,
    `--logging.loggers.level=TRACE`
  );

  return {
    ...conf,
    testFiles: [require.resolve('.')],
  };
}
