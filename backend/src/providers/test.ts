import K8sProvider from './K8sProvider';

describe('K8sProvider API existence', () => {
  let provider: K8sProvider;

  beforeEach(() => {
    provider = new K8sProvider();
  });

  it('should have listNamespacedIngress method', () => {
    expect(typeof (provider as any).k8sApi.listNamespacedIngress).toBe('function');
  });

  it('should have readNamespacedServiceAccount method', () => {
    expect(typeof (provider as any).k8sApi.readNamespacedServiceAccount).toBe('function');
  });
});
