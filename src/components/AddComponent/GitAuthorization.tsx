import * as React from 'react';
import {
  Button,
  ButtonVariant,
  HelperText,
  HelperTextItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { CheckIcon } from '@patternfly/react-icons/dist/js/icons/check-icon';
import { useField } from 'formik';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { LoadingInline } from '../../shared/components/status-box/StatusBox';
import { useAccessTokenBindingAuth } from './utils';

export const GitAuthorization: React.FC = () => {
  const [, { value: url, error, touched }] = useField<string>('source');
  const [, { value: authSecret }] = useField<string>('git.authSecret');
  const formRef = React.useRef<HTMLFormElement>();

  const [authUrl, loaded] = useAccessTokenBindingAuth(url);

  const {
    auth: { getToken },
  } = useChrome();

  const startAuthorization = React.useCallback(async () => {
    if (authUrl) {
      const urlObj = new URL(authUrl);
      const queryParams = new URLSearchParams(urlObj.search);
      const state = queryParams.get('state');

      (formRef.current.elements.namedItem('state') as HTMLInputElement).value = state;
      (formRef.current.elements.namedItem('k8s_token') as HTMLInputElement).value =
        await getToken();
      formRef.current.setAttribute('action', urlObj.origin + urlObj.pathname);
      formRef.current.dispatchEvent(new Event('submit', { cancelable: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUrl]);

  return (
    <>
      <form ref={formRef} method="POST" target="_blank">
        <input type="hidden" name="state" />
        <input type="hidden" name="k8s_token" />
      </form>
      <TextContent>
        <Text component={TextVariants.small}>To connect to a private repository, sign in.</Text>
        {authSecret ? (
          <HelperText>
            <HelperTextItem variant="success" icon={<CheckIcon />}>
              Authorized access
            </HelperTextItem>
          </HelperText>
        ) : loaded ? (
          <Button
            variant={ButtonVariant.link}
            onClick={startAuthorization}
            isDisabled={!touched || !!error}
            style={{ paddingLeft: 0 }}
          >
            Sign In
          </Button>
        ) : (
          <LoadingInline />
        )}
      </TextContent>
    </>
  );
};
