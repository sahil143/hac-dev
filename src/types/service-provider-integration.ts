import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type SPIAccessTokenBindingKind = K8sResourceCommon & {
  spec: {
    repoUrl: string;
    permissions: {
      required: {
        area: string;
        type: string;
      }[];
    };
    secret: {
      name: string;
      type: string;
    };
  };
  status?: {
    phase: SPIAccessTokenBindingPhase;
    oAuthUrl?: string;
    linkedAccessTokenName?: string;
    syncedObjectRef?: {
      name: string;
    };
    errorMessage?: string;
  };
};

export enum SPIAccessTokenBindingPhase {
  AwaitingTokenData = 'AwaitingTokenData',
  Injected = 'Injected',
  Error = 'Error',
}

export type SPIAccessCheckKind = K8sResourceCommon & {
  spec: {
    repoUrl: string;
  };
  status?: {
    accessible: boolean;
    accessibility: string;
    repoType: string;
    errorReason?: string;
    errorMessage?: string;
  };
};
