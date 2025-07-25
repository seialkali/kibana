/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, type EuiAccordionProps } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { useBoolean } from '@kbn/react-hooks';
import { usePluginConfig } from '../../../../../containers/plugin_config_context';
import { AlertFlyout } from '../../../../../alerting/inventory/components/alert_flyout';
import { AlertsSectionTitle } from '../section_titles';
import { useAssetDetailsRenderPropsContext } from '../../../hooks/use_asset_details_render_props';
import { Section } from '../../../components/section';
import { AlertsClosedContent } from './alerts_closed_content';
import { type AlertsCount } from '../../../../../hooks/use_alerts_count';
import { AlertsOverview } from '../../../../shared/alerts/alerts_overview';
import { CreateAlertRuleButton } from '../../../../shared/alerts/links/create_alert_rule_button';
import { LinkToAlertsPage } from '../../../../shared/alerts/links/link_to_alerts_page';
import { useIntegrationCheck } from '../../../hooks/use_integration_check';
import { INTEGRATIONS } from '../../../constants';

export const AlertsSummaryContent = ({
  entityId,
  entityType,
  dateRange,
}: {
  entityId: string;
  entityType: InventoryItemType;
  dateRange: TimeRange;
}) => {
  const { featureFlags } = usePluginConfig();
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);
  const { overrides } = useAssetDetailsRenderPropsContext();
  const [collapsibleStatus, setCollapsibleStatus] =
    useState<EuiAccordionProps['forceState']>('open');
  const [activeAlertsCount, setActiveAlertsCount] = useState<number | undefined>(undefined);

  const onLoaded = (alertsCount?: AlertsCount) => {
    const { activeAlertCount = 0 } = alertsCount ?? {};
    const hasActiveAlerts = activeAlertCount > 0;

    setCollapsibleStatus(hasActiveAlerts ? 'open' : 'closed');
    setActiveAlertsCount(alertsCount?.activeAlertCount);
  };

  const entityIdField = findInventoryFields(entityType).id;
  const isDockerContainer = useIntegrationCheck({ dependsOn: INTEGRATIONS.docker });
  const showCreateRuleFeature =
    featureFlags.inventoryThresholdAlertRuleEnabled &&
    (entityType !== 'container' || isDockerContainer);

  return (
    <>
      <Section
        title={<AlertsSectionTitle />}
        collapsible
        data-test-subj="infraAssetDetailsAlertsCollapsible"
        id="alerts"
        closedSectionContent={<AlertsClosedContent activeAlertCount={activeAlertsCount} />}
        initialTriggerValue={collapsibleStatus}
        extraAction={
          <EuiFlexGroup alignItems="center" responsive={false}>
            {showCreateRuleFeature && (
              <EuiFlexItem grow={false}>
                <CreateAlertRuleButton
                  onClick={toggleAlertFlyout}
                  data-test-subj="infraAssetDetailsAlertsTabCreateAlertsRuleButton"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <LinkToAlertsPage
                kuery={`${entityIdField}:"${entityId}"`}
                dateRange={dateRange}
                data-test-subj="infraAssetDetailsAlertsTabAlertsShowAllButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <AlertsOverview
          onLoaded={onLoaded}
          dateRange={dateRange}
          entityId={entityId}
          entityType={entityType}
        />
      </Section>
      {showCreateRuleFeature && (
        <AlertFlyout
          filter={`${entityIdField}: "${entityId}"`}
          nodeType={entityType}
          setVisible={toggleAlertFlyout}
          visible={isAlertFlyoutVisible}
          options={overrides?.alertRule?.options}
        />
      )}
    </>
  );
};
