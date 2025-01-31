import { k8sCreateResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as yup from 'yup';
import { SpaceBindingRequestGroupVersionKind, SpaceBindingRequestModel } from '../../../models';
import { SpaceBindingRequest, WorkspaceRole } from '../../../types';

export type UserAccessFormValues = {
  usernames: string[];
  role: WorkspaceRole;
};

export const validateUsername = async (username: string) => {
  try {
    const res = await fetch(`/api/k8s/registration/api/v1/usernames/${username}`);
    const [data]: [{ username: string }] = await res.json();
    return data.username === username;
  } catch {
    return false;
  }
};

export const userAccessFormSchema = yup.object({
  usernames: yup
    .array()
    .of(yup.string())
    .min(1, 'Must have at least 1 username.')
    .required('Required.'),
  role: yup
    .string()
    .matches(/contributor|maintainer|admin/, 'Invalid role.')
    .required('Required.'),
});

export const createSBRs = async (
  values: UserAccessFormValues,
  namespace: string,
  dryRun?: boolean,
): Promise<SpaceBindingRequest[]> => {
  const { usernames, role } = values;
  const objs: SpaceBindingRequest[] = usernames.map((username) => ({
    apiVersion: `${SpaceBindingRequestGroupVersionKind.group}/${SpaceBindingRequestGroupVersionKind.version}`,
    kind: SpaceBindingRequestGroupVersionKind.kind,
    metadata: {
      generateName: `${username}-`,
      namespace,
    },
    spec: {
      masterUserRecord: username,
      spaceRole: role,
    },
  }));

  return Promise.all(
    objs.map((obj) =>
      k8sCreateResource({
        model: SpaceBindingRequestModel,
        queryOptions: {
          ns: namespace,
          ...(dryRun && { queryParams: { dryRun: 'All' } }),
        },
        resource: obj,
      }),
    ),
  );
};

/**
 * Only updates one SBR, but returning array to
 * keep it consistent with `createSBRs()`
 */
export const editSBR = async (
  values: UserAccessFormValues,
  sbr: SpaceBindingRequest,
  dryRun?: boolean,
): Promise<SpaceBindingRequest[]> => {
  const { role } = values;

  return Promise.all([
    k8sPatchResource({
      model: SpaceBindingRequestModel,
      queryOptions: {
        name: sbr.metadata.name,
        ns: sbr.metadata.namespace,
        ...(dryRun && { queryParams: { dryRun: 'All' } }),
      },
      patches: [
        {
          op: 'replace',
          path: '/spec/spaceRole',
          value: role,
        },
      ],
    }),
  ]);
};
