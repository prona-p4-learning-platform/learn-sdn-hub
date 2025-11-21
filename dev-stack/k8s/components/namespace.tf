resource "kubernetes_namespace_v1" "learn-sdn-hub" {
  metadata {
    name = "learn-sdn-hub"
  }
}