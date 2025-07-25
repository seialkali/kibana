/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { Doc } from '../../types';

interface RetrievalDocsFlyoutProps {
  onClose: () => void;
  retrievalDocs: Doc[];
}

const RESULT_FIELDS_TRUNCATE_AT = 4;
const truncateFields = (doc: Doc) =>
  Object.entries({ context: doc.content, score: doc.metadata._score })
    .slice(0, RESULT_FIELDS_TRUNCATE_AT)
    .map(([field, value]) => ({ field, value }));

export const RetrievalDocsFlyout: React.FC<RetrievalDocsFlyoutProps> = ({
  onClose,
  retrievalDocs,
}) => {
  const usageTracker = useUsageTracker();
  const modalTitleId = useGeneratedHtmlId();

  const columns: Array<EuiBasicTableColumn<{ field: string; value: unknown }>> = [
    {
      field: 'field',
      name: i18n.translate(
        'xpack.searchPlayground.chat.message.assistant.retrievalDoc.result.nameColumn',
        {
          defaultMessage: 'Field',
        }
      ),
      render: (field: string) => {
        return (
          <EuiText>
            <EuiTextColor color="subdued">
              <code>&quot;{field}&quot;</code>
            </EuiTextColor>
          </EuiText>
        );
      },
      truncateText: true,
      width: '20%',
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.searchPlayground.chat.message.assistant.retrievalDoc.result.valueColumn',
        {
          defaultMessage: 'Value',
        }
      ),
      render: (value: unknown) => (
        <EuiCodeBlock paddingSize="none" transparentBackground fontSize="m">
          {value as React.ReactNode}
        </EuiCodeBlock>
      ),
    },
  ];

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.retrievalDocsFlyoutOpened);
  }, [usageTracker]);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h3 id={modalTitleId}>
            {i18n.translate('xpack.searchPlayground.chat.message.assistant.retrievalDoc.title', {
              defaultMessage: 'Documents retrieved',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.searchPlayground.chat.message.assistant.retrievalDoc.subtitle', {
              defaultMessage:
                'The documents that were referenced in order to create an answer to your query. You can change the context field using the Edit context button.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          {retrievalDocs.map((doc) => (
            <EuiPanel key={doc.metadata._id} paddingSize="m">
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexGroup justifyContent="spaceBetween">
                  <code>
                    {i18n.translate(
                      'xpack.searchPlayground.chat.message.assistant.retrievalDoc.result.id',
                      {
                        defaultMessage: 'ID: {id}',
                        values: { id: doc.metadata._id },
                      }
                    )}
                  </code>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center">
                      <code>
                        {i18n.translate(
                          'xpack.searchPlayground.chat.message.assistant.retrievalDoc.result.fromIndex',
                          {
                            defaultMessage: 'from',
                          }
                        )}
                      </code>
                      <EuiBadge color="primary">{doc.metadata._index}</EuiBadge>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiBasicTable items={truncateFields(doc)} columns={columns} />
              </EuiFlexGroup>
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
