resource "kubernetes_namespace_v1" "mongodb-operator" {
  metadata {
    name = "mongodb-operator"
  }
}

resource "helm_release" "mongodb-operator" {
  name = "mongodb-operator"
  repository = "https://mongodb.github.io/helm-charts"
  chart = "mongodb-kubernetes"
  version = "1.6.1"
  namespace = kubernetes_namespace_v1.mongodb-operator.metadata[0].name
  values = [file("${path.module}/helm/mongo-operator.yaml")]
  depends_on = [ kubernetes_namespace_v1.mongodb-operator ]
}

