import K8sProvider from './K8sProvider';

type K8sApiShape = {
  listNamespacedIngress: (...args: unknown[]) => unknown;
  readNamespacedServiceAccount: (...args: unknown[]) => unknown;
};

describe('K8sProvider API existence', () => {
  let provider: K8sProvider;

  beforeEach(() => {
    provider = new K8sProvider();
  });

  it('should have listNamespacedIngress method', () => {
    const { k8sApi } = provider as unknown as { k8sApi: K8sApiShape };
    expect(typeof k8sApi.listNamespacedIngress).toBe('function');
  });

  it('should have readNamespacedServiceAccount method', () => {
    const { k8sApi } = provider as unknown as { k8sApi: K8sApiShape };
    expect(typeof k8sApi.readNamespacedServiceAccount).toBe('function');
  });
});
