/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, ReactNode } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTabbedContent,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiTabbedContentTab, EuiTabbedContentProps, EuiFlyoutProps } from '@elastic/eui';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';

import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleOverviewTab, useOverviewTabSections } from './rule_overview_tab';
import { RuleInvestigationGuideTab } from './rule_investigation_guide_tab';
import {
  DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS,
} from './constants';

import * as i18n from './translations';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;
    /*
      Removes "transform: translateZ(0)" from EuiFlyoutBody styles to avoid creating a new stacking context.
      Fixed elements inside the flyout body are now correctly positioned relative to the viewport.
      See: https://github.com/elastic/eui/blob/ffd0cbca4d323ad0b1d5a73c252380d93178e5e7/packages/eui/src/global_styling/mixins/_helpers.ts#L122
      The Chrome bug mentioned in the link above no longer reproduces, so this change is safe.
    */
    transform: none;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeL} 0`};
    }
  }
`;

const StyledFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex: 1 0 0;
    overflow: hidden;
  }
`;

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    overflow-y: auto;

    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <StyledFlexGroup direction="column" gutterSize="none">
    <StyledEuiFlexItem grow={true}>
      <StyledEuiTabbedContent {...props} />
    </StyledEuiFlexItem>
  </StyledFlexGroup>
);

export const TabContentPadding: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.xl} ${euiTheme.size.m};
      `}
    >
      {children}
    </div>
  );
};

interface RuleDetailsFlyoutProps {
  rule: RuleResponse;
  subHeader?: ReactNode;
  ruleActions?: React.ReactNode;
  size?: EuiFlyoutProps['size'];
  extraTabs?: EuiTabbedContentTab[];
  dataTestSubj?: string;
  id?: string;
  closeFlyout: () => void;
  title?: string;
}

export function RuleDetailsFlyout({
  id,
  dataTestSubj,
  ...props
}: RuleDetailsFlyoutProps): JSX.Element {
  const prebuiltRulesFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'prebuiltRulesFlyoutTitle',
  });

  return (
    <EuiFlyout
      id={id}
      size={props.size}
      onClose={props.closeFlyout}
      key="prebuilt-rules-flyout"
      paddingSize="l"
      data-test-subj={dataTestSubj}
      aria-labelledby={prebuiltRulesFlyoutTitleId}
      ownFocus
    >
      <KibanaSectionErrorBoundary sectionName={i18n.RULE_DETAILS_FLYOUT_LABEL}>
        <RuleDetailsFlyoutContent {...props} titleId={prebuiltRulesFlyoutTitleId} />
      </KibanaSectionErrorBoundary>
    </EuiFlyout>
  );
}

const DEFAULT_EXTRA_TABS: EuiTabbedContentTab[] = [];

type RuleDetailsFlyoutContentProps = Omit<RuleDetailsFlyoutProps, 'id' | 'dataTestSubj'> & {
  titleId?: string;
};

function RuleDetailsFlyoutContent({
  rule,
  ruleActions,
  subHeader,
  size = 'm',
  extraTabs = DEFAULT_EXTRA_TABS,
  titleId,
  closeFlyout,
  title,
}: RuleDetailsFlyoutContentProps): JSX.Element {
  const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: i18n.OVERVIEW_TAB_LABEL,
      content: (
        <TabContentPadding>
          <RuleOverviewTab
            rule={rule}
            columnWidths={
              size === 'l'
                ? LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS
                : DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS
            }
            expandedOverviewSections={expandedOverviewSections}
            toggleOverviewSection={toggleOverviewSection}
          />
        </TabContentPadding>
      ),
    }),
    [rule, size, expandedOverviewSections, toggleOverviewSection]
  );

  const investigationGuideTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'investigationGuide',
      name: i18n.INVESTIGATION_GUIDE_TAB_LABEL,
      content: (
        <TabContentPadding>
          <RuleInvestigationGuideTab note={rule.note ?? ''} />
        </TabContentPadding>
      ),
    }),
    [rule.note]
  );

  const tabs = useMemo(() => {
    if (rule.note) {
      return [...extraTabs, overviewTab, investigationGuideTab];
    } else {
      return [...extraTabs, overviewTab];
    }
  }, [overviewTab, investigationGuideTab, rule.note, extraTabs]);

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === selectedTabId)) {
      // Switch to first tab if currently selected tab is not available for this rule
      setSelectedTabId(tabs[0].id);
    }
  }, [tabs, selectedTabId]);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    setSelectedTabId(tab.id);
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id={titleId}>{title ?? rule.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        {subHeader && (
          <>
            {subHeader}
            <EuiSpacer size="s" />
          </>
        )}
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <ScrollableFlyoutTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={onTabClick}
        />
      </StyledEuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18n.DISMISS_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{ruleActions}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
