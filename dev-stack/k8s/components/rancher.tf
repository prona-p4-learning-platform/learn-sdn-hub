resource "kubernetes_namespace_v1" "rancher" {
  metadata {
    name = "cattle-system"
  }
}

resource "helm_release" "rancher" {
  name = "rancher"
  repository = "https://releases.rancher.com/server-charts/latest"
  chart = "rancher"
  version = "2.13.0"
  namespace = kubernetes_namespace_v1.rancher.metadata[0].name
  values = [file("${path.module}/helm/rancher-values.yaml")]
  depends_on = [ helm_release.nginx-ingress-controller, helm_release.cert_manager, kubernetes_namespace_v1.rancher]
}