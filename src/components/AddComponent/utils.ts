import * as React from 'react';
import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { useFormikContext } from 'formik';
import { useK8sWatchResource } from '../../dynamic-plugin-sdk';
import {
  ComponentDetectionQueryGroupVersionKind,
  SPIAccessCheckGroupVersionKind,
  SPIAccessCheckModel,
  SPIAccessTokenBindingGroupVersionKind,
} from '../../models';
import {
  ComponentDetectionQueryKind,
  DetectedComponents,
  SPIAccessCheckKind,
  SPIAccessTokenBindingKind,
  SPIAccessTokenBindingPhase,
} from '../../types';
import {
  createComponentDetectionQuery,
  initiateAccessTokenBinding,
} from '../../utils/create-utils';
import { NamespaceContext } from './../NamespacedPage/NamespacedPage';

/**
 * Create the SPIAccessTokenBinding resource when source changes
 * and set the specified secret upon successful injection.
 *
 * @returns oAuth URL provided by the binding
 */
export const useAccessTokenBindingAuth = (source: string): [string, boolean] => {
  const { namespace } = React.useContext(NamespaceContext);
  const { setFieldValue } = useFormikContext();
  const [name, setName] = React.useState<string>();

  React.useEffect(() => {
    initiateAccessTokenBinding(source, namespace)
      .then((resource) => {
        setName(resource.metadata.name);
      })
      // eslint-disable-next-line no-console
      .catch((e) => console.error('Error when initiating access token binding: ', e));
  }, [namespace, source]);

  const [binding, loaded] = useK8sWatchResource<SPIAccessTokenBindingKind>(
    name
      ? {
          groupVersionKind: SPIAccessTokenBindingGroupVersionKind,
          name,
          namespace,
        }
      : {},
  );

  React.useEffect(() => {
    if (!name || !loaded) return;
    if (binding.status?.phase === SPIAccessTokenBindingPhase.Injected) {
      setFieldValue('git.authSecret', binding.status.syncedObjectRef.name);
      // eslint-disable-next-line no-console
      console.log('Git repository successfully authorized.');
    } else if (binding.status?.phase === SPIAccessTokenBindingPhase.Error) {
      // eslint-disable-next-line no-console
      console.log('Error in binding status ', binding.status.errorMessage);
    }
  }, [
    name,
    loaded,
    setFieldValue,
    binding?.status?.phase,
    binding?.status?.errorMessage,
    binding?.status?.syncedObjectRef?.name,
  ]);

  return [binding?.status?.oAuthUrl, loaded];
};

/**
 * Create a ComponentDetectionQuery when any of the params change,
 * and return the detected components when detection is completed.
 */
export const useComponentDetection = (
  source: string,
  application: string,
  namespace: string,
  isMultiComponent?: boolean,
  authSecret?: string,
): [DetectedComponents, any] => {
  const [cdqName, setCdqName] = React.useState<string>();
  const [createError, setCreateError] = React.useState();

  const [cdq, loaded, loadError] = useK8sWatchResource<ComponentDetectionQueryKind>(
    cdqName
      ? {
          groupVersionKind: ComponentDetectionQueryGroupVersionKind,
          name: cdqName,
          namespace,
          isList: false,
        }
      : {},
  );

  React.useEffect(() => {
    setCdqName(null);
    setCreateError(null);
    if (source) {
      createComponentDetectionQuery(application, source, namespace, isMultiComponent, authSecret)
        .then((resource) => setCdqName(resource.metadata.name))
        .catch(setCreateError);
    }
  }, [application, authSecret, isMultiComponent, namespace, source]);

  const detectedComponents = React.useMemo(() => {
    if (cdqName && loaded && cdq) {
      if (cdqName === cdq.metadata.name) {
        return cdq?.status?.componentDetected;
      }
    }
  }, [cdqName, cdq, loaded]);

  const error = React.useMemo(() => {
    if (createError) {
      return createError;
    }
    if (cdqName) {
      if (loadError) {
        return loadError;
      }

      const completeCondition = cdq?.status?.conditions?.find(
        (condition) => condition.type === 'Completed',
      );

      if (loaded && !detectedComponents && completeCondition) {
        if (cdqName === cdq.metadata.name) {
          return completeCondition.message;
        }
      }
    }
  }, [cdq, cdqName, createError, detectedComponents, loadError, loaded]);

  return [detectedComponents, error];
};

/**
 * Create a new SPIAccessCheck when source changes,
 * and return true if the source is accessible.
 */
export const useAccessCheck = (source: string) => {
  const { namespace } = React.useContext(NamespaceContext);
  const [name, setName] = React.useState<string>();

  React.useEffect(() => {
    if (source) {
      k8sCreateResource({
        model: SPIAccessCheckModel,
        queryOptions: {
          ns: namespace,
        },
        resource: {
          apiVersion: `${SPIAccessCheckModel.apiGroup}/${SPIAccessCheckModel.apiVersion}`,
          kind: SPIAccessCheckModel.kind,
          metadata: {
            generateName: 'hacdev-check-',
            namespace,
          },
          spec: {
            repoUrl: source,
          },
        },
      }).then((res) => {
        // TODO fix type for generateName resources not having name?
        setName((res.metadata as any).name);
      });
    }
  }, [namespace, source]);

  const [accessCheck, loaded] = useK8sWatchResource<SPIAccessCheckKind>(
    name
      ? {
          groupVersionKind: SPIAccessCheckGroupVersionKind,
          name,
          namespace,
        }
      : {},
  );

  return loaded && accessCheck?.status?.accessible;
};
