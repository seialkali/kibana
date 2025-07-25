/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import type { RuleMetric } from '../types';
import type { RuleSearchResult } from '../../../types';
import { getAlertSuppressionUsage } from '../usage_utils/get_alert_suppression_usage';
import { getResponseActionsUsage } from '../usage_utils/get_response_actions_usage';

export interface RuleObjectCorrelationsOptions {
  ruleResults: Array<SavedObjectsFindResult<RuleSearchResult>>;
  legacyNotificationRuleIds: Map<
    string,
    {
      enabled: boolean;
    }
  >;
  casesRuleIds: Map<string, number>;
  alertsCounts: Map<string, number>;
}

export const getRuleObjectCorrelations = ({
  ruleResults,
  legacyNotificationRuleIds,
  casesRuleIds,
  alertsCounts,
}: RuleObjectCorrelationsOptions): RuleMetric[] => {
  return ruleResults.map((result) => {
    const ruleId = result.id;
    const { attributes } = result;

    // Even if the legacy notification is set to "no_actions" we still count the rule as having a legacy notification that is not migrated yet.
    const hasLegacyNotification = legacyNotificationRuleIds.get(ruleId) != null;

    // We only count a rule as having a notification and being "enabled" if it is _not_ set to "no_actions"/"muteAll" and it has at least one action within its array.
    const hasNotification =
      !hasLegacyNotification &&
      attributes.actions != null &&
      attributes.actions.length > 0 &&
      attributes.muteAll !== true;

    const {
      hasAlertSuppressionPerRuleExecution,
      hasAlertSuppressionPerTimePeriod,
      hasAlertSuppressionMissingFieldsStrategyDoNotSuppress,
      alertSuppressionFieldsCount,
    } = getAlertSuppressionUsage(attributes);

    const { hasResponseActions, hasResponseActionsEndpoint, hasResponseActionsOsquery } =
      getResponseActionsUsage(attributes);

    return {
      rule_name: attributes.name,
      rule_id: attributes.params.ruleId,
      rule_type: attributes.params.type,
      rule_version: attributes.params.version,
      enabled: attributes.enabled,
      is_customized:
        attributes.params.ruleSource?.type === 'external' &&
        attributes.params.ruleSource?.isCustomized === true,
      // if rule immutable, it's Elastic/prebuilt
      elastic_rule: attributes.params.immutable,
      created_on: attributes.createdAt,
      updated_on: attributes.updatedAt,
      alert_count_daily: alertsCounts.get(ruleId) || 0,
      cases_count_total: casesRuleIds.get(ruleId) || 0,
      has_legacy_notification: hasLegacyNotification,
      has_notification: hasNotification,
      has_legacy_investigation_field: Array.isArray(attributes.params.investigationFields),
      has_alert_suppression_per_rule_execution: hasAlertSuppressionPerRuleExecution,
      has_alert_suppression_per_time_period: hasAlertSuppressionPerTimePeriod,
      has_alert_suppression_missing_fields_strategy_do_not_suppress:
        hasAlertSuppressionMissingFieldsStrategyDoNotSuppress,
      alert_suppression_fields_count: alertSuppressionFieldsCount,
      has_exceptions:
        attributes.params.exceptionsList != null && attributes.params.exceptionsList.length > 0,
      has_response_actions: hasResponseActions,
      has_response_actions_endpoint: hasResponseActionsEndpoint,
      has_response_actions_osquery: hasResponseActionsOsquery,
    };
  });
};
