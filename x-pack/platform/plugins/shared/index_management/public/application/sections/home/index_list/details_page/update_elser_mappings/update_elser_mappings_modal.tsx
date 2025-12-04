/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiSpacer,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSelectable,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiToken,
  EuiCallOut,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  deNormalizeSelectedElserMappings,
  getAllElserFields,
} from '../../../../../components/mappings_editor/lib/utils';
import { useMappingsState } from '../../../../../components/mappings_editor/mappings_state_context';
import { documentationService } from '../../../../../services';
import { updateIndexMappings } from '../../../../../services/api';
import { notificationService } from '../../../../../services/notification';

export interface MappingsOptionType {
  label: string;
  key: string;
  inference_id?: string;
}

export interface UpdateElserMappingsModalProps {
  indexName: string;
  refetchMapping: () => void;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasUpdatePrivileges: boolean | undefined;
}

export function UpdateElserMappingsModal({
  indexName,
  refetchMapping,
  setIsModalOpen,
  hasUpdatePrivileges,
}: UpdateElserMappingsModalProps) {
  const state = useMappingsState();
  const [options, setOptions] = useState<EuiSelectableOption<MappingsOptionType>[]>([]);
  const [updateElserMappingError, setUpdateElserMappingError] = useState<string | undefined>(
    undefined
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const isApplyDisabled = options.every((o) => o.checked !== 'on') || hasUpdatePrivileges === false;

  const closeModal = () => {
    setIsModalOpen(false);
    setUpdateElserMappingError(undefined);
  };

  const renderMappingOption = useCallback((option: EuiSelectableOption<MappingsOptionType>) => {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiToken iconType="tokenSemanticText" />
        <EuiText size="s">{option.label}</EuiText>
        {option.inference_id && <EuiBadge color="hollow">{option.inference_id}</EuiBadge>}
      </EuiFlexGroup>
    );
  }, []);

  const handleApply = useCallback(async () => {
    setIsUpdating(true);
    const selectedOptions = options.filter((option) => option.checked === 'on');
    const denormalizedFields = deNormalizeSelectedElserMappings(selectedOptions);

    try {
      const { error } = await updateIndexMappings(indexName, denormalizedFields);

      if (!error) {
        notificationService.showSuccessToast(
          i18n.translate(
            'xpack.idxMgmt.indexDetails.updateElserMappingsModal.successfullyUpdatedIndexMappingsTitle',
            {
              defaultMessage: 'Mappings updated',
            }
          ),
          i18n.translate(
            'xpack.idxMgmt.indexDetails.updateElserMappingsModal.successfullyUpdatedIndexMappingsText',
            {
              defaultMessage: 'Your index mappings have been updated.',
            }
          )
        );
        refetchMapping();
        setIsModalOpen(false);
      } else {
        setUpdateElserMappingError(error.message);
      }
    } catch (exception) {
      setUpdateElserMappingError(exception.message);
    } finally {
      setIsUpdating(false);
    }
  }, [indexName, refetchMapping, options, setIsModalOpen]);

  useEffect(() => {
    const elserOptions = getAllElserFields(state.mappingViewFields);
    if (elserOptions) setOptions(elserOptions);
  }, [state]);

  return (
    <EuiModal
      style={{ width: 600 }}
      aria-labelledby={i18n.translate(
        'xpack.idxMgmt.indexDetails.updateElserMappingsModal.ariaLabelledBy',
        {
          defaultMessage: 'Update mappings to ELSER on EIS modal',
        }
      )}
      onClose={closeModal}
      data-test-subj="updateElserMappingsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.title', {
            defaultMessage: 'Update mappings to ELSER on EIS',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.costsTransparency', {
            defaultMessage:
              'Performing inference, NLP tasks, and other ML activities on the Elastic Inference Service (EIS) incurs additional costs for tokens.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLink
          href={documentationService.docLinks.enterpriseSearch.elasticInferenceService}
          target="_blank"
          external
        >
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.learnMoreLink', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
        <EuiSpacer size="l" />
        <EuiSelectable<MappingsOptionType>
          data-test-subj="updateElserMappingsSelect"
          aria-label={i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.select', {
            defaultMessage: 'Select elser mappings',
          })}
          options={options}
          listProps={{ bordered: true }}
          onChange={(newOptions) => setOptions(newOptions)}
          renderOption={renderMappingOption}
        >
          {(list) => list}
        </EuiSelectable>
        <EuiSpacer size="l" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.updateConditions', {
            defaultMessage:
              'Only fields using .elser-2-elasticsearch can be updated to use .elser-2-elastic on the Elastic Inference Service.',
          })}
        </EuiText>
        {updateElserMappingError && (
          <>
            <EuiSpacer size="l" />
            <EuiCallOut
              announceOnMount
              color="danger"
              data-test-subj="indexDetailsSaveMappingsError"
              iconType="error"
              title={i18n.translate(
                'xpack.idxMgmt.indexDetails.updateElserMappingsModal.error.title',
                {
                  defaultMessage: 'Error updating mapping',
                }
              )}
            >
              <EuiText>
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.updateElserMappingsModal.error.description"
                  defaultMessage="Error updating mapping: {errorMessage}"
                  values={{ errorMessage: updateElserMappingError }}
                />
              </EuiText>
            </EuiCallOut>
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="UpdateElserMappingsModalCancelBtn"
            onClick={closeModal}
            aria-label={i18n.translate(
              'xpack.idxMgmt.indexDetails.updateElserMappingsModal.cancelButtonAriaLabel',
              {
                defaultMessage: 'Cancel and close modal',
              }
            )}
          >
            {i18n.translate(
              'xpack.idxMgmt.indexDetails.updateElserMappingsModal.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={handleApply}
            isLoading={isUpdating}
            data-test-subj="UpdateElserMappingsModalApplyBtn"
            isDisabled={isApplyDisabled}
          >
            {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.applyButton', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
