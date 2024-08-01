import * as React from 'react';
import { useTaskRuns } from '../../hooks/useTaskRuns';
import { getTaskRunLog } from '../../utils/tekton-results';
import { useWorkspaceInfo } from '../../utils/workspace-context-utils';
import {
  ComponentEnterpriseContractResult,
  EnterpriseContractResult,
  ENTERPRISE_CONTRACT_STATUS,
  UIEnterpriseContractData,
} from './types';
import { extractEcResultsFromTaskRunLogs } from './utils';

export const useEnterpriseContractResultFromLogs = (
  pipelineRunName: string,
): [ComponentEnterpriseContractResult[], boolean] => {
  const { namespace, workspace } = useWorkspaceInfo();
  const [taskRun, loaded, error] = useTaskRuns(namespace, pipelineRunName, 'verify');
  const [ecJson, setEcJson] = React.useState<EnterpriseContractResult>();
  const [ecLoaded, setEcLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!loaded || error) {
      return;
    }

    let unmount = false;
    const fetch = async () => {
      try {
        const logs = await getTaskRunLog(
          workspace,
          taskRun[0].metadata.namespace,
          taskRun[0].metadata.name,
        );
        if (unmount) return;
        const json = extractEcResultsFromTaskRunLogs(logs);
        setEcJson(json);
        setEcLoaded(true);
      } catch (e) {
        if (unmount) return;
        setEcLoaded(true);
        // eslint-disable-next-line no-console
        console.warn('Error while fetching Enterprise Contract result from tekton results logs', e);
      }
    };

    fetch();
    return () => {
      unmount = true;
    };
  }, [taskRun, loaded, error, workspace]);

  const ecResult = React.useMemo(() => {
    // filter out components for which ec didn't execute because invalid image URL
    return ecLoaded && ecJson
      ? ecJson.components?.filter((comp: ComponentEnterpriseContractResult) => {
          return !(
            comp.violations &&
            comp.violations?.length === 1 &&
            !comp.violations[0].metadata &&
            comp.violations[0].msg.includes('404 Not Found')
          );
        })
      : undefined;
  }, [ecJson, ecLoaded]);

  return [ecResult, ecLoaded];
};

export const mapEnterpriseContractResultData = (
  ecResult: ComponentEnterpriseContractResult[],
): UIEnterpriseContractData[] => {
  return ecResult.reduce((acc, compResult) => {
    compResult?.violations?.forEach((v) => {
      const rule: UIEnterpriseContractData = {
        title: v.metadata?.title,
        description: v.metadata?.description,
        status: ENTERPRISE_CONTRACT_STATUS.violations,
        timestamp: v.metadata?.effective_on,
        component: compResult.name,
        msg: v.msg,
        collection: v.metadata?.collections,
        solution: v.metadata?.solution,
      };
      acc.push(rule);
    });
    compResult?.warnings?.forEach((v) => {
      const rule: UIEnterpriseContractData = {
        title: v.metadata?.title,
        description: v.metadata?.description,
        status: ENTERPRISE_CONTRACT_STATUS.warnings,
        timestamp: v.metadata?.effective_on,
        component: compResult.name,
        msg: v.msg,
        collection: v.metadata?.collections,
      };
      acc.push(rule);
    });
    compResult?.successes?.forEach((v) => {
      const rule: UIEnterpriseContractData = {
        title: v.metadata?.title,
        description: v.metadata?.description,
        status: ENTERPRISE_CONTRACT_STATUS.successes,
        component: compResult.name,
        collection: v.metadata?.collections,
      };
      acc.push(rule);
    });

    return acc;
  }, []);
};

export const useEnterpriseContractResults = (
  pipelineRunName: string,
): [UIEnterpriseContractData[], boolean] => {
  const [ec, ecLoaded] = useEnterpriseContractResultFromLogs(pipelineRunName);
  const ecResult = React.useMemo(() => {
    return ecLoaded && ec ? mapEnterpriseContractResultData(ec) : undefined;
  }, [ec, ecLoaded]);

  return [ecResult, ecLoaded];
};
