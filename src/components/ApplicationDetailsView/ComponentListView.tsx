import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  DataList,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  TextInput,
  Bullseye,
  Spinner,
  ToolbarGroup,
  Label,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons/dist/js/icons';
import { useApplicationRoutes } from '../../hooks/useApplicationRoutes';
import { useGitOpsDeploymentCR } from '../../hooks/useGitOpsDeploymentCR';
import { ComponentKind } from '../../types';
import {
  getGitOpsDeploymentHealthStatusIcon,
  getGitOpsDeploymentStrategy,
} from '../../utils/gitops-utils';
import { NamespaceContext } from '../NamespacedPage/NamespacedPage';
import { ComponentListItem } from './ComponentListItem';

type ComponentListViewProps = {
  applicationName: string;
  components: ComponentKind[];
};

const ComponentListView: React.FC<ComponentListViewProps> = ({ applicationName, components }) => {
  const { namespace } = React.useContext(NamespaceContext);

  const [routes, loaded] = useApplicationRoutes(applicationName, namespace);

  const [gitOpsDeployment, gitOpsDeploymentLoaded] = useGitOpsDeploymentCR(
    applicationName,
    namespace,
  );

  const gitOpsDeploymentHealthStatus = gitOpsDeploymentLoaded
    ? gitOpsDeployment?.status?.health?.status
    : null;
  const gitOpsDeploymentHealthStatusIcon = getGitOpsDeploymentHealthStatusIcon(
    gitOpsDeploymentHealthStatus,
  );

  const [nameFilter, setNameFilter] = React.useState<string>('');

  const filteredComponents = React.useMemo(
    () =>
      nameFilter
        ? components.filter((component) => component.metadata.name.indexOf(nameFilter) !== -1)
        : components,
    [nameFilter, components],
  );

  const onClearFilters = () => setNameFilter('');
  const onNameInput = (name: string) => setNameFilter(name);
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <Toolbar data-testid="component-list-toolbar" clearAllFilters={onClearFilters}>
        <ToolbarContent>
          <ToolbarGroup alignment={{ default: 'alignLeft' }}>
            <ToolbarItem>
              <Button variant="control">
                <FilterIcon /> {'Name'}
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <TextInput
                name="nameInput"
                data-testid="name-input-filter"
                type="search"
                aria-label="name filter"
                placeholder="Filter by name..."
                onChange={(name) => onNameInput(name)}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Link
                data-test="add-component"
                className="pf-c-button pf-m-primary"
                to={`/app-studio/import?application=${applicationName}`}
              >
                Add Component
              </Link>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarGroup
            alignment={{ default: 'alignLeft', md: 'alignLeft', lg: 'alignRight' }}
            style={{ padding: 'var(--pf-global--spacer--sm)' }}
          >
            {gitOpsDeploymentLoaded ? (
              gitOpsDeployment ? (
                <>
                  <ToolbarItem>
                    {gitOpsDeploymentHealthStatusIcon} Application {gitOpsDeploymentHealthStatus}
                  </ToolbarItem>
                  <ToolbarItem variant="separator" />
                  <ToolbarItem variant="chip-group">
                    Deployment Strategy:{' '}
                    <Label>{getGitOpsDeploymentStrategy(gitOpsDeployment)}</Label>
                  </ToolbarItem>
                </>
              ) : null
            ) : (
              <Spinner isSVG size="md" />
            )}
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <DataList aria-label="Components" data-testid="component-list">
        {filteredComponents?.map((component) => (
          <ComponentListItem key={component.metadata.uid} component={component} routes={routes} />
        ))}
      </DataList>
    </>
  );
};

export default ComponentListView;
