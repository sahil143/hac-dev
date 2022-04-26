import { commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useK8sWatchResource } from '../../../dynamic-plugin-sdk';
import { createComponentDetectionQuery } from '../../../utils/create-utils';
import { useAccessTokenBindingAuth, useComponentDetection } from '../utils';
import '@testing-library/jest-dom';

jest.mock('../../../dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
}));

jest.mock('../../../utils/create-utils', () => ({
  createComponentDetectionQuery: jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  commonFetch: jest.fn(),
}));

jest.mock('formik', () => ({
  useFormikContext: () => ({ setFieldValue: jest.fn() }),
}));

const useK8sWatchMock = useK8sWatchResource as jest.Mock;
const createCDQMock = createComponentDetectionQuery as jest.Mock;
const commonFetchMock = commonFetch as jest.Mock;

describe('useComponentDetection', () => {
  afterEach(jest.resetAllMocks);

  it('creates CDQ when source is provided', () => {
    useK8sWatchMock.mockReturnValue([{}, true, null]);
    createCDQMock.mockResolvedValue({ metadata: { name: 'test-cdq' } });

    renderHook(() =>
      useComponentDetection('https://github.com/test/repo', 'test-app', 'test-ns', true, 'token'),
    );

    expect(createCDQMock).toHaveBeenCalledTimes(1);
    expect(createCDQMock).toHaveBeenCalledWith(
      'test-app',
      'https://github.com/test/repo',
      'test-ns',
      true,
      'token',
    );
  });

  it('should not create CDQ when source is not available', () => {
    useK8sWatchMock.mockReturnValue([{}, true, null]);
    createCDQMock.mockResolvedValue({ metadata: { name: 'test-cdq' } });

    renderHook(() => useComponentDetection('', 'test-app', 'test-ns'));

    expect(createCDQMock).toHaveBeenCalledTimes(0);
  });

  it('should call useK8sWatchHook with empty object if cdqName is null', () => {
    useK8sWatchMock.mockReturnValue([{}, true, null]);
    createCDQMock.mockResolvedValue({ metadata: { name: 'test-cdq' } });

    renderHook(() => useComponentDetection('', 'test-app', 'test-ns'));
    expect(useK8sWatchMock).toHaveBeenCalledWith({});
    expect(createCDQMock).toHaveBeenCalledTimes(0);
  });
});

describe('useAccessTokenBindingAuth', () => {
  it('should call commonFetch with github auth url', async () => {
    useK8sWatchMock.mockReturnValue([
      { status: { oAuthUrl: 'https://xyz.com/github/authenticate?state=dummy-token' } },
      true,
      null,
    ]);

    renderHook(() => useAccessTokenBindingAuth('test-app'));

    await waitFor(() =>
      expect(commonFetchMock).toHaveBeenCalledWith('/auth/github/authenticate?state=dummy-token'),
    );
  });

  it('should call commonFetch with quay auth url', async () => {
    useK8sWatchMock.mockReturnValue([
      { status: { oAuthUrl: 'https://xyz.com/quay/authenticate?state=dummy-token' } },
      true,
      null,
    ]);

    renderHook(() => useAccessTokenBindingAuth('test-app'));

    await waitFor(() =>
      expect(commonFetchMock).toHaveBeenCalledWith('/auth/quay/authenticate?state=dummy-token'),
    );
  });
});
