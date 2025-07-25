/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiSubSteps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';

interface Props {
  results: FindFileStructureResponse;
  closeFlyout(): void;
}
export const ExplanationFlyout: FC<Props> = ({ results, closeFlyout }) => {
  const explanation = results.explanation!;
  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout onClose={closeFlyout} hideCloseButton size={'m'} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            <FormattedMessage
              id="xpack.dataVisualizer.file.explanationFlyout.title"
              defaultMessage="Analysis explanation"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content explanation={explanation} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.dataVisualizer.file.explanationFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const Content: FC<{ explanation: string[] }> = ({ explanation }) => (
  <>
    <EuiText size={'s'}>
      <FormattedMessage
        id="xpack.dataVisualizer.file.explanationFlyout.content"
        defaultMessage="The logical steps that have produced the analysis results."
      />

      <EuiSpacer size="l" />
      <EuiSubSteps>
        <ul style={{ wordBreak: 'break-word' }}>
          {explanation.map((e, i) => (
            <li key={i}>
              {e}
              <EuiSpacer size="s" />
            </li>
          ))}
        </ul>
      </EuiSubSteps>
    </EuiText>
  </>
);
