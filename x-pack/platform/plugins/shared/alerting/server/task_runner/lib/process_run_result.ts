/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Outcome } from 'elastic-apm-node';
import type { RuleExecutionStatus, RuleLastRun } from '../../../common';
import type { ElasticsearchError } from '../../lib';
import type { ILastRun } from '../../lib/last_run_status';
import { lastRunFromError, lastRunFromState } from '../../lib/last_run_status';
import type { Result } from '../../lib/result_type';
import { map } from '../../lib/result_type';
import type { IExecutionStatusAndMetrics } from '../../lib/rule_execution_status';
import {
  executionStatusFromError,
  executionStatusFromState,
} from '../../lib/rule_execution_status';
import type { RuleRunMetrics } from '../../lib/rule_run_metrics_store';
import type { RuleResultService } from '../../monitoring/rule_result_service';
import type { RunRuleResult } from '../types';

interface ProcessRuleRunOpts {
  logger?: Logger;
  logPrefix?: string;
  result: RuleResultService;
  runDate: Date;
  runRuleResult: Result<RunRuleResult, Error>;
}

interface ProcessRuleRunResult {
  executionStatus: RuleExecutionStatus;
  executionMetrics: RuleRunMetrics | null;
  lastRun: RuleLastRun;
  outcome: Outcome;
}

export function processRunResults({
  logger,
  logPrefix,
  result,
  runDate,
  runRuleResult,
}: ProcessRuleRunOpts): ProcessRuleRunResult {
  // Getting executionStatus for backwards compatibility
  const { status: executionStatus } = map<
    RunRuleResult,
    ElasticsearchError,
    IExecutionStatusAndMetrics
  >(
    runRuleResult,
    (_runRuleResult) =>
      executionStatusFromState({
        runRuleResult: _runRuleResult,
        lastExecutionDate: runDate,
        ruleResultService: result,
      }),
    (err: ElasticsearchError) => executionStatusFromError(err, runDate)
  );

  // New consolidated statuses for lastRun
  const { lastRun, metrics: executionMetrics } = map<RunRuleResult, ElasticsearchError, ILastRun>(
    runRuleResult,
    ({ metrics }) => lastRunFromState(metrics, result),
    (err: ElasticsearchError) => lastRunFromError(err)
  );

  if (logger && logger.isLevelEnabled('debug')) {
    logger.debug(`deprecated ruleRunStatus for ${logPrefix}: ${JSON.stringify(executionStatus)}`);
    logger.debug(`ruleRunStatus for ${logPrefix}: ${JSON.stringify(lastRun)}`);
    if (executionMetrics) {
      logger.debug(`ruleRunMetrics for ${logPrefix}: ${JSON.stringify(executionMetrics)}`);
    }
  }

  let outcome: Outcome = 'success';
  if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
    outcome = 'success';
  } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
    outcome = 'failure';
  } else if (lastRun.outcome === 'succeeded') {
    outcome = 'success';
  } else if (lastRun.outcome === 'failed') {
    outcome = 'failure';
  }

  return { executionStatus, executionMetrics, lastRun, outcome };
}
