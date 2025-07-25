/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick } from 'lodash';
import type { FC } from 'react';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { isEqual } from 'lodash';
import { encode } from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getNestedProperty } from '@kbn/ml-nested-property';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  Provider as UrlStateContextProvider,
  parseUrlState,
  isRisonSerializationRequired,
  type Accessor,
  type Dictionary,
  type SetUrlState,
  UrlStateProvider,
} from '@kbn/ml-url-state';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import {
  type IndexDataVisualizerViewProps,
  IndexDataVisualizerView,
} from './components/index_data_visualizer_view';
import { IndexDataVisualizerESQL } from './components/index_data_visualizer_view/index_data_visualizer_esql';

import { useDataVisualizerKibana } from '../kibana_context';
import type { GetAdditionalLinks } from '../common/components/results_links';
import { DATA_VISUALIZER_APP_LOCATOR, type IndexDataVisualizerLocatorParams } from './locator';
import { DATA_VISUALIZER_INDEX_VIEWER } from './constants/index_data_visualizer_viewer';
import { INDEX_DATA_VISUALIZER_NAME } from '../common/constants';
import { DV_STORAGE_KEYS } from './types/storage';

const localStorage = new Storage(window.localStorage);

export interface DataVisualizerStateContextProviderProps {
  IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
  getAdditionalLinks?: GetAdditionalLinks;
}
export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;

export const getLocatorParams = (params: {
  dataViewId?: string;
  savedSearchId?: string;
  urlSearchString: string;
  searchSessionId?: string;
  shouldRestoreSearchSession: boolean;
}): IndexDataVisualizerLocatorParams => {
  const urlState = parseUrlState(params.urlSearchString);

  let locatorParams: IndexDataVisualizerLocatorParams = {
    dataViewId: urlState.index,
    searchSessionId: params.searchSessionId,
  };

  if (params.savedSearchId) locatorParams.savedSearchId = params.savedSearchId;
  if (urlState) {
    if (urlState._g) {
      const { time, refreshInterval } = urlState._g;

      locatorParams.timeRange = time;
      locatorParams.refreshInterval = refreshInterval;
    }

    if (urlState._a && urlState._a[DATA_VISUALIZER_INDEX_VIEWER]) {
      locatorParams = { ...locatorParams, ...urlState._a[DATA_VISUALIZER_INDEX_VIEWER] };
    }
  }
  return locatorParams;
};

const DataVisualizerESQLStateContextProvider = () => {
  const { services } = useDataVisualizerKibana();
  const isEsqlEnabled = useMemo(() => services.uiSettings.get(ENABLE_ESQL), [services.uiSettings]);

  if (!isEsqlEnabled) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.esqlNotEnabledCalloutTitle"
            defaultMessage="ES|QL is not enabled"
          />
        }
      />
    );
  }

  return (
    <UrlStateProvider>
      <IndexDataVisualizerESQL />
    </UrlStateProvider>
  );
};

const DataVisualizerStateContextProvider: FC<DataVisualizerStateContextProviderProps> = ({
  IndexDataVisualizerComponent,
  getAdditionalLinks,
}) => {
  const { services } = useDataVisualizerKibana();
  const {
    data: { dataViews, search },
    notifications: { toasts },
    savedSearch: savedSearchService,
  } = services;

  const history = useHistory();
  const { search: urlSearchString } = useLocation();

  const [currentDataView, setCurrentDataView] = useState<DataView | undefined>(undefined);
  const [currentSavedSearch, setCurrentSavedSearch] = useState<SavedSearch | null>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const urlState = parseUrlState(urlSearchString);

    if (search.session) {
      search.session.enableStorage({
        getName: async () => {
          // return the name you want to give the saved Search Session
          return INDEX_DATA_VISUALIZER_NAME;
        },
        getLocatorData: async () => {
          return {
            id: DATA_VISUALIZER_APP_LOCATOR,
            initialState: getLocatorParams({
              ...services,
              urlSearchString,
              dataViewId: currentDataView?.id,
              savedSearchId: currentSavedSearch?.id,
              shouldRestoreSearchSession: false,
              searchSessionId: search.session.getSessionId(),
            }),
            restoreState: getLocatorParams({
              ...services,
              urlSearchString,
              dataViewId: currentDataView?.id,
              savedSearchId: currentSavedSearch?.id,
              shouldRestoreSearchSession: true,
              searchSessionId: search.session.getSessionId(),
            }),
          };
        },
      });
    }

    if (urlState.searchSessionId !== undefined && urlState.searchSessionId !== currentSessionId) {
      search.session?.restore(urlState.searchSessionId);
      setCurrentSessionId(urlState.searchSessionId);
    } else {
      const newSessionId = search.session?.start();
      setCurrentSessionId(newSessionId);
    }
    return () => {
      search.session.clear();
    };
    // urlSearchString already includes all the other dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.session, urlSearchString]);

  useEffect(() => {
    const prevSearchString = urlSearchString;
    const parsedQueryString = parse(prevSearchString, { sort: false });

    const getDataView = async () => {
      if (typeof parsedQueryString?.savedSearchId === 'string') {
        const savedSearchId = parsedQueryString.savedSearchId;
        try {
          const savedSearch = await savedSearchService.get(savedSearchId);
          const dataView = savedSearch.searchSource.getField('index');

          if (!dataView) {
            toasts.addDanger({
              title: i18n.translate('xpack.dataVisualizer.index.dataViewErrorMessage', {
                defaultMessage: 'Error finding data view',
              }),
            });
          }
          setCurrentSavedSearch(savedSearch);
          setCurrentDataView(dataView);
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate('xpack.dataVisualizer.index.savedSearchErrorMessage', {
              defaultMessage: 'Error retrieving Discover session {savedSearchId}',
              values: { savedSearchId },
            }),
          });
        }
      }

      if (typeof parsedQueryString?.index === 'string') {
        const dataView = await dataViews.get(parsedQueryString.index);
        setCurrentDataView(dataView);
      }
    };
    getDataView();
  }, [toasts, dataViews, urlSearchString, search, savedSearchService]);

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = urlSearchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.hasOwn(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, urlSearchString]
  );

  return (
    <UrlStateContextProvider value={{ searchString: urlSearchString, setUrlState }}>
      {currentDataView ? (
        <IndexDataVisualizerComponent
          currentDataView={currentDataView}
          currentSavedSearch={currentSavedSearch}
          currentSessionId={currentSessionId}
          getAdditionalLinks={getAdditionalLinks}
        />
      ) : null}
    </UrlStateContextProvider>
  );
};

export interface Props {
  getAdditionalLinks?: GetAdditionalLinks;
  showFrozenDataTierChoice?: boolean;
  esql?: boolean;
}

export const IndexDataVisualizer: FC<Props> = ({
  getAdditionalLinks,
  showFrozenDataTierChoice = true,
  esql,
}) => {
  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    share,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  } = getPluginsStart();
  const services = {
    ...coreStart,
    data,
    maps,
    embeddable,
    share,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  };

  const startServices = pick(coreStart, 'analytics', 'i18n', 'theme', 'userProfile');
  const datePickerDeps: DatePickerDependencies = {
    ...pick(services, [
      'data',
      'http',
      'notifications',
      'theme',
      'uiSettings',
      'userProfile',
      'i18n',
    ]),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  return (
    <KibanaRenderContextProvider {...startServices}>
      <KibanaContextProvider services={{ ...services }}>
        <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
          <DatePickerContextProvider {...datePickerDeps}>
            {!esql ? (
              <DataVisualizerStateContextProvider
                IndexDataVisualizerComponent={IndexDataVisualizerView}
                getAdditionalLinks={getAdditionalLinks}
              />
            ) : (
              <DataVisualizerESQLStateContextProvider />
            )}
          </DatePickerContextProvider>
        </StorageContextProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
